"""Sound for Ivyward social videos: a voiceover and an original music bed in every video.

    python3 audio.py voice spec.json workdir    # speaks each scene's "say" line; prints {"durs": [...]} (seconds per scene)
    python3 audio.py mix spec.json workdir silent.mp4 out.mp4 [--starts 0,4.2,...]
                                                # builds the voice track at the scene start times, adds music, mixes

render.mjs calls both; you rarely need to run this by hand.

Voice: Kokoro (open-weight TTS, Apache-2.0), run locally. The model files are fetched once from the kokoro-onnx GitHub
release into ~/.cache/ivyward-tts. Default voice "af_heart"; a spec can set "voice" and "speed".
Music: generated here from scratch for each video (soft pad chords, a plucked arpeggio, a light pulse), so it is original
and free to use. Seeded by the output file name so each video sounds a little different.
"""
import json
import math
import os
import subprocess
import sys
import urllib.request
import zlib
from pathlib import Path

import numpy as np

SR = 24000  # kokoro's rate; music is made at the same rate
CACHE = Path(os.environ.get("IVYWARD_TTS_CACHE", Path.home() / ".cache" / "ivyward-tts"))
RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
FILES = ["kokoro-v1.0.onnx", "voices-v1.0.bin"]


def ensure_model():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        p = CACHE / name
        if p.exists() and p.stat().st_size > 1_000_000:
            continue
        tmp = p.with_suffix(".part")
        print(f"fetching {name}…", file=sys.stderr)
        urllib.request.urlretrieve(RELEASE + name, tmp)
        tmp.rename(p)
    return CACHE / FILES[0], CACHE / FILES[1]


def speakable(text):
    # what the voice should say for things it would misread
    t = text.replace("tryivyward.com", "try Ivyward dot com").replace("Ivyward", "Ivy-ward")
    t = t.replace("–", " to ").replace("&", " and ")
    return t


def voice(spec, work):
    import soundfile as sf
    from kokoro_onnx import Kokoro

    model, voices = ensure_model()
    k = Kokoro(str(model), str(voices))
    v = spec.get("voice", "af_heart")
    speed = float(spec.get("speed", 1.0))
    durs = []
    for i, s in enumerate(spec["scenes"]):
        line = s.get("say")
        if not line:
            durs.append(0.0)
            continue
        audio, sr = k.create(speakable(line), voice=v, speed=speed, lang="en-us")
        if sr != SR:
            raise SystemExit(f"unexpected sample rate {sr}")
        sf.write(work / f"vo_{i}.wav", audio, SR)
        durs.append(round(len(audio) / SR, 3))
    return durs


# ---------- music ----------
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}
PROGRESSIONS = [  # warm, unhurried, never minor-key gloomy: semitone offsets from the key root (root, chord tones)
    [(0, [0, 4, 7, 11]), (9, [0, 3, 7, 10]), (5, [0, 4, 7, 11]), (7, [0, 4, 7, 9])],   # I maj7 – vi7 – IV maj7 – V6
    [(0, [0, 4, 7, 14]), (7, [0, 4, 7, 11]), (9, [0, 3, 7, 10]), (5, [0, 4, 7, 14])],  # I add9 – V – vi7 – IV add9
    [(5, [0, 4, 7, 11]), (7, [0, 4, 7, 9]), (4, [0, 3, 7, 10]), (9, [0, 3, 7, 10])],   # IV – V6 – iii7 – vi7
]
KEYS = ["C", "D", "Eb", "F", "G", "A"]


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def adsr(n, a, r, sustain=1.0):
    env = np.full(n, sustain, dtype=np.float32)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        env[:na] = np.linspace(0, sustain, na)
    if nr:
        env[-nr:] *= np.linspace(1, 0, nr)
    return env


def lowpass(x, cutoff):
    # one-pole low-pass, enough to round off the pad
    from scipy.signal import lfilter
    a = math.exp(-2 * math.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x).astype(np.float32)


def music(seconds, seed):
    rng = np.random.default_rng(seed)
    key = NOTE[KEYS[seed % len(KEYS)].replace("Eb", "D#")]
    prog = PROGRESSIONS[(seed // 7) % len(PROGRESSIONS)]
    bpm = 80 + (seed % 3) * 4
    beat = 60 / bpm
    bar = 4 * beat
    total = int((seconds + 0.5) * SR)
    L = np.zeros(total, dtype=np.float32)
    R = np.zeros(total, dtype=np.float32)
    t_all = np.arange(total) / SR

    chord_len = 2 * bar
    n_chords = int(math.ceil(seconds / chord_len)) + 1
    base = 48 + key  # C3 + key
    for c in range(n_chords):
        root, tones = prog[c % len(prog)]
        start = int(c * chord_len * SR)
        if start >= total:
            break
        n = min(int(chord_len * SR) + int(0.6 * SR), total - start)
        t = np.arange(n) / SR
        # pad: three detuned sines per tone, slow swell
        pad = np.zeros(n, dtype=np.float32)
        for tone in tones:
            f = hz(base + 12 + root + tone)
            for det in (-0.12, 0.0, 0.12):
                pad += np.sin(2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6.28)).astype(np.float32)
        pad += 0.5 * np.sin(2 * np.pi * hz(base + root) * t).astype(np.float32)  # bass
        pad *= adsr(n, 0.9, 0.9) * 0.045
        L[start:start + n] += pad
        R[start:start + n] += pad
        # pluck arpeggio, eighth notes, gently panned
        steps = int(chord_len / (beat / 2))
        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for s in range(steps):
            if rng.random() < 0.18:
                continue  # leave a little air
            ts = start + int(s * (beat / 2) * SR)
            if ts >= total:
                break
            tone = tones[pattern[s % len(pattern)] % len(tones)]
            f = hz(base + 24 + root + tone)
            m = min(int(1.2 * SR), total - ts)
            tt = np.arange(m) / SR
            pl = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt))
            pl = (pl * np.exp(-tt * 5.5) * 0.06).astype(np.float32)
            pan = 0.5 + 0.35 * math.sin(s * 0.9)
            L[ts:ts + m] += pl * (1 - pan) * 1.4
            R[ts:ts + m] += pl * pan * 1.4
    # soft pulse: a muted low thump on beats 1 and 3, very quiet, for motion
    for b in range(int(seconds / beat) + 1):
        if b % 2:
            continue
        ts = int(b * beat * SR)
        if ts >= total:
            break
        m = min(int(0.25 * SR), total - ts)
        tt = np.arange(m) / SR
        k = (np.sin(2 * np.pi * (60 - 25 * tt) * tt) * np.exp(-tt * 18) * 0.12).astype(np.float32)
        L[ts:ts + m] += k
        R[ts:ts + m] += k
    L = lowpass(L, 5200)
    R = lowpass(R, 5200)
    # fades
    fi, fo = int(1.2 * SR), int(1.8 * SR)
    env = np.ones(total, dtype=np.float32)
    env[:fi] = np.linspace(0, 1, fi)
    env[-fo:] = np.linspace(1, 0, fo)
    out = np.stack([L * env, R * env], axis=1)
    peak = float(np.max(np.abs(out))) or 1.0
    return (out / peak * 0.8).astype(np.float32)


def mix(spec, work, silent, out, starts):
    import soundfile as sf

    seconds = float(json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(silent)]))["format"]["duration"])
    total = int(seconds * SR) + 1
    vo = np.zeros(total, dtype=np.float32)
    for i, start in enumerate(starts):
        p = work / f"vo_{i}.wav"
        if not p.exists():
            continue
        a, _ = sf.read(p, dtype="float32")
        ts = int((start + 0.35) * SR)  # a breath after the scene appears
        n = min(len(a), total - ts)
        if n > 0:
            vo[ts:ts + n] += a[:n]
    sf.write(work / "vo.wav", vo, SR)
    seed = zlib.crc32(Path(out).name.encode()) % 10_000
    sf.write(work / "music.wav", music(seconds, seed), SR)
    has_voice = bool(np.any(vo))
    # mix the stems to a wav first (voice compressed and on top, music low and ducked under it), then normalise
    # loudness in two passes so the balance between them survives (one-pass loudnorm pumps the music up in pauses)
    if has_voice:
        graph = ("[0:a]highpass=f=80,acompressor=threshold=-24dB:ratio=3:attack=5:release=80:makeup=3,"
                 "aformat=channel_layouts=stereo,asplit=2[vo][sc];"
                 "[1:a]volume=0.12[m];[m][sc]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=600[md];"
                 "[vo][md]amix=inputs=2:duration=longest:normalize=0[a]")
        inputs = ["-i", str(work / "vo.wav"), "-i", str(work / "music.wav")]
    else:
        graph = "[0:a]volume=0.5[a]"
        inputs = ["-i", str(work / "music.wav")]
    raw = work / "mix.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[a]", str(raw)], check=True)
    target = "I=-16:TP=-1.5:LRA=11" if has_voice else "I=-20:TP=-1.5:LRA=11"
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    norm = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(raw), "-af", norm,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
                    "-shortest", "-movflags", "+faststart", str(out)], check=True)
    return {"voice": has_voice, "music": True}


if __name__ == "__main__":
    cmd, spec_path, work = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    work.mkdir(parents=True, exist_ok=True)
    spec = json.loads(Path(spec_path).read_text())
    if cmd == "voice":
        print(json.dumps({"durs": voice(spec, work)}))
    elif cmd == "mix":
        silent, out = sys.argv[4], sys.argv[5]
        starts = []
        if "--starts" in sys.argv:
            starts = [float(x) for x in sys.argv[sys.argv.index("--starts") + 1].split(",") if x]
        print(json.dumps(mix(spec, work, silent, out, starts)))
    else:
        raise SystemExit("usage: audio.py voice|mix …")

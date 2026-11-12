"""Sound for Ivyward ads: a voiceover, an original music track with a real build and drop, and sound effects on cue.

    python3 adaudio.py voice spec.json work      # one wav per beat with a "say" line; prints {"durs": [...]}
    python3 adaudio.py mix spec.json work silent.mp4 out.mp4 cues.json
        cues.json: {"total": s, "starts": [beat start s...], "sfx": [{"t": s, "kind": "...", "gain": 1}], "music": {...}}

Everything here is synthesised from scratch (numpy), so the music and effects are original and free to use. The voice is
Kokoro (open weights, run locally) through ../audio.py. Mastered to -14 LUFS, true peak -1 dB: the loudness ad platforms
expect.
"""
import json
import subprocess
import sys
import zlib
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import audio as base  # noqa: E402  (Kokoro voice, shared with the social videos)

SR = 48000
rng = np.random.default_rng(7)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a=0.002, d=0.2, curve=4.0):
    x = np.arange(n) / SR
    e = np.minimum(1.0, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) * curve / max(d, 1e-3))
    return e




def fft_band(x, lo=20, hi=20000):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def reverb(x, secs=1.6, wet=0.25):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 4.5 / secs)
    ir = fft_band(ir, 200, 9000)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x) + n]
    out = np.zeros(len(y))
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out[: len(x) + n]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------- drums and instruments ----------
def kick(punch=1.0):
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    f = 45 + 110 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 7) * punch + rng.standard_normal(n) * np.exp(-tt * 300) * 0.15


def clap():
    n = int(0.3 * SR)
    tt = np.arange(n) / SR
    noise = fft_band(rng.standard_normal(n), 900, 7000)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        e += np.where(tt >= o, np.exp(-(tt - o) * 60), 0)
    e += np.exp(-tt * 14) * 0.6
    return noise * e * 0.5


def hat(open_=False):
    n = int((0.25 if open_ else 0.05) * SR)
    tt = np.arange(n) / SR
    return fft_band(rng.standard_normal(n), 7000, 16000) * np.exp(-tt * (12 if open_ else 90)) * 0.35


def shaker():
    n = int(0.08 * SR)
    tt = np.arange(n) / SR
    return fft_band(rng.standard_normal(n), 5000, 12000) * np.sin(np.pi * np.minimum(1, tt / 0.08)) * 0.18


def rim():
    n = int(0.06 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * tt) * 0.6 + fft_band(rng.standard_normal(n), 2000, 6000) * 0.4) * np.exp(-tt * 70) * 0.5


def logdrum(m, secs=0.5):
    # the pitched, gliding bass hit of amapiano / afrobeats, made from a sine with a fast pitch drop and some grit
    n = int(secs * SR)
    tt = np.arange(n) / SR
    f = hz(m) * (1 + 0.6 * np.exp(-tt * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.tanh(np.sin(ph) * 2.2) * np.exp(-tt * 5)
    return x * 0.55


def saw(f, tt, detune=0.0):
    out = 0
    for d in (-detune, 0, detune):
        ph = (tt * f * (1 + d)) % 1.0
        out = out + (2 * ph - 1)
    return out / 3


def pad_chord(ms, secs, bright=1500):
    tt = t_(secs)
    x = sum(saw(hz(m), tt, 0.004) for m in ms) / len(ms)
    x = fft_band(x, 60, bright)
    a = int(0.25 * SR)
    e = np.ones(len(tt))
    e[:a] = np.linspace(0, 1, a)
    e[-a:] = np.linspace(1, 0, a)
    return x * e


def pluck(m, secs=0.35, bright=4000):
    tt = t_(secs)
    x = saw(hz(m), tt, 0.002) * 0.5 + np.sin(2 * np.pi * hz(m) * tt) * 0.5
    return fft_band(x, 100, bright) * np.exp(-tt * 9)


def sub_bass(m, secs):
    tt = t_(secs)
    x = np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(4 * np.pi * hz(m) * tt)
    e = np.minimum(1, tt / 0.01) * np.minimum(1, (secs - tt) / 0.03)
    return x * e * 0.5


def place(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    j = min(len(buf), i + len(x))
    buf[max(0, i):j] += x[max(0, -i): j - i] * gain


# ---------- music ----------
def music_cinematic(total, drop, hit, seed):
    """Ad 1: a tense pulse that builds, a riser, a drop into a driving beat with pumping chords, a final impact."""
    bpm = 100
    beat = 60 / bpm
    buf = np.zeros(int((total + 3) * SR))
    side = np.ones(len(buf))  # sidechain pump after the drop
    root = 45 + (seed % 3) * 2  # A2, B2 or C#3 territory
    prog = [0, -4, 3, -2]  # i - VI - III - VII: epic but hopeful
    # pre-drop: low pulsing eighths, ticking hats, a dark pad
    t = 0.0
    bar = 4 * beat
    k = 0
    while t < drop - 0.01:
        ch = prog[(k // 2) % 4]
        for e in range(8):
            tt = t + e * beat / 2
            if tt >= drop:
                break
            place(buf, sub_bass(root + ch - 12, beat / 2 * 0.9) * (0.5 + 0.5 * tt / max(drop, 1)), tt, 0.7)
            place(buf, hat(), tt, 0.35 if e % 2 else 0.2)
        k += 1
        t += bar / 2
    pre = pad_chord([root + 12, root + 15, root + 19], drop + 0.5, 900)
    place(buf, pre, 0, 0.35)
    # riser into the drop
    rise = 2.2
    n = int(rise * SR)
    tt = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sweep = np.zeros(n)
    seg = n // 24
    for s in range(24):  # stepped band-pass sweep upward
        lo = 300 + s * 350
        a, b = s * seg, min(n, (s + 1) * seg)
        sweep[a:b] = fft_band(noise[a:b], lo, lo + 2500)
    place(buf, sweep * (tt / rise) ** 2 * 0.5, drop - rise)
    # drop: impact + groove
    place(buf, kick(1.4), drop, 1.0)
    place(buf, reverb(fft_band(rng.standard_normal(int(0.6 * SR)), 60, 3000) * env(int(0.6 * SR), 0.001, 0.4), 2.0, 0.6), drop, 0.4)
    t = drop
    k = 0
    end = hit
    while t < end - 0.01:
        ch = prog[k % 4]
        place(buf, pad_chord([root + ch + 12, root + ch + 16 - (1 if ch in (0, 3) else 0), root + ch + 19, root + ch + 24], bar, 2600), t, 0.32)
        for b in range(4):
            tb = t + b * beat
            if tb >= end:
                break
            place(buf, kick(), tb, 0.95 if b in (0, 2) else 0.0)
            if b in (1, 3):
                place(buf, clap(), tb, 0.8)
            # pump
            i = int(tb * SR)
            m = int(beat * 0.6 * SR)
            if i + m < len(side):
                side[i:i + m] = np.minimum(side[i:i + m], 0.35 + 0.65 * np.linspace(0, 1, m) ** 0.7)
            for s16 in range(4):
                place(buf, hat(s16 == 2), tb + s16 * beat / 4, 0.4 if s16 % 2 else 0.25)
            for e in range(2):
                place(buf, sub_bass(root + ch - 12, beat / 2 * 0.85), tb + e * beat / 2, 0.75)
        k += 1
        t += bar
    buf *= side
    # final impact and a held chord under the end card
    place(buf, kick(1.6), hit, 1.1)
    place(buf, reverb(clap(), 2.5, 0.7), hit, 0.7)
    # the end card keeps a full sound under it: a held major chord, its bass, a light beat and a rising arpeggio,
    # fading only in the last moments (a near-silent end card loses people before the address)
    tail = total - hit + 2
    place(buf, pad_chord([root + 12, root + 16, root + 19, root + 24], tail, 3000), hit, 1.1)
    place(buf, sub_bass(root, tail), hit, 0.55)
    t = hit
    while t < total:
        place(buf, hat(), t, 0.3)
        place(buf, hat(), t + beat / 2, 0.18)
        if int(round((t - hit) / beat)) % 4 == 0:
            place(buf, kick(0.8), t, 0.6)
        t += beat
    for i, m in enumerate([root + 24, root + 28, root + 31, root + 36, root + 40]):
        place(buf, reverb(pluck(m, 0.6), 2.0, 0.5), hit + 0.4 + i * beat / 2, 0.5)
    out = buf[: int(total * SR)]
    f = int(0.8 * SR)
    out[-f:] *= np.linspace(1, 0, f) ** 1.5
    return out


def music_afro(total, seed, breaks=()):
    """Ad 2: bright afrobeats / amapiano groove: log-drum bass, shaker 16ths, rim pattern, warm plucked chords."""
    bpm = 110
    beat = 60 / bpm
    bar = 4 * beat
    buf = np.zeros(int((total + 3) * SR))
    root = 50 + (seed % 3)  # D3-ish
    prog = [(0, [0, 4, 7, 11]), (9, [0, 3, 7, 10]), (5, [0, 4, 7, 11]), (7, [0, 4, 7, 9])]
    kick_pat = [0, 1.5, 2.5]  # in beats
    rim_pat = [0.75, 1.75, 2.25, 3.5]
    log_pat = [(0, 0), (1.5, 0), (2.75, 7), (3.5, 5)]
    t = 0.0
    k = 0
    while t < total + bar:
        off, ch = prog[k % 4]
        quiet = any(a <= t < b for a, b in breaks)
        place(buf, pad_chord([root + off + c for c in ch], bar, 3200), t, 0.16)
        for b in kick_pat:
            place(buf, kick(), t + b * beat, 0.0 if quiet else 0.85)
        for b in rim_pat:
            place(buf, rim(), t + b * beat, 0.45)
        for s in range(16):
            place(buf, shaker(), t + s * beat / 4, 0.9 if s % 2 else 0.5)
        if not quiet:
            for b, step in log_pat:
                place(buf, logdrum(root + off - 12 + step, 0.45), t + b * beat, 0.9)
        # a plucked hook on the chord tones
        for i, b in enumerate([0, 0.5, 1.5, 2, 3]):
            m = root + off + 12 + ch[[0, 2, 1, 3, 2][i]]
            place(buf, pluck(m, 0.3, 5000), t + b * beat, 0.24)
        k += 1
        t += bar
    # ending: a last downbeat and a ring-out
    end = total - 2.2
    buf[int(end * SR):] *= np.linspace(1, 0.25, len(buf) - int(end * SR))
    return buf[: int(total * SR)]


# ---------- sound effects ----------
def sfx(kind):
    if kind == "whoosh":
        n = int(0.55 * SR)
        tt = np.arange(n) / SR
        x = np.zeros(n)
        seg = n // 12
        noise = rng.standard_normal(n)
        for s in range(12):
            lo = 400 + 500 * np.sin(np.pi * s / 11) * 4
            x[s * seg:(s + 1) * seg] = fft_band(noise[s * seg:(s + 1) * seg], lo, lo + 1800)
        return x * np.sin(np.pi * tt / (n / SR)) ** 2 * 0.45
    if kind == "tick":
        n = int(0.04 * SR)
        tt = np.arange(n) / SR
        return np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 160) * 0.35
    if kind == "ping":  # notification
        out = np.zeros(int(0.5 * SR))
        for i, f in enumerate((1318.5, 1760.0)):
            tt = t_(0.35)
            place(out, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 10) * 0.3, i * 0.09)
        return out
    if kind == "success":
        out = np.zeros(int(0.8 * SR))
        for i, f in enumerate((783.99, 1046.5, 1318.5)):
            tt = t_(0.5)
            place(out, (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 7) * 0.22, i * 0.07)
        return reverb(out, 1.0, 0.3)
    if kind == "buzz":  # error
        tt = t_(0.42)
        x = np.sign(np.sin(2 * np.pi * 98 * tt)) * 0.5 + np.sign(np.sin(2 * np.pi * 103 * tt)) * 0.5
        x = fft_band(x, 80, 2500)
        return x * np.minimum(1, (0.42 - tt) / 0.05) * np.minimum(1, tt / 0.005) * 0.32
    if kind == "hit":
        x = kick(1.5)
        return reverb(x + fft_band(rng.standard_normal(len(x)), 50, 2000) * env(len(x), 0.001, 0.3) * 0.3, 1.8, 0.4) * 0.8
    if kind == "type":  # a burst of keystrokes, about a second
        out = np.zeros(int(1.1 * SR))
        t = 0.0
        while t < 1.0:
            n = int(0.03 * SR)
            tt = np.arange(n) / SR
            place(out, fft_band(rng.standard_normal(n), 1500, 6000) * np.exp(-tt * 180) * rng.uniform(0.15, 0.3), t)
            t += rng.uniform(0.06, 0.13)
        return out
    if kind == "pop":
        tt = t_(0.12)
        f = 300 + 900 * np.exp(-tt * 40)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 30) * 0.4
    if kind == "riser":
        n = int(1.2 * SR)
        tt = np.arange(n) / SR
        noise = rng.standard_normal(n)
        x = np.zeros(n)
        seg = n // 12
        for s in range(12):
            lo = 500 + s * 600
            x[s * seg:(s + 1) * seg] = fft_band(noise[s * seg:(s + 1) * seg], lo, lo + 2000)
        return x * (tt / 1.2) ** 2 * 0.35
    raise SystemExit(f"unknown sfx {kind}")


def mix(spec, work, silent, out, cues):
    import soundfile as sf

    total = float(cues["total"])
    n = int(total * SR) + 1
    # voice: kokoro speaks at 24k; resample by ffmpeg into one track at the beat starts
    vo24 = np.zeros(int(total * base.SR) + 1, dtype=np.float32)
    lead = float(spec.get("lead", 0.15))
    for i, st in enumerate(cues["starts"]):
        p = work / f"vo_{i}.wav"
        if not p.exists():
            continue
        a, _ = sf.read(p, dtype="float32")
        ts = int((st + lead) * base.SR)
        m = min(len(a), len(vo24) - ts)
        if m > 0:
            vo24[ts:ts + m] += a[:m]
    sf.write(work / "vo.wav", vo24, base.SR)

    mus = cues["music"]
    seed = zlib.crc32(Path(out).name.encode()) % 1000
    if mus["style"] == "cinematic":
        m = music_cinematic(total, mus["drop"], mus["hit"], seed)
    else:
        m = music_afro(total, seed, [tuple(b) for b in mus.get("breaks", [])])
    m = m / (np.max(np.abs(m)) + 1e-9) * 0.9
    sf.write(work / "music.wav", m.astype(np.float32), SR)

    fx = np.zeros(n)
    for c in cues.get("sfx", []):
        place(fx, sfx(c["kind"]), float(c["t"]), float(c.get("gain", 1.0)))
    sf.write(work / "sfx.wav", (fx / max(1.0, np.max(np.abs(fx)) / 0.9)).astype(np.float32), SR)

    mv = float(spec.get("musicVolume", 0.32))
    graph = (
        "[0:a]aresample=48000,highpass=f=90,acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=4,"
        "equalizer=f=3200:t=q:w=1.2:g=2,aformat=channel_layouts=stereo,asplit=2[vo][sc];"
        f"[1:a]aformat=channel_layouts=stereo,volume={mv}[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=350[md];"
        "[2:a]aformat=channel_layouts=stereo,volume=0.55[fx];"
        "[vo][md][fx]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.95[a]"
    )
    raw = work / "mix.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(work / "vo.wav"), "-i", str(work / "music.wav"), "-i", str(work / "sfx.wav"),
                    "-filter_complex", graph, "-map", "[a]", "-t", f"{total:.3f}", str(raw)], check=True)
    target = "I=-14:TP=-1:LRA=9"
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    j = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    norm = (f"loudnorm={target}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
            f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(raw), "-af", norm,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-shortest", "-movflags", "+faststart", str(out)], check=True)
    return {"voice": True, "music": mus["style"], "sfx": len(cues.get("sfx", []))}


if __name__ == "__main__":
    cmd = sys.argv[1]
    spec = json.loads(Path(sys.argv[2]).read_text())
    work = Path(sys.argv[3])
    work.mkdir(parents=True, exist_ok=True)
    if cmd == "voice":
        # audio.voice reads spec["scenes"]; the ad spec calls them beats
        print(json.dumps({"durs": base.voice({**spec, "scenes": spec["beats"]}, work)}))
    elif cmd == "mix":
        print(json.dumps(mix(spec, work, sys.argv[4], sys.argv[5], json.loads(Path(sys.argv[6]).read_text()))))
    else:
        raise SystemExit("usage: adaudio.py voice|mix …")

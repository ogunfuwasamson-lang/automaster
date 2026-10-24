# zips extension/ into public/automaster-runner.zip (served from settings). run after changing the extension.
import zipfile, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / "extension"
out = root / "public" / "automaster-runner.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(src.iterdir()):
        if f.is_file():
            z.write(f, f"automaster-runner/{f.name}")
print(out, out.stat().st_size, "bytes")

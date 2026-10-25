# zips extension/ into public/ivyward-runner.zip (served from settings). run after changing the extension.
# the source in extension/src and the build leftovers stay out; icons/ goes in.
import zipfile, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = root / "extension"
SKIP_DIRS = {"src"}
SKIP_FILES = {"icon.png"}

def files():
    for f in sorted(src.rglob("*")):
        rel = f.relative_to(src)
        if f.is_file() and rel.parts[0] not in SKIP_DIRS and f.name not in SKIP_FILES:
            yield f, rel

# for people loading it unpacked: everything inside an ivyward-runner/ folder
out = root / "public" / "ivyward-runner.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f, rel in files():
        z.write(f, f"ivyward-runner/{rel.as_posix()}")
print(out, out.stat().st_size, "bytes")

# for the chrome web store: manifest.json at the root of the zip. pass a path to write it.
if len(sys.argv) > 1:
    store = pathlib.Path(sys.argv[1])
    with zipfile.ZipFile(store, "w", zipfile.ZIP_DEFLATED) as z:
        for f, rel in files():
            z.write(f, rel.as_posix())
    print(store, store.stat().st_size, "bytes")

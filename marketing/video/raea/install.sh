#!/usr/bin/env bash
# Install raea (the video renderer the social videos use) from its GitHub release, checksum-verified.
# Idempotent: does nothing when the pinned version is already installed. Linux x86_64 and macOS arm64.
# raea.io/install does the same, but some networks only reach github.com, so this goes there directly.
set -euo pipefail
VERSION="${RAEA_VERSION:-0.1.1-rc4}"
if command -v raea >/dev/null 2>&1 && [ "$(raea --version 2>/dev/null)" = "$VERSION" ]; then
  echo "raea $VERSION already installed"; exit 0
fi
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) TARGET=linux-x86_64 ;;
  Darwin-arm64) TARGET=macos-arm64 ;;
  *) echo "raea: no build for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac
NAME="raea-${VERSION}-${TARGET}.tar.gz"
URL="https://github.com/shinyobjectz/raea/releases/download/v${VERSION}/${NAME}"
DL="$(mktemp -d)"
trap 'rm -rf "$DL"' EXIT
curl -fsSL -o "$DL/$NAME" "$URL"
curl -fsSL -o "$DL/$NAME.sha256" "$URL.sha256"
( cd "$DL" && echo "$(cut -d' ' -f1 "$NAME.sha256")  $NAME" | sha256sum -c - )
mkdir -p "$DL/x" "$HOME/.raea" "$HOME/.local/bin"
tar -xzf "$DL/$NAME" -C "$DL/x"
rm -rf "$HOME/.raea/bin" "$HOME/.raea/share"
cp -r "$DL/x/raea/bin" "$DL/x/raea/share" "$HOME/.raea/"
ln -sf "$HOME/.raea/bin/raea" "$HOME/.local/bin/raea"
echo "raea $("$HOME/.raea/bin/raea" --version) installed; add ~/.local/bin to PATH"

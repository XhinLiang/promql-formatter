#!/bin/bash
# Build a clean, store-ready ZIP containing only the files the extension needs
# at runtime. Files sit at the archive root (Chrome Web Store requirement).
#
# Everything that ships lives under src/, so the package is "the contents of
# src/ plus LICENSE".
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# 1. (re)build the WebAssembly artifact into src/
echo "==> Building extension"
bash scripts/build-wasm.sh >/dev/null

# 2. read the version from src/manifest.json
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' src/manifest.json | head -1)"
if [ -z "$VERSION" ]; then echo "could not read version from src/manifest.json" >&2; exit 1; fi

OUT="dist"
STAGE="$OUT/_pkg"
PKG="$OUT/promql-formatter-v${VERSION}.zip"

rm -rf "$STAGE" "$PKG"
mkdir -p "$STAGE"

# 3. stage the runtime payload: all of src/ + the license
cp -R src/. "$STAGE/"
cp LICENSE "$STAGE/"

# sanity: required runtime files must be present
for f in manifest.json popup.html popup.js wasm_exec.js promqlparser.wasm icons/icon128.png; do
  [ -e "$STAGE/$f" ] || { echo "missing required file: $f" >&2; exit 1; }
done

# 4. zip from inside the stage dir so files sit at the archive root
(cd "$STAGE" && zip -rqX "$ROOT/$PKG" .)
rm -rf "$STAGE"

echo "==> Packaged: $PKG"
unzip -l "$PKG"

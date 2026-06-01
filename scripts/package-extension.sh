#!/bin/bash
# Build a clean, store-ready ZIP containing only the files the extension needs
# at runtime. The ZIP has all files at its root (Chrome Web Store requirement).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# 1. (re)build the WebAssembly artifact
echo "==> Building promqlparser.wasm"
bash build.sh >/dev/null

# 2. read the version from manifest.json
VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -1)"
if [ -z "$VERSION" ]; then echo "could not read version from manifest.json" >&2; exit 1; fi

OUT="dist"
STAGE="$OUT/_pkg"
PKG="$OUT/promql-formatter-v${VERSION}.zip"

rm -rf "$STAGE" "$PKG"
mkdir -p "$STAGE/images"

# 3. the ONLY files that ship to the store
RUNTIME_FILES=(manifest.json popup.html popup.js wasm_exec.js promqlparser.wasm LICENSE)
for f in "${RUNTIME_FILES[@]}"; do
  [ -f "$f" ] || { echo "missing required file: $f" >&2; exit 1; }
  cp "$f" "$STAGE/"
done
cp images/icon16.png images/icon48.png images/icon128.png "$STAGE/images/"

# 4. zip from inside the stage dir so files sit at the archive root
( cd "$STAGE" && zip -rqX "$ROOT/$PKG" . )
rm -rf "$STAGE"

echo "==> Packaged: $PKG"
unzip -l "$PKG"

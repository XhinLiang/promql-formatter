#!/bin/bash
# Build the WebAssembly module from wasm/ into the extension source dir (src/),
# and refresh the Go runtime glue (wasm_exec.js) so it always matches the Go
# toolchain that produced the .wasm.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "==> Building src/promqlparser.wasm (GOOS=js GOARCH=wasm)"
(cd wasm && GOOS=js GOARCH=wasm go build -o "$ROOT/src/promqlparser.wasm" .)

# Keep src/wasm_exec.js in sync with the active Go toolchain. The file moved
# from misc/wasm/ to lib/wasm/ in Go 1.21+, so probe both locations.
GO_WASM_EXEC="$(go env GOROOT)/lib/wasm/wasm_exec.js"
[ -f "$GO_WASM_EXEC" ] || GO_WASM_EXEC="$(go env GOROOT)/misc/wasm/wasm_exec.js"
if [ -f "$GO_WASM_EXEC" ]; then
  cp "$GO_WASM_EXEC" src/wasm_exec.js
  echo "==> Synced src/wasm_exec.js from $GO_WASM_EXEC"
else
  echo "warning: wasm_exec.js not found in GOROOT; keeping existing src/wasm_exec.js" >&2
fi

echo "==> Done"

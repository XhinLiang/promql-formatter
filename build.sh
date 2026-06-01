#!/bin/bash
set -e

# Build the WebAssembly component from the wasm/ module, which depends on
# github.com/xhinliang/promql-formatter-cli for the formatting logic.
cd "$(dirname "$0")/wasm"

echo "Building WASM (GOOS=js GOARCH=wasm)..."
GOOS=js GOARCH=wasm go build -o ../promqlparser.wasm .

echo "Compilation complete: promqlparser.wasm (written to project root)"

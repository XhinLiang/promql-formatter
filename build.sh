#!/bin/bash
set -e

# Enter the custom-promql-parser directory
cd "$(dirname "$0")/custom-promql-parser"

echo "Initializing Go module..."
go mod tidy

echo "Setting up WASM compilation environment..."
GOOS=js GOARCH=wasm go build -o ../promqlparser.wasm .

echo "Compilation complete: promqlparser.wasm"
echo "File has been output to the project root directory" 
#!/bin/bash
set -e

# 进入 custom-promql-parser 目录
cd "$(dirname "$0")/custom-promql-parser"

echo "正在初始化 Go 模块..."
go mod tidy

echo "设置 WASM 编译环境..."
GOOS=js GOARCH=wasm go build -o ../promqlparser.wasm .

echo "编译完成：promqlparser.wasm"
echo "文件已输出到项目根目录" 
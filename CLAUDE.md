# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension that formats PromQL queries to improve readability. The core formatting logic is implemented in Go and compiled to WebAssembly for browser execution. The extension automatically detects PromQL input fields in Prometheus UI and Grafana, providing instant formatting capabilities.

## Architecture

### Core Components

1. **Go Formatter (`custom-promql-parser/`)** - The core PromQL formatting engine
   - Uses official Prometheus parser library for AST-based formatting
   - Compiles to WebAssembly for browser execution
   - Handles Grafana variable syntax (`$variable`, `$__variable`)
   - Fixes non-standard offset positioning from Grafana queries

2. **Chrome Extension** - Browser integration layer
   - Content scripts for automatic field detection
   - Popup interface for manual formatting
   - Background scripts for extension lifecycle

3. **WebAssembly Bridge** - Go-to-JavaScript interface
   - Exposes `parsepromql()` function to JavaScript
   - Handles error reporting and success responses

### Key Go Architecture

The Go formatter uses a modern AST-based approach:

- **FormatterVisitor**: Implements visitor pattern for AST traversal
- **VariableManager**: Handles Grafana variable substitution/restoration  
- **FormatOptions**: Configuration for indentation and formatting preferences
- **fixOffsetPosition()**: Preprocesses queries to fix Grafana's non-standard offset syntax

The formatter supports complex PromQL expressions including:
- Binary expressions with proper operator precedence
- Aggregate functions with by/without clauses
- Function calls with multiple arguments
- Parenthesized expressions with proper indentation
- Vector matching clauses (on/ignoring)

## Development Commands

### Building
```bash
# Build WebAssembly component
npm run build
# OR
bash build.sh
```

### Testing Go Code
```bash
cd custom-promql-parser
go test -v                    # Run all tests
go test -v -run TestName      # Run specific test
go test -bench=.              # Run benchmarks
```

### Linting
```bash
npm run lint                  # Check JavaScript code
npm run lint:fix              # Auto-fix JavaScript issues
```

### Chrome Extension Development
```bash
npm install                   # Install dependencies
npm run build                 # Build WASM component
# Then load unpacked extension in Chrome's developer mode
```

## Working with the Formatter

### Testing Changes
The Go formatter has comprehensive tests in `formatter_test.go`. When modifying formatting logic:

1. Run tests to ensure compatibility: `go test -v`
2. Test with complex queries that include variables and offset positioning
3. Verify WebAssembly compilation: `npm run build`

### Key Functions
- `formatPromql()`: Main entry point for formatting
- `fixOffsetPosition()`: Critical preprocessing for Grafana compatibility
- `FormatterVisitor.formatExprAST()`: Core AST-based formatting logic

### Variable Handling
The formatter must handle Grafana template variables (`$var`, `$__interval`) by:
1. Replacing with placeholders before parsing
2. Formatting the AST
3. Restoring original variables in output

This is essential because Prometheus parser cannot handle Grafana's variable syntax.

## Build Requirements

- Go 1.23.9+
- Node.js (for npm scripts and linting)
- Chrome browser (for testing extension)

The build process compiles Go code to WebAssembly using `GOOS=js GOARCH=wasm`, producing `promqlparser.wasm` that's loaded by the extension.
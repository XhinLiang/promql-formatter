# Contributing

Thanks for helping improve the **promql-formatter** Chrome extension!

## Where code lives

- **Formatting logic** (how a query is prettified) lives in
  [promql-formatter-cli](https://github.com/XhinLiang/promql-formatter-cli).
  Bug in the *output*? Fix it there.
- **This repo** is the extension shell: the popup UI (`popup.html`, `popup.js`),
  the WASM entry point (`wasm/main.go`), and the build script.

## Development

```sh
git clone https://github.com/XhinLiang/promql-formatter.git
cd promql-formatter
npm install
npm run build        # GOOS=js GOARCH=wasm build -> promqlparser.wasm
```

Load the unpacked extension from `chrome://extensions/` (Developer mode → Load
unpacked) and reload it after each `npm run build`.

To bump the formatting engine, update the dependency in `wasm/`:

```sh
cd wasm
go get github.com/xhinliang/promql-formatter-cli@latest
go mod tidy
```

## Pull requests

1. Fork and create a feature branch.
2. Keep changes scoped to the extension shell.
3. Confirm `npm run build` succeeds and the popup still formats a query.
4. Open the PR with a clear description.

## Reporting bugs

Open an issue with the input query, the selected backend (`vic` / `main`), the
actual output, and what you expected.

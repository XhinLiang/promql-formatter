<p align="center">
  <img src="assets/logo.svg" width="120" alt="promql-formatter logo">
</p>

<h1 align="center">promql-formatter</h1>

<p align="center">
  <b>Prettify PromQL right in your browser.</b><br>
  A Chrome extension that formats PromQL queries locally — no servers, no data sent.
</p>

<p align="center">
  <a href="https://github.com/XhinLiang/promql-formatter/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/XhinLiang/promql-formatter/ci.yml?branch=master&label=CI&logo=github" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/XhinLiang/promql-formatter?color=blue" alt="License"></a>
  <img src="https://img.shields.io/badge/Go-%2300ADD8.svg?logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/WebAssembly-%23654FF0.svg?logo=webassembly&logoColor=white" alt="WebAssembly">
  <img src="https://img.shields.io/badge/Chrome-Extension-%234285F4.svg?logo=googlechrome&logoColor=white" alt="Chrome Extension">
</p>

---

## ✨ Features

- 🧹 **Format PromQL** directly from the toolbar popup — paste, click, copy.
- 🔒 **100% local** — everything runs in your browser via WebAssembly. No query ever leaves your machine.
- 🔀 **Two backends** — VictoriaMetrics (`vic`, default) and a custom Prometheus-AST formatter (`main`), selectable in the popup.
- 🪶 No build server, no telemetry, no account.

## 🎬 Example

Turn a dense one-liner:

```promql
sum(rate(http_requests_total[1m]))by(job) / sum(rate(http_requests_total[1m] offset 1d))by(job) > 1.5
```

…into something readable:

```promql
(
  sum(rate(http_requests_total[1m])) by(job)
    /
  sum(rate(http_requests_total[1m] offset 1d)) by(job)
)
  >
1.5
```

## 📦 Install (developer mode)

```sh
git clone https://github.com/XhinLiang/promql-formatter.git
cd promql-formatter
npm install
npm run build        # builds promqlparser.wasm from wasm/
```

Then:

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the project folder.
4. Click the extension icon, paste a query, hit **Format**.

## 🔧 How it works

The formatting engine is **not** bundled in this repo — it lives in
[**promql-formatter-cli**](https://github.com/XhinLiang/promql-formatter-cli) and is
shared with the standalone CLI. This extension is a thin shell:

```
wasm/main.go (//go:build js,wasm)  ──imports──▶  github.com/xhinliang/promql-formatter-cli
        │
        └── compiled to promqlparser.wasm, called from the popup's JavaScript
```

`build.sh` compiles `wasm/` with `GOOS=js GOARCH=wasm` into `promqlparser.wasm`.

### Backends

| Backend | Engine |
|---------|--------|
| **`vic`** _(default)_ | [VictoriaMetrics `metricsql.Prettify`](https://github.com/VictoriaMetrics/metricsql) |
| **`main`** | [Prometheus](https://github.com/prometheus/prometheus) parser + custom AST formatter with Grafana `$variable` support |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the WebAssembly component |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |

## 🔒 Privacy

This extension does not collect or transmit any data. All query processing happens
locally in your browser.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Formatting logic changes belong in
[promql-formatter-cli](https://github.com/XhinLiang/promql-formatter-cli); this repo
holds the extension shell.

## 📄 License

[Apache-2.0](LICENSE).

## 🙏 Acknowledgements

Thanks to [o11y.tools](https://o11y.tools/) for the original Prometheus-based PromQL
prettifier, and to VictoriaMetrics for [`metricsql`](https://github.com/VictoriaMetrics/metricsql).

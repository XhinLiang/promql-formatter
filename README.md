# PromQL Formatter Chrome Extension

A Chrome extension that helps you format PromQL queries to make them more readable. Based on the official Prometheus parser library compiled to WebAssembly via [o11y.tools](https://o11y.tools/).

## Features

- Format PromQL queries directly in your browser
- No server required, all processing happens locally
- Automatically detects query input fields in Prometheus UI and Grafana
- Manually format queries through the extension popup

## Usage

### Automatic Detection and Formatting

1. Visit a page with PromQL query input fields (like Prometheus UI or Grafana)
2. The extension automatically detects query fields and adds a "Format PromQL" button next to them
3. After entering a PromQL query, click the button to format it

### Manual Formatting with Extension Popup

1. Click the extension icon in the toolbar to open the popup
2. Enter your PromQL query in the text box
3. Click the "Format" button
4. Copy the formatted query using the "Copy Result" button

## Installation

### Manual Installation (Developer Mode)

1. Clone this repository:
   ```
   git clone https://github.com/xhinliang/promql-formatter.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Build the WebAssembly component:
   ```
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top-right corner
6. Click "Load unpacked" and select the project folder

## Development

This project uses a Go-based PromQL parser compiled to WebAssembly for the formatting functionality.

### Project Structure

- `custom-promql-parser/` - Go code for the PromQL parser
- `images/` - Extension icons
- `*.js` files - Chrome extension JavaScript code
- `*.html` files - Extension UI
- `build.sh` - Script to build the WebAssembly component

### Available Scripts

- `npm run build` - Build the WebAssembly component
- `npm run lint` - Run ESLint to check for code issues
- `npm run lint:fix` - Automatically fix ESLint issues

## Privacy Statement

This extension does not collect or send any data to external servers. All query processing is done locally in your browser.

## License

This extension is licensed under the Apache 2.0 License.

## Acknowledgements

Special thanks to [o11y.tools](https://o11y.tools/) for providing the PromQL parser that uses the official Prometheus library compiled to WebAssembly.

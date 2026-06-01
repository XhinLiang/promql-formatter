# Publishing to the Chrome Web Store

This guide takes **promql-formatter** from source to a published Chrome Web Store
listing, then wires up tag-based auto-publishing for future versions.

There are three phases:

1. [One-time account setup](#1-one-time-account-setup) — _you, in a browser ($5)._
2. [First submission (manual)](#2-first-submission-manual) — _you, in the dashboard._
3. [Auto-publish for future versions](#3-auto-publish-for-future-versions) — _one-time setup, then `git tag`._

Everything that can be prepared from the repo already is: a clean store ZIP, the
listing copy, and the screenshots.

---

## 1. One-time account setup

1. Go to the **[Chrome Web Store Developer Dashboard](https://chromewebstore.google.com/devconsole)** and sign in with the Google account you want to own the listing.
2. Pay the **one-time US$5** developer registration fee.
3. Accept the developer agreement. (You may also need to verify a contact email.)

> This is the only paid step, and it can't be automated — it's tied to your Google
> account and a payment.

---

## 2. First submission (manual)

The very first upload must be done in the dashboard: it creates the item, assigns
the **Extension ID**, and goes through the initial review. After that, updates can
be automated (phase 3).

### 2.1 Build the package

```sh
bash scripts/package-extension.sh
# -> dist/promql-formatter-v1.0.0.zip   (only the runtime files, manifest at root)
```

(Or download the `chrome-extension` artifact from the **Publish to Chrome Web
Store** GitHub Actions run.)

### 2.2 Create the item

1. Dashboard → **Items** → **+ New item**.
2. Upload `dist/promql-formatter-v1.0.0.zip`.
3. Fill in the **store listing** using the copy below.
4. Fill in **Privacy practices** (section 2.4).
5. Click **Submit for review**.
6. After it's approved/published, open the item — the URL contains the
   **Extension ID** (`https://chromewebstore.google.com/detail/<name>/<EXTENSION_ID>`).
   Save it for phase 3.

### 2.3 Store listing copy (ready to paste)

| Field                    | Value                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Name**                 | `PromQL Formatter`                                                                                                      |
| **Summary** (≤132 chars) | `Prettify PromQL queries locally in your browser — VictoriaMetrics & Prometheus backends, no data leaves your machine.` |
| **Category**             | `Developer Tools`                                                                                                       |
| **Language**             | `English`                                                                                                               |

**Description** (paste as-is):

```
PromQL Formatter prettifies dense, hard-to-read PromQL queries into a clean,
multi-line form — right from your browser toolbar. No servers, no sign-in, and
nothing ever leaves your machine.

Features
• One-click formatting from the toolbar popup — paste, click Format, copy.
• Two formatting backends:
   – VictoriaMetrics (metricsql) — the default, MetricsQL-aware prettifier.
   – Prometheus — a parser-based formatter with Grafana $variable support.
• 100% local: all processing runs in your browser via WebAssembly.
• No data collection, no telemetry, no accounts.
• Free and open source (Apache-2.0).

How it works
The formatting engine is compiled from Go to WebAssembly and runs entirely inside
the extension. The same engine is available as a standalone CLI and Go library:
https://github.com/xhinliang/promql-formatter-cli

Source code: https://github.com/XhinLiang/promql-formatter
```

**Screenshots** (1280×800, already generated):

- `assets/store/screenshot-1.png`
- `assets/store/screenshot-2.png`

**Store icon:** `src/icons/icon128.png` (128×128).

**Optional — Social/promo:** `assets/social-preview.png` works as a small promo
tile source if you want one.

### 2.4 Privacy practices

| Prompt                         | Answer                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| **Single purpose**             | `Format (prettify) PromQL queries locally in the browser.`                           |
| **Permission: `storage`**      | `Stores the user's selected formatter backend so it is remembered between sessions.` |
| **Host permissions**           | None requested.                                                                      |
| **Are you using remote code?** | **No** — all code (including the WebAssembly module) ships inside the package.       |
| **Data collection**            | Declare **no** data collected/used/sold. The extension does not transmit anything.   |

A privacy policy URL is generally **not required** when you declare no data
collection. If the form asks for one, you can point to the README's Privacy
section: `https://github.com/XhinLiang/promql-formatter#-privacy`.

---

## 3. Auto-publish for future versions

Once the item exists, the [`publish.yml`](../.github/workflows/publish.yml)
workflow can upload and publish new versions whenever you push a `v*` tag.

### 3.1 Get Google API credentials (one-time)

1. In the **[Google Cloud Console](https://console.cloud.google.com/)**, create (or pick) a project.
2. **APIs & Services → Library →** enable the **Chrome Web Store API**.
3. **APIs & Services → OAuth consent screen:** configure it (User type _External_ is
   fine), and add your own Google account as a **Test user**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID →**
   application type **Desktop app**. Note the **Client ID** and **Client secret**.
5. Get a **refresh token**. Easiest way (interactive, opens a browser):

   ```sh
   npx chrome-webstore-upload-keys
   ```

   Paste the client id/secret when prompted, approve in the browser, and it prints
   a `refreshToken`. (Manual alternative: the OAuth 2.0 flow with scope
   `https://www.googleapis.com/auth/chromewebstore`.)

### 3.2 Add GitHub repository secrets

**Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret              | Value                           |
| ------------------- | ------------------------------- |
| `CWS_EXTENSION_ID`  | the Extension ID from step 2.2  |
| `CWS_CLIENT_ID`     | OAuth client id                 |
| `CWS_CLIENT_SECRET` | OAuth client secret             |
| `CWS_REFRESH_TOKEN` | the refresh token from step 3.1 |

Until these exist, the workflow still runs on a tag — it builds the ZIP and uploads
it as an artifact, then **skips** the publish step (it won't fail).

### 3.3 Ship a new version

```sh
# bump the version (updates package.json + auto-syncs src/manifest.json), then:
npm version patch          # 1.0.0 -> 1.0.1, commits the bump
git push && git push --tags
```

The workflow builds `dist/promql-formatter-v1.0.1.zip` and publishes it to the
Chrome Web Store. (Google still re-reviews updates; publishing may be queued until
the review passes.)

---

## What ships in the package

`scripts/package-extension.sh` ships **only** the runtime payload (the contents of
`src/` plus `LICENSE`), with everything at the archive root:

```
manifest.json  popup.html  popup.js  wasm_exec.js  promqlparser.wasm
icons/icon16.png  icons/icon48.png  icons/icon128.png  LICENSE
```

Everything outside `src/` (the Go sources in `wasm/`, `scripts/`, `test/`,
`node_modules/`, `assets/`, `docs/`, config files, …) is intentionally excluded.

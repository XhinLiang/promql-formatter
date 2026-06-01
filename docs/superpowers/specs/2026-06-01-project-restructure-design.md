# PromQL Formatter — 项目结构标准化设计

- **日期**: 2026-06-01
- **状态**: 已批准（待实施）
- **范围**: 仓库结构、构建/打包脚本、dotfiles、CI、测试、文档。不改扩展功能与 WASM API。

## TL;DR

把这个 Chrome MV3 扩展从"根目录一堆松散文件"的业余形态，整理成标准 JS 项目 / Chrome 扩展结构：

- 运行时文件全部收进 `src/`（`src/` 即 `chrome://extensions` "加载已解压扩展"指向的目录）。
- 删除 6 个无用遗留文件。
- 补齐 dotfiles（Prettier / nvmrc / gitattributes / dependabot），并修复 lockfile 被误忽略的问题。
- ESLint 升级到 9 的 flat config，Prettier 独立运行。
- 加真实测试（`node:test` + `jsdom` 烟雾测试），CI 增加 lint / test job。
- 补社区/文档文件（CHANGELOG / SECURITY / CODE_OF_CONDUCT），版本号单源同步。

保持 **vanilla JS、无打包器** 的技术路线 —— 对一个 ~9KB 手写 popup、核心逻辑在 Go/WASM 的扩展，引入 bundler 或 TypeScript 属于过度工程。

## 现状与问题

真正打包进扩展的运行时文件（见 `scripts/package-extension.sh` 白名单）：
`manifest.json`、`popup.html`、`popup.js`、`wasm_exec.js`、`promqlparser.wasm`、`images/icon{16,48,128}.png`、`LICENSE`。

Go 源码在 `wasm/`（`main.go` + `go.mod/go.sum`），编译产物为 `promqlparser.wasm`。

让项目显得业余的具体问题：

1. **根目录混杂**：运行时文件、Go 源码、临时测试页、无关参考文件、配置全平铺在根，无 `src/` 划分。
2. **遗留死文件**：
   - `main.js` —— 原 promqlparser 网站 Hugo geekdoc 主题的压缩 bundle（clipboard.js / store2 / 主题切换），扩展未引用。
   - `chrome-extension.js` —— 早期 content-script 实现，已被 `popup.js` 取代，manifest 未引用。
   - `promqlparser.html` —— 原始参考网页（Hugo 生成，43KB），非扩展组成部分。
   - `test.html` / `test_formatter.html` / `test_script.js` —— 手搓临时测试页，非真正测试。
3. **`package-lock.json` 被 `.gitignore` 忽略** —— 应用/扩展应提交 lockfile 以保证可复现构建。
4. **没有真实测试**（`npm test` 缺失）。
5. **Prettier 无独立配置**（靠 `eslint-plugin-prettier` 隐式跑），也无 `format` 脚本。
6. **CI 只 build wasm，根本没跑 eslint**。
7. **没有 CHANGELOG**；`manifest.json` 与 `package.json` 的 version 要手动同步。

## 目标 / 非目标

**目标**

- 标准化目录：源/产物/脚本/测试/素材/文档/配置各归其位。
- 补齐主流开源项目应有的 dotfiles 与社区健康文件。
- CI 覆盖 lint + format check + test + wasm build。
- 引入可运行的真实测试。
- 版本号单源，发布流程不变（仍由 tag/`workflow_dispatch` 触发）。

**非目标**

- 不引入打包器（esbuild/Vite/@crxjs）。
- 不迁移 TypeScript。
- 不改扩展功能、UI、WASM 导出 API（`parsepromql` / `loadexample` 保持 DOM 耦合签名）。
- 不重写 Go 格式化逻辑（在上游 `promql-formatter-cli` 中，已被其测试覆盖）。

## 关键技术事实（影响方案）

- WASM 导出 `parsepromql(query, type)` 与 `loadexample()`，二者**与 DOM 耦合**：读 `getElementById(...).value`、写 `innerHTML`，不返回值。因此测试需在 DOM 环境（jsdom）下断言 `resultDiv` 输出，而非断言返回值。
- `popup.js` 以 `<script src="popup.js">`（非 module）加载，是经典 script 语义；测试文件用 `.mjs`（module）。flat config 需按文件分组设置 `sourceType`。
- Go 版本 `go1.24.12`，`wasm_exec.js` 位于 `$(go env GOROOT)/lib/wasm/wasm_exec.js`。

## 目标目录结构

```
promql-formatter/
├─ src/                          ← "加载已解压扩展"指向此目录
│  ├─ manifest.json               icon 路径改为 icons/…
│  ├─ popup.html                  <script src> 路径不变（同目录相对）
│  ├─ popup.js
│  ├─ wasm_exec.js                vendored；build 时从 GOROOT 刷新（已提交）
│  ├─ promqlparser.wasm           构建产物（.gitignore）
│  └─ icons/
│     ├─ icon16.png
│     ├─ icon48.png
│     └─ icon128.png
├─ wasm/                         Go 源码（不变）：main.go / go.mod / go.sum
├─ test/
│  └─ format.smoke.test.mjs      node:test + jsdom 烟雾测试
├─ scripts/
│  ├─ build-wasm.sh              编译 wasm → src/ 并刷新 src/wasm_exec.js
│  ├─ package-extension.sh       打包 src/ → dist/*.zip
│  └─ sync-version.mjs           把 package.json 版本写入 src/manifest.json
├─ assets/                       仓库/商店美术（不打包，保持现状）
├─ docs/                         chrome-web-store.md、superpowers/specs/…
├─ dist/                         构建输出 zip（.gitignore）
├─ .github/
│  ├─ workflows/ci.yml            + lint job + test job
│  ├─ workflows/publish.yml       仅内部脚本路径随之更新
│  ├─ dependabot.yml              npm + gomod + github-actions
│  ├─ ISSUE_TEMPLATE/…
│  └─ PULL_REQUEST_TEMPLATE.md
├─ .editorconfig
├─ .gitattributes                新增
├─ .gitignore                    修复：提交 lockfile；wasm 产物路径改为 src/
├─ .nvmrc                        新增：钉死 Node 版本
├─ .prettierrc.json              新增
├─ .prettierignore               新增
├─ eslint.config.js              新增（取代 .eslintrc.js）
├─ CHANGELOG.md                  新增
├─ SECURITY.md                   新增
├─ CODE_OF_CONDUCT.md            新增
├─ CONTRIBUTING.md
├─ LICENSE
├─ README.md
├─ package.json
└─ package-lock.json             现在提交
```

## 详细改动

### 1. 删除遗留文件

`git rm`：`main.js`、`chrome-extension.js`、`promqlparser.html`、`test.html`、`test_formatter.html`、`test_script.js`。历史仍可追回。

### 2. 移动运行时文件进 `src/`

- `manifest.json`、`popup.html`、`popup.js`、`wasm_exec.js` → `src/`。
- `images/icon{16,48,128}.png` → `src/icons/`。
- 更新 `src/manifest.json` 的图标路径：`images/iconNN.png` → `icons/iconNN.png`（`icons` 与 `action.default_icon` 两处）。
- `popup.html` 内 `<script src="wasm_exec.js">` / `<script src="popup.js">` 为同目录相对路径，移动后无需改。
- `popup.js` 内 `fetch('promqlparser.wasm')` 相对扩展根（= `src/`）解析，移动后无需改。

加载方式：`chrome://extensions` → 加载已解压 → 选 `src/`（前提是已 `npm run build` 生成 `src/promqlparser.wasm`）。

### 3. dotfiles

**`.gitignore` 修复**

- 移除对 `package-lock.json` 的忽略（改为提交）。
- WASM 产物忽略路径由 `promqlparser.wasm` 改为 `src/promqlparser.wasm`。
- 保留 `dist/`、`node_modules/` 等忽略。

**`.prettierrc.json`**（显式化、与 editorconfig/eslint 对齐）

```json
{
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all",
  "semi": true,
  "tabWidth": 2
}
```

**`.prettierignore`** 与 **eslint 的 ignores**：忽略 `dist/`、`node_modules/`、`**/*.wasm`、`src/wasm_exec.js`（vendored 不格式化/不 lint）、`wasm/`（Go 不归 prettier）。

**`.nvmrc`**：钉 Node LTS（建议 `20`），CI 用 `setup-node` 的 `node-version-file: .nvmrc`。

**`.gitattributes`**：

- `* text=auto eol=lf`
- `*.wasm binary`、`*.png binary`
- `src/wasm_exec.js linguist-vendored`、`*.wasm linguist-generated`（让 GitHub 语言统计更准）

**`.github/dependabot.yml`**：3 个生态，weekly：

- `npm`，目录 `/`
- `gomod`，目录 `/wasm`
- `github-actions`，目录 `/`

### 4. ESLint 9 flat config

新增 `eslint.config.js`，删除 `.eslintrc.js`。

- 依赖：`eslint@^9`、`@eslint/js`、`globals`、`eslint-config-prettier`；**移除** `eslint-plugin-prettier` 与 `prettier/prettier` 规则（现代标准：Prettier 不再作为 ESLint 规则跑，独立 `format` 脚本，由 `eslint-config-prettier` 关掉冲突规则）。
- 两个配置块：
  - **浏览器脚本块** `files: ['src/**/*.js']`：`sourceType: 'script'`，`globals` = `globals.browser` + `globals.webextensions` + 自定义 `Go/parsepromql/loadexample`（readonly）。
  - **Node 模块块** `files: ['test/**/*.mjs', 'scripts/**/*.mjs']`：`sourceType: 'module'`，`globals.node`。
- 保留原有规则意图：`prefer-const`、`no-var`、`no-unused-vars: warn`、`semi: always`、`quotes: single`、`comma-dangle: always-multiline`、`max-len: 100`（warn）。
- 末尾 `eslint-config-prettier` 关闭与 Prettier 冲突的格式规则。

草图：

```js
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        Go: 'readonly',
        parsepromql: 'readonly',
        loadexample: 'readonly',
      },
    },
    rules: { /* prefer-const, no-var, … */ },
  },
  {
    files: ['test/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
  },
  prettier,
];
```

### 5. 测试

新增 `test/format.smoke.test.mjs`，用内置 `node:test` + `node:assert` + `jsdom`（新增 devDep）：

1. 用 jsdom 建最小 DOM：`runButton`、`exampleButton`、`loadingWarning`、`promqlInput`、`resultDiv`，以及 popup 用到的输入/结果元素。
2. 把 jsdom 的 `window`/`document` 挂到 `globalThis`，加载 `src/wasm_exec.js`，`fs.readFile` 读 `src/promqlparser.wasm` 并 `WebAssembly.instantiate`，`new Go().run(instance)`。
3. 调 `globalThis.parsepromql(query, 'vic')`，断言 `resultDiv.innerHTML` 含预期的 prettified 输出（用一条已知 query 的稳定片段断言）。
4. 视情况再覆盖 `'main'` formatter 与一条非法 query 的报错路径。

测试依赖 `src/promqlparser.wasm` 存在 → CI 的 test job 先 build wasm。本地 `npm test` 前需 `npm run build`。

### 6. package.json scripts

```jsonc
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "node --test test/",
    "build:wasm": "bash scripts/build-wasm.sh",
    "build": "npm run build:wasm",
    "package": "bash scripts/package-extension.sh",
    "version": "node scripts/sync-version.mjs && git add src/manifest.json"
  }
}
```

- devDependencies：`eslint@^9`、`@eslint/js`、`globals`、`eslint-config-prettier`、`prettier`、`jsdom`；移除 `eslint-plugin-prettier`。
- **版本单源**：`package.json` 为唯一版本源。`npm version <patch|minor|major>` 触发 `version` 钩子 → `sync-version.mjs` 把版本写入 `src/manifest.json` 并 `git add`。

### 7. 脚本

**`scripts/build-wasm.sh`**（在现有基础上）：

```bash
cd "$(dirname "$0")/../wasm"
GOOS=js GOARCH=wasm go build -o ../src/promqlparser.wasm .
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" ../src/wasm_exec.js
```

**`scripts/package-extension.sh`**：

- 版本读 `src/manifest.json`。
- 先 `bash scripts/build-wasm.sh`。
- 暂存目录直接复制 `src/` 全部内容（manifest、popup.html、popup.js、wasm_exec.js、promqlparser.wasm、icons/）+ 根 `LICENSE`，从暂存根 zip 到 `dist/promql-formatter-v<version>.zip`（保持文件位于 zip 根的商店要求）。

**`scripts/sync-version.mjs`**：读 `package.json.version`，写入 `src/manifest.json.version`（保持其余字段不变、缩进一致）。

### 8. CI

**`.github/workflows/ci.yml`** 改为多 job：

- `lint`：`setup-node`（`node-version-file: .nvmrc`）→ `npm ci` → `npm run lint` → `npm run format:check`。
- `wasm-build`：`setup-go` → `GOOS=js GOARCH=wasm go vet ./...` → build（保留现状）。
- `test`：`setup-go` + `setup-node` → `npm ci` → `npm run build:wasm` → `npm test`。

**`.github/workflows/publish.yml`**：逻辑不变，仅因脚本内部路径（`src/manifest.json`、暂存 `src/`）更新而自然适配；workflow 仍调 `bash scripts/package-extension.sh`。

### 9. 文档 / 社区文件

- **`CHANGELOG.md`**：Keep a Changelog 格式，首条记录本次结构化整理与既有 1.0.0。
- **`SECURITY.md`**：上报渠道与支持版本（强调本扩展本地运行、无数据外发）。
- **`CODE_OF_CONDUCT.md`**：Contributor Covenant。
- `README.md`：更新结构说明、`npm` 脚本、加载方式（指向 `src/`）；其余装饰（badge/logo）保留。
- `docs/CHROME_WEB_STORE.md`：更新其中对 dev/test 文件的描述（那些文件已删）。

## 风险与验证

- **路径回归**（最主要风险）：manifest 图标路径、popup 资源相对路径、`fetch('promqlparser.wasm')`、打包白名单。验证：`npm run build` 后 `chrome://extensions` 加载 `src/`，手测 format（vic + main）+ copy；`npm run package` 后 `unzip -l` 确认 zip 内文件齐全且位于根。
- **jsdom 加载 Go WASM**：Go 的 `wasm_exec.js` 支持 Node/globalThis，但需正确挂 `window`/`document`/`crypto` 等全局。验证：`npm test` 通过。
- **ESLint 9 迁移**：flat config 全新写法。验证：`npm run lint` 对 `src/` 与 `test/` 无解析错误、无误报。
- **CI**：推分支后三个 job 全绿。
- **发布流程**：打 `v*` tag 后 publish workflow 能产出正确 zip artifact（无 store secret 时跳过 publish 步骤，不报错）。

## 实施顺序（粗）

1. 删遗留文件。
2. 建 `src/`，移动运行时文件，改 manifest 图标路径。
3. 改 `build-wasm.sh` / `package-extension.sh` 路径，本地 build + 加载 + 打包验证。
4. dotfiles：`.gitignore` 修复、`.prettierrc.json`、`.prettierignore`、`.nvmrc`、`.gitattributes`、`dependabot.yml`。
5. ESLint 9 flat config + package.json scripts/deps；`npm install` 提交 lockfile。
6. 写测试，本地 `npm test` 通过。
7. `sync-version.mjs` + `version` 钩子。
8. 改 CI（lint/test/wasm-build）与 publish 路径。
9. 文档/社区文件；更新 README 与 chrome-web-store 文档。
10. 整体复跑：build / lint / format:check / test / package，推分支看 CI。

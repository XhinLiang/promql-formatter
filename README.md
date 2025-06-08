# PromQL Formatter Chrome 扩展

这个 Chrome 扩展可以帮助你格式化 PromQL 查询语句，使其更易读。它基于 [o11y.tools](https://o11y.tools/) 的 PromQL 解析器，该解析器使用官方的 Prometheus 库并编译为 WebAssembly。

## 特点

- 直接在浏览器中格式化 PromQL 查询
- 无需服务器，所有处理都在本地完成
- 支持自动检测 Prometheus UI 和 Grafana 中的查询输入框
- 可以通过扩展弹出窗口手动格式化查询

## 使用方法

### 在网页中自动检测并格式化

1. 访问包含 PromQL 查询输入框的页面（如 Prometheus UI 或 Grafana）
2. 扩展会自动检测查询输入框并在其旁边添加"格式化 PromQL"按钮
3. 输入 PromQL 查询后，点击按钮进行格式化

### 使用扩展弹出窗口手动格式化

1. 点击工具栏中的扩展图标打开弹出窗口
2. 在文本框中输入需要格式化的 PromQL 查询
3. 点击"格式化"按钮
4. 格式化后的查询会显示在下方
5. 点击"复制结果"按钮可以复制格式化后的查询

## 安装方法

### 从 Chrome 网上应用店安装

1. 访问 Chrome 网上应用店（链接待添加）
2. 点击"添加到 Chrome"按钮

### 手动安装（开发者模式）

1. 下载此仓库并解压缩
2. 在 Chrome 中打开 `chrome://extensions/`
3. 打开右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择解压后的文件夹

## 隐私声明

此扩展不会收集或发送任何数据到外部服务器。所有的查询处理都在您的浏览器中本地完成。

## 许可证

此扩展使用 Apache 2.0 许可证。

## 致谢

特别感谢 [o11y.tools](https://o11y.tools/) 提供的 PromQL 解析器，该工具使用官方的 Prometheus 库并编译为 WebAssembly。 
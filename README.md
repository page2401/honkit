---
title: "00. 概览与版本档案 (HonKit 7.0)"
description: "开源 GitBook 社区继任者 HonKit v7.0.1 基准实测：检验 SUMMARY.md 强中心化目录、README.md 强制入口与 Nunjucks 插件钩子体系。"
---

# HonKit 7.0 基准实测子站（开源 GitBook `SUMMARY.md` 继任者）

本子站（`page2401/honkit`）由主仓库 `page2401.github.io/docs/` 的**标准 GitHub Flavored Markdown（GFM）母版**派生适配而来，用于实测经典开源 GitBook CLI 停更后由日本开源社区接力维护的现代化分支 **`honkit@7.0.1`** 在零外部 CDN 依赖下的真实表现。

## 锁定版本与技术栈档案

| 模块 / 组件 | 锁定版本 | 角色与实测说明 |
| :--- | :--- | :--- |
| `honkit` | `7.0.1` | 开源 GitBook CLI 现代继任者（支持 Node 22、移除内联脚本满足严格 CSP、内置 PJAX 无刷新翻页） |
| `@honkit/markdown-legacy` | `7.0.1` | 内置 Markdown 解析层（底层仍封装 2015 年的 `kramed@0.5.6` + `nunjucks@3.2.4` 模板预处理器） |
| `@honkit/honkit-plugin-lunr` | `7.0.1` | 开箱内置离线检索，构建期自动生成 `_book/search_index.json` 静态索引 |
| `katex` | `0.19.1` | 通过本地插件 `page:before` / `page` 双阶段钩子实现构建期 SSR 输出 HTML + 本地 `.woff2` 字体 |
| `mermaid` | `12.3.0` | 本地静态拷贝 `mermaid.min.js`，监听 `gitbook.events` 的 `page.change` 与内置 Night 夜间主题实时重绘 |

## 五大基准测试章节导航

| 章节路径 | 测试维度 | `HonKit 7.0.1` 派生适配实录 |
| :--- | :--- | :--- |
| [`01-annotations.md`](./01-annotations.md) | 专属标注与元数据 | `front-matter` 可剥离 YAML，但 `SUMMARY.md` 链接文本会强制覆盖 `page.title`；传统生态采用 Nunjucks `{% raw %}{% hint %}{% endraw %}` 标签块，`kramed@0.5.6` 默认不识 GFM Alerts 且吞噬 `<details>` 内嵌 Markdown |
| [`02-diagrams.md`](./02-diagrams.md) | 流程图与时序图 | 正文 ```` ```mermaid ```` 保持零改动；需在 `page` 钩子提前接管代码块，防止内置 `highlight.js` 抛出未知语言告警，并兼容 PJAX 局部换页 |
| [`03-math.md`](./03-math.md) | 数学公式排版 | 原文公式保持 100% 零改动；在 `page:before` 钩子前置提取 `$...$` / `$$...$$` 交由 `katex@0.19.1` 服务端渲染，彻底规避 `kramed` 吞噬 `\\` 与下划线 `_` |
| [`04-directory/`](./04-directory/README.md) | 目录结构与路由取舍 | **GitBook 标志性双铁律**：根 `README.md` 强制充当全书首页（缺失直接报错中断构建），`SUMMARY.md` 白名单接管目录树；需配 `.bookignore` 防工程文件拷入 `_book/` |
| [`05-code-blocks.md`](./05-code-blocks.md) | 高阶代码块与语法高亮 | 内置 `@honkit/honkit-plugin-highlight`（构建期 `highlight.js` 静态分词），严禁在围栏语言后追加 `title=` 或 `{3,7-9}`（否则触发未知语言异常），支持标准 `diff` 增删着色 |

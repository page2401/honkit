---
title: "05. 高阶代码块与语法高亮"
description: "实测 HonKit 7.0.1 内置 @honkit/honkit-plugin-highlight (highlight.js) 的构建期静态分词、纯语言标识硬约束、json->javascript 映射与标准 diff 高亮。"
---

# 05. 高阶代码块与语法高亮（HonKit 7.0 + `highlight.js` 构建期分词实测）

技术文档中超过 40% 的篇幅由代码块构成。与客户端运行时的 `mdBook` 或 `Docsify` 不同，**`honkit@7.0.1`** 开箱内置官方插件 **`@honkit/honkit-plugin-highlight`**，在 Node.js 构建期直接调用 **`highlight.js`** 将围栏代码块预编译为纯静态 `<span class="hljs-*">` 标签并搭配经典的 Base16 Tomorrow 配色表，浏览器端实现 **0 字节高亮运行时 JS**。

{% hint style="warning", title="HonKit 围栏信息串（Info String）纯净度铁律" %}
翻阅 `@honkit/honkit-plugin-highlight/index.js` 源码可见，HonKit 直接将围栏反引号后的整段字符串作为 `language` 传给 `hljs.highlight(code, { language })`！一旦像 VitePress 或 Quartz 那样写上 `title="scripts/resolve-route.ts"` 或 `{3,7-9}`，`highlight.js` 会立即抛出 `Unknown language` 错误并退化为完全无高纯文本。因此派生至 HonKit 时，围栏行**必须严格保持纯语言名**。
{% endhint %}

## 1. 代码块文件名标题栏与构建期 TypeScript 语法高亮

由于 `@honkit/markdown-legacy`（`kramed@0.5.6`）不支持代码块标题元数据属性，HonKit 完美契合母版 GFM 的约定——在代码块正上方使用粗体代码路径标注文件名，下方使用纯净的 ```` ```ts ```` 触发 `highlight.js` 的 TypeScript 词法着色：

**`scripts/resolve-route.ts`**

```ts
export interface RouteContext {
  basePath: string
  slug: string
  cleanUrls: boolean
}

export function formatDocRoute(ctx: RouteContext): string {
  const prefix = ctx.basePath.endsWith('/') ? ctx.basePath : `${ctx.basePath}/`
  const normalized = ctx.slug.replace(/^\/+|\/+$/g, '')
  if (!normalized || normalized === 'index') return prefix
  return ctx.cleanUrls ? `${prefix}${normalized}/` : `${prefix}${normalized}.html`
}
```

## 2. 关键行聚焦与高亮（`highlight.js` 行级高亮缺失与 `json` 映射轶事）

`highlight.js` 的设计哲学是纯文本流词法状态机，本身不维护“按行切分 DOM 包裹”概念，因此 `@honkit/honkit-plugin-highlight` 既无行号列，也不支持 `{3,7-9}` 指定行背景高亮（这里同样折射出一处源码历史彩蛋：该插件内部硬编码了 `const MAP = { json: "javascript", ... }`，把所有 `json` 代码块映射给 JavaScript 语法器高亮！）。读者需结合正文提示定位第 `3` 行与第 `7–9` 行关键字段：

```json
{
  "id": "ssg-benchmark",
  "routeStyle": "clean",
  "strictZeroCdn": true,
  "markdown": {
    "mathEngine": "katex",
    "diagramEngine": "mermaid",
    "lineHighlight": true,
    "codeTransformers": ["diff", "focus"]
  }
}
```

## 3. 代码增删对比着色（`highlight.js` 原生 `diff` 语言支持）

虽然不支持在 TypeScript 代码块内插入 `// [!code ++]` 魔法注释，但 `highlight.js` 内置了完整的 `diff` 语法定义，会在构建期将删减行与新增行静态包裹为 `<span class="hljs-deletion">`（Tomorrow 主题红色 `#c82829`）与 `<span class="hljs-addition">`（绿色 `#718c00`），且在夜间模式（`.color-theme-2`）下自动切换对比色：

```diff
 export function mountSubsite(baseDir: string, subPath: string): string | null {
-  const cleanRel = decodeURIComponent(subPath).replace(/\.\./g, '')
-  return `${baseDir}/${cleanRel}`
+  const resolvedBase = path.resolve(baseDir)
+  const target = path.resolve(resolvedBase, decodeURIComponent(subPath).replace(/^\/+/, ''))
+  return target.startsWith(`${resolvedBase}${path.sep}`) ? target : null
 }
```

## 4. 多语言运行时命令组（GitBook 传统平铺与升级版 `<details>` 折叠）

传统 GitBook 社区曾流行 `gitbook-plugin-codetabs`，但多数早期 GitBook 3 插件已年久失修或注入内联脚本破坏 HonKit 7 的严格 CSP 策略。结合本站本地插件对 `kramed` `<details>` 内部 Markdown 解析的补全修复，使用原生折叠块即可零运行时负担组织多语言构建命令：

<details open>
<summary><strong>Node.js (<code>package.json</code>)</strong></summary>

```bash
npm ci && npm run build
```

</details>

<details>
<summary><strong>Deno 2 (<code>deno.json</code>)</strong></summary>

```bash
deno task build
```

</details>

<details>
<summary><strong>Python (<code>requirements.txt</code>)</strong></summary>

```bash
pip install -r requirements.txt && sphinx-build -b dirhtml . _build/dirhtml
```

</details>

<details>
<summary><strong>Ruby (<code>Gemfile</code>)</strong></summary>

```bash
bundle install && bundle exec jekyll build
```

</details>

## 5. 四大底层高亮引擎能力对照小结

| 高亮引擎代表 | 典型采用框架 | 构建期零运行时 JS | 原生行号 / 行高亮 | 保留词法着色的 Diff |
| :--- | :--- | :--- | :--- | :--- |
| **Shiki / Expressive Code** | VitePress、Starlight、Fumadocs、Nextra、Rspress、Nuxt、Quartz | ✅ 纯静态内联样式 | ✅ `{1,3-5}` / `[!code highlight]` | ✅ `// [!code ++]` |
| **Prism.js** | Docusaurus、VuePress、Eleventy (plugin)、Gatsby | ✅ 静态 Token 类名 | ✅ `{1,3-5}` / 魔法注释 | ⚠️ 需配 diff-highlight 插件 |
| **Pygments / Rouge** | MkDocs Material、Sphinx、Pelican、Jekyll | ✅ Python/Ruby 编译直出 | ✅ `hl_lines` / `emphasize-lines` | ⚠️ 仅标准 `diff` 块红绿 |
| **`highlight.js`（构建期 SSR）** | **HonKit 7 (`@honkit/honkit-plugin-highlight`)**、Hexo | ✅ 构建期直出 `.hljs-*` 静态标签 | ❌ 不支持 `{3,7-9}`（围栏禁带额外参数） | ⚠️ 标准 `diff` 块 `.hljs-addition` / `.hljs-deletion` |

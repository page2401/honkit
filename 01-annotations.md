---
title: "01. 专属标注与元数据"
description: "实测 HonKit 7.0.1 的 Frontmatter 标题覆盖优先级、Nunjucks {% hint %} 标签块、kramed <details> 陷阱与 GFM Alerts 插件扩展。"
---

# 01. 专属标注与元数据（HonKit 7.0 + Nunjucks 块实测）

不同静态网站生成器对“提示框 / 标注（Callouts / Admonitions）”和页面元数据的语法约定存在显著分歧。本文件由原始 GFM 母版派生至 **`honkit@7.0.1`**，集中展现了 GitBook 遗产架构下 **Nunjucks 模板预处理 + `kramed@0.5.6` 解析器** 的独特边界。

## 1. Frontmatter 元数据机制（`SUMMARY.md` 标题覆盖规则）

与 `mdBook` 完全不剥离 YAML 不同，HonKit 内置 `front-matter@^2.3.0` 解析头部 YAML，但其内部 `encodePage.js` 存在一条极具代表性的优先级铁律：

- **页面摘要字段生效**：`description: "..."` 会被正常注入页面 `<meta name="description" content="...">`。
- **标题被 `SUMMARY.md` 强制接管**：只要文档被收录进 `SUMMARY.md`，`result.title = article.getTitle()` 就会**无条件覆盖** YAML 中的 `title` 字段！因此整本书的浏览器 `<title>` 与侧边栏名称完全以 `SUMMARY.md` 为唯一准绳。

## 2. 标准提示语义块（GitBook / HonKit 传统 Nunjucks `{% hint %}` 块）

传统 GitBook / HonKit 插件体系不采用 `::: tip` 三冒号指令，而是基于内置的 **Nunjucks 模板引擎** 注册成对标签块 `{% hint style="info|tip|warning|danger", title="..." %} ... {% endhint %}`（注意多个命名参数之间须用英文逗号 `,` 分隔）：

{% hint style="info" %}
默认信息提示块：静态站点对比平台的每个子模块均独立维护 `main`（源码）与 `page`（构建产物）双分支，互不污染提交历史。
{% endhint %}

{% hint style="tip", title="性能优化建议（自定义标题语义）" %}
在本地插件 `honkit-plugin-local-bench` 的 `blocks.hint` 中调用 `this.renderBlock("markdown", block.body)`，即可在构建期输出纯静态语义化 `<aside>` 容器，并完整保留行内代码与数学公式能力。
{% endhint %}

{% hint style="warning", title="Nunjucks 模板预处理器转义边界" %}
HonKit 会在 Markdown 解析前先对全文执行 Nunjucks 模板求值！虽然顶层代码块会被自动包裹，但在 HTML 块或自定义块内部演示字面量标签（如 {% raw %}`{% hint %}`{% endraw %} 或双花括号）时，务必使用 {% raw %}`{% raw %}...{% endraw %}`{% endraw %} 转义保护。
{% endhint %}

{% hint style="danger", title="不可逆分支覆盖警告" %}
自动化流水线在向 `page` 分支推送构建产物时会启用 `force_orphan: true`，切勿在 `page` 分支直接手工修改代码！
{% endhint %}

## 3. 可折叠详情容器（实测 `kramed@0.5.6` HTML 块吞噬陷阱）

标准 CommonMark 允许在 `<details>` 与 `<summary>` 之间留空行以继续解析内部 Markdown；但 HonKit 默认搭载的 `@honkit/markdown-legacy` 底层仍是 2015 年的 `kramed@0.5.6`，会将 `<details>...</details>` 整段视为不透明原始 HTML 块，导致内部代码块原样露出反引号！本站在 `page` 钩子中对 `<details>` 内部文本补跑了一轮 `toHTML.block` 才得以完美还原：

<details>
<summary>点击展开查看 HonKit Nunjucks 提示块与折叠容器源码结构</summary>

{% raw %}
```markdown
{% hint style="tip", title="性能优化建议" %}
HonKit 继承自 GitBook 3 的 Nunjucks 模板块扩展语法。
{% endhint %}
```
{% endraw %}

除了代码块，折叠容器内同样支持列表、表格与数学公式 $f(x) = x^2 + 1$。

</details>

## 4. GitHub 风格引用警报（GFM Alerts）跨框架直通测试

以下三段与母版**保持一字不改**。实测发现两个极具时代印记的 `kramed@0.5.6`（2015 年 pre-CommonMark 分支）底层细节：① 默认不识别 `[!NOTE]` 且会把仅隔一个空行的连续 `>` 引用块强行合并进同一个 `<blockquote>` 标签；② 本站本地插件在 `page` 钩子中通过内置 `cheerio` 按 `<p>[!TYPE]` 边界重新切分升级，从而在不改动母版一字一符的前提下还原三段独立警报框：

> [!NOTE]
> 这是一段标准的 GitHub Flavored Markdown `[!NOTE]` 警报文本，用于检验各生成器对母版语法的零改造直通能力。

> [!IMPORTANT]
> 跨平台迁移 Markdown 文档时，是否原生兼容 `> [!IMPORTANT]` 与 `> [!WARNING]` 直接决定了母版文档的派生改造成本。

> [!CAUTION]
> 若目标生成器未内置 GFM Alert 解析器（如 VuePress v1、Starlight 默认配置、Docsify v4 旧插件），上方标记会退化为普通引用块并原样露出 `[!CAUTION]` 字符串。

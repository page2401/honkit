---
title: "04. 目录结构与路由取舍"
description: "实测 HonKit / GitBook 派系的 README.md 强制首页铁律、SUMMARY.md 中心化白名单目录与 .bookignore 静态泄漏防护。"
---

# 04. 目录结构与路由取舍（GitBook / HonKit `README.md` + `SUMMARY.md` 范式）

作为开源 GitBook 3 的正统继任者（亦是启发了 Rust `mdBook` 与早期 `VuePress` 目录设计的鼻祖），**`honkit@7.0.1`** 在处理母版多级嵌套目录 `04-directory/nested/` 时展现出三条极鲜明的架构取舍：

1. **`README.md` 即首页的强制约定**：
   - 在 GitBook / HonKit 中，根目录下的 `README.md` **强制充当整本书的扉页入口**（编译为 `_book/index.html`，缺失会直接抛出 `FileNotFoundError: README` 中断构建！）；
   - 同理，子目录章节入口按传统惯例由母版 `04-directory/index.md` 派生为 `04-directory/README.md`，`fileToOutput.js` 会自动将其编译为 `_book/04-directory/index.html` 并在侧边栏生成干净的 `04-directory/` 链接，在 GitHub 网页端浏览文件夹时也能自动渲染成目录导读。
2. **`SUMMARY.md` 绝对白名单驱动 + 相对路径零 basePath 寻址**：
   - 与其 Rust 表亲 `mdBook` 一致，侧边栏章节树、自动编号（`1.1` / `1.2`）及底部的左右线性翻页完全由根级 `SUMMARY.md` 的缩进列表唯一决定；未列入 `SUMMARY.md` 的 `.md` 绝不会被编译成 HTML 页面；
   - 生成的 HTML 对所有静态资源均采用纯相对路径（如 `gitbook/style.css`、`../gitbook/...`、`../../gitbook/...`），因此无需像 Next.js / Astro 那样硬编码 `basePath`，构建产物直接挂载到 `/honkit/` 子路径即可零改造运行！
3. **根目录平铺的静态泄漏陷阱与 `.bookignore` 防护**：
   - HonKit 的 `listAssets.js` 会把内容根目录下**所有未被忽略且非书页的文件当作静态资源原样拷入 `_book/`**！若采用经典根平铺布局而不编写 `.bookignore`，`package.json`、`plugins/` 源码甚至未列入 `SUMMARY.md` 的草稿 `.md` 都会被静默复制到线上产物中。

## 嵌套子文档入口（相对 `.md` 互链自动编译为 `.html`）

- [进入子文档 A：排序前缀与 URL 纯净度权衡](./nested/01-order-and-url.md)
- [进入子文档 B：多级子目录与侧边栏同步机制](./nested/02-sidebar-sync.md)

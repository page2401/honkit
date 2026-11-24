"use strict";

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const katex = require("katex");
const toHTML = require("@honkit/markdown-legacy/lib/toHTML");

const DOLLAR_LITERAL_TOKEN = "HONKITDOLLARLITERAL9401TOKEN";

const CALLOUT_META = {
  note: { tone: "info", defaultTitle: "说明 (Note)", icon: "ℹ" },
  info: { tone: "info", defaultTitle: "信息 (Info)", icon: "ℹ" },
  tip: { tone: "tip", defaultTitle: "提示 (Tip)", icon: "💡" },
  important: { tone: "important", defaultTitle: "重要 (Important)", icon: "📌" },
  warning: { tone: "warning", defaultTitle: "注意 (Warning)", icon: "⚠" },
  caution: { tone: "danger", defaultTitle: "警告 (Caution)", icon: "⛔" },
  danger: { tone: "danger", defaultTitle: "危险警告 (Danger)", icon: "⛔" }
};

const pageMathStore = new Map();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractMathAndEscapedDollars(src) {
  const entries = [];
  let out = "";
  let i = 0;

  while (i < src.length) {
    // Skip fenced code blocks (``` or ~~~, optionally indented)
    if (i === 0 || src[i - 1] === "\n") {
      let ws = i;
      while (src[ws] === " ") ws++;
      if (src.startsWith("```", ws) || src.startsWith("~~~", ws)) {
        const fenceChar = src[ws];
        let fenceLen = 3;
        while (src[ws + fenceLen] === fenceChar) fenceLen++;
        const fenceSeq = fenceChar.repeat(fenceLen);
        const lineEnd = src.indexOf("\n", ws + fenceLen);
        if (lineEnd === -1) {
          out += src.slice(i);
          break;
        }
        const closeRe = new RegExp(`\\n[ ]*${fenceSeq}[ ]*(?=\\n|$)`, "g");
        closeRe.lastIndex = lineEnd;
        const match = closeRe.exec(src);
        if (!match) {
          out += src.slice(i);
          break;
        }
        let afterClose = src.indexOf("\n", match.index + 1);
        if (afterClose === -1) afterClose = src.length;
        out += src.slice(i, afterClose);
        i = afterClose;
        continue;
      }
    }

    // Skip inline backtick code spans
    if (src[i] === "`") {
      let ticks = 1;
      while (src[i + ticks] === "`") ticks++;
      const delim = "`".repeat(ticks);
      const closeIdx = src.indexOf(delim, i + ticks);
      if (closeIdx !== -1) {
        out += src.slice(i, closeIdx + ticks);
        i = closeIdx + ticks;
        continue;
      }
    }

    // Escaped literal dollar \$ outside code spans
    if (src[i] === "\\" && src[i + 1] === "$") {
      out += DOLLAR_LITERAL_TOKEN;
      i += 2;
      continue;
    }

    // Display math $$...$$
    if (src[i] === "$" && src[i + 1] === "$") {
      const closeIdx = src.indexOf("$$", i + 2);
      if (closeIdx !== -1) {
        const tex = src.slice(i + 2, closeIdx).trim();
        if (tex && tex !== "...") {
          const html = katex.renderToString(tex, {
            displayMode: true,
            throwOnError: false,
            strict: false
          });
          const token = `HONKITMATHBLOCK${entries.length}TOKEN`;
          entries.push({ token, html: `<div class="honkit-katex-block">${html}</div>` });
          out += `\n\n${token}\n\n`;
          i = closeIdx + 2;
          continue;
        }
      }
    }

    // Inline math $...$
    if (src[i] === "$" && src[i + 1] !== "$") {
      let j = i + 1;
      let found = -1;
      while (j < src.length && src[j] !== "\n") {
        if (src[j] === "\\" && j + 1 < src.length) {
          j += 2;
          continue;
        }
        if (src[j] === "$") {
          found = j;
          break;
        }
        j++;
      }
      if (found !== -1 && found > i + 1) {
        const tex = src.slice(i + 1, found).trim();
        if (tex && tex !== "...") {
          const html = katex.renderToString(tex, {
            displayMode: false,
            throwOnError: false,
            strict: false
          });
          const token = `HONKITMATHINLINE${entries.length}TOKEN`;
          entries.push({ token, html: `<span class="honkit-katex-inline">${html}</span>` });
          out += token;
          i = found + 1;
          continue;
        }
      }
    }

    out += src[i];
    i++;
  }

  return { content: out, entries };
}

function copyDirRecursiveSync(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursiveSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

module.exports = {
  website: {
    assets: "./assets",
    css: ["vendor/katex/katex.min.css", "bench.css"],
    js: ["vendor/mermaid/mermaid.min.js", "bench.js"]
  },

  blocks: {
    hint: {
      process: function (block) {
        const rawStyle = String(block.kwargs.style || block.args[0] || "info").toLowerCase();
        const customTitle = block.kwargs.title || block.args[1] || "";
        const meta = CALLOUT_META[rawStyle] || CALLOUT_META.info;
        const titleHtml = customTitle ? escapeHtml(customTitle) : escapeHtml(meta.defaultTitle);

        return this.renderBlock("markdown", (block.body || "").trim()).then((bodyHtml) => {
          return {
            body:
              `<aside class="honkit-callout honkit-callout-hint honkit-callout-${meta.tone}" data-hint-style="${escapeHtml(rawStyle)}">` +
              `<div class="honkit-callout-title"><span class="honkit-callout-icon" aria-hidden="true">${meta.icon}</span><span>${titleHtml}</span></div>` +
              `<div class="honkit-callout-body">${bodyHtml}</div>` +
              `</aside>`,
            parse: false
          };
        });
      }
    },

    details: {
      process: function (block) {
        const summary = block.kwargs.summary || block.args[0] || "点击展开详情";
        return this.renderBlock("markdown", (block.body || "").trim()).then((bodyHtml) => {
          return {
            body:
              `<details class="honkit-details">` +
              `<summary>${escapeHtml(summary)}</summary>` +
              `<div class="honkit-details-body">${bodyHtml}</div>` +
              `</details>`,
            parse: false
          };
        });
      }
    }
  },

  hooks: {
    "page:before": function (page) {
      const { content, entries } = extractMathAndEscapedDollars(page.content);
      pageMathStore.set(page.path, entries);
      page.content = content;
      return page;
    },

    page: function (page) {
      const $ = cheerio.load(page.content, null, false);

      // 1. Upgrade raw <details> blocks whose inner Markdown kramed@0.5.6 leaves unparsed
      $("details").each((_, el) => {
        const $det = $(el);
        if ($det.hasClass("honkit-details")) return;
        const $sum = $det.children("summary").first();
        const summaryHtml = $sum.length ? $sum.html() : "详情";
        $sum.remove();
        const rawInner = $det
          .contents()
          .toArray()
          .map((node) => (node.type === "text" ? node.data : $.html(node)))
          .join("");
        const compiledInner = toHTML.block(rawInner.trim());
        $det.addClass("honkit-details");
        $det.html(`<summary>${summaryHtml}</summary><div class="honkit-details-body">${compiledInner}</div>`);
      });

      // 2. Upgrade verbatim GFM Alerts (> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION])
      // Note: kramed@0.5.6 (pre-CommonMark) merges consecutive `>` blockquotes separated by a single
      // blank line into ONE <blockquote> with multiple <p>[!TYPE]...</p> children, so we split groups cleanly.
      $("blockquote").each((_, el) => {
        const $bq = $(el);
        const children = $bq.children().toArray();
        if (!children.length) return;

        const alertRe = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>|\r?\n)?([\s\S]*)$/i;
        const firstCheck = $(children[0]);
        if (!firstCheck.is("p") || !alertRe.test(firstCheck.html() || "")) {
          return;
        }

        const groups = [];
        let current = null;

        for (const child of children) {
          const $child = $(child);
          if ($child.is("p")) {
            const pHtml = $child.html() || "";
            const m = pHtml.match(alertRe);
            if (m) {
              const kind = m[1].toLowerCase();
              const remainder = m[2].trim();
              current = {
                rawType: m[1].toUpperCase(),
                meta: CALLOUT_META[kind] || CALLOUT_META.note,
                parts: remainder ? [`<p>${remainder}</p>`] : []
              };
              groups.push(current);
              continue;
            }
          }
          if (current) {
            current.parts.push($.html(child));
          }
        }

        if (!groups.length) return;

        const replacementHtml = groups
          .map(
            (g) =>
              `<aside class="honkit-callout honkit-callout-gfm honkit-callout-${g.meta.tone}" data-gfm-alert="${g.rawType}">` +
              `<div class="honkit-callout-title"><span class="honkit-callout-icon" aria-hidden="true">${g.meta.icon}</span><span>${escapeHtml(g.meta.defaultTitle)}</span></div>` +
              `<div class="honkit-callout-body">${g.parts.join("\n")}</div>` +
              `</aside>`
          )
          .join("\n");

        $bq.replaceWith(replacementHtml);
      });

      // 3. Transform ```mermaid code fences before highlight.js runs so highlight.js never errors on "mermaid"
      $("pre > code.lang-mermaid, pre > code.language-mermaid").each((_, codeEl) => {
        const $code = $(codeEl);
        const $pre = $code.parent("pre");
        const diagramSource = $code.text().trim();
        const encoded = escapeHtml(diagramSource);
        $pre.replaceWith(
          `<div class="honkit-mermaid-wrap"><pre class="mermaid" data-mermaid-code="${encoded}">${encoded}</pre></div>`
        );
      });

      let html = $.html();

      // 4. Restore build-time SSR KaTeX tokens & literal escaped dollars
      const entries = pageMathStore.get(page.path) || [];
      for (const { token, html: katexHtml } of entries) {
        // Unwrap <p>HONKITMATHBLOCK...TOKEN</p> if wrapped by kramed
        if (token.startsWith("HONKITMATHBLOCK")) {
          const pWrapped = `<p>${token}</p>`;
          if (html.includes(pWrapped)) {
            html = html.split(pWrapped).join(katexHtml);
            continue;
          }
        }
        html = html.split(token).join(katexHtml);
      }
      pageMathStore.delete(page.path);

      html = html.split(DOLLAR_LITERAL_TOKEN).join("$");
      page.content = html;
      return page;
    },

    finish: function () {
      const pluginVendorDir = this.output.resolve("gitbook/honkit-plugin-local-bench/vendor");
      const katexDistDir = path.dirname(require.resolve("katex/dist/katex.min.css"));
      const mermaidMinPath = require.resolve("mermaid/dist/mermaid.min.js");

      const katexTargetDir = path.join(pluginVendorDir, "katex");
      fs.mkdirSync(katexTargetDir, { recursive: true });
      fs.copyFileSync(path.join(katexDistDir, "katex.min.css"), path.join(katexTargetDir, "katex.min.css"));
      copyDirRecursiveSync(path.join(katexDistDir, "fonts"), path.join(katexTargetDir, "fonts"));

      const mermaidTargetDir = path.join(pluginVendorDir, "mermaid");
      fs.mkdirSync(mermaidTargetDir, { recursive: true });
      fs.copyFileSync(mermaidMinPath, path.join(mermaidTargetDir, "mermaid.min.js"));

      fs.writeFileSync(this.output.resolve(".nojekyll"), "");
    }
  }
};

(function () {
  "use strict";

  var lastMermaidTheme = null;
  var renderCounter = 0;
  var syncingTheme = false;

  function getBookEl() {
    return document.querySelector(".book");
  }

  function detectDark() {
    var html = document.documentElement;
    var book = getBookEl();
    if (html.classList.contains("dark") || html.getAttribute("data-theme") === "dark") {
      return true;
    }
    if (book && book.classList.contains("color-theme-2")) {
      return true;
    }
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("theme") === "dark") return true;
    } catch (_) {}
    return false;
  }

  function applyThemeMode(dark) {
    if (syncingTheme) return;
    syncingTheme = true;
    try {
      var html = document.documentElement;
      var book = getBookEl();
      html.classList.toggle("dark", Boolean(dark));
      html.setAttribute("data-theme", dark ? "dark" : "light");
      if (book) {
        if (dark) {
          book.classList.remove("color-theme-1");
          book.classList.add("color-theme-2");
        } else if (book.classList.contains("color-theme-2")) {
          book.classList.remove("color-theme-2");
        }
      }
    } finally {
      syncingTheme = false;
    }
  }

  function renderMermaidDiagrams(force) {
    if (!window.mermaid) return;
    var nodes = document.querySelectorAll(".markdown-section pre.mermaid");
    if (!nodes.length) return;

    var dark = detectDark();
    var targetTheme = dark ? "dark" : "default";
    if (!force && lastMermaidTheme === targetTheme) {
      var allRendered = Array.prototype.every.call(nodes, function (n) {
        return Boolean(n.querySelector("svg"));
      });
      if (allRendered) return;
    }
    lastMermaidTheme = targetTheme;

    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: targetTheme
    });

    Array.prototype.forEach.call(nodes, function (el) {
      var raw = el.getAttribute("data-mermaid-code") || el.textContent || "";
      if (!el.getAttribute("data-mermaid-code")) {
        el.setAttribute("data-mermaid-code", raw);
      }
      var id = "honkit-mermaid-svg-" + (++renderCounter);
      window.mermaid
        .render(id, raw)
        .then(function (res) {
          el.innerHTML = res.svg;
          el.setAttribute("data-processed", "true");
        })
        .catch(function (err) {
          console.error("[honkit-local-bench] Mermaid render failed:", err);
        });
    });
  }

  function observeThemeChanges() {
    var html = document.documentElement;
    var htmlObserver = new MutationObserver(function () {
      if (syncingTheme) return;
      var extDark = html.classList.contains("dark") || html.getAttribute("data-theme") === "dark";
      var book = getBookEl();
      if (book && extDark !== book.classList.contains("color-theme-2")) {
        applyThemeMode(extDark);
      }
      renderMermaidDiagrams(false);
    });
    htmlObserver.observe(html, { attributes: true, attributeFilter: ["class", "data-theme"] });

    function bindBookObserver() {
      var book = getBookEl();
      if (!book || book.__honkitBenchObserved) return;
      book.__honkitBenchObserved = true;
      var bookObserver = new MutationObserver(function () {
        if (syncingTheme) return;
        var isNight = book.classList.contains("color-theme-2");
        syncingTheme = true;
        try {
          html.classList.toggle("dark", isNight);
          html.setAttribute("data-theme", isNight ? "dark" : "light");
        } finally {
          syncingTheme = false;
        }
        renderMermaidDiagrams(false);
      });
      bookObserver.observe(book, { attributes: true, attributeFilter: ["class"] });
    }

    bindBookObserver();
    return bindBookObserver;
  }

  window.addEventListener("message", function (ev) {
    var data = ev && ev.data;
    if (!data || typeof data !== "object") return;
    if (data.theme === "dark" || data.theme === "light") {
      applyThemeMode(data.theme === "dark");
      renderMermaidDiagrams(true);
    }
  });

  var rebindBook = observeThemeChanges();

  function onPageReady() {
    if (detectDark()) {
      applyThemeMode(true);
    }
    rebindBook();
    renderMermaidDiagrams(true);
  }

  if (window.gitbook && window.gitbook.events) {
    window.gitbook.events.on("page.change", onPageReady);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onPageReady);
  } else {
    onPageReady();
  }
})();

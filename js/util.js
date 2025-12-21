// util.js / 作成日時(JST): 2025-12-21 15:55:00
(function (global) {
  "use strict";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return (root || document).querySelectorAll(sel);
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = (text === undefined || text === null) ? "" : String(text);
  }

  function escapeHTML(s) {
    s = (s === undefined || s === null) ? "" : String(s);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nowText() {
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var da = ("0" + d.getDate()).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mm = ("0" + d.getMinutes()).slice(-2);
    var ss = ("0" + d.getSeconds()).slice(-2);
    return y + "-" + m + "-" + da + " " + hh + ":" + mm + ":" + ss;
  }

  // 相対URLを絶対URLへ（Edge95/IEモードでも動く）
  function resolveUrl(relativePath) {
    var a = document.createElement("a");
    a.href = relativePath;
    return a.href;
  }

  function isDavWWWRootUrl(url) {
    url = url || global.location.href;
    return url.indexOf("DavWWWRoot") !== -1;
  }

  function pageInfoText() {
    return "PAGE: " + global.location.href + "\nBASE: " + resolveUrl("./");
  }

  global.Util = {
    qs: qs,
    qsa: qsa,
    setText: setText,
    escapeHTML: escapeHTML,
    nowText: nowText,
    resolveUrl: resolveUrl,
    isDavWWWRootUrl: isDavWWWRootUrl,
    pageInfoText: pageInfoText
  };
})(window);

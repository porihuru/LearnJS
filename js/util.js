// util.js / 作成日時(JST): 2025-12-21 15:40:00
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
    // 表示用（厳密なフォーマットでなくてOK）
    var d = new Date();
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var da = ("0" + d.getDate()).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mm = ("0" + d.getMinutes()).slice(-2);
    var ss = ("0" + d.getSeconds()).slice(-2);
    return y + "-" + m + "-" + da + " " + hh + ":" + mm + ":" + ss;
  }

  global.Util = {
    qs: qs,
    qsa: qsa,
    setText: setText,
    escapeHTML: escapeHTML,
    nowText: nowText
  };
})(window);

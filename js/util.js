/*
  ファイル: js/util.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01
*/
(function (global) {
  "use strict";

  /* [IDX-001] バージョン集計（下部表示用） */
  if (!global.__VERSIONS__) global.__VERSIONS__ = {};

  var Util = {};
  Util.VERSION = "20251226-01";

  Util.registerVersion = function (fileName, version) {
    global.__VERSIONS__[fileName] = version;
  };
  Util.registerVersion("util.js", Util.VERSION);

  /* [IDX-010] DOMヘルパ */
  Util.byId = function (id) { return document.getElementById(id); };

  Util.setText = function (id, text) {
    var el = Util.byId(id);
    if (!el) return;
    el.textContent = (text === null || text === undefined) ? "" : String(text);
  };

  Util.setHTML = function (id, html) {
    var el = Util.byId(id);
    if (!el) return;
    el.innerHTML = (html === null || html === undefined) ? "" : String(html);
  };

  Util.setDisplay = function (id, isShow) {
    var el = Util.byId(id);
    if (!el) return;
    el.style.display = isShow ? "" : "none";
  };

  Util.toInt = function (v, defVal) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return defVal;
    return n;
  };

  /* [IDX-020] 日付（YYYY/MM/DD HH:MM:SS） */
  function pad2(n) { return (n < 10) ? ("0" + n) : String(n); }

  Util.formatYMDHMS = function (d) {
    var y = d.getFullYear();
    var m = pad2(d.getMonth() + 1);
    var da = pad2(d.getDate());
    var h = pad2(d.getHours());
    var mi = pad2(d.getMinutes());
    var s = pad2(d.getSeconds());
    return y + "/" + m + "/" + da + " " + h + ":" + mi + ":" + s;
  };

  Util.nowStamp = function () { return Util.formatYMDHMS(new Date()); };

  /* [IDX-030] 配列シャッフル（Fisher-Yates） */
  Util.shuffle = function (arr) {
    var a = arr.slice(0);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  /* [IDX-040] HTMLエスケープ（render/print/mailで共通利用） */
  Util.esc = function (s) {
    s = (s === null || s === undefined) ? "" : String(s);
    return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
  };

  /* [IDX-050] Cookie（IEモード互換） */
  Util.getCookie = function (name) {
    var c = document.cookie;
    if (!c) return "";
    var parts = c.split(";");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/^\s+/, "");
      if (p.indexOf(name + "=") === 0) return decodeURIComponent(p.substring((name + "=").length));
    }
    return "";
  };

  Util.setCookie = function (name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
  };

  Util.deleteCookie = function (name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  global.Util = Util;

})(window);

/*
  ファイル: js/util.js
  作成日時(JST): 2025-12-25 20:30:00
  VERSION: 20251225-01
*/
(function (global) {
  "use strict";

  var Util = {};
  Util.VERSION = "20251225-01";

  Util.ensureVersions = function () {
    if (!global.__VERSIONS__) global.__VERSIONS__ = {};
    return global.__VERSIONS__;
  };

  Util.registerVersion = function (name, ver) {
    var v = Util.ensureVersions();
    v[name] = ver;
  };

  Util.qs = function (sel) { return document.querySelector(sel); };

  Util.esc = function (s) {
    s = (s === null || s === undefined) ? "" : String(s);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  Util.toInt = function (v, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (def || 0) : n;
  };

  Util.nowStamp = function () {
    try { return new Date().toLocaleString(); }
    catch (e) { return String(new Date()); }
  };

  Util.cloneArray = function (arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) out.push(arr[i]);
    return out;
  };

  Util.shuffle = function (arr) {
    var a = Util.cloneArray(arr);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  Util.pickN = function (arr, n) {
    if (n <= 0) return [];
    if (n >= arr.length) return Util.cloneArray(arr);
    var s = Util.shuffle(arr);
    return s.slice(0, n);
  };

  // ★追加：文字列末尾から数字を抽出（例: "FP3-0061" -> 61）
  Util.extractLastInt = function (s, def) {
    s = (s === null || s === undefined) ? "" : String(s);
    // 末尾の連続数字
    var m = s.match(/(\d+)\s*$/);
    if (!m) return (def === undefined ? 0 : def);
    var n = parseInt(m[1], 10);
    if (isNaN(n)) return (def === undefined ? 0 : def);
    return n;
  };

  Util.registerVersion("util.js", Util.VERSION);
  global.Util = Util;

})(window);

/*
  ファイル: js/util.js
  作成日時(JST): 2025-12-24 20:30:00
  VERSION: 20251224-01
*/
(function (global) {
  "use strict";

  var Util = {};

  Util.VERSION = "20251224-01";

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
    // Edge95想定：toLocaleString で簡易
    try {
      return new Date().toLocaleString();
    } catch (e) {
      return String(new Date());
    }
  };

  Util.cloneArray = function (arr) {
    var out = [];
    var i;
    for (i = 0; i < arr.length; i++) out.push(arr[i]);
    return out;
  };

  Util.shuffle = function (arr) {
    // Fisher-Yates
    var a = Util.cloneArray(arr);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  Util.pickN = function (arr, n) {
    if (n <= 0) return [];
    if (n >= arr.length) return Util.cloneArray(arr);
    var s = Util.shuffle(arr);
    return s.slice(0, n);
  };

  Util.pad2 = function (n) {
    n = String(n);
    return (n.length < 2) ? ("0" + n) : n;
  };

  Util.registerVersion("util.js", Util.VERSION);
  global.Util = Util;

})(window);
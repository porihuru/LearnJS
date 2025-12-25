/*
  ファイル: js/util.js
  作成日時(JST): 2025-12-25 21:40:00
  VERSION: 20251225-03
*/
(function (global) {
  "use strict";

  var Util = {};
  Util.VERSION = "20251225-03";

  Util.ensureVersions = function () {
    if (!global.__VERSIONS__) global.__VERSIONS__ = {};
    return global.__VERSIONS__;
  };

  Util.registerVersion = function (name, ver) {
    var v = Util.ensureVersions();
    v[name] = ver;
  };

  Util.qs = function (sel) { return document.querySelector(sel); };

  Util.setText = function (id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = (text === undefined || text === null) ? "" : String(text);
  };

  Util.setDisplay = function (id, show) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? "" : "none";
  };

  Util.toInt = function (v, defVal) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (defVal === undefined ? 0 : defVal) : n;
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

  Util.extractLastInt = function (s, defVal) {
    s = (s === null || s === undefined) ? "" : String(s);
    var m = s.match(/(\d+)\s*$/);
    if (!m) return (defVal === undefined ? 0 : defVal);
    var n = parseInt(m[1], 10);
    if (isNaN(n)) return (defVal === undefined ? 0 : defVal);
    return n;
  };

  Util.getCookie = function (key) {
    var name = key + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1);
      if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return "";
  };

  Util.setCookie = function (key, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = key + "=" + value + ";" + expires + ";path=/";
  };

  Util.deleteCookie = function (key) {
    document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  Util.HIST_COOKIE_KEY = "QUIZ_HIST";

  Util.histLoad = function () {
    var raw = Util.getCookie(Util.HIST_COOKIE_KEY);
    var map = {};
    if (!raw) return map;

    try {
      var items = raw.split("|");
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it) continue;
        var parts = it.split(",");
        if (parts.length < 3) continue;

        var id = decodeURIComponent(parts[0]);
        var c = Util.toInt(parts[1], 0);
        var w = Util.toInt(parts[2], 0);
        map[id] = { c: c, w: w };
      }
    } catch (e) {
      map = {};
    }
    return map;
  };

  Util.histSave = function (map) {
    var out = [];
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var v = map[id] || { c: 0, w: 0 };
      var enc = encodeURIComponent(id);
      out.push(enc + "," + Util.toInt(v.c, 0) + "," + Util.toInt(v.w, 0));
    }
    if (out.length > 200) out = out.slice(0, 200);
    Util.setCookie(Util.HIST_COOKIE_KEY, out.join("|"), 3650);
  };

  Util.histGet = function (map, id) {
    if (!id) return { c: 0, w: 0 };
    if (map[id]) return { c: map[id].c, w: map[id].w };
    return { c: 0, w: 0 };
  };

  Util.histInc = function (map, id, isCorrect) {
    if (!id) return;
    if (!map[id]) map[id] = { c: 0, w: 0 };
    if (isCorrect) map[id].c = Util.toInt(map[id].c, 0) + 1;
    else map[id].w = Util.toInt(map[id].w, 0) + 1;
    Util.histSave(map);
  };

  Util.histClearAll = function () {
    Util.deleteCookie(Util.HIST_COOKIE_KEY);
  };

  Util.registerVersion("util.js", Util.VERSION);
  global.Util = Util;

})(window);
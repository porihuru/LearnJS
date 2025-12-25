/*
  ファイル: js/util.js
  作成日時(JST): 2025-12-25 21:10:00
  VERSION: 20251225-02

  [UTIL-方針]
    - [UTIL-01] ES5準拠（Edge95 / IEモード互換）
    - [UTIL-02] Cookie履歴（ID別 正解/不正解）を扱うユーティリティを集約
    - [UTIL-03] 末尾数字抽出（FP3-0061 -> 61）
*/
(function (global) {
  "use strict";

  var Util = {};
  Util.VERSION = "20251225-02";

  // =========================
  // [VER-01] バージョン管理（画面表示用）
  // =========================
  Util.ensureVersions = function () {
    if (!global.__VERSIONS__) global.__VERSIONS__ = {};
    return global.__VERSIONS__;
  };

  Util.registerVersion = function (name, ver) {
    var v = Util.ensureVersions();
    v[name] = ver;
  };

  // =========================
  // [DOM-01] DOMヘルパ
  // =========================
  Util.qs = function (sel) { return document.querySelector(sel); };

  Util.setText = function (id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = (text === undefined || text === null) ? "" : String(text);
  };

  // =========================
  // [NUM-01] 数値変換
  // =========================
  Util.toInt = function (v, defVal) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (defVal === undefined ? 0 : defVal) : n;
  };

  // =========================
  // [TIME-01] ログ用タイムスタンプ
  // =========================
  Util.nowStamp = function () {
    try { return new Date().toLocaleString(); }
    catch (e) { return String(new Date()); }
  };

  // =========================
  // [ARR-01] 配列操作（シャッフル/抽出）
  // =========================
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

  // =========================
  // [ID-01] 末尾数字抽出（FP3-0001 -> 1）
  // =========================
  Util.extractLastInt = function (s, defVal) {
    s = (s === null || s === undefined) ? "" : String(s);
    var m = s.match(/(\d+)\s*$/);
    if (!m) return (defVal === undefined ? 0 : defVal);
    var n = parseInt(m[1], 10);
    if (isNaN(n)) return (defVal === undefined ? 0 : defVal);
    return n;
  };

  // =========================
  // [COOKIE-01] Cookie ヘルパ（IEモード互換）
  // =========================
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

  // =========================
  // [HIST-01] 履歴（Cookie）仕様
  //   CookieKey: QUIZ_HIST
  //   値形式: encode(ID),correct,wrong|encode(ID),correct,wrong|...
  //   例: ID1,1,2|FP3-0001,3,5
  // =========================
  Util.HIST_COOKIE_KEY = "QUIZ_HIST";

  Util.histLoad = function () {
    var raw = Util.getCookie(Util.HIST_COOKIE_KEY);
    var map = {}; // id -> {c,w}
    if (!raw) return map;

    // [HIST-02] 破損耐性：try/catchで安全に
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
      // 壊れていたら空扱い
      map = {};
    }
    return map;
  };

  Util.histSave = function (map) {
    // [HIST-03] map を文字列化
    var out = [];
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var v = map[id] || { c: 0, w: 0 };
      var enc = encodeURIComponent(id);
      out.push(enc + "," + Util.toInt(v.c, 0) + "," + Util.toInt(v.w, 0));
    }

    // [HIST-04] Cookieサイズの簡易対策（多すぎる場合は末尾を落とす）
    // NOTE: 厳密なLRUは要件外。安全策として最大200件に制限。
    if (out.length > 200) out = out.slice(0, 200);

    Util.setCookie(Util.HIST_COOKIE_KEY, out.join("|"), 3650); // 約10年
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
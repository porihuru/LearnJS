/*
  ファイル: js/history_store.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  仕様:
    - Cookieに「ID,正解数,不正解数」を保存
    - 形式: "1,2,1|2,0,3|10,5,2" のように "|" 区切り
*/
(function (global) {
  "use strict";

  var HistoryStore = {};
  HistoryStore.VERSION = "20251226-01";
  Util.registerVersion("history_store.js", HistoryStore.VERSION);

  /* [IDX-010] Cookieキー */
  HistoryStore.KEY = "quiz_hist";

  /* [IDX-020] map形式: { "1": {c:2,w:1}, ... } */
  HistoryStore.loadMap = function () {
    var raw = Util.getCookie(HistoryStore.KEY);
    var map = {};
    if (!raw) return map;

    var blocks = raw.split("|");
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (!b) continue;
      var p = b.split(",");
      if (p.length < 3) continue;

      var id = String(p[0]);
      var c = parseInt(p[1], 10); if (isNaN(c)) c = 0;
      var w = parseInt(p[2], 10); if (isNaN(w)) w = 0;
      map[id] = { c: c, w: w };
    }
    return map;
  };

  HistoryStore.saveMap = function (map) {
    var keys = [];
    for (var k in map) if (map.hasOwnProperty(k)) keys.push(k);

    /* [IDX-021] IDの数値順で保存（見やすさ） */
    keys.sort(function (a, b) {
      var na = parseInt(a, 10); var nb = parseInt(b, 10);
      if (isNaN(na)) na = 0; if (isNaN(nb)) nb = 0;
      return na - nb;
    });

    var blocks = [];
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var v = map[id];
      blocks.push(id + "," + (v.c || 0) + "," + (v.w || 0));
    }
    Util.setCookie(HistoryStore.KEY, blocks.join("|"), 365);
  };

  HistoryStore.get = function (map, id) {
    var key = String(id);
    if (map[key]) return map[key];
    return { c: 0, w: 0 };
  };

  HistoryStore.inc = function (map, id, isCorrect) {
    var key = String(id);
    if (!map[key]) map[key] = { c: 0, w: 0 };
    if (isCorrect) map[key].c = (map[key].c || 0) + 1;
    else map[key].w = (map[key].w || 0) + 1;
    HistoryStore.saveMap(map);
  };

  HistoryStore.clearAll = function () {
    Util.deleteCookie(HistoryStore.KEY);
  };

  /* [IDX-030] 印刷/メール用：履歴を配列で返す */
  HistoryStore.toArraySorted = function (map) {
    var keys = [];
    for (var k in map) if (map.hasOwnProperty(k)) keys.push(k);

    keys.sort(function (a, b) {
      var na = parseInt(a, 10); var nb = parseInt(b, 10);
      if (isNaN(na)) na = 0; if (isNaN(nb)) nb = 0;
      return na - nb;
    });

    var arr = [];
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var v = map[id] || { c: 0, w: 0 };
      arr.push({ id: id, c: v.c || 0, w: v.w || 0 });
    }
    return arr;
  };

  global.HistoryStore = HistoryStore;

})(window);

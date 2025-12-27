/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-27 11:45:00
  VERSION: 20251227-02

  目的:
    - CSVLoader(正) を使って questions_fallback.csv を読み込み、State.App.rows を埋める
    - Edge95/IEモードでも確実に動く（例外はログに出す）
    - ボタンID/入力IDの多少のズレに強い（候補を複数持つ）

  重要:
    - CSVローダー名は CSVLoader（大文字）です
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251227-02";
  Util.registerVersion("app.js", App.VERSION);

  /* =========================
     [IDX-001] 共通ユーティリティ
  ========================= */

  function byId(id) { return Util.byId(id); }

  function s(v) { return (v === null || v === undefined) ? "" : String(v); }

  function toInt(v, defVal) {
    var n = parseInt(s(v), 10);
    if (isNaN(n)) return defVal;
    return n;
  }

  function log(msg) {
    try { State.log(msg); } catch (e) {}
    try { if (global.Render && Render.renderLogs) Render.renderLogs(); } catch (e2) {}
  }

  /* [IDX-002] グローバル例外をログへ */
  function installGlobalErrorHook() {
    try {
      global.onerror = function (msg, url, line, col, err) {
        log("JS例外: " + msg + " @ " + url + ":" + line + (col ? (":" + col) : ""));
        try { if (err && err.stack) log("stack: " + err.stack); } catch (e2) {}
        return false;
      };
      log("診断: window.onerror を設定");
    } catch (e) {}
  }

  /* [IDX-003] 先に見つかったIDへ onclick を設定 */
  function bindFirst(ids, handler, label) {
    for (var i = 0; i < ids.length; i++) {
      var node = byId(ids[i]);
      if (!node) continue;

      node.onclick = function (ev) {
        try { if (ev && ev.preventDefault) ev.preventDefault(); } catch (e0) {}
        try { if (ev) ev.returnValue = false; } catch (e1) {} // IE系保険
        try { handler(ev); } catch (e2) { log(label + " 例外: " + e2); }
        return false;
      };

      log("UI結線: " + label + " -> #" + ids[i]);
      return ids[i];
    }
    log("UI結線失敗: " + label + "（ID不一致）候補=" + ids.join(","));
    return "";
  }

  function getSelectValueFirst(ids, defVal) {
    for (var i = 0; i < ids.length; i++) {
      var node = byId(ids[i]);
      if (!node) continue;
      return node.value;
    }
    return defVal;
  }

  function getValueFirst(ids, defVal) {
    for (var i = 0; i < ids.length; i++) {
      var node = byId(ids[i]);
      if (!node) continue;
      if (typeof node.value !== "undefined") return node.value;
    }
    return defVal;
  }

  /* =========================
     [IDX-010] CSV読込（正: CSVLoader）
  ========================= */

  function getCsvLoader() {
    // 互換のため候補を見に行く（基本は CSVLoader）
    if (global.CSVLoader && global.CSVLoader.loadFallback) return global.CSVLoader;
    if (global.CsvLoader && global.CsvLoader.loadFallback) return global.CsvLoader;
    return null;
  }

  App.loadCsv = function () {
    log("CSV読込開始（App側）: fallback");

    var loader = getCsvLoader();
    if (!loader) {
      log("CSV読込失敗: CSVLoader.loadFallback が見つからない（csv_loader.js の読み込み順を確認）");
      return;
    }

    // CSVLoader.loadFallback(cb) は cb(err, rows) 形式
    loader.loadFallback(function (err, rows) {
      if (err) {
        log("CSV読込失敗: status=" + (err.status || "?") + " url=" + (err.url || "?"));
        return;
      }

      var n = (State.App.rows && State.App.rows.length) ? State.App.rows.length : 0;
      log("CSV読込完了: rows=" + n);

      // カテゴリ生成（Engineに実装がある前提。無ければログだけ）
      try {
        if (global.Engine && Engine.buildCategories) Engine.buildCategories();
        else log("注意: Engine.buildCategories が無い（カテゴリ件数表示が出ない可能性）");
      } catch (e1) {
        log("Engine.buildCategories 例外: " + e1);
      }

      try { if (global.Render && Render.renderCategories) Render.renderCategories(); } catch (e2) { log("Render.renderCategories 例外: " + e2); }
      try { if (global.Render && Render.renderFooter) Render.renderFooter(); } catch (e3) {}
      try { if (global.Render && Render.renderLogs) Render.renderLogs(); } catch (e4) {}
    });
  };

  /* =========================
     [IDX-020] 開始前/開始後共通チェック
  ========================= */

  function ensureReadyOrLog() {
    if (!global.State || !State.App) { log("開始不可: State.App が未初期化"); return false; }
    if (!State.App.rows || State.App.rows.length === 0) { log("開始不可: rows が空（CSV未読込）"); return false; }
    if (!global.Engine) { log("開始不可: Engine が未ロード"); return false; }
    if (!global.Render) { log("開始不可: Render が未ロード"); return false; }
    return true;
  }

  function startCommonAfterEngineStarted() {
    try { if (Render.setQuizMode) Render.setQuizMode(true); } catch (e1) { log("Render.setQuizMode(true) 例外: " + e1); }
    try { if (Render.renderQuestion) Render.renderQuestion(); } catch (e2) { log("Render.renderQuestion 例外: " + e2); }
    try { if (Render.renderFooter) Render.renderFooter(); } catch (e3) {}
  }

  /* =========================
     [IDX-030] ボタン処理
  ========================= */

  App.onRandomStart = function () {
    log("クリック: ランダムスタート");
    if (!ensureReadyOrLog()) return;

    var category = getSelectValueFirst(["categorySelect"], "__ALL__");
    var countVal = getValueFirst(["randomCount"], "10");
    var count = toInt(countVal, 10);

    log("開始要求(ランダム): category=" + category + " count=" + count);

    try {
      Engine.startRandom(category, count);
      startCommonAfterEngineStarted();
    } catch (e) {
      log("Engine.startRandom 例外: " + e);
    }
  };

  App.onIdStart = function () {
    log("クリック: ID指定スタート");
    if (!ensureReadyOrLog()) return;

    var category = getSelectValueFirst(["categorySelect"], "__ALL__");
    var startIdVal = getValueFirst(["startId"], "1");
    // rangeCount / idCount など名称ブレ吸収
    var countVal = getValueFirst(["rangeCount", "idCount"], "10");

    var startId = toInt(startIdVal, 1);
    var count = toInt(countVal, 10);

    log("開始要求(ID指定): category=" + category + " startId=" + startId + " count=" + count);

    try {
      Engine.startFromId(category, startId, count);
      startCommonAfterEngineStarted();
    } catch (e) {
      log("Engine.startFromId 例外: " + e);
    }
  };

  /* =========================
     [IDX-040] 初期化
  ========================= */

  App.bindUI = function () {
    bindFirst(["btnRandomStart"], App.onRandomStart, "ランダムスタート");
    bindFirst(["btnIdStart"], App.onIdStart, "ID指定スタート");

    // モーダルボタン（存在する場合）
    bindFirst(["btnModalNext"], function () {
      log("モーダル: 次へ");
      try {
        if (Render.hideModal) Render.hideModal();
        if (Engine.hasNext && Engine.hasNext()) {
          Engine.next();
          Render.renderQuestion();
        } else {
          if (Render.showResultModal) Render.showResultModal();
        }
      } catch (e) { log("モーダル次へ 例外: " + e); }
    }, "モーダル:次へ");

    bindFirst(["btnModalEnd"], function () {
      log("モーダル: 終了");
      try { if (Render.showResultModal) Render.showResultModal(); } catch (e) { log("モーダル終了 例外: " + e); }
    }, "モーダル:終了");

    bindFirst(["btnModalClose"], function () {
      log("モーダル: 閉じる");
      try { if (Render.hideModal) Render.hideModal(); } catch (e) {}
    }, "モーダル:閉じる");
  };

  App.init = function () {
    installGlobalErrorHook();
    log("起動: App.init");

    try { if (Render.renderTopInfo) Render.renderTopInfo(); } catch (e1) {}
    try { if (Render.renderFooter) Render.renderFooter(); } catch (e2) {}
    try { if (Render.setQuizMode) Render.setQuizMode(false); } catch (e3) {}

    App.bindUI();
    App.loadCsv();
  };

  function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
      return;
    }
    if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", fn, false);
    } else {
      document.attachEvent("onreadystatechange", function () {
        if (document.readyState === "complete") fn();
      });
    }
  }

  domReady(function () {
    try { App.init(); } catch (e) { log("App.init 例外: " + e); }
  });

  global.App = App;

})(window);
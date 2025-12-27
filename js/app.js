/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-27 10:55:00
  VERSION: 20251227-01

  目的:
    - Edge95/IEモードでも「スタート押しても動かない」を必ずログで原因可視化
    - ボタンID/入力IDのズレに強い（候補IDを複数試す）
    - form submit（リロード）を preventDefault で阻止
    - 例外が出ても画面下ログに出す

  依存:
    - Util, State, CsvLoader, Engine, Render, HistoryStore（あれば）
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251227-01";
  Util.registerVersion("app.js", App.VERSION);

  /* =========================
     [IDX-001] 共通
  ========================= */

  function byId(id) { return Util.byId(id); }

  function safeStr(v) { return (v === null || v === undefined) ? "" : String(v); }

  function toInt(v, defVal) {
    var n = parseInt(safeStr(v), 10);
    if (isNaN(n)) return defVal;
    return n;
  }

  function log(s) { State.log(s); Render.renderLogs(); }

  function bindFirst(ids, handler, label) {
    // ids: ["id1","id2",...]
    for (var i = 0; i < ids.length; i++) {
      var el = byId(ids[i]);
      if (el) {
        el.onclick = function (ev) {
          try {
            if (ev && ev.preventDefault) ev.preventDefault();
            if (ev) ev.returnValue = false; // IE系保険
          } catch (e0) {}
          handler(ev);
          return false;
        };
        log("UI結線: " + label + " -> #" + ids[i]);
        return ids[i];
      }
    }
    log("UI結線失敗: " + label + "（ボタンIDが見つからない）候補=" + ids.join(","));
    return "";
  }

  function getValueFirst(ids, defVal) {
    for (var i = 0; i < ids.length; i++) {
      var el = byId(ids[i]);
      if (el && typeof el.value !== "undefined") return el.value;
    }
    return defVal;
  }

  function getSelectValueFirst(ids, defVal) {
    for (var i = 0; i < ids.length; i++) {
      var el = byId(ids[i]);
      if (!el) continue;
      if (el.tagName && String(el.tagName).toUpperCase() === "SELECT") {
        return el.value;
      }
    }
    return defVal;
  }

  /* =========================
     [IDX-010] グローバル例外をログへ
  ========================= */

  function installGlobalErrorHook() {
    try {
      global.onerror = function (msg, url, line, col, err) {
        var m = "JS例外: " + msg + " @ " + url + ":" + line + (col ? (":" + col) : "");
        log(m);
        if (err && err.stack) log("stack: " + err.stack);
        return false;
      };
      log("診断: window.onerror を設定");
    } catch (e) {
      // 何もしない
    }
  }

  /* =========================
     [IDX-020] 起動処理
  ========================= */

  App.init = function () {
    installGlobalErrorHook();

    // 起動ログ
    log("起動: App.init");

    // 開始前モード
    try { Render.setQuizMode(false); } catch (e1) { log("Render.setQuizMode(false)失敗: " + e1); }

    // 右上情報・フッター・ログ
    try { Render.renderTopInfo(); } catch (e2) { log("Render.renderTopInfo失敗: " + e2); }
    try { Render.renderFooter(); } catch (e3) { log("Render.renderFooter失敗: " + e3); }
    try { Render.renderLogs(); } catch (e4) {}

    // CSVロード（fallback固定）
    App.loadCsvThenReady();

    // UI結線（ボタンIDズレに強い）
    App.bindUI();
  };

  /* =========================
     [IDX-030] CSV読込（fallback固定）
  ========================= */

  App.loadCsvThenReady = function () {
    try {
      log("CSV読込開始: file=questions_fallback.csv");

      // CsvLoader の公開APIに合わせて呼ぶ（存在チェック）
      if (typeof CsvLoader === "undefined" || !CsvLoader.loadFallback) {
        log("CSV読込失敗: CsvLoader.loadFallback が見つからない");
        return;
      }

      CsvLoader.loadFallback(function (ok, info) {
        if (!ok) {
          log("CSV読込失敗: " + safeStr(info || ""));
          return;
        }

        // State.App.rows が入っている前提
        var n = (State.App.rows && State.App.rows.length) ? State.App.rows.length : 0;
        log("CSV読込成功: 件数=" + n);

        // カテゴリ集計→セレクト描画
        try { Engine.buildCategories(); } catch (e1) { log("Engine.buildCategories失敗: " + e1); }
        try { Render.renderCategories(); } catch (e2) { log("Render.renderCategories失敗: " + e2); }

        // フッター更新
        try { Render.renderFooter(); } catch (e3) {}
      });
    } catch (e) {
      log("CSV読込開始で例外: " + e);
    }
  };

  /* =========================
     [IDX-040] UI結線
  ========================= */

  App.bindUI = function () {
    // ボタンID候補（あなたのHTMLの実IDが多少ズレても拾えるように）
    bindFirst(
      ["btnRandomStart", "btnStartRandom", "btnRandStart"],
      App.onRandomStart,
      "ランダムスタート"
    );

    bindFirst(
      ["btnIdStart", "btnStartId", "btnStartFromId", "btnStart"],
      App.onIdStart,
      "ID指定スタート"
    );

    bindFirst(
      ["btnClearHistory", "btnHistoryClear"],
      App.onClearHistory,
      "履歴削除"
    );

    // モーダルボタン（存在する場合のみ）
    bindFirst(
      ["btnModalNext", "btnNext"],
      App.onModalNext,
      "モーダル:次へ"
    );

    bindFirst(
      ["btnModalEnd", "btnEnd"],
      App.onModalEnd,
      "モーダル:終了"
    );

    bindFirst(
      ["btnModalClose", "btnClose"],
      function(){ try{ Render.hideModal(); }catch(e){} },
      "モーダル:閉じる"
    );
  };

  /* =========================
     [IDX-050] 開始処理（共通チェック）
  ========================= */

  function ensureReadyOrLog() {
    if (typeof Engine === "undefined") { log("開始不可: Engine が未ロード"); return false; }
    if (typeof Render === "undefined") { log("開始不可: Render が未ロード"); return false; }
    if (!State || !State.App) { log("開始不可: State.App が未初期化"); return false; }
    if (!State.App.rows || State.App.rows.length === 0) { log("開始不可: rows が空（CSV未読込の可能性）"); return false; }
    return true;
  }

  function startCommonAfterEngineStarted() {
    try { Render.setQuizMode(true); } catch (e1) { log("Render.setQuizMode(true)失敗: " + e1); }
    try { Render.renderQuestion(); } catch (e2) { log("Render.renderQuestion失敗: " + e2); }
    try { Render.renderFooter(); } catch (e3) {}
  }

  /* =========================
     [IDX-060] ランダムスタート
  ========================= */

  App.onRandomStart = function () {
    log("クリック: ランダムスタート");

    if (!ensureReadyOrLog()) return;

    var category = getSelectValueFirst(["categorySelect", "selCategory"], "__ALL__");

    // 「デフォルト10」入力欄の候補ID
    var countVal = getValueFirst(["randomCount", "txtRandomCount", "inputRandomCount"], "10");
    var count = toInt(countVal, 10);

    log("開始要求(ランダム): category=" + category + " count=" + count);

    try {
      Engine.startRandom(category, count);
      startCommonAfterEngineStarted();
    } catch (e) {
      log("Engine.startRandom で例外: " + e);
    }
  };

  /* =========================
     [IDX-070] ID指定スタート
  ========================= */

  App.onIdStart = function () {
    log("クリック: ID指定スタート");

    if (!ensureReadyOrLog()) return;

    var category = getSelectValueFirst(["categorySelect", "selCategory"], "__ALL__");

    // 「ID(デフォルト1)」入力欄の候補ID
    var startIdVal = getValueFirst(["startId", "txtStartId", "inputStartId"], "1");
    var startId = toInt(startIdVal, 1);

    // 「問(デフォルト10)」入力欄の候補ID
    var countVal = getValueFirst(["idCount", "txtIdCount", "inputIdCount"], "10");
    var count = toInt(countVal, 10);

    log("開始要求(ID指定): category=" + category + " startId=" + startId + " count=" + count);

    try {
      Engine.startFromId(category, startId, count);
      startCommonAfterEngineStarted();
    } catch (e) {
      log("Engine.startFromId で例外: " + e);
    }
  };

  /* =========================
     [IDX-080] 履歴削除
  ========================= */

  App.onClearHistory = function () {
    log("クリック: 履歴削除");
    try {
      if (typeof HistoryStore === "undefined") {
        log("履歴削除不可: HistoryStore が未ロード");
        return;
      }
      HistoryStore.clearAll();
      State.App.histMap = HistoryStore.loadAll();
      log("履歴削除: 完了");
      try { Render.renderQuestion(); } catch (e) {}
      try { Render.renderFooter(); } catch (e2) {}
    } catch (e3) {
      log("履歴削除で例外: " + e3);
    }
  };

  /* =========================
     [IDX-090] モーダル操作（次へ/終了）
  ========================= */

  App.onModalNext = function () {
    log("モーダル: 次へ");
    try {
      // 次へ→閉じる→次の問題へ
      Render.hideModal();
      if (Engine.hasNext()) {
        Engine.next();
        Render.renderQuestion();
      } else {
        // 最後なら結果発表へ
        Render.showResultModal();
      }
    } catch (e) {
      log("モーダル次へで例外: " + e);
    }
  };

  App.onModalEnd = function () {
    log("モーダル: 終了");
    try {
      // 終了→結果発表
      Render.showResultModal();
    } catch (e) {
      log("モーダル終了で例外: " + e);
    }
  };

  /* =========================
     [IDX-100] 起動
  ========================= */

  function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
      return;
    }
    if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", fn, false);
    } else {
      // IE系保険
      document.attachEvent("onreadystatechange", function () {
        if (document.readyState === "complete") fn();
      });
    }
  }

  domReady(function () {
    try {
      App.init();
    } catch (e) {
      // 最低限の可視化
      try { State.log("App.init 例外: " + e); } catch (e2) {}
    }
  });

  global.App = App;

})(window);
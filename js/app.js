/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-25 21:10:00
  VERSION: 20251225-02

  [APP-要件]
    - [APP-01] 起動時にCSV読込（SharePointは中止=CSVのみ）
    - [APP-02] 回答モーダルの「次へ」「終了」
    - [APP-03] 全問終了 or 終了で結果発表モーダル
    - [APP-04] 履歴削除ボタン（Cookie削除 + 表示更新 + ログ）
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251225-02";
  Util.registerVersion("app.js", App.VERSION);

  function getSelectedCategory() {
    var sel = document.getElementById("categorySelect");
    if (!sel) return "__ALL__";
    return sel.value || "__ALL__";
  }

  // =========================
  // [APP-10] モーダルボタン処理
  // =========================
  function bindModalButtons() {
    var btnNext = document.getElementById("btnModalNext");
    var btnEnd = document.getElementById("btnModalEnd");
    var btnClose = document.getElementById("btnModalClose");

    if (btnNext) {
      btnNext.onclick = function () {
        // 次があるなら次へ。なければ結果発表。
        if (Engine.hasNext()) {
          Engine.next();
          Render.hideModal();
          Render.renderQuestion();
          Render.renderFooter();
          return;
        }

        // 全問終了
        Render.hideModal();
        State.log("全問終了: 結果発表へ");
        Render.showResultModal();
      };
    }

    if (btnEnd) {
      btnEnd.onclick = function () {
        Render.hideModal();
        State.log("終了ボタン: 結果発表へ");
        Render.showResultModal();
      };
    }

    if (btnClose) {
      btnClose.onclick = function () {
        Render.hideModal();
        State.log("結果発表: 閉じる");
        Render.renderQuestion();
        Render.renderFooter();
      };
    }
  }

  // =========================
  // [APP-20] 画面ボタン処理（スタート/履歴削除）
  // =========================
  function bindUI() {
    var btnRandom = document.getElementById("btnRandomStart");
    var btnId = document.getElementById("btnIdStart");
    var btnClearHistory = document.getElementById("btnClearHistory");

    if (btnRandom) {
      btnRandom.onclick = function () {
        var cat = getSelectedCategory();
        var n = Util.toInt(document.getElementById("randomCount").value, 10);
        Engine.startRandom(cat, n);
        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnId) {
      btnId.onclick = function () {
        var cat = getSelectedCategory();
        var sid = Util.toInt(document.getElementById("startId").value, 1);
        var n = Util.toInt(document.getElementById("rangeCount").value, 10);
        Engine.startFromId(cat, sid, n);
        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnClearHistory) {
      btnClearHistory.onclick = function () {
        // [APP-04] confirmで再確認
        var ok = global.confirm("履歴を削除します。\nOKで全履歴を削除します。");
        if (!ok) {
          State.log("履歴削除: キャンセル");
          return;
        }

        Util.histClearAll();
        State.App.histMap = {};
        State.log("履歴削除: 完了");

        // 表示更新（現在問題の累積が0になる）
        Render.renderQuestion();
      };
    }
  }

  // =========================
  // [APP-30] 初期化
  // =========================
  App.init = function () {
    // 起動日時
    State.App.openedAt = Util.nowStamp();

    // Cookie履歴ロード
    State.App.histMap = Util.histLoad();

    State.log("起動");
    Render.renderTopInfo();
    Render.renderFooter();
    Render.renderLogs();

    // CSV読み込み
    CSVLoader.loadFallback(function (err) {
      if (err) {
        Render.renderFooter();
        Render.renderQuestion();
        return;
      }

      // カテゴリ集計 → select描画
      Engine.buildCategories();
      Render.renderCategories();

      Render.renderTopInfo();
      Render.renderFooter();
      Render.renderQuestion();
    });
  };

  global.App = App;

  // [APP-90] バインド順（先にイベント → 初期化）
  bindModalButtons();
  bindUI();
  App.init();

})(window);
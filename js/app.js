/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-25 21:40:00
  VERSION: 20251225-03

  追加要件:
    - [APP-100] 開始まで出題グループ非表示
    - [APP-110] 開始後はカテゴリ/ランダム/スタート/履歴削除を非表示
    - [APP-120] 結果発表→閉じる で操作群を復帰し、出題グループを再度非表示
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251225-03";
  Util.registerVersion("app.js", App.VERSION);

  function getSelectedCategory() {
    var sel = document.getElementById("categorySelect");
    if (!sel) return "__ALL__";
    return sel.value || "__ALL__";
  }

  // =========================
  // [APP-100] 画面モード切替
  // =========================
  function setQuizMode(on) {
    State.App.inQuizMode = !!on;

    // 出題パネル
    Util.setDisplay("quizPanel", !!on);

    // 操作群（開始系）
    Util.setDisplay("boxCategory", !on);
    Util.setDisplay("boxRandomStart", !on);
    Util.setDisplay("boxIdStart", !on);

    // 履歴削除ボタンも非表示（開始中は操作不可）
    Util.setDisplay("btnClearHistory", !on);

    // toolbar自体は残すが、子要素を消す方針（レイアウトの急変を抑制）
    // Util.setDisplay("toolbarArea", true);
  }

  function resetToIdle() {
    // セッション解除 → 次回開始待ち
    State.App.session = null;
    setQuizMode(false);
    Render.renderQuestion(); // （未開始）へ
    Render.renderFooter();
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
        if (Engine.hasNext()) {
          Engine.next();
          Render.hideModal();
          Render.renderQuestion();
          Render.renderFooter();
          return;
        }
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
        // 結果発表を閉じたら「開始待ち」に戻す
        Render.hideModal();
        State.log("結果発表: 閉じる → 開始待ちに戻す");
        resetToIdle();
      };
    }
  }

  // =========================
  // [APP-20] 画面ボタン処理
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

        // [APP-110] 開始後に出題モードへ
        setQuizMode(true);

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

        // [APP-110] 開始後に出題モードへ
        setQuizMode(true);

        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnClearHistory) {
      btnClearHistory.onclick = function () {
        var ok = global.confirm("履歴を削除します。\nOKで全履歴を削除します。");
        if (!ok) {
          State.log("履歴削除: キャンセル");
          return;
        }

        Util.histClearAll();
        State.App.histMap = {};
        State.log("履歴削除: 完了");

        Render.renderQuestion();
      };
    }
  }

  // =========================
  // [APP-30] 初期化
  // =========================
  App.init = function () {
    State.App.openedAt = Util.nowStamp();
    State.App.histMap = Util.histLoad();

    State.log("起動");

    Render.renderTopInfo();
    Render.renderFooter();
    Render.renderLogs();

    // [APP-100] 起動直後は出題非表示
    setQuizMode(false);

    CSVLoader.loadFallback(function (err) {
      if (err) {
        Render.renderFooter();
        Render.renderQuestion();
        return;
      }

      Engine.buildCategories();
      Render.renderCategories();

      Render.renderTopInfo();
      Render.renderFooter();
      Render.renderQuestion();
    });
  };

  global.App = App;

  bindModalButtons();
  bindUI();
  App.init();

})(window);
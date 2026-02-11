/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  実装方針:
    - 起動→CSV読込→カテゴリ作成→開始待ち
    - ランダム/ID指定で開始→開始UI非表示→出題表示
    - 回答後は即ポップアップ（次へ/終了）
    - 全問終了または終了→結果発表（印刷/メール/閉じる）
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251226-01";
  Util.registerVersion("app.js", App.VERSION);

  function getSelectedCategory() {
    var sel = Util.byId("categorySelect");
    if (!sel) return "__ALL__";
    return sel.value || "__ALL__";
  }

  function resetToIdle() {
    State.App.session = null;
    Render.setQuizMode(false);
    Render.renderQuestion();
    Render.renderFooter();
  }

  /* [IDX-010] モーダルボタン */
  function bindModalButtons() {
    var btnNext = Util.byId("btnModalNext");
    var btnEnd = Util.byId("btnModalEnd");
    var btnPrint = Util.byId("btnModalPrint");
    var btnMail = Util.byId("btnModalMail");
    var btnClose = Util.byId("btnModalClose");

    if (btnNext) {
      btnNext.onclick = function () {
        if (Engine.hasNext()) {
          Engine.next();
          Render.hideModal();
          Render.renderQuestion();
          Render.renderFooter();
        } else {
          /* 最終問題まで終了 */
          Render.hideModal();
          State.log("全問終了: 結果発表へ");
          Render.showResultModal();
        }
      };
    }

    if (btnEnd) {
      btnEnd.onclick = function () {
        Render.hideModal();
        State.log("終了ボタン: 結果発表へ");
        Render.showResultModal();
      };
    }

    if (btnPrint) {
      btnPrint.onclick = function () {
        if (global.PrintManager && PrintManager.printLastResult) PrintManager.printLastResult();
        else alert("印刷機能が読み込まれていません。");
      };
    }

    if (btnMail) {
      btnMail.onclick = function () {
        if (global.Mail && Mail.openMailer) Mail.openMailer();
        else alert("メール機能が読み込まれていません。");
      };
    }

    if (btnClose) {
      btnClose.onclick = function () {
        Render.hideModal();
        State.log("結果発表: 閉じる → 開始待ちへ戻す");
        resetToIdle();
      };
    }
  }

  /* [IDX-020] 開始UI */
  function bindUI() {
    var btnRandom = Util.byId("btnRandomStart");
    var btnId = Util.byId("btnIdStart");
    var btnClearHistory = Util.byId("btnClearHistory");
    var btnToggleLog = Util.byId("btnToggleLog");

    if (btnRandom) {
      btnRandom.onclick = function () {
        var cat = getSelectedCategory();
        var n = Util.toInt(Util.byId("randomCount").value, 10);

        Engine.startRandom(cat, n);
        Render.setQuizMode(true);

        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnId) {
      btnId.onclick = function () {
        var cat = getSelectedCategory();
        var sid = Util.toInt(Util.byId("startId").value, 1);
        var n = Util.toInt(Util.byId("rangeCount").value, 10);

        Engine.startFromId(cat, sid, n);
        Render.setQuizMode(true);

        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnClearHistory) {
      btnClearHistory.onclick = function () {
        var ok = global.confirm("履歴を削除します。\nOKで全履歴を削除します。");
        if (!ok) { State.log("履歴削除: キャンセル"); return; }

        HistoryStore.clearAll();
        State.App.histMap = {};
        State.log("履歴削除: 完了");

        Render.renderQuestion();
      };
    }

    if (btnToggleLog) {
      btnToggleLog.onclick = function () {
        var logBox = Util.byId("logBox");
        var logPanel = Util.byId("logPanel");
        if (!logBox || !logPanel) return;
        var isClosed = logBox.classList.contains("logBoxClosed");
        if (isClosed) {
          logBox.classList.remove("logBoxClosed");
          logPanel.classList.remove("logPanelClosed");
          btnToggleLog.textContent = "閉じる";
        } else {
          logBox.classList.add("logBoxClosed");
          logPanel.classList.add("logPanelClosed");
          btnToggleLog.textContent = "開く";
        }
      };
    }
  }

  App.init = function () {
    State.App.openedAt = Util.nowStamp();
    State.App.histMap = HistoryStore.loadMap();

    State.log("起動");
    Render.renderTopInfo();
    Render.renderFooter();
    Render.renderLogs();

    Render.setQuizMode(false);

    CSVLoader.loadFallback(function (err) {
      if (err) {
        State.log("CSV読込失敗: " + err);
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

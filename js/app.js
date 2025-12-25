/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-25 22:25:00
  VERSION: 20251225-04

  変更点:
    [APP-200] 回答結果: 次へ(左) / 終了(右) に合わせてHTML側の順序を採用
    [APP-210] 結果発表: 印刷ボタンを新設（print.jsに委譲）
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251225-04";
  Util.registerVersion("app.js", App.VERSION);

  function getSelectedCategory() {
    var sel = document.getElementById("categorySelect");
    if (!sel) return "__ALL__";
    return sel.value || "__ALL__";
  }

  function setQuizMode(on) {
    State.App.inQuizMode = !!on;

    Util.setDisplay("quizPanel", !!on);

    Util.setDisplay("boxCategory", !on);
    Util.setDisplay("boxRandomStart", !on);
    Util.setDisplay("boxIdStart", !on);
    Util.setDisplay("btnClearHistory", !on);
  }

  function resetToIdle() {
    State.App.session = null;
    setQuizMode(false);
    Render.renderQuestion();
    Render.renderFooter();
  }

  function bindModalButtons() {
    var btnNext = document.getElementById("btnModalNext");
    var btnEnd = document.getElementById("btnModalEnd");
    var btnClose = document.getElementById("btnModalClose");
    var btnPrint = document.getElementById("btnModalPrint");

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

    if (btnPrint) {
      btnPrint.onclick = function () {
        if (global.PrintManager && PrintManager.printLastResult) {
          PrintManager.printLastResult();
        } else {
          alert("印刷機能が読み込まれていません。");
        }
      };
    }

    if (btnClose) {
      btnClose.onclick = function () {
        Render.hideModal();
        State.log("結果発表: 閉じる → 開始待ちに戻す");
        resetToIdle();
      };
    }
  }

  function bindUI() {
    var btnRandom = document.getElementById("btnRandomStart");
    var btnId = document.getElementById("btnIdStart");
    var btnClearHistory = document.getElementById("btnClearHistory");

    if (btnRandom) {
      btnRandom.onclick = function () {
        var cat = getSelectedCategory();
        var n = Util.toInt(document.getElementById("randomCount").value, 10);

        Engine.startRandom(cat, n);
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
        setQuizMode(true);

        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnClearHistory) {
      btnClearHistory.onclick = function () {
        var ok = global.confirm("履歴を削除します。\nOKで全履歴を削除します。");
        if (!ok) { State.log("履歴削除: キャンセル"); return; }

        Util.histClearAll();
        State.App.histMap = {};
        State.log("履歴削除: 完了");

        Render.renderQuestion();
      };
    }
  }

  App.init = function () {
    State.App.openedAt = Util.nowStamp();
    State.App.histMap = Util.histLoad();

    State.log("起動");

    Render.renderTopInfo();
    Render.renderFooter();
    Render.renderLogs();

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
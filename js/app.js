/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-24 20:30:00
  VERSION: 20251224-01
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251224-01";
  Util.registerVersion("app.js", App.VERSION);

  function getSelectedCategory() {
    var sel = document.getElementById("categorySelect");
    if (!sel) return "__ALL__";
    return sel.value || "__ALL__";
  }

  function bindUI() {
    var btnRandom = document.getElementById("btnRandomStart");
    var btnId = document.getElementById("btnIdStart");
    var btnPrev = document.getElementById("btnPrev");
    var btnNext = document.getElementById("btnNext");
    var btnToggleExplain = document.getElementById("btnToggleExplain");
    var btnReset = document.getElementById("btnResetAnswer");

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

    if (btnPrev) {
      btnPrev.onclick = function () {
        Engine.prev();
        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnNext) {
      btnNext.onclick = function () {
        Engine.next();
        Render.renderQuestion();
        Render.renderFooter();
      };
    }

    if (btnToggleExplain) {
      btnToggleExplain.onclick = function () {
        State.App.ui.showExplain = !State.App.ui.showExplain;
        State.log("解説表示: " + (State.App.ui.showExplain ? "ON" : "OFF"));
        Render.renderQuestion();
      };
    }

    if (btnReset) {
      btnReset.onclick = function () {
        Engine.resetAnswer();
        Render.renderQuestion();
        Render.renderFooter();
      };
    }
  }

  App.init = function () {
    State.log("起動");
    Render.renderFooter();
    Render.renderLogs();

    // CSV読込
    CSVLoader.loadFallback(function (err, rows) {
      if (err) {
        // CSVのみ運用：ここで止める（必要なら後で sampleCsv を読む導線を追加）
        Render.renderFooter();
        Render.renderQuestion();
        return;
      }

      // カテゴリ生成
      Engine.buildCategories();
      Render.renderCategories();

      // 初期表示（未開始状態）
      Render.renderFooter();
      Render.renderQuestion();

      // 自動開始はしない（現状の挙動維持）
    });
  };

  global.App = App;

  // 起動
  bindUI();
  App.init();

})(window);

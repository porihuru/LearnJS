/*
  ファイル: js/app.js
  作成日時(JST): 2025-12-25 20:30:00
  VERSION: 20251225-01
*/
(function (global) {
  "use strict";

  var App = {};
  App.VERSION = "20251225-01";
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

    CSVLoader.loadFallback(function (err) {
      if (err) {
        Render.renderFooter();
        Render.renderQuestion();
        return;
      }

      Engine.buildCategories();
      Render.renderCategories();

      Render.renderFooter();
      Render.renderQuestion();
    });
  };

  global.App = App;

  bindUI();
  App.init();

})(window);

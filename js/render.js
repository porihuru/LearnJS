/*
  ファイル: js/render.js
  作成日時(JST): 2025-12-25 21:40:00
  VERSION: 20251225-03
*/
(function (global) {
  "use strict";

  var Render = {};
  Render.VERSION = "20251225-03";
  Util.registerVersion("render.js", Render.VERSION);

  Render.renderCategories = function () {
    var sel = document.getElementById("categorySelect");
    if (!sel) return;

    while (sel.options.length > 0) sel.remove(0);

    var counts = State.App.categoryCounts || {};
    var allCount = counts["__ALL__"] || 0;

    var optAll = document.createElement("option");
    optAll.value = "__ALL__";
    optAll.textContent = "（すべて）：全" + allCount + "問";
    sel.appendChild(optAll);

    var cats = State.App.categories || [];
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var n = counts[c] || 0;
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c + "：全" + n + "問";
      sel.appendChild(opt);
    }
  };

  function clearChoices() {
    var wrap = document.getElementById("choices");
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  }

  function createChoiceButton(choice, isAnswered, mark) {
    var btn = document.createElement("div");
    btn.className = "choiceBtn";

    if (isAnswered) btn.className += " isLocked";
    if (mark === "correct") btn.className += " isCorrect";
    if (mark === "wrong") btn.className += " isWrong";

    var key = document.createElement("span");
    key.className = "choiceKey";
    key.textContent = choice.key;

    var txt = document.createElement("span");
    txt.className = "choiceText";
    txt.textContent = choice.text;

    btn.appendChild(key);
    btn.appendChild(txt);

    return btn;
  }

  Render.renderQuestion = function () {
    var cur = Engine.getCurrent();
    if (!cur) {
      Util.setText("metaId", "（未開始）");
      Util.setText("metaCategory", "（未開始）");
      Util.setText("metaStatus", "未回答");
      Util.setText("metaHist", "正解0回 / 不正解0回");
      Util.setText("questionText", "（未開始）");
      clearChoices();
      return;
    }

    var row = cur.row;
    var ans = cur.ans;

    Util.setText("metaId", row.idText || row.id || "");
    Util.setText("metaCategory", row.category || "");
    Util.setText("questionText", row.question || "");

    var st = "未回答";
    if (ans.isAnswered) st = ans.isCorrect ? "正解" : "不正解";
    Util.setText("metaStatus", st);

    var hist = Util.histGet(State.App.histMap, row.idText || row.id || "");
    Util.setText("metaHist", "正解" + hist.c + "回 / 不正解" + hist.w + "回");

    clearChoices();
    var wrap = document.getElementById("choices");
    if (!wrap) return;

    for (var i = 0; i < ans.options.length; i++) {
      var opt = ans.options[i];

      var mark = "";
      if (ans.isAnswered) {
        if (String(opt.text) === String(ans.selectedText)) {
          mark = ans.isCorrect ? "correct" : "wrong";
        }
      }

      var btn = createChoiceButton(opt, ans.isAnswered, mark);

      if (!ans.isAnswered) {
        (function (choiceText) {
          btn.onclick = function () {
            var res = Engine.selectAnswer(choiceText);
            if (!res || !res.ok) return;

            var idKey = res.idText || "";
            Util.histInc(State.App.histMap, idKey, !!res.isCorrect);
            State.log("履歴更新: " + idKey + " / " + (res.isCorrect ? "正解+1" : "不正解+1"));

            Render.renderQuestion();
            Render.renderFooter();
            Render.showAnswerModal(res);
          };
        })(opt.text);
      }

      wrap.appendChild(btn);
    }
  };

  Render.renderTopInfo = function () {
    var el = document.getElementById("topInfo");
    if (!el) return;

    var s = State.App.openedAt || "(未設定)";
    el.textContent = "起動: " + s + " / HTML: " + State.VERS.html + " / CSS: " + State.VERS.css;
  };

  Render.renderLogs = function () {
    var box = document.getElementById("logBox");
    if (!box) return;

    var lines = State.App.logs || [];
    box.textContent = lines.join("\n");
    try { box.scrollTop = box.scrollHeight; } catch (e) {}
  };

  Render.renderFooter = function () {
    var vLine = document.getElementById("versionLine");
    var dLine = document.getElementById("dataLine");

    if (vLine) {
      vLine.textContent = "BUILD: " + State.App.build + " / JS: " + State.getAllVersions();
    }
    if (dLine) {
      dLine.textContent =
        "データ: " + State.App.dataSource +
        " / 件数: " + (State.App.rows ? State.App.rows.length : 0) +
        " / 最終読込: " + (State.App.lastLoadedAt || "—");
    }
  };

  function showOverlay() {
    var ov = document.getElementById("modalOverlay");
    if (!ov) return;
    ov.style.display = "block";
  }

  function hideOverlay() {
    var ov = document.getElementById("modalOverlay");
    if (!ov) return;
    ov.style.display = "none";
  }

  function setModal(mode) {
    var fA = document.getElementById("modalFooterAnswer");
    var fR = document.getElementById("modalFooterResult");
    if (fA) fA.style.display = (mode === "answer") ? "table" : "none";
    if (fR) fR.style.display = (mode === "result") ? "table" : "none";
  }

  Render.showAnswerModal = function (res) {
    var title = document.getElementById("modalTitle");
    var body = document.getElementById("modalBody");
    if (!title || !body) return;

    setModal("answer");

    var okng = res.isCorrect ? "正解" : "不正解";
    var stats = res.stats || { total: 0, correct: 0, wrong: 0 };

    title.textContent = "回答結果";

    var text = ""
      + okng + "\n\n"
      + "正解の答え:\n" + (res.correctText || "") + "\n\n"
      + "解説:\n" + (res.explanation || "") + "\n\n"
      + "問題数: " + stats.total + "  正解数: " + stats.correct + "  不正解数: " + stats.wrong;

    body.textContent = text;

    showOverlay();
  };

  Render.showResultModal = function () {
    var title = document.getElementById("modalTitle");
    var body = document.getElementById("modalBody");
    if (!title || !body) return;

    setModal("result");

    var s = State.App.session;
    var stats = (s && s.stats) ? s.stats : { total: 0, correct: 0, wrong: 0, answered: 0 };

    title.textContent = "結果発表";

    var rate = 0;
    if (stats.total > 0) rate = Math.round((stats.correct / stats.total) * 100);

    var text = ""
      + "問題数: " + stats.total + "\n"
      + "回答数: " + stats.answered + "\n"
      + "正解数: " + stats.correct + "\n"
      + "不正解数: " + stats.wrong + "\n"
      + "正答率: " + rate + "%\n\n"
      + "お疲れさまでした。";

    body.textContent = text;

    showOverlay();
  };

  Render.hideModal = function () { hideOverlay(); };

  global.Render = Render;

})(window);
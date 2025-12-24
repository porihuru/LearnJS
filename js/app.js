/*
  ファイル: js/render.js
  作成日時(JST): 2025-12-24 20:30:00
  VERSION: 20251224-01
*/
(function (global) {
  "use strict";

  var Render = {};
  Render.VERSION = "20251224-01";
  Util.registerVersion("render.js", Render.VERSION);

  Render.log = function (msg) {
    State.log(msg);
  };

  function setText(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = (text === undefined || text === null) ? "" : String(text);
  }

  function clearChoices() {
    var wrap = document.getElementById("choices");
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  }

  function createChoiceButton(choice, isSelected, mark) {
    // mark: "correct" | "wrong" | ""
    var btn = document.createElement("div");
    btn.className = "choiceBtn";
    if (isSelected) btn.className += " isSelected";
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

    btn.setAttribute("data-choice-text", choice.text);

    return btn;
  }

  Render.renderCategories = function () {
    var sel = document.getElementById("categorySelect");
    if (!sel) return;

    // 先頭は（すべて）
    while (sel.options.length > 1) sel.remove(1);

    var cats = State.App.categories || [];
    for (var i = 0; i < cats.length; i++) {
      var opt = document.createElement("option");
      opt.value = cats[i];
      opt.textContent = cats[i];
      sel.appendChild(opt);
    }
  };

  Render.renderQuestion = function () {
    var cur = Engine.getCurrent();
    if (!cur) {
      setText("metaId", "（未読込）");
      setText("metaCategory", "（未読込）");
      setText("metaStatus", "未回答");
      setText("questionText", "（未読込）");
      setText("explanationText", "(未表示)");
      clearChoices();
      Render.renderNav();
      return;
    }

    var row = cur.row;
    var ans = cur.ans;

    setText("metaId", row.id);
    setText("metaCategory", row.category || "");
    setText("questionText", row.question || "");

    // 状態表示
    var st = "未回答";
    if (ans.isAnswered) st = ans.isCorrect ? "正解" : "不正解";
    setText("metaStatus", st);

    // 解説表示（トグル）
    if (State.App.ui.showExplain) {
      setText("explanationText", row.explanation || "");
    } else {
      setText("explanationText", "(未表示)");
    }

    // choices
    clearChoices();
    var wrap = document.getElementById("choices");
    if (!wrap) return;

    for (var i = 0; i < ans.options.length; i++) {
      var opt = ans.options[i];
      var selected = (ans.isAnswered && String(opt.text) === String(ans.selectedText));

      var mark = "";
      if (ans.isAnswered && selected) {
        mark = ans.isCorrect ? "correct" : "wrong";
      }

      var btn = createChoiceButton(opt, selected, mark);

      // クリックで回答
      (function (choiceText) {
        btn.onclick = function () {
          Engine.selectAnswer(choiceText);
          Render.renderQuestion();
          Render.renderNav();
        };
      })(opt.text);

      wrap.appendChild(btn);
    }

    Render.renderNav();
  };

  Render.renderNav = function () {
    var prev = document.getElementById("btnPrev");
    var next = document.getElementById("btnNext");
    if (prev) prev.disabled = !Engine.canPrev();
    if (next) next.disabled = !Engine.canNext();
  };

  Render.renderLogs = function () {
    var box = document.getElementById("logBox");
    if (!box) return;

    var lines = State.App.logs || [];
    box.textContent = lines.join("\n");

    // 常に末尾へ
    try { box.scrollTop = box.scrollHeight; } catch (e) {}
  };

  Render.renderFooter = function () {
    var vLine = document.getElementById("versionLine");
    var dLine = document.getElementById("dataLine");

    if (vLine) {
      vLine.textContent =
        "BUILD: " + State.App.build +
        " / JS: " + State.getAllVersions();
    }

    if (dLine) {
      dLine.textContent =
        "データ: " + State.App.dataSource +
        " / 件数: " + (State.App.rows ? State.App.rows.length : 0) +
        " / 最終読込: " + (State.App.lastLoadedAt || "—");
    }
  };

  global.Render = Render;

})(window);
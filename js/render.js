// JST: 2025-12-19 06:37:29 / render.js
(function (global) {
  "use strict";

  var Render = {};

  function el(id) { return document.getElementById(id); }

  Render.setStatus = function (text) {
    el("statusText").textContent = text || "";
  };

  Render.updateFooter = function () {
    var S = global.AppState;
    var base = global.SP_BASE;

    el("footerLine1").textContent = "接続先: " + (S.dataSource.label || "-");
    el("footerLine2").textContent = "Webルート: " + (window.location.origin + base.webRoot);
    el("footerLine3").textContent = "API: " + (window.location.origin + base.api);
    el("footerLine4").textContent = "最終読込: " + (S.lastLoadedAt || "-") + " / 件数: " + (S.total || 0);
  };

  Render.updatePills = function () {
    var S = global.AppState;
    el("progressPill").textContent = (S.current ? (S.index + 1) : S.total) + " / " + (S.total || "-");
    el("sourcePill").textContent = "接続先: " + (S.dataSource.label || "-");
    el("countPill").textContent = "件数: " + (S.total || 0);
    el("timePill").textContent = "経過: " + global.Engine.getElapsedSec() + "s";
  };

  Render.showQuestion = function () {
    var S = global.AppState;

    el("cardResult").classList.add("hidden");
    el("cardQuiz").classList.remove("hidden");

    Render.updatePills();

    if (!S.current) {
      // 終了
      Render.showResult();
      return;
    }

    el("questionText").textContent = S.current.question || "(問題文が空です)";
    el("questionSub").textContent = "選択肢: " + S.currentChoices.length + "択（表示順はランダム）";

    // choices render
    var area = el("choicesArea");
    area.innerHTML = "";

    for (var i = 0; i < S.currentChoices.length; i++) {
      (function (choiceObj) {
        var btn = document.createElement("button");
        btn.className = "choice";
        btn.type = "button";
        btn.textContent = choiceObj.text;
        btn.onclick = function () {
          Render.onChoiceClick(choiceObj);
        };
        area.appendChild(btn);
      })(S.currentChoices[i]);
    }

    // judge hidden
    var j = el("judgeArea");
    j.className = "judge hidden";
    el("judgeTitle").textContent = "";
    el("judgeBody").textContent = "";
  };

  Render.lockChoices = function () {
    var area = el("choicesArea");
    var btns = area.getElementsByTagName("button");
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
  };

  Render.showJudge = function (ok, correctAnswer, explain) {
    var j = el("judgeArea");
    j.className = "judge " + (ok ? "ok" : "ng");

    el("judgeTitle").textContent = ok ? "正解！" : "不正解";
    var body = "";
    body += "正解: " + (correctAnswer || "-") + "\n";
    body += "\n【解説】\n" + (explain || "(解説なし)");
    el("judgeBody").textContent = body;

    j.classList.remove("hidden");
    Render.updatePills();
  };

  Render.showResult = function () {
    var S = global.AppState;

    el("cardQuiz").classList.add("hidden");
    el("cardResult").classList.remove("hidden");

    var sec = global.Engine.getElapsedSec();
    var rate = (S.total ? Math.round((S.correct / S.total) * 100) : 0);

    el("resultText").textContent =
      "正解数: " + S.correct + " / " + S.total + "\n"
      + "正答率: " + rate + "%\n"
      + "所要時間: " + sec + "秒\n"
      + "\n接続先: " + (S.dataSource.label || "-");

    Render.updatePills();
  };

  Render.showModal = function (title, msg) {
    el("modalTitle").textContent = title || "データソース選択";
    el("modalMsg").textContent = msg || "";
    el("modalWrap").classList.remove("hidden");
  };

  Render.hideModal = function () {
    el("modalWrap").classList.add("hidden");
  };

  // event hooks (set by app.js)
  Render.onChoiceClick = function () {};
  Render.onTick = function () { Render.updatePills(); };

  global.Render = Render;

})(window);
// render.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  function setValidationBadge(ok, summaryText) {
    var badge = document.getElementById("validationBadge");
    var summary = document.getElementById("summary");
    var log = document.getElementById("validationLog");

    if (ok === true) {
      badge.textContent = "検証OK";
      badge.className = "pill ok";
    } else if (ok === false) {
      badge.textContent = "検証NG";
      badge.className = "pill ng";
    } else {
      badge.textContent = "未読み込み";
      badge.className = "pill";
    }

    summary.textContent = summaryText || "";
    return log;
  }

  function renderValidation(resultObj) {
    var log = setValidationBadge(resultObj.ok, resultObj.summary || "");
    var lines = [];

    if (resultObj.ok) {
      lines.push("検証: OK");
      lines.push("総問題数: " + resultObj.count);
      lines.push("カテゴリー内訳:");
      var cats = Object.keys(resultObj.stats).sort();
      for (var i = 0; i < cats.length; i++) {
        lines.push("  - " + cats[i] + ": " + resultObj.stats[cats[i]] + "問");
      }
      if (resultObj.warnings && resultObj.warnings.length) {
        lines.push("");
        lines.push("警告（読み込みは継続）:");
        for (var w = 0; w < resultObj.warnings.length; w++) lines.push("  * " + resultObj.warnings[w]);
      }
    } else {
      lines.push("検証: NG");
      lines.push("エラー:");
      for (var e = 0; e < resultObj.errors.length; e++) lines.push("  * " + resultObj.errors[e]);
      if (resultObj.warnings && resultObj.warnings.length) {
        lines.push("");
        lines.push("警告:");
        for (var w2 = 0; w2 < resultObj.warnings.length; w2++) lines.push("  * " + resultObj.warnings[w2]);
      }
    }

    log.textContent = lines.join("\n");
  }

  function showQuizBox(show) {
    var box = document.getElementById("quizBox");
    if (show) box.classList.remove("hidden");
    else box.classList.add("hidden");
  }

  function renderQuestion(q, idx, total, score) {
    document.getElementById("qMeta").textContent = q.id + " / " + q.category;
    document.getElementById("qProgress").textContent = (idx + 1) + " / " + total;
    document.getElementById("score").textContent = String(score);
    document.getElementById("qText").textContent = q.question;

    var choicesEl = document.getElementById("choices");
    choicesEl.innerHTML = "";

    for (var i = 0; i < q.choices.length; i++) {
      (function (choiceIndex) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choiceBtn";
        btn.textContent = (choiceIndex + 1) + ". " + q.choices[choiceIndex];
        btn.addEventListener("click", function () {
          global.App.onChoose(choiceIndex);
        });
        choicesEl.appendChild(btn);
      })(i);
    }

    // judge area reset
    document.getElementById("judgeBox").classList.add("hidden");
    document.getElementById("judgeBadge").textContent = "";
    document.getElementById("judgeBadge").className = "pill";
    document.getElementById("explain").textContent = "";
    document.getElementById("btnNext").disabled = true;
  }

  function renderJudge(isCorrect, correctIndex, selectedIndex, explanation) {
    var judgeBox = document.getElementById("judgeBox");
    var badge = document.getElementById("judgeBadge");
    var explain = document.getElementById("explain");
    var choicesEl = document.getElementById("choices");
    var btns = choicesEl.querySelectorAll("button");

    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;

    judgeBox.classList.remove("hidden");
    badge.textContent = isCorrect ? "正解" : "不正解";
    badge.className = "pill " + (isCorrect ? "ok" : "ng");
    explain.textContent = explanation;

    for (var j = 0; j < btns.length; j++) {
      if (j === correctIndex) btns[j].classList.add("correct");
      if (!isCorrect && j === selectedIndex) btns[j].classList.add("wrong");
    }

    document.getElementById("btnNext").disabled = false;
  }

  global.Render = {
    renderValidation: renderValidation,
    showQuizBox: showQuizBox,
    renderQuestion: renderQuestion,
    renderJudge: renderJudge
  };
})(window);
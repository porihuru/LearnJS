// render.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  function renderStatus() {
    Util.setText(Util.qs("#statusDataSource"), AppState.dataSource);
    Util.setText(Util.qs("#statusCount"), AppState.questions.length);
    Util.setText(Util.qs("#statusLoadedAt"), AppState.loadedAt);

    Util.setText(Util.qs("#footerDataSource"), AppState.dataSource);
    Util.setText(Util.qs("#footerCount"), AppState.questions.length);
    Util.setText(Util.qs("#footerLoadedAt"), AppState.loadedAt);
  }

  function renderCategorySelect() {
    var sel = Util.qs("#categorySelect");
    if (!sel) return;

    while (sel.options.length > 1) sel.remove(1);

    for (var i = 0; i < AppState.categories.length; i++) {
      var opt = document.createElement("option");
      opt.value = AppState.categories[i];
      opt.text = AppState.categories[i];
      sel.appendChild(opt);
    }
    sel.value = AppState.selectedCategory || "";
  }

  function renderCurrentQuestion() {
    var total = AppState.visible ? AppState.visible.length : 0;
    Util.setText(Util.qs("#progressTotal"), total);

    if (!AppState.visible || total === 0) {
      Util.setText(Util.qs("#progressCurrent"), 0);
      Util.setText(Util.qs("#quizId"), "-");
      Util.setText(Util.qs("#quizCategory"), "-");
      Util.setText(Util.qs("#quizQuestion"), "（データなし）");
      Util.setText(Util.qs("#quizExplanation"), "（データなし）");

      var cg = Util.qs("#choicesGrid");
      if (cg) cg.innerHTML = "";
      return;
    }

    var idx = AppState.selectedIndex;
    if (idx < 0) idx = 0;
    if (idx >= total) idx = total - 1;
    AppState.selectedIndex = idx;

    var q = AppState.visible[idx];

    Util.setText(Util.qs("#progressCurrent"), idx + 1);
    Util.setText(Util.qs("#quizId"), q.id || "-");
    Util.setText(Util.qs("#quizCategory"), q.category || "-");
    Util.setText(Util.qs("#quizQuestion"), q.question || "");
    Util.setText(Util.qs("#quizExplanation"), q.explanation || "");

    // 今は表示だけ（採点/シャッフルは後で追加）
    var cg2 = Util.qs("#choicesGrid");
    if (cg2) {
      cg2.innerHTML = "";
      var letters = ["A", "B", "C", "D"];
      for (var i = 0; i < q.choicesRaw.length; i++) {
        var ch = q.choicesRaw[i];
        var btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.type = "button";
        btn.disabled = true;

        var mark = document.createElement("span");
        mark.className = "choice-btn__mark";
        mark.textContent = letters[i] || "";

        var text = document.createElement("span");
        text.className = "choice-btn__text";
        text.textContent = ch.text || "";

        btn.appendChild(mark);
        btn.appendChild(text);
        cg2.appendChild(btn);
      }
    }
  }

  function clearLog() {
    AppState.logs = [];
    flushLog();
  }

  function log(line) {
    var ts = Util.nowText();
    AppState.logs.push("[" + ts + "] " + line);
    flushLog();
  }

  function flushLog() {
    var body = Util.qs("#noticeBody");
    if (!body) return;
    body.textContent = (AppState.logs || []).join("\n");
  }

  global.Render = {
    renderStatus: renderStatus,
    renderCategorySelect: renderCategorySelect,
    renderCurrentQuestion: renderCurrentQuestion,
    clearLog: clearLog,
    log: log
  };
})(window);

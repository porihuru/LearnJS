// render.js / 作成日時(JST): 2025-12-21 15:40:00
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

    // 既存オプション初期化（先頭の「すべて」は残す）
    while (sel.options.length > 1) sel.remove(1);

    for (var i = 0; i < AppState.categories.length; i++) {
      var opt = document.createElement("option");
      opt.value = AppState.categories[i];
      opt.text = AppState.categories[i];
      sel.appendChild(opt);
    }

    sel.value = AppState.selectedCategory || "";
  }

  function renderList() {
    var list = Util.qs("#questionList");
    var empty = Util.qs("#questionListEmpty");
    if (!list) return;

    // クリア（空メッセージは後で制御）
    list.innerHTML = "";

    if (!AppState.visible || AppState.visible.length === 0) {
      if (empty) {
        empty.style.display = "block";
        list.appendChild(empty);
      }
      Util.setText(Util.qs("#listShownCount"), 0);
      return;
    }

    if (empty) empty.style.display = "none";

    for (var i = 0; i < AppState.visible.length; i++) {
      var q = AppState.visible[i];
      var row = document.createElement("div");
      row.className = "q-row" + (i === AppState.selectedIndex ? " q-row--selected" : "");
      row.setAttribute("data-index", String(i));

      var title = document.createElement("div");
      title.className = "q-row__title";
      title.textContent = (q.id ? ("[" + q.id + "] ") : "") + q.question;

      var meta = document.createElement("div");
      meta.className = "q-row__meta";
      meta.textContent = "カテゴリ: " + (q.category || "-");

      row.appendChild(title);
      row.appendChild(meta);
      list.appendChild(row);
    }

    Util.setText(Util.qs("#listShownCount"), AppState.visible.length);
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

    // choices: 今は並びを固定表示（シャッフル・採点は次フェーズ）
    var cg2 = Util.qs("#choicesGrid");
    if (cg2) {
      cg2.innerHTML = "";
      var letters = ["A", "B", "C", "D"];
      for (var i = 0; i < q.choicesRaw.length; i++) {
        var ch = q.choicesRaw[i];
        var btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.type = "button";
        btn.setAttribute("data-choice-index", String(i));
        btn.disabled = true; // 機能追加前なので無効

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

    // 前後ボタン：今は未実装なので無効のまま（後で有効化）
  }

  function showNotice(title, body) {
    Util.setText(Util.qs("#noticeTitle"), title);
    Util.setText(Util.qs("#noticeBody"), body);
  }

  global.Render = {
    renderStatus: renderStatus,
    renderCategorySelect: renderCategorySelect,
    renderList: renderList,
    renderCurrentQuestion: renderCurrentQuestion,
    showNotice: showNotice
  };
})(window);

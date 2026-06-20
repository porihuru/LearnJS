/*
  ファイル: js/render.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  画面仕様:
    - 開始前：出題グループは非表示
    - 開始後：カテゴリ/開始/履歴削除を非表示、出題グループ表示
    - 回答後：即ポップアップ（正解/不正解、正解、解説、集計、次へ/終了）
*/
(function (global) {
  "use strict";

  var Render = {};
  Render.VERSION = "20251226-01";
  Util.registerVersion("render.js", Render.VERSION);

  /* [IDX-010] カテゴリセレクト描画（各カテゴリに件数付与） */
  Render.renderCategories = function () {
    var sel = Util.byId("categorySelect");
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

  Render.renderStartQuestions = function (category) {
    var sel = Util.byId("startQuestionSelect");
    if (!sel) return;

    while (sel.options.length > 0) sel.remove(0);

    var rows = Engine.getRowsForCategory(category);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var question = String(row.question || "").replace(/\s+/g, " ");
      if (question.length > 42) question = question.substring(0, 42) + "...";

      var opt = document.createElement("option");
      opt.value = String(row.idNum || row.idText || "");
      opt.textContent = (i + 1) + "問目：" + question;
      sel.appendChild(opt);
    }

    if (sel.options.length > 0) sel.selectedIndex = 0;
    sel.disabled = rows.length === 0;
  };

  function buildAnalysis() {
    var rows = State.App.rows || [];
    var histMap = State.App.histMap || {};
    var categories = {};
    var totalCorrect = 0;
    var totalWrong = 0;
    var unanswered = 0;
    var weak = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var category = row.category || "（カテゴリなし）";
      var hist = HistoryStore.get(histMap, row.idText || "");
      var c = hist.c || 0;
      var w = hist.w || 0;
      var attempts = c + w;

      if (!categories[category]) {
        categories[category] = { name: category, c: 0, w: 0, questions: 0, unanswered: 0 };
      }
      categories[category].c += c;
      categories[category].w += w;
      categories[category].questions++;

      totalCorrect += c;
      totalWrong += w;
      if (attempts === 0) {
        unanswered++;
        categories[category].unanswered++;
      }
      if (attempts >= 2 && (w >= 2 || (c / attempts) < 0.5)) weak++;
    }

    var list = [];
    for (var key in categories) {
      if (!categories.hasOwnProperty(key)) continue;
      var item = categories[key];
      item.attempts = item.c + item.w;
      item.rate = item.attempts > 0 ? Math.round((item.c / item.attempts) * 100) : 0;
      list.push(item);
    }
    list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });

    return {
      correct: totalCorrect,
      wrong: totalWrong,
      attempts: totalCorrect + totalWrong,
      unanswered: unanswered,
      weak: weak,
      categories: list
    };
  }

  function setWidth(id, percent) {
    var el = Util.byId(id);
    if (el) el.style.width = percent + "%";
  }

  Render.renderCategoryAnalysis = function () {
    var data = buildAnalysis();
    var sel = Util.byId("analysisCategorySelect");
    if (!sel) return;

    var item = null;
    for (var i = 0; i < data.categories.length; i++) {
      if (String(data.categories[i].name) === String(sel.value)) {
        item = data.categories[i];
        break;
      }
    }
    if (!item && data.categories.length > 0) item = data.categories[0];

    if (!item) {
      Util.setText("categoryStats", "カテゴリがありません");
      setWidth("categoryRateBar", 0);
      return;
    }

    Util.setText(
      "categoryStats",
      "回答 " + item.attempts + "回 / 正解 " + item.c + "回 / 不正解 " + item.w +
      "回 / 未回答 " + item.unanswered + "問 / 正答率 " + item.rate + "%"
    );
    setWidth("categoryRateBar", item.rate);
  };

  Render.renderAnalysis = function () {
    var data = buildAnalysis();
    var rate = data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0;

    Util.setText("analysisAttempts", data.attempts);
    Util.setText("analysisRate", rate + "%");
    Util.setText("analysisUnanswered", data.unanswered);
    Util.setText("analysisWeak", data.weak);
    setWidth("overallCorrectBar", rate);
    setWidth("overallWrongBar", data.attempts > 0 ? 100 - rate : 0);

    Util.setText(
      "overallLegend",
      data.attempts > 0
        ? "正解 " + data.correct + "回（" + rate + "%） / 不正解 " + data.wrong + "回（" + (100 - rate) + "%）"
        : "まだ回答履歴がありません"
    );

    var sel = Util.byId("analysisCategorySelect");
    if (sel) {
      var previous = sel.value;
      while (sel.options.length > 0) sel.remove(0);
      for (var i = 0; i < data.categories.length; i++) {
        var option = document.createElement("option");
        option.value = data.categories[i].name;
        option.textContent = data.categories[i].name;
        sel.appendChild(option);
      }
      if (previous) sel.value = previous;
      if (!sel.value && sel.options.length > 0) sel.selectedIndex = 0;
    }
    Render.renderCategoryAnalysis();

    var review = [];
    for (var j = 0; j < data.categories.length; j++) {
      if (data.categories[j].attempts > 0) review.push(data.categories[j]);
    }
    review.sort(function (a, b) {
      if (a.rate !== b.rate) return a.rate - b.rate;
      return b.attempts - a.attempts;
    });

    var wrap = Util.byId("reviewCategoryList");
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    if (review.length === 0) {
      var empty = document.createElement("div");
      empty.className = "analysisEmpty";
      empty.textContent = "回答すると、要復習カテゴリが表示されます。";
      wrap.appendChild(empty);
      return;
    }

    var limit = review.length < 5 ? review.length : 5;
    for (var k = 0; k < limit; k++) {
      var rowEl = document.createElement("div");
      rowEl.className = "reviewRow";
      var nameEl = document.createElement("div");
      nameEl.className = "reviewName";
      nameEl.textContent = (k + 1) + ". " + review[k].name;
      nameEl.title = review[k].name;
      var rateEl = document.createElement("div");
      rateEl.className = "reviewRate";
      rateEl.textContent = review[k].rate + "% (" + review[k].attempts + "回)";
      rowEl.appendChild(nameEl);
      rowEl.appendChild(rateEl);
      wrap.appendChild(rowEl);
    }
  };

  /* [IDX-020] 右上情報 */
  Render.renderTopInfo = function () {
    var el = Util.byId("topInfo");
    if (!el) return;
    el.textContent = "起動: " + (State.App.openedAt || "(未設定)") + " / HTML: " + State.VERS.html + " / CSS: " + State.VERS.css;
  };

  /* [IDX-030] ログ */
  Render.renderLogs = function () {
    var box = Util.byId("logBox");
    if (!box) return;

    var lines = State.App.logs || [];
    box.textContent = lines.join("\n");
    try { box.scrollTop = box.scrollHeight; } catch (e) {}
  };

  /* [IDX-040] フッター */
  Render.renderFooter = function () {
    var vLine = Util.byId("versionLine");
    var dLine = Util.byId("dataLine");

    if (vLine) vLine.textContent = "BUILD: " + State.App.build + " / JS: " + State.getAllVersions();
    if (dLine) {
      dLine.textContent =
        "データ: " + State.App.dataSource +
        " / 件数: " + (State.App.rows ? State.App.rows.length : 0) +
        " / 最終読込: " + (State.App.lastLoadedAt || "—");
    }
  };

  /* [IDX-050] 出題モード切替（App.jsから呼ぶ） */
  Render.setQuizMode = function (on) {
    State.App.inQuizMode = !!on;

    Util.setDisplay("quizPanel", !!on);

    Util.setDisplay("boxCategory", !on);
    Util.setDisplay("boxRandomStart", !on);
    Util.setDisplay("boxSequentialStart", !on);
    Util.setDisplay("analysisPanel", !on);
  };

  function clearChoices() {
    var wrap = Util.byId("choices");
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

  function submitAnswer(answerText) {
    var res = Engine.selectAnswer(answerText);
    if (!res || !res.ok) return;

    HistoryStore.inc(State.App.histMap, res.idText, !!res.isCorrect);
    State.log("履歴更新: " + res.idText + " / " + (res.isCorrect ? "正解+1" : "不正解+1"));

    Render.renderQuestion();
    Render.renderFooter();
    Render.renderAnalysis();
    Render.showAnswerModal(res);
  }

  function renderTextAnswer(wrap, ans) {
    var area = document.createElement("div");
    area.className = "textAnswerArea";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "textAnswerInput";
    input.placeholder = "答えを入力";
    input.value = ans.selectedText || "";
    input.disabled = !!ans.isAnswered;

    var button = document.createElement("button");
    button.className = "btnPrimary textAnswerButton";
    button.textContent = "回答する";
    button.disabled = !!ans.isAnswered;

    function send() {
      if (ans.isAnswered) return;
      var value = input.value;
      if (!String(value).replace(/^\s+|\s+$/g, "")) {
        input.focus();
        return;
      }
      submitAnswer(value);
    }

    button.onclick = send;
    input.onkeydown = function (event) {
      event = event || window.event;
      if ((event.key && event.key === "Enter") || event.keyCode === 13) send();
    };

    area.appendChild(input);
    area.appendChild(button);
    wrap.appendChild(area);

    if (!ans.isAnswered) {
      try { input.focus(); } catch (e) {}
    }
  }

  /* [IDX-060] 出題表示 */
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
    var s = State.App.session;
    var questionNum = "";
    if (s && s.items) {
      questionNum = (s.index + 1) + "/" + s.items.length + "問";
    }

    /* パネルタイトルを更新 */
    var titleEl = Util.byId("quizPanelTitle");
    if (titleEl) {
      titleEl.textContent = "出題　" + questionNum;
    }

    Util.setText("metaId", row.idText || "");
    Util.setText("metaCategory", row.category || "");
    Util.setText("questionText", row.question || "");

    var st = "未回答";
    if (ans.isAnswered) st = ans.isCorrect ? "正解" : "不正解";
    Util.setText("metaStatus", st);

    var hist = HistoryStore.get(State.App.histMap, row.idText || "");
    Util.setText("metaHist", "正解" + hist.c + "回 / 不正解" + hist.w + "回");

    clearChoices();
    var wrap = Util.byId("choices");
    if (!wrap) return;

    var hint = Util.byId("answerHint");
    if (hint) {
      hint.textContent = (ans.type === "text")
        ? "記述問題（答えを入力 / 回答は1回のみ）"
        : "選択肢（毎回ランダム表示 / 回答は1回のみ）";
    }

    if (ans.type === "text") {
      renderTextAnswer(wrap, ans);
      return;
    }

    for (var i = 0; i < ans.options.length; i++) {
      var opt = ans.options[i];

      var mark = "";
      if (ans.isAnswered) {
        if (String(opt.text) === String(ans.selectedText)) {
          mark = ans.isCorrect ? "correct" : "wrong";
        }
      }

      var btn = createChoiceButton(opt, ans.isAnswered, mark);

      /* [IDX-061] 回答は1回のみ：未回答時だけクリック有効 */
      if (!ans.isAnswered) {
        (function (choiceText) {
          btn.onclick = function () {
            submitAnswer(choiceText);
          };
        })(opt.text);
      } else {
        btn.onclick = null;
      }

      wrap.appendChild(btn);
    }
  };

  /* ========= モーダル ========= */

  function showOverlay() { Util.byId("modalOverlay").style.display = "block"; }
  function hideOverlay() { Util.byId("modalOverlay").style.display = "none"; }

  function setModal(mode) {
    Util.byId("modalFooterAnswer").style.display = (mode === "answer") ? "flex" : "none";
    Util.byId("modalFooterResult").style.display = (mode === "result") ? "flex" : "none";
  }

  /* [IDX-100] 回答結果モーダル */
  Render.showAnswerModal = function (res) {
    var title = Util.byId("modalTitle");
    var body = Util.byId("modalBody");
    if (!title || !body) return;

    setModal("answer");

    var okng = res.isCorrect ? "正解" : "不正解";
    var cls = res.isCorrect ? "isCorrect" : "isWrong";

    var stats = res.stats || { total: 0, correct: 0, wrong: 0 };
    var s = State.App.session;
    var questionNum = "";
    if (s && s.items) {
      questionNum = " " + (s.index + 1) + "/" + s.items.length + "問";
    }

    title.textContent = "回答結果" + questionNum;

    var html = "";
    html += '<div class="resultTopLine ' + cls + '">' + Util.esc(okng) + "</div>";

    html += '<div class="modalSectionTitle">正解の答え</div>';
    html += "<div>" + Util.esc(res.correctText || "") + "</div>";

    html += '<div class="modalSectionTitle">解説</div>';
    html += "<div>" + Util.esc(res.explanation || "") + "</div>";

    html += '<div class="modalSectionTitle">集計</div>';
    html += "<div>問題数: " + Util.esc(stats.total) +
            "　正解数: " + Util.esc(stats.correct) +
            "　不正解数: " + Util.esc(stats.wrong) + "</div>";

    body.innerHTML = html;
    showOverlay();
  };

  /* [IDX-110] 結果発表モーダル（印刷/メール用スナップショット生成） */
  Render.showResultModal = function () {
    var title = Util.byId("modalTitle");
    var body = Util.byId("modalBody");
    if (!title || !body) return;

    setModal("result");
    title.textContent = "結果発表";

    var snap = Engine.buildResultSnapshot();
    var r = (snap && snap.result) ? snap.result : { total: 0, answered: 0, correct: 0, wrong: 0, rate: 0, at: Util.nowStamp() };

    var html = "";
    html += "<div class='resultStats'>問題数: " + Util.esc(r.total) + "</div>";
    html += "<div class='resultStats'>回答数: " + Util.esc(r.answered) + "</div>";
    html += "<div class='resultStats'>正解数: " + Util.esc(r.correct) + "</div>";
    html += "<div class='resultStats'>不正解数: " + Util.esc(r.wrong) + "</div>";
    html += "<div class='resultStats'>正答率: " + Util.esc(r.rate) + "%</div>";

    html += "<div style='margin-top:10px;'>お疲れさまでした。</div>";

    body.innerHTML = html;
    showOverlay();
  };

  Render.hideModal = function () { hideOverlay(); };

  global.Render = Render;

})(window);

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
    Util.setDisplay("boxIdStart", !on);
    Util.setDisplay("btnClearHistory", !on);
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
            var res = Engine.selectAnswer(choiceText);
            if (!res || !res.ok) return;

            /* [IDX-062] Cookie履歴更新 */
            HistoryStore.inc(State.App.histMap, res.idText, !!res.isCorrect);
            State.log("履歴更新: " + res.idText + " / " + (res.isCorrect ? "正解+1" : "不正解+1"));

            Render.renderQuestion();
            Render.renderFooter();
            Render.showAnswerModal(res);
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

    /* [IDX-111] Cookie履歴（全体） */
    var histArr = HistoryStore.toArraySorted(State.App.histMap);
    var histText = "";
    for (var i = 0; i < histArr.length; i++) {
      var h = histArr[i];
      histText += "ID" + h.id + "：正解" + h.c + " 不正解" + h.w + "\n";
    }
    if (!histText) histText = "（履歴なし）\n";

    var html = "";
    html += "<div class='resultStats'>問題数: " + Util.esc(r.total) + "</div>";
    html += "<div class='resultStats'>回答数: " + Util.esc(r.answered) + "</div>";
    html += "<div class='resultStats'>正解数: " + Util.esc(r.correct) + "</div>";
    html += "<div class='resultStats'>不正解数: " + Util.esc(r.wrong) + "</div>";
    html += "<div class='resultStats'>正答率: " + Util.esc(r.rate) + "%</div>";

    html += '<div class="modalSectionTitle">累積履歴（Cookie）</div>';
    html += "<div style='white-space:pre-wrap;'>" + Util.esc(histText) + "</div>";

    html += "<div style='margin-top:10px;'>お疲れさまでした。</div>";

    body.innerHTML = html;
    showOverlay();
  };

  Render.hideModal = function () { hideOverlay(); };

  global.Render = Render;

})(window);

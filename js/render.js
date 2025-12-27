/*
  ファイル: js/render.js
  作成日時(JST): 2025-12-27 10:15:00
  VERSION: 20251227-01

  画面仕様（Render担当）:
    - 開始前：出題グループ(quizPanel)は非表示、開始UIは表示
    - 開始後：開始UIを非表示、出題グループを表示
    - 回答は1回のみ（未回答時のみクリック有効）
    - 選択肢は行に応じて可変（2択/3択/4択）：空文字の選択肢は表示しない（空欄行を作らない）
    - 回答後：即モーダル表示（正解/不正解を大きく、正解=青/不正解=赤）
    - モーダルのボタン配置：次へ(左寄せ/幅3倍)・終了(右寄せ)、文字は中央
    - モーダルは内容が増えたらスクロール可能（はみ出し防止）
    - 結果発表モーダル：メール本文と同じ形式をポップアップ内に表示（解説は載せない）
*/
(function (global) {
  "use strict";

  var Render = {};
  Render.VERSION = "20251227-01";
  Util.registerVersion("render.js", Render.VERSION);

  /* =========================
     [IDX-001] 小物
  ========================= */

  function el(id) { return Util.byId(id); }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function toStr(v) { return (v === null || v === undefined) ? "" : String(v); }

  function isBlank(s) {
    var t = toStr(s);
    t = t.replace(/\u3000/g, " "); // 全角スペースも考慮
    return t.replace(/^\s+|\s+$/g, "") === "";
  }

  /* =========================
     [IDX-010] カテゴリセレクト描画（件数付与）
  ========================= */
  Render.renderCategories = function () {
    var sel = el("categorySelect");
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

  /* =========================
     [IDX-020] 右上情報（起動日時 + HTML/CSSバージョン）
  ========================= */
  Render.renderTopInfo = function () {
    var info = el("topInfo");
    if (!info) return;

    var opened = State.App.openedAt || "(未設定)";
    var htmlV = State.VERS && State.VERS.html ? State.VERS.html : "(不明)";
    var cssV  = State.VERS && State.VERS.css  ? State.VERS.css  : "(不明)";

    info.textContent = "起動: " + opened + " / HTML: " + htmlV + " / CSS: " + cssV;
  };

  /* =========================
     [IDX-030] ログ描画
  ========================= */
  Render.renderLogs = function () {
    var box = el("logBox");
    if (!box) return;

    var lines = State.App.logs || [];
    box.textContent = lines.join("\n");

    try { box.scrollTop = box.scrollHeight; } catch (e) {}
  };

  /* =========================
     [IDX-040] フッター表示（BUILD / JS / データ）
  ========================= */
  Render.renderFooter = function () {
    var vLine = el("versionLine");
    var dLine = el("dataLine");

    if (vLine) {
      vLine.textContent = "BUILD: " + (State.App.build || "—") + " / JS: " + State.getAllVersions();
    }
    if (dLine) {
      dLine.textContent =
        "データ: " + (State.App.dataSource || "—") +
        " / 件数: " + ((State.App.rows && State.App.rows.length) ? State.App.rows.length : 0) +
        " / 最終読込: " + (State.App.lastLoadedAt || "—");
    }
  };

  /* =========================
     [IDX-050] 出題モード切替（開始前/開始後）
       - quizPanel: 出題グループ（枠）
       - boxCategory / boxRandomStart / boxIdStart / btnClearHistory: 開始UI
  ========================= */
  Render.setQuizMode = function (on) {
    State.App.inQuizMode = !!on;

    Util.setDisplay("quizPanel", !!on);

    Util.setDisplay("boxCategory", !on);
    Util.setDisplay("boxRandomStart", !on);
    Util.setDisplay("boxIdStart", !on);
    Util.setDisplay("btnClearHistory", !on);
  };

  /* =========================
     [IDX-060] 選択肢ボタン生成
  ========================= */
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

  /* =========================
     [IDX-070] 出題表示
       - 2択/3択/4択の可変に対応（空文字の選択肢は描画しない）
       - key(A/B/C/D)も可変に合わせて振り直す
  ========================= */
  Render.renderQuestion = function () {
    var cur = Engine.getCurrent();

    if (!cur) {
      Util.setText("metaId", "（未開始）");
      Util.setText("metaCategory", "（未開始）");
      Util.setText("metaStatus", "未回答");
      Util.setText("metaHist", "正解0回 / 不正解0回");
      Util.setText("questionText", "（未開始）");
      clearChildren(el("choices"));
      return;
    }

    var row = cur.row || {};
    var ans = cur.ans || {};

    Util.setText("metaId", row.idText || "");
    Util.setText("metaCategory", row.category || "");
    Util.setText("questionText", row.question || "");

    var st = "未回答";
    if (ans.isAnswered) st = ans.isCorrect ? "正解" : "不正解";
    Util.setText("metaStatus", st);

    /* [IDX-071] 履歴（Cookie） */
    var hist = HistoryStore.get(State.App.histMap, row.idText || "");
    Util.setText("metaHist", "正解" + (hist.c || 0) + "回 / 不正解" + (hist.w || 0) + "回");

    /* [IDX-072] 選択肢描画（空文字は除外） */
    var wrap = el("choices");
    clearChildren(wrap);
    if (!wrap) return;

    var raw = ans.options || [];
    var valid = [];
    for (var i = 0; i < raw.length; i++) {
      var t = toStr(raw[i].text);
      if (!isBlank(t)) valid.push({ key: raw[i].key, text: t });
    }

    /* [IDX-073] 可変個数に合わせて A/B/C/D を振り直す */
    var keys = ["A", "B", "C", "D"];
    for (var k = 0; k < valid.length; k++) valid[k].key = keys[k] || ("#" + (k + 1));

    for (var j = 0; j < valid.length; j++) {
      var opt = valid[j];

      var mark = "";
      if (ans.isAnswered) {
        if (toStr(opt.text) === toStr(ans.selectedText)) {
          mark = ans.isCorrect ? "correct" : "wrong";
        }
      }

      var btn = createChoiceButton(opt, !!ans.isAnswered, mark);

      /* [IDX-074] 回答は1回のみ（未回答時だけクリック有効） */
      if (!ans.isAnswered) {
        (function (choiceText) {
          btn.onclick = function () {
            var res = Engine.selectAnswer(choiceText);
            if (!res || !res.ok) return;

            /* [IDX-075] Cookie履歴更新 */
            HistoryStore.inc(State.App.histMap, res.idText, !!res.isCorrect);
            State.log("履歴更新: " + res.idText + " / " + (res.isCorrect ? "正解+1" : "不正解+1"));

            Render.renderQuestion();
            Render.renderFooter();

            /* [IDX-076] 回答結果モーダル表示 */
            Render.showAnswerModal(res);
          };
        })(opt.text);
      } else {
        btn.onclick = null;
      }

      wrap.appendChild(btn);
    }
  };

  /* =========================================================
     [IDX-100] モーダル制御
  ========================================================= */

  function showOverlay() {
    var ov = el("modalOverlay");
    if (!ov) return;
    ov.style.display = "block";

    /* [IDX-101] 半透明問題対策：モーダル本体は不透明に寄せる */
    var panel = el("modalPanel");
    if (panel) {
      panel.style.opacity = "1";
      panel.style.backgroundColor = "#ffffff";
    }

    /* [IDX-102] はみ出し対策：bodyをスクロール可能にする（CSSが無くても最低限動く） */
    var body = el("modalBody");
    if (body) {
      body.style.overflowY = "auto";
      body.style.maxHeight = "70vh"; // iPhoneでもはみ出しにくい
      body.style.webkitOverflowScrolling = "touch";
    }
  }

  function hideOverlay() {
    var ov = el("modalOverlay");
    if (!ov) return;
    ov.style.display = "none";
  }

  function setModal(mode) {
    /* mode: "answer" or "result" */
    var fa = el("modalFooterAnswer");
    var fr = el("modalFooterResult");
    if (fa) fa.style.display = (mode === "answer") ? "flex" : "none";
    if (fr) fr.style.display = (mode === "result") ? "flex" : "none";

    /* [IDX-103] ボタン配置（左：次へ / 右：終了）※ボタン自体を寄せる、文字は中央 */
    if (mode === "answer") {
      var foot = el("modalFooterAnswer");
      if (foot) {
        foot.style.display = "flex";
        foot.style.justifyContent = "space-between";
        foot.style.alignItems = "center";
      }

      var btnNext = el("btnModalNext");
      var btnEnd  = el("btnModalEnd");
      if (btnNext) {
        btnNext.style.width = "60%";       // 「今の3倍」相当（目安）
        btnNext.style.textAlign = "center"; // ボタン内文字は中央
      }
      if (btnEnd) {
        btnEnd.style.width = "";           // そのまま
        btnEnd.style.textAlign = "center"; // ボタン内文字は中央
      }
    }

    if (mode === "result") {
      var footR = el("modalFooterResult");
      if (footR) {
        footR.style.display = "flex";
        footR.style.justifyContent = "space-between";
        footR.style.alignItems = "center";
      }
    }
  }

  Render.hideModal = function () { hideOverlay(); };

  /* =========================================================
     [IDX-120] 回答結果モーダル
       - 正解/不正解：大きく、正解=青 / 不正解=赤
       - 解説は表示（回答モーダルのみ）
       - 次へ/終了は footer の左右
  ========================================================= */
  Render.showAnswerModal = function (res) {
    var title = el("modalTitle");
    var body = el("modalBody");
    if (!title || !body) return;

    setModal("answer");
    title.textContent = "回答結果";

    var okng = res.isCorrect ? "正解" : "不正解";
    var cls = res.isCorrect ? "isCorrect" : "isWrong"; // CSS側で色(青/赤)想定

    var stats = res.stats || { total: 0, correct: 0, wrong: 0 };

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

  /* =========================================================
     [IDX-140] 結果発表モーダル（メール本文と同じ形式）
       - 問題文/選択した答え/正解の答え を載せる
       - 解説は載せない
       - 「【今回の結果（全問）】」の後に1行空ける
       - ヘッダー行（ID/カテゴリ/結果/履歴 正解/不正解）を入れる
  ========================================================= */
  Render.showResultModal = function () {
    var title = el("modalTitle");
    var body = el("modalBody");
    if (!title || !body) return;

    setModal("result");
    title.textContent = "結果発表";

    var snap = Engine.buildResultSnapshot();
    var r = (snap && snap.result) ? snap.result : {
      total: 0, answered: 0, correct: 0, wrong: 0, rate: 0, at: Util.nowStamp()
    };
    var details = (snap && snap.details) ? snap.details : [];

    var lines = [];
    lines.push("text_access問題集 結果");
    lines.push("日時: " + (r.at || Util.nowStamp()));
    lines.push("");
    lines.push("【今回の結果】");
    lines.push("問題数: " + (r.total || 0));
    lines.push("回答数: " + (r.answered || 0));
    lines.push("正解数: " + (r.correct || 0));
    lines.push("不正解数: " + (r.wrong || 0));
    lines.push("正答率: " + (r.rate || 0) + "%");
    lines.push("");
    lines.push("【今回の結果（全問）】");
    lines.push(""); /* ← 1行空ける */

    lines.push("| ID | カテゴリ | 結果 |履歴 正解/不正解|");
    lines.push("問題");
    lines.push("選択した答え");
    lines.push("正解の答え");
    lines.push(""); /* 見出しブロックの後の空行 */

    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      var id = toStr(d.id);
      var cat = toStr(d.category);
      var judge = d.ok ? "正解" : "不正解";

      var histObj = HistoryStore.get(State.App.histMap, id);
      var hist = String(histObj.c || 0) + "/" + String(histObj.w || 0);

      lines.push("| " + id + " | " + cat + " | " + judge + " | " + hist + " |");
      lines.push(toStr(d.question));
      lines.push(toStr(d.selected));
      lines.push(toStr(d.correct));
      lines.push(""); /* 区切り（空行） */
    }

    if (details.length === 0) {
      lines.push("（明細なし）");
    }

    /* [IDX-141] 表示はpre相当（monoBlockはCSSで pre-wrap を想定） */
    body.innerHTML = "<div class='monoBlock'>" + Util.esc(lines.join("\n")) + "</div>";

    showOverlay();
  };

  /* =========================
     [IDX-200] 公開
  ========================= */
  global.Render = Render;

})(window);
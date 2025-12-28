/*
  ファイル: js/engine.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  重要仕様:
    - Choice1 を正解として扱う
    - 選択肢は毎回ランダム表示（ただし「同一問題内」は固定：回答後に並びが変わらないよう、開始時にシャッフルして保持）
    - 回答は1回のみ（2回目以降のクリックは無効）
*/
(function (global) {
  "use strict";

  var Engine = {};
  Engine.VERSION = "20251226-01";
  Util.registerVersion("engine.js", Engine.VERSION);

  /* [IDX-010] カテゴリ集計 */
  Engine.buildCategories = function () {
    var rows = State.App.rows || [];
    var counts = {};
    counts["__ALL__"] = rows.length;

    var cats = {};
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i].category || "";
      if (!counts[c]) counts[c] = 0;
      counts[c]++;

      if (!cats[c]) cats[c] = true;
    }

    var list = [];
    for (var k in cats) if (cats.hasOwnProperty(k)) list.push(k);

    list.sort(function (a, b) { return String(a).localeCompare(String(b)); });

    State.App.categories = list;
    State.App.categoryCounts = counts;
  };

  function filterByCategory(rows, category) {
    if (!category || category === "__ALL__") return rows.slice(0);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].category) === String(category)) out.push(rows[i]);
    }
    return out;
  }

/* ===========================
   修正対象: js/engine.js
   修正内容: buildItem(row) を丸ごと差し替え
   目的:
     - Choice1が正解（仕様維持）
     - 2択/3択/4択に自動対応（空欄Choiceは表示しない）
     - 選択肢は毎回ランダム（ただし同一問題内で固定）
   重要:
     - Util.shuffle は「新しい配列を返す」実装なので、必ず代入する
=========================== */

// ★ここから差し替え★（engine.js の function buildItem(row){...} を丸ごと置換）
function buildItem(row) {

  /* [IDX-019] trim互換（Util.trim などに依存しない） */
  function trimCompat(v) {
    var t = (v === null || v === undefined) ? "" : String(v);
    t = t.replace(/\u3000/g, " ");          // 全角スペース→半角
    return t.replace(/^\s+|\s+$/g, "");     // 前後空白除去
  }

  /* [IDX-020] Choice1〜4 を取得して空欄は除外（2択/3択/4択に自動対応） */
  var c1 = trimCompat(row.choice1 || "");
  var c2 = trimCompat(row.choice2 || "");
  var c3 = trimCompat(row.choice3 || "");
  var c4 = trimCompat(row.choice4 || "");

  var texts = [];
  if (c1) texts.push(c1);
  if (c2) texts.push(c2);
  if (c3) texts.push(c3);
  if (c4) texts.push(c4);

  /* [IDX-021] 正解は Choice1（仕様） */
  var correctText = c1;

  /* [IDX-022] 念のため：Choice1 が空の異常データでも落とさない */
  if (!correctText && texts.length > 0) correctText = texts[0];

  /* [IDX-023] 同一問題内の選択肢は開始時にシャッフルして固定
     ※ Util.shuffle は「新しい配列を返す」ので必ず代入する */
  texts = Util.shuffle(texts);

  /* [IDX-024] options を生成（キーは A/B/C... を可変で振り直す） */
  var keys = ["A", "B", "C", "D", "E", "F"];
  var options = [];
  for (var i = 0; i < texts.length; i++) {
    options.push({
      key: keys[i] || String(i + 1),
      text: texts[i]
    });
  }

  return {
    row: row,
    ans: {
      options: options,
      correctText: correctText,   // Choice1が正解（判定はテキスト一致）
      selectedText: "",
      isAnswered: false,
      isCorrect: false
    }
  };
}
// ★ここまで差し替え★


  function startSession(items, modeDesc) {
    var s = {
      items: items,
      index: 0,
      stats: { total: items.length, answered: 0, correct: 0, wrong: 0 }
    };
    State.App.session = s;
    State.App.lastResult = null;
    State.App.lastResultDetails = null;

    State.log("出題開始(" + modeDesc + "): actual=" + items.length);
  }

  /* [IDX-030] ランダムスタート */
  Engine.startRandom = function (category, count) {
    var rows = filterByCategory(State.App.rows || [], category);
    var shuffledRows = Util.shuffle(rows);

    var n = count;
    if (n < 1) n = 1;
    if (n > shuffledRows.length) n = shuffledRows.length;

    var picked = [];
    for (var i = 0; i < n; i++) picked.push(buildItem(shuffledRows[i]));

    startSession(picked, "ランダム");
    State.log("出題開始(ランダム): category=" + (category || "ALL") + " count=" + count + " actual=" + picked.length);
  };

  /* [IDX-040] ID指定スタート（カテゴリ内でID>=startIdをID昇順で） */
  Engine.startFromId = function (category, startId, count) {
    var rows = filterByCategory(State.App.rows || [], category);

    rows.sort(function (a, b) {
      return (a.idNum || 0) - (b.idNum || 0);
    });

    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if ((rows[i].idNum || 0) >= startId) out.push(rows[i]);
    }

    var n = count;
    if (n < 1) n = 1;
    if (n > out.length) n = out.length;

    var picked = [];
    for (var j = 0; j < n; j++) picked.push(buildItem(out[j]));

    startSession(picked, "ID指定");
    State.log("出題開始(ID指定): category=" + (category || "ALL") + " startId=" + startId + " count=" + count + " actual=" + picked.length);
  };

  Engine.getCurrent = function () {
    var s = State.App.session;
    if (!s || !s.items || s.items.length === 0) return null;
    if (s.index < 0) s.index = 0;
    if (s.index >= s.items.length) s.index = s.items.length - 1;
    return s.items[s.index];
  };

  Engine.hasNext = function () {
    var s = State.App.session;
    if (!s) return false;
    return (s.index < s.items.length - 1);
  };

  Engine.next = function () {
    var s = State.App.session;
    if (!s) return;
    if (s.index < s.items.length - 1) s.index++;
  };

  /* [IDX-050] 回答選択（1回のみ） */
  Engine.selectAnswer = function (choiceText) {
    var s = State.App.session;
    var cur = Engine.getCurrent();
    if (!s || !cur) return { ok: false, reason: "no session" };

    var ans = cur.ans;
    if (ans.isAnswered) return { ok: false, reason: "already answered" };

    ans.isAnswered = true;
    ans.selectedText = String(choiceText || "");
    ans.isCorrect = (String(ans.selectedText) === String(ans.correctText));

    s.stats.answered++;
    if (ans.isCorrect) s.stats.correct++;
    else s.stats.wrong++;

    var row = cur.row;
    State.log("回答: ID=" + (row.idText || "") + " 選択=" + ans.selectedText + " 正誤=" + (ans.isCorrect ? "正解" : "不正解"));

    return {
      ok: true,
      idText: row.idText || "",
      category: row.category || "",
      question: row.question || "",
      isCorrect: ans.isCorrect,
      selectedText: ans.selectedText,
      correctText: ans.correctText,
      explanation: row.explanation || "",
      stats: {
        total: s.stats.total,
        correct: s.stats.correct,
        wrong: s.stats.wrong,
        answered: s.stats.answered
      }
    };
  };

  /* [IDX-060] 結果発表用データ生成（印刷/メール用） */
  Engine.buildResultSnapshot = function () {
    var s = State.App.session;
    if (!s) return null;

    var stats = s.stats || { total: 0, answered: 0, correct: 0, wrong: 0 };
    var rate = 0;
    if (stats.total > 0) rate = Math.round((stats.correct / stats.total) * 100);

    var details = [];
    for (var i = 0; i < s.items.length; i++) {
      var it = s.items[i];
      var row = it.row || {};
      var ans = it.ans || {};
      details.push({
        id: row.idText || "",
        category: row.category || "",
        question: row.question || "",
        selected: ans.selectedText || "",
        correct: ans.correctText || "",
        ok: !!ans.isCorrect
      });
    }

    var result = {
      total: stats.total,
      answered: stats.answered,
      correct: stats.correct,
      wrong: stats.wrong,
      rate: rate,
      at: Util.nowStamp()
    };

    State.App.lastResult = result;
    State.App.lastResultDetails = details;

    return { result: result, details: details };
  };

  global.Engine = Engine;

})(window);

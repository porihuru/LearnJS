/*
  ファイル: js/engine.js
  作成日時(JST): 2025-12-25 20:30:00
  VERSION: 20251225-01
*/
(function (global) {
  "use strict";

  var Engine = {};
  Engine.VERSION = "20251225-01";
  Util.registerVersion("engine.js", Engine.VERSION);

  function buildChoices(row) {
    var correctText = row.choice1;

    var options = [
      { key: "A", text: row.choice1 },
      { key: "B", text: row.choice2 },
      { key: "C", text: row.choice3 },
      { key: "D", text: row.choice4 }
    ];

    var any = false;
    for (var i = 0; i < options.length; i++) if (String(options[i].text || "").trim() !== "") any = true;
    if (!any) options[0].text = "(選択肢なし)";

    var shuffled = Util.shuffle(options);

    return {
      correctText: correctText,
      options: shuffled,
      selectedText: "",
      isAnswered: false,
      isCorrect: false
    };
  }

  function filterByCategory(rows, cat) {
    if (!cat || cat === "__ALL__") return rows;
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].category === cat) out.push(rows[i]);
    }
    return out;
  }

  function makeSession(rows) {
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      items.push({ row: rows[i], ans: buildChoices(rows[i]) });
    }
    return { items: items, index: 0 };
  }

  Engine.buildCategories = function () {
    var rows = State.App.rows || [];
    var map = {};
    var list = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i].category || "";
      if (!c) continue;
      if (!map[c]) { map[c] = true; list.push(c); }
    }
    list.sort();
    State.App.categories = list;
  };

  Engine.startRandom = function (category, count) {
    var rows = filterByCategory(State.App.rows, category);
    var n = Util.toInt(count, 10);
    if (n <= 0) n = 10;

    var picked = Util.pickN(rows, n);
    State.App.session = makeSession(picked);

    State.log("出題開始(ランダム): category=" + (category === "__ALL__" ? "ALL" : category) + " count=" + n + " actual=" + picked.length);
  };

  // ★修正：ID指定は idNum（末尾数字）で比較
  Engine.startFromId = function (category, startId, count) {
    var rows = filterByCategory(State.App.rows, category);
    var sid = Util.toInt(startId, 1);
    var n = Util.toInt(count, 10);
    if (n <= 0) n = 10;

    var picked = [];
    for (var i = 0; i < rows.length; i++) {
      var num = (rows[i].idNum || 0);
      if (num >= sid) picked.push(rows[i]);
      if (picked.length >= n) break;
    }

    State.App.session = makeSession(picked);
    State.log("出題開始(ID指定): category=" + (category === "__ALL__" ? "ALL" : category) + " startId=" + sid + " count=" + n + " actual=" + picked.length);
  };

  Engine.getCurrent = function () {
    var s = State.App.session;
    if (!s || !s.items || !s.items.length) return null;
    if (s.index < 0) s.index = 0;
    if (s.index >= s.items.length) s.index = s.items.length - 1;
    return s.items[s.index];
  };

  Engine.canPrev = function () {
    var s = State.App.session;
    return !!(s && s.items && s.items.length && s.index > 0);
  };

  Engine.canNext = function () {
    var s = State.App.session;
    return !!(s && s.items && s.items.length && s.index < s.items.length - 1);
  };

  Engine.prev = function () {
    if (!Engine.canPrev()) return;
    State.App.session.index--;
    State.log("移動: 前へ index=" + State.App.session.index);
  };

  Engine.next = function () {
    if (!Engine.canNext()) return;
    State.App.session.index++;
    State.log("移動: 次へ index=" + State.App.session.index);
  };

  Engine.selectAnswer = function (choiceText) {
    var cur = Engine.getCurrent();
    if (!cur) return;

    var ans = cur.ans;
    ans.selectedText = choiceText;
    ans.isAnswered = true;
    ans.isCorrect = (String(choiceText || "") === String(ans.correctText || ""));

    var row = cur.row;
    State.log("回答: ID=" + (row.idText || row.id || "") + " 選択=" + (choiceText || "") + " 正誤=" + (ans.isCorrect ? "正解" : "不正解"));
  };

  Engine.resetAnswer = function () {
    var cur = Engine.getCurrent();
    if (!cur) return;

    cur.ans = buildChoices(cur.row);
    var row = cur.row;
    State.log("回答リセット: ID=" + (row.idText || row.id || ""));
  };

  global.Engine = Engine;

})(window);

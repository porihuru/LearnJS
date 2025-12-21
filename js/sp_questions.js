// sp_questions.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  function toStr(v) {
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function loadQuestions(onOk, onErr) {
    var listTitle = SP_CONFIG.listTitle;

    // 取得列（Idは内部ID、QIDは任意）
    var col = SP_CONFIG.col;
    var select = [
      "Id",
      col.qid,
      col.category,
      col.question,
      col.choice1,
      col.choice2,
      col.choice3,
      col.choice4,
      col.explanation
    ].join(",");

    SP_API.getItems(listTitle, select, 5000, function (items) {
      if (!items || items.length === 0) {
        onErr("SharePointから取得できましたが0件でした。リスト名や権限、列名を確認してください。");
        return;
      }

      var questions = [];
      var catMap = {};

      for (var i = 0; i < items.length; i++) {
        var it = items[i];

        // IDは QID があればそれ、無ければ SPのId
        var qid = toStr(it[col.qid]);
        if (!qid) qid = toStr(it.Id);

        var category = toStr(it[col.category]);
        var question = toStr(it[col.question]);

        if (!question) continue;

        var q = {
          id: qid,
          category: category,
          question: question,
          explanation: toStr(it[col.explanation]),
          // Answer列なし：Choice1が正解
          choicesRaw: [
            { text: toStr(it[col.choice1]), isCorrect: true },
            { text: toStr(it[col.choice2]), isCorrect: false },
            { text: toStr(it[col.choice3]), isCorrect: false },
            { text: toStr(it[col.choice4]), isCorrect: false }
          ]
        };

        questions.push(q);
        if (category && !catMap[category]) catMap[category] = true;
      }

      var categories = [];
      for (var k in catMap) {
        if (catMap.hasOwnProperty(k)) categories.push(k);
      }
      categories.sort();

      onOk({ questions: questions, categories: categories });
    }, onErr);
  }

  global.SP_Questions = {
    loadQuestions: loadQuestions
  };
})(window);

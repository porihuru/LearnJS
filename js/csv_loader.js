// JST: 2025-12-19 06:37:29 / csv_loader.js
(function (global) {
  "use strict";

  var CsvLoader = {};

  // ヘッダ揺れ吸収（必要なら増やしてOK）
  var H = {
    question: ["question", "q", "問題", "問題文", "title"],
    choice1: ["choice1", "a", "選択肢1", "選択1"],
    choice2: ["choice2", "b", "選択肢2", "選択2"],
    choice3: ["choice3", "c", "選択肢3", "選択3"],
    choice4: ["choice4", "d", "選択肢4", "選択4"],
    answer: ["answer", "正解", "解答"],
    explain: ["explanation", "explain", "解説", "説明"]
  };

  function buildQuestionsFromRows(rows) {
    if (!rows || rows.length < 2) return [];

    var headers = rows[0];
    var idxQ = global.Util.findHeaderIndex(headers, H.question);
    var idxA = global.Util.findHeaderIndex(headers, H.answer);
    var idxE = global.Util.findHeaderIndex(headers, H.explain);

    var idxC1 = global.Util.findHeaderIndex(headers, H.choice1);
    var idxC2 = global.Util.findHeaderIndex(headers, H.choice2);
    var idxC3 = global.Util.findHeaderIndex(headers, H.choice3);
    var idxC4 = global.Util.findHeaderIndex(headers, H.choice4);

    var list = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];

      var qText = global.Util.safeGet(row, idxQ);
      var aRaw = global.Util.safeGet(row, idxA);
      var eText = global.Util.safeGet(row, idxE);

      var choices = [
        global.Util.safeGet(row, idxC1),
        global.Util.safeGet(row, idxC2),
        global.Util.safeGet(row, idxC3),
        global.Util.safeGet(row, idxC4)
      ];

      var q = {
        id: "csv-" + r,
        question: qText,
        choices: choices,
        answer: aRaw,
        explain: eText
      };

      list.push(q);
    }
    return list;
  }

  CsvLoader.loadFile = function (file, onOk, onErr) {
    try {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var text = reader.result || "";
          var rows = global.Util.parseCsv(String(text));
          var list = buildQuestionsFromRows(rows);
          onOk(list);
        } catch (e) {
          onErr("CSV解析に失敗: " + String(e));
        }
      };
      reader.onerror = function () {
        onErr("CSV読み込みに失敗しました。");
      };
      reader.readAsText(file, "utf-8");
    } catch (e2) {
      onErr("CSV読み込みに失敗: " + String(e2));
    }
  };

  global.CsvLoader = CsvLoader;

})(window);

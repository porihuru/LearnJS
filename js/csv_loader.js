// csv_loader.js / 作成日時(JST): 2025-12-21 15:40:00
(function (global) {
  "use strict";

  function xhrGetText(url, onOk, onErr) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        onOk(xhr.responseText);
      } else {
        onErr("CSV読込失敗: " + url + " (status=" + xhr.status + ")");
      }
    };
    xhr.send(null);
  }

  // RFC4180寄り：ダブルクォート対応（改行/カンマ/クォート）
  function parseCSV(text) {
    if (!text) return [];

    // BOM除去
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    var rows = [];
    var row = [];
    var i = 0;
    var field = "";
    var inQuotes = false;

    while (i < text.length) {
      var c = text.charAt(i);

      if (inQuotes) {
        if (c === '"') {
          // "" -> "
          if (i + 1 < text.length && text.charAt(i + 1) === '"') {
            field += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i += 1;
            continue;
          }
        } else {
          field += c;
          i += 1;
          continue;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
          i += 1;
          continue;
        }
        if (c === ",") {
          row.push(field);
          field = "";
          i += 1;
          continue;
        }
        if (c === "\r") {
          // CRLF
          if (i + 1 < text.length && text.charAt(i + 1) === "\n") {
            i += 2;
          } else {
            i += 1;
          }
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          continue;
        }
        if (c === "\n") {
          i += 1;
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
          continue;
        }

        field += c;
        i += 1;
      }
    }

    // 最終フィールド
    row.push(field);
    // 最終行が空行だけなら捨てる
    var allEmpty = true;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== "") { allEmpty = false; break; }
    }
    if (!allEmpty) rows.push(row);

    return rows;
  }

  function normalizeQuestionsFromCSV(csvText) {
    var rows = parseCSV(csvText);
    if (!rows || rows.length < 2) {
      return { questions: [], categories: [] };
    }

    var header = rows[0];
    var colIndex = {};
    for (var i = 0; i < header.length; i++) {
      colIndex[header[i]] = i;
    }

    function getCell(r, name) {
      var idx = colIndex[name];
      if (idx === undefined) return "";
      return (r[idx] === undefined || r[idx] === null) ? "" : String(r[idx]);
    }

    var questions = [];
    var catMap = {};

    for (var r = 1; r < rows.length; r++) {
      var line = rows[r];
      if (!line || line.length === 0) continue;

      var id = getCell(line, "ID");
      var category = getCell(line, "Category");
      var question = getCell(line, "Question");
      var c1 = getCell(line, "Choice1");
      var c2 = getCell(line, "Choice2");
      var c3 = getCell(line, "Choice3");
      var c4 = getCell(line, "Choice4");
      var explanation = getCell(line, "Explanation");

      // 必須が空ならスキップ（雑音行対策）
      if (!question) continue;

      var q = {
        id: id,
        category: category,
        question: question,
        explanation: explanation,
        // Answer列なし：Choice1が正解
        choicesRaw: [
          { text: c1, isCorrect: true },
          { text: c2, isCorrect: false },
          { text: c3, isCorrect: false },
          { text: c4, isCorrect: false }
        ]
      };

      questions.push(q);

      if (category && !catMap[category]) catMap[category] = true;
    }

    var categories = [];
    for (var k2 in catMap) {
      if (catMap.hasOwnProperty(k2)) categories.push(k2);
    }
    categories.sort();

    return { questions: questions, categories: categories };
  }

  function loadFallback(onOk, onErr) {
    xhrGetText("./questions_fallback.csv", function (text) {
      var norm = normalizeQuestionsFromCSV(text);
      onOk(norm);
    }, onErr);
  }

  global.CsvLoader = {
    loadFallback: loadFallback,
    normalizeQuestionsFromCSV: normalizeQuestionsFromCSV
  };
})(window);

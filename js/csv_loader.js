// csv_loader.js / 作成日時(JST): 2025-12-21 15:55:00
(function (global) {
  "use strict";

  function makeXhrDebug(xhr, url, label) {
    var ct = "";
    try { ct = xhr.getResponseHeader("Content-Type") || ""; } catch (e) { ct = ""; }

    var respUrl = "";
    try { respUrl = xhr.responseURL || ""; } catch (e2) { respUrl = ""; }

    var snippet = "";
    try {
      // responseTextが読める範囲で先頭だけ
      snippet = (xhr.responseText || "").slice(0, 300);
    } catch (e3) {
      snippet = "";
    }

    return (label || "CSV読込失敗") +
      "\nURL: " + url +
      (respUrl ? ("\nresponseURL: " + respUrl) : "") +
      "\nstatus: " + xhr.status + " " + (xhr.statusText || "") +
      (ct ? ("\ncontent-type: " + ct) : "") +
      (snippet ? ("\n---- snippet(先頭) ----\n" + snippet) : "");
  }

  function xhrGetText(url, onOk, onErr) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      // file:// などでstatus=0になりやすい
      if (xhr.status >= 200 && xhr.status < 300) {
        onOk(xhr.responseText, xhr);
        return;
      }

      // 200以外はエラー
      onErr(makeXhrDebug(xhr, url, "CSV取得に失敗しました"));
    };

    try {
      xhr.send(null);
    } catch (sendErr) {
      onErr("CSV取得に失敗しました（send例外）\nURL: " + url + "\n" + String(sendErr));
    }
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
        if (c === '"') { inQuotes = true; i += 1; continue; }

        if (c === ",") {
          row.push(field);
          field = "";
          i += 1;
          continue;
        }

        if (c === "\r") {
          if (i + 1 < text.length && text.charAt(i + 1) === "\n") i += 2;
          else i += 1;

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

    row.push(field);

    // 最終行が空行だけなら捨てる
    var allEmpty = true;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== "") { allEmpty = false; break; }
    }
    if (!allEmpty) rows.push(row);

    return rows;
  }

  function trimCell(s) {
    s = (s === undefined || s === null) ? "" : String(s);
    return s.replace(/^\s+|\s+$/g, "");
  }

  function rowHasHeader(row) {
    if (!row || row.length === 0) return false;
    // 必須列（Answerなしスキーマ）
    var need = {
      "ID": false,
      "Category": false,
      "Question": false,
      "Choice1": false,
      "Choice2": false,
      "Choice3": false,
      "Choice4": false,
      "Explanation": false
    };

    for (var i = 0; i < row.length; i++) {
      var v = trimCell(row[i]);
      if (need.hasOwnProperty(v)) need[v] = true;
    }

    for (var k in need) {
      if (need.hasOwnProperty(k) && need[k] === false) return false;
    }
    return true;
  }

  function looksLikeHtml(text) {
    if (!text) return false;
    var head = text.slice(0, 200).toLowerCase();
    return (head.indexOf("<!doctype html") !== -1) ||
           (head.indexOf("<html") !== -1) ||
           (head.indexOf("<head") !== -1);
  }

  function normalizeQuestionsFromCSV(csvText) {
    if (!csvText) {
      throw new Error("CSVが空です。");
    }

    if (looksLikeHtml(csvText)) {
      throw new Error("CSVではなくHTMLが返っています（ログイン画面/エラーページの可能性）。\n先頭:\n" + csvText.slice(0, 200));
    }

    var rows = parseCSV(csvText);

    if (!rows || rows.length === 0) {
      throw new Error("CSVを解析できませんでした（行が0）。");
    }

    // 先頭の空行や `sep=,` をスキップしてヘッダ行を探す
    var headerRowIndex = -1;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];

      // 空行スキップ
      var joined = "";
      for (var j = 0; j < row.length; j++) joined += trimCell(row[j]);
      if (joined === "") continue;

      // Excel用の sep=, が先頭にある場合
      if (row.length === 1 && trimCell(row[0]).toLowerCase() === "sep=,") continue;

      if (rowHasHeader(row)) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // デバッグ用に先頭数行を提示
      var preview = "";
      for (var p = 0; p < rows.length && p < 5; p++) {
        preview += (p + 1) + ": " + rows[p].join("|") + "\n";
      }
      throw new Error(
        "ヘッダ行が見つかりませんでした。\n" +
        "期待ヘッダ: ID,Category,Question,Choice1,Choice2,Choice3,Choice4,Explanation\n" +
        "先頭プレビュー:\n" + preview
      );
    }

    var header = rows[headerRowIndex];
    var colIndex = {};
    for (var i = 0; i < header.length; i++) {
      colIndex[trimCell(header[i])] = i;
    }

    function getCell(r, name) {
      var idx = colIndex[name];
      if (idx === undefined) return "";
      return (r[idx] === undefined || r[idx] === null) ? "" : String(r[idx]);
    }

    var questions = [];
    var catMap = {};

    for (var rr = headerRowIndex + 1; rr < rows.length; rr++) {
      var line = rows[rr];
      if (!line || line.length === 0) continue;

      // 雑音行（空行）除外
      var qText = trimCell(getCell(line, "Question"));
      if (!qText) continue;

      var id = trimCell(getCell(line, "ID"));
      var category = trimCell(getCell(line, "Category"));
      var c1 = getCell(line, "Choice1");
      var c2 = getCell(line, "Choice2");
      var c3 = getCell(line, "Choice3");
      var c4 = getCell(line, "Choice4");
      var explanation = getCell(line, "Explanation");

      var q = {
        id: id,
        category: category,
        question: qText,
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
    var url = "./questions_fallback.csv";
    xhrGetText(url, function (text, xhr) {
      var norm;
      try {
        norm = normalizeQuestionsFromCSV(text);
      } catch (e) {
        var msg = "CSV解析に失敗しました。\nURL: " + url;
        try { msg += (xhr.responseURL ? ("\nresponseURL: " + xhr.responseURL) : ""); } catch (e2) {}
        msg += "\n" + String(e && e.message ? e.message : e);
        onErr(msg);
        return;
      }

      if (!norm.questions || norm.questions.length === 0) {
        onErr("CSVは取得できましたが、問題が0件です。\nURL: " + url + "\n先頭:\n" + (text || "").slice(0, 200));
        return;
      }

      onOk(norm);
    }, onErr);
  }

  global.CsvLoader = {
    loadFallback: loadFallback,
    normalizeQuestionsFromCSV: normalizeQuestionsFromCSV
  };
})(window);

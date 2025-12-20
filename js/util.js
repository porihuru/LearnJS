// JST: 2025-12-19 06:37:29 / util.js
(function (global) {
  "use strict";

  var Util = global.Util || {};

  Util.trim = function (s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/^\s+|\s+$/g, "");
  };

  Util.isEmpty = function (s) {
    return Util.trim(s) === "";
  };

  Util.escapeHtml = function (s) {
    s = String(s === null || s === undefined ? "" : s);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  Util.nowMs = function () {
    return new Date().getTime();
  };

  Util.pad2 = function (n) {
    n = parseInt(n, 10);
    return (n < 10 ? "0" : "") + n;
  };

  Util.formatJstLike = function (d) {
    // 実運用はJST前提なので、単にローカル時刻を表示
    return d.getFullYear() + "-"
      + Util.pad2(d.getMonth() + 1) + "-"
      + Util.pad2(d.getDate()) + " "
      + Util.pad2(d.getHours()) + ":"
      + Util.pad2(d.getMinutes()) + ":"
      + Util.pad2(d.getSeconds());
  };

  Util.shuffle = function (arr) {
    // Fisher–Yates
    var a = arr.slice(0);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  Util.pickNonEmpty = function (arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = Util.trim(arr[i]);
      if (v !== "") out.push(v);
    }
    return out;
  };

  Util.coerceAnswerText = function (choices, answerRaw) {
    // Answer が "1"〜"4" なら index として扱う。その他は文字列一致
    var a = Util.trim(answerRaw);
    if (a === "") return "";

    if (/^\d+$/.test(a)) {
      var idx = parseInt(a, 10) - 1; // CSVで1始まり想定
      if (idx >= 0 && idx < choices.length) return choices[idx];
    }

    // "0"〜"3" を index で持っている可能性も吸収
    if (/^\d+$/.test(a)) {
      var idx0 = parseInt(a, 10);
      if (idx0 >= 0 && idx0 < choices.length) return choices[idx0];
    }

    return a;
  };

  Util.normalizeQuestion = function (q) {
    // {id, question, choices[], answer, explain} -> answerText を確実化
    var out = {
      id: q.id,
      question: Util.trim(q.question),
      choices: Util.pickNonEmpty(q.choices || []),
      answerText: "",
      explain: Util.trim(q.explain)
    };
    out.answerText = Util.coerceAnswerText(out.choices, q.answer);
    return out;
  };

  Util.normalizeQuestions = function (questions) {
    var out = [];
    for (var i = 0; i < questions.length; i++) {
      var nq = Util.normalizeQuestion(questions[i]);
      // choices が2未満は除外
      if (nq.choices.length >= 2) out.push(nq);
    }
    return out;
  };

  // CSV parser (quotes対応)
  Util.parseCsv = function (text) {
    text = text || "";
    // BOM除去
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

    var rows = [];
    var row = [];
    var field = "";
    var i = 0;
    var inQuotes = false;

    function pushField() {
      row.push(field);
      field = "";
    }
    function pushRow() {
      rows.push(row);
      row = [];
    }

    while (i < text.length) {
      var c = text.charAt(i);

      if (inQuotes) {
        if (c === '"') {
          var next = text.charAt(i + 1);
          if (next === '"') {
            field += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          field += c;
          i++;
          continue;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (c === ",") {
          pushField();
          i++;
          continue;
        }
        if (c === "\r") {
          // CRLF or CR
          pushField();
          pushRow();
          if (text.charAt(i + 1) === "\n") i += 2;
          else i += 1;
          continue;
        }
        if (c === "\n") {
          pushField();
          pushRow();
          i++;
          continue;
        }
        field += c;
        i++;
      }
    }

    // last
    pushField();
    // trailing empty row対策
    var allEmpty = true;
    for (var k = 0; k < row.length; k++) {
      if (Util.trim(row[k]) !== "") { allEmpty = false; break; }
    }
    if (!allEmpty) pushRow();

    return rows;
  };

  Util.findHeaderIndex = function (headers, candidates) {
    var hmap = {};
    for (var i = 0; i < headers.length; i++) {
      hmap[Util.trim(headers[i]).toLowerCase()] = i;
    }
    for (var j = 0; j < candidates.length; j++) {
      var key = Util.trim(candidates[j]).toLowerCase();
      if (hmap.hasOwnProperty(key)) return hmap[key];
    }
    return -1;
  };

  Util.safeGet = function (row, idx) {
    if (idx < 0) return "";
    if (!row || idx >= row.length) return "";
    return row[idx];
  };

  global.Util = Util;
})(window);

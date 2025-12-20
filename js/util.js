// JST: 2025-12-20 21:10:00 / js/util.js
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
    return d.getFullYear() + "-"
      + Util.pad2(d.getMonth() + 1) + "-"
      + Util.pad2(d.getDate()) + " "
      + Util.pad2(d.getHours()) + ":"
      + Util.pad2(d.getMinutes()) + ":"
      + Util.pad2(d.getSeconds());
  };

  Util.shuffle = function (arr) {
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
    var a = Util.trim(answerRaw);
    if (a === "") return "";

    // Answer が "1"〜"4" なら 1始まりindexとして扱う
    if (/^\d+$/.test(a)) {
      var idx1 = parseInt(a, 10) - 1;
      if (idx1 >= 0 && idx1 < choices.length) return choices[idx1];
    }

    // "0"〜"3" を index として持っている場合も吸収
    if (/^\d+$/.test(a)) {
      var idx0 = parseInt(a, 10);
      if (idx0 >= 0 && idx0 < choices.length) return choices[idx0];
    }

    // 文字列一致
    return a;
  };

  Util.normalizeQuestion = function (q) {
    // ★修正ポイント★
    // 既に正規化されたデータ（answerTextを持つ）でも、再正規化で壊れないようにする
    var answerRaw =
      (q && q.answer !== undefined && q.answer !== null) ? q.answer :
      (q && q.answerText !== undefined && q.answerText !== null) ? q.answerText :
      "";

    var out = {
      id: q && q.id ? q.id : "",
      question: Util.trim(q && q.question ? q.question : ""),
      choices: Util.pickNonEmpty((q && q.choices) ? q.choices : []),
      answerText: "",
      explain: Util.trim(q && q.explain ? q.explain : "")
    };

    out.answerText = Util.coerceAnswerText(out.choices, answerRaw);
    return out;
  };

  Util.normalizeQuestions = function (questions) {
    var out = [];
    for (var i = 0; i < (questions || []).length; i++) {
      var nq = Util.normalizeQuestion(questions[i]);
      if (nq.choices.length >= 2) out.push(nq);
    }
    return out;
  };

  // CSV parser (quotes対応)
  Util.parseCsv = function (text) {
    text = text || "";
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1); // BOM除去

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
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ",") { pushField(); i++; continue; }
        if (c === "\r") {
          pushField(); pushRow();
          if (text.charAt(i + 1) === "\n") i += 2;
          else i += 1;
          continue;
        }
        if (c === "\n") { pushField(); pushRow(); i++; continue; }
        field += c;
        i++;
      }
    }

    pushField();
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

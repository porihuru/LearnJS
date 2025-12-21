// util.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function parseCSV(text) {
    text = String(text || "");
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = text.split("\n");
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (trim(line) === "") continue;
      out.push(parseCSVLine(line));
    }
    return out;
  }

  // クォート対応（"a,b","c""d"）
  function parseCSVLine(line) {
    var res = [];
    var cur = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);

      if (ch === "\"") {
        if (inQuotes && i + 1 < line.length && line.charAt(i + 1) === "\"") {
          cur += "\"";
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        res.push(trim(cur));
        cur = "";
        continue;
      }

      cur += ch;
    }
    res.push(trim(cur));
    return res;
  }

  function arrayEquals(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function groupBy(arr, keyFn) {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
      var k = keyFn(arr[i]);
      if (!map[k]) map[k] = [];
      map[k].push(arr[i]);
    }
    return map;
  }

  function parseID(id) {
    var m = String(id).match(/^([A-Za-z0-9]+)-(\d{4,})$/);
    if (!m) return null;
    return { prefix: m[1], num: parseInt(m[2], 10) };
  }

  function pad4(n) {
    var s = String(n);
    while (s.length < 4) s = "0" + s;
    return s;
  }

  global.Util = {
    trim: trim,
    shuffleInPlace: shuffleInPlace,
    parseCSV: parseCSV,
    parseCSVLine: parseCSVLine,
    arrayEquals: arrayEquals,
    groupBy: groupBy,
    parseID: parseID,
    pad4: pad4
  };
})(window);
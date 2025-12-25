/*
  ファイル: js/csv_loader.js
  作成日時(JST): 2025-12-25 21:40:00
  VERSION: 20251225-03
*/
(function (global) {
  "use strict";

  var CSVLoader = {};
  CSVLoader.VERSION = "20251225-03";
  Util.registerVersion("csv_loader.js", CSVLoader.VERSION);

  function xhrGetText(url, cb) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) return cb(null, x.responseText);
      cb({ status: x.status, url: url }, null);
    };
    try { x.send(null); } catch (e) { cb({ status: 0, url: url, error: e }, null); }
  }

  function stripBom(s) {
    if (!s) return s;
    if (s.charCodeAt(0) === 0xFEFF) return s.substring(1);
    return s;
  }

  function normHeader(s) {
    s = (s === null || s === undefined) ? "" : String(s);
    s = stripBom(s);
    s = s.replace(/^\s+|\s+$/g, "");
    return s.toLowerCase();
  }

  function parseCSV(text) {
    var rows = [];
    var i = 0;
    var field = "";
    var row = [];
    var inQuotes = false;

    function pushField() { row.push(field); field = ""; }
    function pushRow() {
      var allEmpty = true;
      for (var k = 0; k < row.length; k++) {
        if (String(row[k] || "").replace(/^\s+|\s+$/g, "") !== "") { allEmpty = false; break; }
      }
      if (!allEmpty) rows.push(row);
      row = [];
    }

    while (i < text.length) {
      var ch = text.charAt(i);

      if (inQuotes) {
        if (ch === '"') {
          var next = text.charAt(i + 1);
          if (next === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      } else {
        if (ch === '"') { inQuotes = true; i++; continue; }
        if (ch === ",") { pushField(); i++; continue; }
        if (ch === "\r") {
          pushField(); pushRow();
          if (text.charAt(i + 1) === "\n") i += 2; else i++;
          continue;
        }
        if (ch === "\n") { pushField(); pushRow(); i++; continue; }
        field += ch; i++;
      }
    }

    pushField(); pushRow();
    return rows;
  }

  function buildHeaderIndexMap(headers) {
    var map = {};
    for (var i = 0; i < headers.length; i++) {
      var key = normHeader(headers[i]);
      if (key && map[key] === undefined) map[key] = i;
    }
    return map;
  }

  function findIndex(map, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var k = normHeader(candidates[i]);
      if (map[k] !== undefined) return map[k];
    }
    return -1;
  }

  function normalizeRow(headers, cols, fields) {
    var map = buildHeaderIndexMap(headers);

    function getBy(candidates) {
      var idx = findIndex(map, candidates);
      if (idx < 0) return "";
      return (fields[idx] === undefined || fields[idx] === null) ? "" : String(fields[idx]);
    }

    var idText = getBy(cols.id);
    idText = (idText === null || idText === undefined) ? "" : String(idText).replace(/^\s+|\s+$/g, "");
    var idNum = 0;

    var asInt = parseInt(idText, 10);
    if (!isNaN(asInt) && String(asInt) === String(idText)) idNum = asInt;
    else idNum = Util.extractLastInt(idText, 0);

    return {
      id: idText,
      idText: idText,
      idNum: idNum,
      category: getBy(cols.category),
      question: getBy(cols.question),
      choice1: getBy(cols.choice1),
      choice2: getBy(cols.choice2),
      choice3: getBy(cols.choice3),
      choice4: getBy(cols.choice4),
      explanation: getBy(cols.explanation)
    };
  }

  function getStartDir() {
    var href = String(global.location && global.location.href ? global.location.href : "");
    href = href.split("#")[0].split("?")[0];
    var p = href.lastIndexOf("/");
    if (p < 0) return href;
    return href.substring(0, p + 1);
  }

  function parentDir(dir) {
    var d = dir;
    if (d.length && d.charAt(d.length - 1) === "/") d = d.substring(0, d.length - 1);
    var p = d.lastIndexOf("/");
    if (p < 0) return dir;
    return d.substring(0, p + 1);
  }

  function tryLoadUpwards(dir, fileName, depth, maxDepth, cb) {
    var url = dir + fileName;
    State.log("CSV探索: try depth=" + depth + " url=" + url);

    xhrGetText(url, function (err, text) {
      if (!err) return cb(null, { url: url, text: text });

      if (err.status === 404 && depth < maxDepth) {
        var up = parentDir(dir);
        if (up === dir) return cb(err, null);
        return tryLoadUpwards(up, fileName, depth + 1, maxDepth, cb);
      }
      return cb(err, null);
    });
  }

  CSVLoader.loadFallback = function (cb) {
    var fileName = State.CONFIG.data.fallbackCsv;
    var startDir = getStartDir();

    State.log("CSV読込開始: file=" + fileName);
    State.log("CSV探索開始: baseDir=" + startDir);

    tryLoadUpwards(startDir, fileName, 0, 5, function (err, found) {
      if (err || !found) {
        State.log("CSV読込失敗: status=" + (err ? err.status : "?") + " url=" + (err ? err.url : "?"));
        return cb(err || { status: 0, url: "unknownKnown" }, null);
      }

      var grid = parseCSV(found.text);
      if (!grid.length) {
        State.log("CSV読込失敗: 空です url=" + found.url);
        return cb({ status: 0, url: found.url, message: "empty" }, null);
      }

      var headers = grid[0];
      var cols = State.CONFIG.columns;

      var out = [];
      for (var r = 1; r < grid.length; r++) {
        var obj = normalizeRow(headers, cols, grid[r]);
        if (!obj.question) continue;
        out.push(obj);
      }

      out.sort(function (a, b) {
        var an = (a.idNum || 0), bn = (b.idNum || 0);
        if (an !== bn) return an - bn;
        var at = String(a.idText || ""), bt = String(b.idText || "");
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });

      State.App.rows = out;
      State.App.dataSource = "CSV:fallback";
      State.App.lastLoadedAt = Util.nowStamp();

      State.log("CSV読込成功: url=" + found.url);
      State.log("CSV読込成功: 件数=" + out.length);

      cb(null, out);
    });
  };

  global.CSVLoader = CSVLoader;

})(window);
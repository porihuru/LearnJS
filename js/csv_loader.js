/*
  ファイル: js/csv_loader.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  目的:
    - Edge95/IEモードでも読み込めるようfetch不使用（XHR）
    - 同一ディレクトリに questions_fallback.csv がある前提
    - ただし「置き場所が変わっても」ある程度追従できるよう、親階層へ探索（最大4段）
*/
(function (global) {
  "use strict";

  var CSVLoader = {};
  CSVLoader.VERSION = "20251226-01";
  Util.registerVersion("csv_loader.js", CSVLoader.VERSION);

  /* [IDX-010] XHRでテキスト取得 */
  function xhrGetText(url, cb) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200 || xhr.status === 0) {
          cb(null, xhr.responseText);
        } else {
          cb(new Error("HTTP " + xhr.status));
        }
      };
      xhr.send(null);
    } catch (e) {
      cb(e);
    }
  }

  /* [IDX-020] BOM除去 */
  function stripBOM(s) {
    if (!s) return "";
    if (s.charCodeAt(0) === 0xFEFF) return s.substring(1);
    return s;
  }

  /* [IDX-030] CSVパーサ（引用符・改行・カンマ対応の簡易実装） */
  function parseCSV(text) {
    text = stripBOM(text || "");
    /* 正規化 */
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    var rows = [];
    var row = [];
    var cur = "";
    var inQ = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);

      if (inQ) {
        if (ch === '"') {
          /* "" はエスケープ */
          var next = (i + 1 < text.length) ? text.charAt(i + 1) : "";
          if (next === '"') {
            cur += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === ",") {
          row.push(cur);
          cur = "";
        } else if (ch === "\n") {
          row.push(cur);
          cur = "";
          /* 空行除外 */
          var nonEmpty = false;
          for (var k = 0; k < row.length; k++) {
            if (String(row[k]).replace(/\s+/g, "") !== "") { nonEmpty = true; break; }
          }
          if (nonEmpty) rows.push(row);
          row = [];
        } else {
          cur += ch;
        }
      }
    }

    /* 最終セル */
    row.push(cur);
    if (row.length > 1 || (row.length === 1 && String(row[0]).replace(/\s+/g, "") !== "")) {
      rows.push(row);
    }
    return rows;
  }

  /* [IDX-040] URLの基準ディレクトリ（末尾/まで） */
  function getBaseDir() {
    var href = String(global.location.href || "");
    var q = href.indexOf("?");
    if (q >= 0) href = href.substring(0, q);
    var hash = href.indexOf("#");
    if (hash >= 0) href = href.substring(0, hash);
    /* /index.html のような末尾を落とす */
    var lastSlash = href.lastIndexOf("/");
    if (lastSlash < 0) return href;
    return href.substring(0, lastSlash + 1);
  }

  /* [IDX-050] 親階層を作る */
  function parentDir(url) {
    if (!url) return url;
    /* 末尾/を前提 */
    var s = url;
    if (s.charAt(s.length - 1) !== "/") s += "/";
    /* 末尾の / を除いた上で一つ上へ */
    var t = s.substring(0, s.length - 1);
    var last = t.lastIndexOf("/");
    if (last < 0) return s;
    return t.substring(0, last + 1);
  }

  /* [IDX-060] ヘッダ名から列Indexを解決 */
  function buildHeaderMap(headerRow) {
    var map = {};
    for (var i = 0; i < headerRow.length; i++) {
      var key = String(headerRow[i] || "").replace(/^\s+|\s+$/g, "");
      if (!key) continue;
      map[key] = i;
    }
    return map;
  }

  function pickCell(cols, headerMap, row) {
    for (var i = 0; i < cols.length; i++) {
      var name = cols[i];
      if (headerMap.hasOwnProperty(name)) {
        var idx = headerMap[name];
        return (idx < row.length) ? row[idx] : "";
      }
    }
    return "";
  }

  /* [IDX-070] CSV→内部rowsへ */
  function convertToRows(csvRows) {
    if (!csvRows || csvRows.length < 2) return [];

    var header = csvRows[0];
    var headerMap = buildHeaderMap(header);

    var out = [];
    for (var r = 1; r < csvRows.length; r++) {
      var row = csvRows[r];

      var idText = pickCell(State.CONFIG.columns.id, headerMap, row);
      var cat = pickCell(State.CONFIG.columns.category, headerMap, row);
      var q = pickCell(State.CONFIG.columns.question, headerMap, row);

      var c1 = pickCell(State.CONFIG.columns.choice1, headerMap, row);
      var c2 = pickCell(State.CONFIG.columns.choice2, headerMap, row);
      var c3 = pickCell(State.CONFIG.columns.choice3, headerMap, row);
      var c4 = pickCell(State.CONFIG.columns.choice4, headerMap, row);
      var exp = pickCell(State.CONFIG.columns.explanation, headerMap, row);

      /* [IDX-071] IDは文字列保持＋数値化も持つ */
      var idNum = parseInt(idText, 10);
      if (isNaN(idNum)) idNum = 0;

      out.push({
        idText: String(idText || ""),
        idNum: idNum,
        category: String(cat || ""),
        question: String(q || ""),
        choice1: String(c1 || ""),
        choice2: String(c2 || ""),
        choice3: String(c3 || ""),
        choice4: String(c4 || ""),
        explanation: String(exp || "")
      });
    }
    return out;
  }

  /* [IDX-080] fallback CSVロード（親階層探索） */
  CSVLoader.loadFallback = function (cb) {
    var file = State.CONFIG.data.fallbackCsv;

    State.log("CSV読込開始: file=" + file);

    var base = getBaseDir();
    State.log("CSV探索開始: baseDir=" + base);

    var depthMax = 4;
    var curDir = base;

    function tryOne(depth) {
      var url = curDir + file;
      State.log("CSV探索: try depth=" + depth + " url=" + url);

      xhrGetText(url, function (err, text) {
        if (!err && text) {
          State.log("CSV読込成功: url=" + url);

          var rows = parseCSV(text);
          var data = convertToRows(rows);

          State.App.rows = data;
          State.App.lastLoadedAt = Util.nowStamp();
          State.App.dataSource = "CSV:fallback";

          State.log("CSV読込成功: 件数=" + data.length);
          cb(null, data);
          return;
        }

        /* 失敗→親へ */
        if (depth >= depthMax) {
          State.log("CSV読込失敗: depthMax到達");
          cb(new Error("CSV not found"));
          return;
        }
        curDir = parentDir(curDir);
        tryOne(depth + 1);
      });
    }

    tryOne(0);
  };

  global.CSVLoader = CSVLoader;

})(window);

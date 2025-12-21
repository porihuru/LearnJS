// csv_loader.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  var EXPECTED_HEADER = ["ID","Category","Question","Choice1","Choice2","Choice3","Choice4","Explanation"];

  function loadFromUrl(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        cb(null, xhr.responseText);
      } else {
        cb(new Error("URL読込失敗: " + url + " (status=" + xhr.status + ")"));
      }
    };
    xhr.onerror = function () { cb(new Error("URL読込失敗: " + url)); };
    xhr.send(null);
  }

  function loadFromFile(file, cb) {
    var reader = new FileReader();
    reader.onload = function () { cb(null, String(reader.result || "")); };
    reader.onerror = function () { cb(new Error("ファイル読込失敗")); };
    reader.readAsText(file);
  }

  function validateAndBuild(csvText) {
    var parsed = Util.parseCSV(csvText);
    if (!parsed || parsed.length === 0) throw new Error("CSVが空です。");

    var header = parsed[0];
    if (!Util.arrayEquals(header, EXPECTED_HEADER)) {
      throw new Error("ヘッダー不一致\n期待: " + EXPECTED_HEADER.join(",") + "\n実際: " + header.join(","));
    }

    var errors = [];
    var warnings = [];

    var seenID = {};
    var seenQ = {};

    var questions = [];
    var stats = {};

    // 連番チェック（警告扱い）：prefixごとに欠番/重複/並びを検出
    var idNumsByPrefix = {};

    for (var i = 1; i < parsed.length; i++) {
      var cols = parsed[i];
      var lineNo = i + 1;

      if (cols.length !== 8) {
        errors.push("列数不正 line=" + lineNo + " cols=" + cols.length);
        continue;
      }

      // 空欄チェック
      for (var c = 0; c < 8; c++) {
        if (Util.trim(cols[c]) === "") {
          errors.push("空欄 line=" + lineNo + " col=" + (c + 1));
          break;
        }
      }
      if (errors.length && errors[errors.length - 1].indexOf("空欄 line=" + lineNo) === 0) continue;

      var id = cols[0];
      var category = cols[1];
      var question = cols[2];
      var choice1 = cols[3]; // 正解
      var choice2 = cols[4];
      var choice3 = cols[5];
      var choice4 = cols[6];
      var explanation = cols[7];

      if (seenID[id]) {
        errors.push("ID重複: " + id);
        continue;
      }
      seenID[id] = true;

      if (seenQ[question]) {
        errors.push("問題文重複: " + question);
        continue;
      }
      seenQ[question] = true;

      // ID連番検出用
      var info = Util.parseID(id);
      if (info) {
        if (!idNumsByPrefix[info.prefix]) idNumsByPrefix[info.prefix] = [];
        idNumsByPrefix[info.prefix].push(info.num);
      } else {
        warnings.push("ID形式注意（推奨: PREFIX-0001）: " + id);
      }

      stats[category] = (stats[category] || 0) + 1;

      questions.push({
        id: id,
        category: category,
        question: question,
        choice1: choice1,
        choice2: choice2,
        choice3: choice3,
        choice4: choice4,
        explanation: explanation
      });
    }

    // 連番警告
    var prefixes = Object.keys(idNumsByPrefix);
    for (var p = 0; p < prefixes.length; p++) {
      var pref = prefixes[p];
      var nums = idNumsByPrefix[pref].slice();
      nums.sort(function (a, b) { return a - b; });

      // 欠番検出（min..max）
      if (nums.length >= 2) {
        var min = nums[0], max = nums[nums.length - 1];
        var set = {};
        for (var k = 0; k < nums.length; k++) set[nums[k]] = true;

        var gaps = [];
        for (var n = min; n <= max; n++) {
          if (!set[n]) gaps.push(n);
          if (gaps.length >= 20) break; // 多すぎ抑制
        }
        if (gaps.length) {
          warnings.push("ID欠番の可能性 [" + pref + "] 例: " + gaps.slice(0, 10).join(", ") + (gaps.length > 10 ? " ..." : ""));
        }
      }
    }

    if (errors.length) {
      var e = new Error("CSV検証NG（" + errors.length + "件）");
      e._detail = { ok: false, errors: errors, warnings: warnings, questions: [], stats: {} };
      throw e;
    }

    return { ok: true, errors: [], warnings: warnings, questions: questions, stats: stats };
  }

  global.CsvLoader = {
    loadFromUrl: loadFromUrl,
    loadFromFile: loadFromFile,
    validateAndBuild: validateAndBuild
  };
})(window);
/*
  ファイル: js/state.js
  作成日時(JST): 2025-12-24 20:30:00
  VERSION: 20251224-01
*/
(function (global) {
  "use strict";

  var State = {};

  State.VERSION = "20251224-01";
  Util.registerVersion("state.js", State.VERSION);

  // CSV専用（列名は従来どおり）
  State.CONFIG = {
    data: {
      fallbackCsv: "questions_fallback.csv",
      sampleCsv: "questions_sample.csv" // 将来用（今は未使用でもOK）
    },
    columns: {
      // CSVヘッダの揺れを吸収（ID / QID どちらでもOK）
      id: ["ID", "QID"],
      category: ["Category"],
      question: ["Question"],
      choice1: ["Choice1"],
      choice2: ["Choice2"],
      choice3: ["Choice3"],
      choice4: ["Choice4"],
      explanation: ["Explanation"]
    }
  };

  State.App = {
    build: "app-20251224-01",
    dataSource: "CSV:fallback",
    lastLoadedAt: "",
    rows: [],          // 全問題（正規化済）
    categories: [],    // カテゴリ一覧
    session: null,     // 出題セッション
    ui: {
      showExplain: false
    },
    logs: []           // 画面下部ログ
  };

  // ログ追加（回答状態も含める）
  State.log = function (msg) {
    var line = "[" + Util.nowStamp() + "] " + msg;
    State.App.logs.push(line);
    if (global.Render && Render.renderLogs) Render.renderLogs();
  };

  State.getAllVersions = function () {
    var v = global.__VERSIONS__ || {};
    // file順（見やすさ優先）
    var order = ["util.js", "state.js", "csv_loader.js", "engine.js", "render.js", "app.js"];
    var parts = [];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      if (v[k]) parts.push(k + ":" + v[k]);
    }
    // 追加分があれば末尾に
    for (var kk in v) {
      if (!v.hasOwnProperty(kk)) continue;
      var found = false;
      for (var j = 0; j < order.length; j++) if (order[j] === kk) found = true;
      if (!found) parts.push(kk + ":" + v[kk]);
    }
    return parts.join(" / ");
  };

  global.State = State;

})(window);
/*
  ファイル: js/state.js
  作成日時(JST): 2025-12-24 20:45:00
  VERSION: 20251224-02
*/
(function (global) {
  "use strict";

  var State = {};

  State.VERSION = "20251224-02";
  Util.registerVersion("state.js", State.VERSION);

  // CSV専用（列名は従来どおり）
  State.CONFIG = {
    data: {
      fallbackCsv: "questions_fallback.csv",
      sampleCsv: "questions_sample.csv"
    },
    columns: {
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
    build: "app-20251224-02",
    dataSource: "CSV:fallback",
    lastLoadedAt: "",
    rows: [],
    categories: [],
    session: null,
    ui: { showExplain: false },
    logs: []
  };

  State.log = function (msg) {
    var line = "[" + Util.nowStamp() + "] " + msg;
    State.App.logs.push(line);
    if (global.Render && Render.renderLogs) Render.renderLogs();
  };

  State.getAllVersions = function () {
    var v = global.__VERSIONS__ || {};
    var order = ["util.js", "state.js", "csv_loader.js", "engine.js", "render.js", "app.js"];
    var parts = [];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      if (v[k]) parts.push(k + ":" + v[k]);
    }
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

/*
  ファイル: js/state.js
  作成日時(JST): 2025-12-25 22:25:00
  VERSION: 20251225-04
*/
(function (global) {
  "use strict";

  var State = {};
  State.VERSION = "20251225-04";
  Util.registerVersion("state.js", State.VERSION);

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

  State.VERS = { html: "20251225-04", css: "20251225-04" };

  State.App = {
    build: "app-20251225-04",
    openedAt: "",
    dataSource: "CSV:fallback",
    lastLoadedAt: "",
    rows: [],
    categories: [],
    categoryCounts: {},
    session: null,
    histMap: {},
    logs: [],
    inQuizMode: false,

    /* [IDX-10] 印刷用に「最後の結果」を保持 */
    lastResult: null,
    lastResultDetails: null
  };

  State.log = function (msg) {
    var line = "[" + Util.nowStamp() + "] " + msg;
    State.App.logs.push(line);
    if (global.Render && Render.renderLogs) Render.renderLogs();
  };

  State.getAllVersions = function () {
    var v = global.__VERSIONS__ || {};
    var order = ["util.js", "state.js", "csv_loader.js", "engine.js", "render.js", "print.js", "app.js"];
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
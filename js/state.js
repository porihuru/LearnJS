/*
  ファイル: js/state.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01
*/
(function (global) {
  "use strict";

  var State = {};
  State.VERSION = "20251226-01";
  Util.registerVersion("state.js", State.VERSION);

  /* [IDX-010] 画面右上の表記 */
  State.VERS = { html: "20251226-01", css: "20251226-01" };

  /* [IDX-020] CSV列（Choice1＝正解扱い） */
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

  /* [IDX-030] アプリ状態（ログ・データ・セッション） */
  State.App = {
    build: "app-20251226-01",
    openedAt: "",
    dataSource: "CSV:fallback",
    lastLoadedAt: "",
    rows: [],
    categories: [],
    categoryCounts: {},
    session: null,
    inQuizMode: false,
    logs: [],
    histMap: {},

    /* [IDX-031] 印刷/メール用に結果を保持 */
    lastResult: null,
    lastResultDetails: null
  };

  /* [IDX-040] ログ */
  State.log = function (msg) {
    var line = "[" + Util.nowStamp() + "] " + msg;
    State.App.logs.push(line);
    if (global.Render && Render.renderLogs) Render.renderLogs();
  };

  /* [IDX-050] JSバージョン一覧（フッター表示用） */
  State.getAllVersions = function () {
    var v = global.__VERSIONS__ || {};
    var order = ["util.js", "state.js", "history_store.js", "csv_loader.js", "engine.js", "render.js", "print.js", "mail.js", "app.js"];
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

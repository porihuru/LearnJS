/*
  ファイル: js/state.js
  作成日時(JST): 2025-12-25 21:10:00
  VERSION: 20251225-02

  [STATE-方針]
    - [ST-01] グローバル状態（CSVデータ / セッション / 履歴map / ログ）
    - [ST-02] HTML/CSSバージョンも表示用に保持
*/
(function (global) {
  "use strict";

  var State = {};
  State.VERSION = "20251225-02";
  Util.registerVersion("state.js", State.VERSION);

  // [CFG-01] CSV列名は従来どおり（Answer列なし / 正解はChoice1）
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

  // [VER-02] HTML/CSSバージョン表示
  State.VERS = {
    html: "20251225-02",
    css: "20251225-02"
  };

  State.App = {
    build: "app-20251225-02",
    openedAt: "",                // [ST-10] 起動日時
    dataSource: "CSV:fallback",
    lastLoadedAt: "",
    rows: [],
    categories: [],
    categoryCounts: {},          // [ST-11] カテゴリ別件数
    session: null,               // [ST-20] 出題セッション
    histMap: {},                 // [ST-30] Cookie履歴map
    logs: []
  };

  // [LOG-01] ログ追加（画面下に出る）
  State.log = function (msg) {
    var line = "[" + Util.nowStamp() + "] " + msg;
    State.App.logs.push(line);
    if (global.Render && Render.renderLogs) Render.renderLogs();
  };

  // [VER-03] 画面下（JSバージョン一覧）
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
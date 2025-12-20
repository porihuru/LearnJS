// JST: 2025-12-20 21:00:00 / state.js
(function (global) {
  "use strict";

  var AppState = {
    dataSource: { type: "-", label: "-", detail: "-" }, // type: "sharepoint" | "csv"
    questions: [],
    total: 0,
    index: 0,
    correct: 0,
    startedAtMs: 0,
    timerId: null,
    current: null,
    currentChoices: [],
    answered: false,
    lastLoadedAt: ""
  };

  // ★ここを変えるだけでSharePoint側のリスト/列名を差し替え可能★
  var SP_CONFIG = {
    listTitle: "問題バンク",
    col: {
      id: "Id",
      questionTitle: "Title",
      choice1: "Choice1",
      choice2: "Choice2",
      choice3: "Choice3",
      choice4: "Choice4",
      answer: "Answer",
      explain: "Explanation"
    }
  };

  // ★SharePointリストが無い場合のCSV自動フォールバック設定★
  // 例：index.html と同じフォルダに questions_fallback.csv を置く
  var CSV_FALLBACK = {
    enabled: true,
    url: "./questions_fallback.csv" // 同階層ならこれでOK
  };

  global.AppState = AppState;
  global.SP_CONFIG = SP_CONFIG;
  global.CSV_FALLBACK = CSV_FALLBACK;

})(window);

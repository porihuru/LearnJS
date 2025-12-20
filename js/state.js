// JST: 2025-12-19 06:37:29 / state.js
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
    current: null,        // normalized question
    currentChoices: [],   // [{text,isCorrect}]
    answered: false
  };

  // ★ここを変えるだけでSharePoint側のリスト/列名を差し替え可能★
  var SP_CONFIG = {
    listTitle: "問題バンク",
    col: {
      id: "Id",
      questionTitle: "Title",       // 問題文
      choice1: "Choice1",
      choice2: "Choice2",
      choice3: "Choice3",
      choice4: "Choice4",
      answer: "Answer",
      explain: "Explanation"
    }
  };

  global.AppState = AppState;
  global.SP_CONFIG = SP_CONFIG;

})(window);

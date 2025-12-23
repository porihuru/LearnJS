// state.js / 作成日時(JST): 2025-12-23 11:05:00
(function (global) {
  "use strict";

  // アプリ情報（画面表示用）
  var APP_INFO = {
    build: "app-2025-12-23-1105"
  };

  // SharePoint接続設定（列内部名は環境に合わせて変更）
  var SP_CONFIG = {
    listTitle: "問題01",
    col: {
      qid: "QID",
      category: "Category",
      question: "Question",
      choice1: "Choice1",
      choice2: "Choice2",
      choice3: "Choice3",
      choice4: "Choice4",
      explanation: "Explanation"
    },
    categoryIsChoice: true
  };

  var AppState = {
    dataSource: "---",
    loadedAt: "---",

    questions: [],
    visible: [],

    categories: [],
    selectedCategory: "",

    selectedIndex: 0,

    logs: []
  };

  global.APP_INFO = APP_INFO;
  global.SP_CONFIG = SP_CONFIG;
  global.AppState = AppState;
})(window);
// state.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  // SharePoint接続設定（列内部名は環境に合わせて変更）
  // まずは「問題01」を試行 → 失敗したらCSVへフォールバック
  var SP_CONFIG = {
    listTitle: "問題01",
    col: {
      // 推奨：SharePoint側に QID（数値）を用意。無い場合は item.Id を採用します。
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

    // 接続ログ（画面に表示）
    logs: []
  };

  global.SP_CONFIG = SP_CONFIG;
  global.AppState = AppState;
})(window);

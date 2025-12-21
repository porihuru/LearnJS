// state.js / 作成日時(JST): 2025-12-21 15:40:00
(function (global) {
  "use strict";

  var AppState = {
    dataSource: "---",
    loadedAt: "---",
    questions: [],         // 全件
    visible: [],           // カテゴリフィルタ後
    categories: [],
    selectedCategory: "",
    selectedIndex: 0       // visible内のインデックス
  };

  global.AppState = AppState;
})(window);

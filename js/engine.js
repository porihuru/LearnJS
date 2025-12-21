// engine.js / 作成日時(JST): 2025-12-21 15:40:00
(function (global) {
  "use strict";

  // 今は画面設計優先のため、出題ロジックは最小限
  // 後で「選択肢毎回シャッフル」「採点」「履歴」等を追加する前提

  function applyCategoryFilter(allQuestions, category) {
    if (!category) return allQuestions.slice(0);

    var out = [];
    for (var i = 0; i < allQuestions.length; i++) {
      if (allQuestions[i].category === category) out.push(allQuestions[i]);
    }
    return out;
  }

  global.Engine = {
    applyCategoryFilter: applyCategoryFilter
  };
})(window);

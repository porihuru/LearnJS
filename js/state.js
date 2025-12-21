// state.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  global.AppState = {
    questions: [],
    categoryStats: {},
    validation: {
      ok: false,
      errors: [],
      warnings: [],
      summary: ""
    },
    quiz: {
      set: [],
      idx: 0,
      score: 0
    },
    config: {
      fallbackCsvUrl: "./questions_fallback.csv",
      sampleCsvUrl: "./questions_sample.csv"
    }
  };
})(window);
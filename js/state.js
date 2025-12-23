// state.js / 作成日時(JST): 2025-12-23 12:55:00
(function (global) {
  "use strict";

  // =========================================================
  // アプリ情報（画面右上/フッター表示用）
  // =========================================================
  var APP_INFO = {
    appName: "text_access問題集",
    build: "app-2025-12-23-1105",
    note: "Edge95 / SharePoint REST / CSV fallback"
  };

  // =========================================================
  // SharePoint 接続設定（リストURL直打ち対応）
  // =========================================================
  var SP_CONFIG = {
    // 表示名（診断用として残してOK）
    listTitle: "問題01",

    // ★最重要：リストのサーバー相対URL（直打ち）★
    // ブラウザのURL:
    //   https://.../na/N/NF/f_c/Lists/01/AllItems.aspx
    // からドメインを除いたこれを入れる：
    //   /na/N/NF/f_c/Lists/01
    listServerRelativeUrl: "/na/N/NF/f_c/Lists/01",

    // GUID（任意。直打ち方式が動けば不要）
    listGuid: "",

    // 探索は基本0推奨（サインイン誘発を避ける）
    parentProbeMax: 0,
    parentProbeStopAt: "/na/N/NF",

    // Category が Choice 列なら true
    categoryIsChoice: true,

    // 列の内部名（スクショが QID なのでここは QID 推奨）
    col: {
      qid: "QID",
      category: "Category",
      question: "Question",
      choice1: "Choice1",
      choice2: "Choice2",
      choice3: "Choice3",
      choice4: "Choice4",
      explanation: "Explanation"
    }
  };

  // =========================================================
  // CSV フォールバック設定
  // =========================================================
  var CSV_CONFIG = {
    fallbackCsv: "questions_fallback.csv",
    sampleCsv: "questions_sample.csv",
    correctChoiceKey: "Choice1" // Answer列が無いので常にChoice1が正解
  };

  // =========================================================
  // アプリ状態（最低限）
  // =========================================================
  var AppState = {
    source: "none",      // "sp" | "csv" | "none"
    lastLoadAt: "",
    count: 0,

    categories: [],
    questions: [],

    selectedCategory: "(すべて)",

    mode: "random",      // "random" | "range"
    randomCount: 10,
    rangeStartId: 1,
    rangeCount: 10,

    session: {
      active: false,
      index: 0,
      queue: [],
      answered: {}
    }
  };

  global.APP_INFO = APP_INFO;
  global.SP_CONFIG = SP_CONFIG;
  global.CSV_CONFIG = CSV_CONFIG;
  global.AppState = AppState;

})(window);
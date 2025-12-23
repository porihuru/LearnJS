// state.js / 作成日時(JST): 2025-12-23 12:35:00
(function (global) {
  "use strict";

  // =========================================================
  // アプリ情報（画面右上/フッター表示用）
  // =========================================================
  var APP_INFO = {
    appName: "text_access問題集",
    build: "app-2025-12-23-1105", // 必要に応じて更新
    note: "Edge95 / SharePoint REST / CSV fallback",
  };

  // =========================================================
  // SharePoint 接続設定
  // =========================================================
  // ★重要★
  // - listTitle は「表示名」です（全角/半角/空白などでズレると getbytitle が 404 になり得ます）
  // - listGuid を入れると最終的に GUID で取得できるので最も確実です
  //
  // listGuid は「リスト設定」画面の URL に出る：
  //   listedit.aspx?List={xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
  // の GUID を { } を除いて貼り付けます。
  //
  // 例:
  // listGuid: "26F51B65-E51C-4989-....-............"
  // =========================================================
  var SP_CONFIG = {
    listTitle: "問題01",

    // ★これを追加★
    listGuid: "",

    // 探索は「安全のため最小限」がおすすめ
    // 0: fin_csm だけ（サインイン誘発を避ける）
    // 1: 1段上まで
    // 2: 2段上まで（例 fin_csm → NAFin まで）
    parentProbeMax: 0,

    // ★任意：上位探索を許す場合の“停止ライン”（これより上には行かない）
    // 例："/na/NA/NAFin" を超えて /na/NA へ上がらないようにする
    parentProbeStopAt: "/na/NA/NAFin",
    // ★ここまで追加★

    // Category が SharePoint の Choice 列なら true（表示上のカテゴリ絞り込みで使える）
    categoryIsChoice: true,

    // SharePoint 内部名（列の内部名がこの通りである前提）
    // ※内部名が違う場合はここだけ修正すればOK
    col: {
      qid: "ID",
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
  // - 同一ディレクトリの questions_fallback.csv を読む前提
  // - CSVは Answer 列なし（Choice1 を正解扱い）
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
    // 読込状態
    source: "none",     // "sp" | "csv" | "none"
    lastLoadAt: "",     // "YYYY-MM-DD HH:mm:ss"
    count: 0,

    // マスタ
    categories: [],     // ["相続", ...]
    questions: [],      // {id, category, question, explanation, choicesRaw:[{key,text}...]}

    // UI選択
    selectedCategory: "(すべて)",

    // 出題制御
    mode: "random",     // "random" | "range"
    randomCount: 10,
    rangeStartId: 1,
    rangeCount: 10,

    // 実行中
    session: {
      active: false,
      index: 0,
      queue: [],        // 出題対象（questions配列の要素）
      answered: {}      // id -> { selectedKey, isCorrect }
    }
  };

  // =========================================================
  // グローバル公開
  // =========================================================
  global.APP_INFO = APP_INFO;
  global.SP_CONFIG = SP_CONFIG;
  global.CSV_CONFIG = CSV_CONFIG;
  global.AppState = AppState;

})(window);
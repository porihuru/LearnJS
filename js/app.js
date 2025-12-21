// app.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  function applyFilterAndRender() {
    AppState.visible = Engine.applyCategoryFilter(AppState.questions, AppState.selectedCategory);

    if (AppState.selectedIndex >= AppState.visible.length) AppState.selectedIndex = 0;
    if (AppState.selectedIndex < 0) AppState.selectedIndex = 0;

    Render.renderStatus();
    Render.renderCategorySelect();
    Render.renderCurrentQuestion();
  }

  function setQuestions(norm, sourceLabel) {
    AppState.questions = norm.questions || [];
    AppState.categories = norm.categories || [];
    AppState.dataSource = sourceLabel || "---";
    AppState.loadedAt = Util.nowText();
    AppState.selectedIndex = 0;

    // カテゴリ整合
    if (AppState.selectedCategory) {
      var ok = false;
      for (var i = 0; i < AppState.categories.length; i++) {
        if (AppState.categories[i] === AppState.selectedCategory) { ok = true; break; }
      }
      if (!ok) AppState.selectedCategory = "";
    }

    applyFilterAndRender();
  }

  function loadCsvFallback(reasonLine) {
    Render.log("CSVフォールバック開始: " + (reasonLine || ""));
    CsvLoader.loadFallback(function (norm) {
      setQuestions(norm, "CSV:fallback");
      Render.log("CSV読込成功: 件数=" + AppState.questions.length);
      enableNavButtons();
    }, function (errMsg) {
      AppState.dataSource = "CSV:fallback(失敗)";
      AppState.loadedAt = Util.nowText();
      Render.renderStatus();
      Render.log("CSV読込失敗:\n" + errMsg);
    });
  }

  function trySharePointThenFallback() {
    // DavWWWRoot注意
    if (Util.isDavWWWRootUrl && Util.isDavWWWRootUrl()) {
      Render.log("注意: DavWWWRoot 経由で開いている可能性があります。通常の https URL で開いてください。");
    }

    Render.log("SharePoint接続試行: リスト『" + SP_CONFIG.listTitle + "』");
    Render.log("SP webRoot: " + (SP_BASE.webRoot || "(空)"));
    Render.log("SP api: " + (SP_BASE.api || "(空)"));

    SP_Questions.loadQuestions(function (norm) {
      setQuestions(norm, "SP:" + SP_CONFIG.listTitle);
      Render.log("SharePoint読込成功: 件数=" + AppState.questions.length);
      enableNavButtons();
    }, function (errMsg) {
      Render.log("SharePoint接続失敗。理由:\n" + errMsg);
      loadCsvFallback("SharePoint接続に失敗したため");
    });
  }

  function enableNavButtons() {
    var btnPrev = Util.qs("#btnPrev");
    var btnNext = Util.qs("#btnNext");
    if (btnPrev) btnPrev.disabled = false;
    if (btnNext) btnNext.disabled = false;
  }

  function wireEvents() {
    var sel = Util.qs("#categorySelect");
    if (sel) sel.onchange = function () {
      AppState.selectedCategory = sel.value || "";
      AppState.selectedIndex = 0;
      applyFilterAndRender();
      Render.log("カテゴリ変更: " + (AppState.selectedCategory || "(すべて)"));
    };

    var btnPrint = Util.qs("#btnPrint");
    if (btnPrint) btnPrint.onclick = function () {
      global.print();
    };

    var btnExport = Util.qs("#btnExportCsv");
    if (btnExport) btnExport.onclick = function () {
      Render.log("CSV出力は次フェーズで実装します。");
    };

    // 画面確認用の前後移動（出題ロジックは後で）
    var btnPrev = Util.qs("#btnPrev");
    var btnNext = Util.qs("#btnNext");

    if (btnPrev) btnPrev.onclick = function () {
      if (!AppState.visible || AppState.visible.length === 0) return;
      AppState.selectedIndex = Math.max(0, AppState.selectedIndex - 1);
      Render.renderCurrentQuestion();
    };

    if (btnNext) btnNext.onclick = function () {
      if (!AppState.visible || AppState.visible.length === 0) return;
      AppState.selectedIndex = Math.min(AppState.visible.length - 1, AppState.selectedIndex + 1);
      Render.renderCurrentQuestion();
    };

    // ランダム開始／ID指定開始（ロジックは次フェーズ）
    var btnR = Util.qs("#btnRandomStart");
    if (btnR) btnR.onclick = function () {
      Render.log("ランダムスタート: （ロジックは次フェーズで実装）");
    };

    var btnS = Util.qs("#btnStart");
    if (btnS) btnS.onclick = function () {
      Render.log("ID指定スタート: （ロジックは次フェーズで実装）");
    };
  }

  function init() {
    wireEvents();
    Render.clearLog();
    Render.renderStatus();
    Render.log("起動");
    trySharePointThenFallback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

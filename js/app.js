// app.js / 作成日時(JST): 2025-12-21 15:40:00
(function (global) {
  "use strict";

  function applyFilterAndRender() {
    AppState.visible = Engine.applyCategoryFilter(AppState.questions, AppState.selectedCategory);

    // 選択インデックス補正
    if (AppState.selectedIndex >= AppState.visible.length) AppState.selectedIndex = 0;
    if (AppState.selectedIndex < 0) AppState.selectedIndex = 0;

    Render.renderStatus();
    Render.renderCategorySelect();
    Render.renderList();
    Render.renderCurrentQuestion();
  }

  function setQuestions(norm, sourceLabel) {
    AppState.questions = norm.questions || [];
    AppState.categories = norm.categories || [];
    AppState.dataSource = sourceLabel || "CSV:fallback";
    AppState.loadedAt = Util.nowText();
    AppState.selectedIndex = 0;

    // カテゴリ選択が無効になっていたらクリア
    if (AppState.selectedCategory) {
      var ok = false;
      for (var i = 0; i < AppState.categories.length; i++) {
        if (AppState.categories[i] === AppState.selectedCategory) { ok = true; break; }
      }
      if (!ok) AppState.selectedCategory = "";
    }

    applyFilterAndRender();
  }

  function loadFallback() {
    Render.showNotice("読込", "questions_fallback.csv を読み込んでいます…");
    CsvLoader.loadFallback(function (norm) {
      setQuestions(norm, "CSV:fallback");
      Render.showNotice("読込完了", "questions_fallback.csv を読み込みました。件数: " + AppState.questions.length);
    }, function (errMsg) {
      AppState.dataSource = "CSV:fallback(失敗)";
      AppState.loadedAt = Util.nowText();
      Render.renderStatus();
      Render.showNotice("エラー", errMsg + "\n同じディレクトリに questions_fallback.csv があるか、https配下で開いているか確認してください。");
    });
  }

  function wireEvents() {
    var btnLoad = Util.qs("#btnLoadFallback");
    if (btnLoad) btnLoad.onclick = function () {
      loadFallback();
    };

    var sel = Util.qs("#categorySelect");
    if (sel) sel.onchange = function () {
      AppState.selectedCategory = sel.value || "";
      AppState.selectedIndex = 0;
      applyFilterAndRender();
    };

    // 一覧クリックで選択
    var list = Util.qs("#questionList");
    if (list) {
      list.onclick = function (ev) {
        ev = ev || window.event;
        var target = ev.target || ev.srcElement;
        while (target && target !== list) {
          if (target.getAttribute && target.getAttribute("data-index") !== null) {
            var idx = parseInt(target.getAttribute("data-index"), 10);
            if (!isNaN(idx)) {
              AppState.selectedIndex = idx;
              Render.renderList();
              Render.renderCurrentQuestion();
            }
            break;
          }
          target = target.parentNode;
        }
      };
    }

    // 印刷/CSVは後で実装（今はUIだけ）
    var btnPrint = Util.qs("#btnPrint");
    if (btnPrint) btnPrint.onclick = function () {
      window.print();
    };

    var btnExport = Util.qs("#btnExportCsv");
    if (btnExport) btnExport.onclick = function () {
      Render.showNotice("未実装", "CSV出力は次のフェーズで追加します（表示中の行だけ等）。");
    };
  }

  function init() {
    wireEvents();
    Render.renderStatus();
    // 起動時に自動でフォールバックCSVを読込（要件）
    loadFallback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

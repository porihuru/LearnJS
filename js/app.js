// app.js / 作成日時(JST): 2025-12-21 15:55:00
(function (global) {
  "use strict";

  function applyFilterAndRender() {
    AppState.visible = Engine.applyCategoryFilter(AppState.questions, AppState.selectedCategory);

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

  function loadFallback() {
    var abs = Util.resolveUrl("./questions_fallback.csv");

    var msg = "questions_fallback.csv を読み込んでいます…\n" +
              Util.pageInfoText() + "\n" +
              "CSV: " + abs;

    if (Util.isDavWWWRootUrl()) {
      msg += "\n\n注意: DavWWWRoot で開いている可能性があります。\n通常の https URL で開いてください。";
    }

    Render.showNotice("読込", msg);

    CsvLoader.loadFallback(function (norm) {
      setQuestions(norm, "CSV:fallback");
      Render.showNotice(
        "読込完了",
        "questions_fallback.csv を読み込みました。\n" +
        "件数: " + AppState.questions.length + "\n" +
        "CSV: " + abs
      );

      // ボタン類を「画面確認用」に最小限有効化（前/次はまだ未実装）
      var btnPrev = Util.qs("#btnPrev");
      var btnNext = Util.qs("#btnNext");
      if (btnPrev) btnPrev.disabled = false;
      if (btnNext) btnNext.disabled = false;
    }, function (errMsg) {
      AppState.dataSource = "CSV:fallback(失敗)";
      AppState.loadedAt = Util.nowText();
      Render.renderStatus();

      Render.showNotice(
        "エラー",
        errMsg + "\n\n" +
        "確認事項:\n" +
        "- index.html と同じフォルダに questions_fallback.csv がある\n" +
        "- ブラウザで questions_fallback.csv を直接開ける（権限/404でない）\n" +
        "- https の通常URLで開いている（DavWWWRoot不可）\n"
      );
    });
  }

  function wireEvents() {
    var btnLoad = Util.qs("#btnLoadFallback");
    if (btnLoad) btnLoad.onclick = function () { loadFallback(); };

    var sel = Util.qs("#categorySelect");
    if (sel) sel.onchange = function () {
      AppState.selectedCategory = sel.value || "";
      AppState.selectedIndex = 0;
      applyFilterAndRender();
    };

    var list = Util.qs("#questionList");
    if (list) {
      list.onclick = function (ev) {
        ev = ev || global.event;
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

    var btnPrint = Util.qs("#btnPrint");
    if (btnPrint) btnPrint.onclick = function () { global.print(); };

    var btnExport = Util.qs("#btnExportCsv");
    if (btnExport) btnExport.onclick = function () {
      Render.showNotice("未実装", "CSV出力は次のフェーズで追加します。");
    };

    // 前へ/次へ（暫定：画面確認用にリスト内を移動するだけ）
    var btnPrev = Util.qs("#btnPrev");
    var btnNext = Util.qs("#btnNext");

    if (btnPrev) btnPrev.onclick = function () {
      if (!AppState.visible || AppState.visible.length === 0) return;
      AppState.selectedIndex = Math.max(0, AppState.selectedIndex - 1);
      Render.renderList();
      Render.renderCurrentQuestion();
    };

    if (btnNext) btnNext.onclick = function () {
      if (!AppState.visible || AppState.visible.length === 0) return;
      AppState.selectedIndex = Math.min(AppState.visible.length - 1, AppState.selectedIndex + 1);
      Render.renderList();
      Render.renderCurrentQuestion();
    };
  }

  function init() {
    wireEvents();
    Render.renderStatus();
    loadFallback(); // 起動時自動読込
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

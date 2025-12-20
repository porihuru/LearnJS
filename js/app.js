// JST: 2025-12-20 21:00:00 / app.js
(function (global) {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function setDataSource(type, label, detail) {
    var S = global.AppState;
    S.dataSource = { type: type, label: label, detail: detail };
  }

  function markLoaded(count) {
    var S = global.AppState;
    S.lastLoadedAt = global.Util.formatJstLike(new Date());
    global.Render.updateFooter();
    global.Render.updatePills();
    global.Render.setStatus("読込完了（" + count + "件）");
  }

  function isListMissingError(req) {
    // リスト不存在っぽいものだけ「自動CSVへ」
    if (!req || typeof req !== "object") return false;

    // 404 が最も多い（環境によりメッセージ差あり）
    if (req.status === 404) return true;

    var t = (req.responseText || "");
    t = String(t).toLowerCase();

    // SharePointの典型メッセージをざっくり吸収
    if (t.indexOf("does not exist") >= 0) return true;
    if (t.indexOf("list") >= 0 && t.indexOf("exist") >= 0) return true;
    if (t.indexOf("リスト") >= 0 && (t.indexOf("存在") >= 0 || t.indexOf("見つか") >= 0)) return true;

    return false;
  }

  function tryLoadFromCsvFallbackUrl(onOk, onErr) {
    var fb = global.CSV_FALLBACK || {};
    if (!fb.enabled || !fb.url) { onErr("CSVフォールバック未設定"); return; }

    global.Render.setStatus("SharePointリスト無し → CSVへ自動接続中…");
    setDataSource("csv", "CSV（自動）『" + fb.url + "』", fb.url);

    global.CsvLoader.loadUrl(fb.url, function (rawList) {
      var normalized = global.Util.normalizeQuestions(rawList);
      if (!normalized || normalized.length === 0) {
        onErr("CSVは読めましたが、有効な問題が0件です。");
        return;
      }
      global.Engine.setQuestions(normalized);
      markLoaded(global.AppState.total);
      global.Render.hideModal();
      global.Render.showQuestion();
      onOk();
    }, function (msg) {
      onErr(msg);
    });
  }

  function openCsvPickerWithMessage(msg) {
    // 完全自動でファイルピッカーは開けないことがあるので、モーダルは残す
    global.Render.setStatus("CSV選択が必要です");
    global.Render.showModal("CSVを選択してください", msg || "CSVを選択して開始してください。");
  }

  function tryLoadFromSharePoint() {
    global.Render.setStatus("SharePointに接続中…");
    setDataSource("sharepoint", "SharePoint リスト『" + global.SP_CONFIG.listTitle + "』", "");

    global.SpApi.tryPing(function () {
      global.Render.setStatus("SharePointから問題を取得中…");
      global.SpQuestions.loadAll(function (rawList) {
        var normalized = global.Util.normalizeQuestions(rawList);
        if (!normalized || normalized.length === 0) {
          // リストはあるが中身が無い → CSV自動へは行かず、案内だけ
          openCsvPickerWithMessage("SharePointから問題を取得しましたが、有効な問題が0件です。\nCSVで開始できます。");
          return;
        }
        global.Engine.setQuestions(normalized);
        markLoaded(global.AppState.total);
        global.Render.hideModal();
        global.Render.showQuestion();
      }, function (req) {
        // ★ここ：リストが無い場合だけ自動CSVへ
        if (isListMissingError(req)) {
          tryLoadFromCsvFallbackUrl(function(){}, function (msg) {
            openCsvPickerWithMessage(
              "SharePointリストが見つかりません。\n"
              + "CSV自動読込も失敗しました。\n\n"
              + "理由: " + msg + "\n\n"
              + "手動でCSVを選択してください。"
            );
          });
          return;
        }

        // それ以外（権限不足等）は、CSV選択へ誘導（自動にはしない）
        openCsvPickerWithMessage(
          "SharePointからの取得に失敗しました。\n"
          + "status: " + (req && req.status ? req.status : "-") + "\n\n"
          + "CSVで開始できます。"
        );
      });
    }, function (req) {
      // サイト自体に繋がらない等 → CSVフォールバックも試し、ダメなら選択へ
      tryLoadFromCsvFallbackUrl(function(){}, function (msg) {
        openCsvPickerWithMessage(
          "SharePointに接続できません。\n"
          + "CSV自動読込も失敗しました。\n\n"
          + "理由: " + msg + "\n\n"
          + "手動でCSVを選択してください。"
        );
      });
    });
  }

  function loadFromCsvFile(file) {
    global.Render.setStatus("CSV読込中…");
    setDataSource("csv", "CSV『" + (file && file.name ? file.name : "選択ファイル") + "』", "");

    global.CsvLoader.loadFile(file, function (rawList) {
      var normalized = global.Util.normalizeQuestions(rawList);
      if (!normalized || normalized.length === 0) {
        openCsvPickerWithMessage("CSVに有効な問題（2択以上）がありません。");
        return;
      }
      global.Engine.setQuestions(normalized);
      markLoaded(global.AppState.total);
      global.Render.hideModal();
      global.Render.showQuestion();
    }, function (errMsg) {
      openCsvPickerWithMessage("CSV読込に失敗しました。\n" + String(errMsg || ""));
    });
  }

  function bindEvents() {
    global.Render.onChoiceClick = function (choiceObj) {
      global.Render.lockChoices();
      var res = global.Engine.answer(choiceObj);
      if (res && res.ignored) return;
      global.Render.showJudge(!!res.ok, res.correctAnswer, res.explain);
    };

    el("btnNext").onclick = function () {
      global.Engine.next();
      global.Render.showQuestion();
    };

    el("btnRestart").onclick = function () {
      global.Engine.restart();
      global.Render.showQuestion();
      global.Render.setStatus("やり直し");
    };

    el("btnResultRestart").onclick = function () {
      global.Engine.restart();
      global.Render.showQuestion();
      global.Render.setStatus("やり直し");
    };

    el("btnChangeSource").onclick = function () {
      // 手動で切り替えたい時用（モーダルを出す）
      global.Render.showModal("データソース変更", "CSVを選択するか、SharePointを再読込してください。");
    };

    // modal
    el("btnModalRetrySP").onclick = function () {
      tryLoadFromSharePoint();
    };
    el("btnModalPickCSV").onclick = function () {
      el("fileCsv").value = "";
      el("fileCsv").click();
    };
    el("btnModalClose").onclick = function () {
      global.Render.hideModal();
    };
    el("modalBackdrop").onclick = function () {
      global.Render.hideModal();
    };

    el("fileCsv").onchange = function () {
      var files = el("fileCsv").files;
      if (!files || files.length === 0) return;
      loadFromCsvFile(files[0]);
    };
  }

  function startTicker() {
    if (global.AppState.timerId) clearInterval(global.AppState.timerId);
    global.AppState.timerId = setInterval(function () {
      global.Render.onTick();
    }, 1000);
  }

  function init() {
    global.SP_BASE.init();
    global.Render.updateFooter();
    bindEvents();
    startTicker();
    tryLoadFromSharePoint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})(window);
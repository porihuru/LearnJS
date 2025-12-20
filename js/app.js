// JST: 2025-12-20 21:10:00 / js/app.js
(function (global) {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function setDataSource(type, label, detail) {
    var S = global.AppState;
    S.dataSource = { type: type, label: label, detail: detail };
  }

  function markLoaded() {
    var S = global.AppState;
    S.lastLoadedAt = global.Util.formatJstLike(new Date());
    global.Render.updateFooter();
    global.Render.updatePills();
    global.Render.setStatus("読込完了（" + (S.total || 0) + "件）");
  }

  function isListMissingError(req) {
    if (!req || typeof req !== "object") return false;
    if (req.status === 404) return true;

    var t = String(req.responseText || "").toLowerCase();
    if (t.indexOf("does not exist") >= 0) return true;
    if (t.indexOf("list") >= 0 && t.indexOf("exist") >= 0) return true;
    if (t.indexOf("リスト") >= 0 && (t.indexOf("存在") >= 0 || t.indexOf("見つか") >= 0)) return true;
    return false;
  }

  function openCsvPickerWithMessage(msg) {
    global.Render.setStatus("CSV選択が必要です");
    global.Render.showModal("CSVを選択してください", msg || "CSVを選択して開始してください。");
  }

  function tryLoadFromCsvFallbackUrl(onOk, onErr) {
    var fb = global.CSV_FALLBACK || {};
    if (!fb.enabled || !fb.url) { onErr("CSVフォールバック未設定"); return; }

    global.Render.setStatus("SharePointリスト無し → CSVへ自動接続中…");
    setDataSource("csv", "CSV（自動）『" + fb.url + "』", fb.url);

    global.CsvLoader.loadUrl(fb.url, function (rawList) {
      // ★Engine側で正規化する（ここでnormalizeしない）★
      global.Engine.setQuestions(rawList);

      if (!global.AppState.total) {
        onErr("CSVは読めましたが、有効な問題（2択以上）が0件です。");
        return;
      }

      markLoaded();
      global.Render.hideModal();
      global.Render.showQuestion();
      onOk();
    }, function (msg) {
      onErr(msg);
    });
  }

  function tryLoadFromSharePoint() {
    global.Render.setStatus("SharePointに接続中…");
    setDataSource("sharepoint", "SharePoint リスト『" + global.SP_CONFIG.listTitle + "』", "");

    global.SpApi.tryPing(function () {
      global.Render.setStatus("SharePointから問題を取得中…");
      global.SpQuestions.loadAll(function (rawList) {
        // ★Engine側で正規化する（ここでnormalizeしない）★
        global.Engine.setQuestions(rawList);

        if (!global.AppState.total) {
          openCsvPickerWithMessage("SharePointから問題を取得しましたが、有効な問題（2択以上）が0件です。\nCSVで開始できます。");
          return;
        }

        markLoaded();
        global.Render.hideModal();
        global.Render.showQuestion();
      }, function (req) {
        // リスト無しだけ自動CSVへ
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

        // それ以外（権限不足など）は手動CSVへ誘導
        openCsvPickerWithMessage(
          "SharePointからの取得に失敗しました。\n"
          + "status: " + (req && req.status ? req.status : "-") + "\n\n"
          + "CSVで開始できます。"
        );
      });
    }, function (req) {
      // サイトに繋がらない等 → CSV自動も試す
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
      // ★Engine側で正規化する（ここでnormalizeしない）★
      global.Engine.setQuestions(rawList);

      if (!global.AppState.total) {
        openCsvPickerWithMessage("CSVに有効な問題（2択以上）がありません。");
        return;
      }

      markLoaded();
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
      global.Render.showModal("データソース変更", "CSVを選択するか、SharePointを再読込してください。");
    };

    // modal
    el("btnModalRetrySP").onclick = function () { tryLoadFromSharePoint(); };
    el("btnModalPickCSV").onclick = function () {
      el("fileCsv").value = "";
      el("fileCsv").click();
    };
    el("btnModalClose").onclick = function () { global.Render.hideModal(); };
    el("modalBackdrop").onclick = function () { global.Render.hideModal(); };

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

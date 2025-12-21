// app.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  function setStartEnabled(enabled) {
    document.getElementById("btnStart").disabled = !enabled;
  }

  function applyValidationResult(ok, detail) {
    var st = global.AppState.validation;
    st.ok = ok;
    st.errors = detail.errors || [];
    st.warnings = detail.warnings || [];
    st.summary = detail.summary || "";

    if (ok) {
      global.AppState.questions = detail.questions;
      global.AppState.categoryStats = detail.stats;
      setStartEnabled(global.AppState.questions.length > 0);
    } else {
      global.AppState.questions = [];
      global.AppState.categoryStats = {};
      setStartEnabled(false);
    }

    global.Render.renderValidation({
      ok: ok,
      summary: st.summary,
      errors: st.errors,
      warnings: st.warnings,
      count: (detail.questions || []).length,
      stats: detail.stats || {}
    });
  }

  function loadCsvText(csvText, label) {
    try {
      var built = global.CsvLoader.validateAndBuild(csvText);
      applyValidationResult(true, {
        questions: built.questions,
        stats: built.stats,
        warnings: built.warnings,
        summary: (label || "読み込み") + "：OK（" + built.questions.length + "問）"
      });
    } catch (e) {
      var d = (e && e._detail) ? e._detail : null;
      applyValidationResult(false, {
        questions: [],
        stats: {},
        warnings: d ? d.warnings : [],
        errors: d ? d.errors : [String(e && e.message ? e.message : e)],
        summary: (label || "読み込み") + "：NG"
      });
    }
  }

  function autoLoadFallback() {
    applyValidationResult(false, { errors: [], warnings: [], summary: "フォールバック読込中..." });

    global.CsvLoader.loadFromUrl(global.AppState.config.fallbackCsvUrl, function (err, text) {
      if (err) {
        applyValidationResult(false, {
          errors: ["フォールバックCSVを自動読込できませんでした。", String(err.message || err)],
          warnings: [],
          summary: "フォールバック読込：NG"
        });
        return;
      }
      loadCsvText(text, "フォールバック読込");
    });
  }

  function loadSample() {
    applyValidationResult(false, { errors: [], warnings: [], summary: "サンプル読込中..." });
    global.CsvLoader.loadFromUrl(global.AppState.config.sampleCsvUrl, function (err, text) {
      if (err) {
        applyValidationResult(false, {
          errors: ["サンプルCSVを読込できませんでした。", String(err.message || err)],
          warnings: [],
          summary: "サンプル読込：NG"
        });
        return;
      }
      loadCsvText(text, "サンプル読込");
    });
  }

  function startQuiz() {
    var total = parseInt(document.getElementById("totalCount").value, 10);
    if (!isFinite(total) || total <= 0) total = 40;

    var balanced = !!document.getElementById("balanced").checked;

    global.AppState.quiz.set = global.Engine.buildQuizSet(global.AppState.questions, total, balanced);
    global.AppState.quiz.idx = 0;
    global.AppState.quiz.score = 0;

    global.Render.showQuizBox(true);
    renderCurrent();
  }

  function renderCurrent() {
    var qset = global.AppState.quiz.set;
    var idx = global.AppState.quiz.idx;

    if (idx >= qset.length) {
      global.Render.showQuizBox(false);
      applyValidationResult(true, {
        questions: global.AppState.questions,
        stats: global.AppState.categoryStats,
        warnings: global.AppState.validation.warnings,
        summary: "終了：正解数 " + global.AppState.quiz.score + " / " + qset.length
      });
      return;
    }

    global.Render.renderQuestion(qset[idx], idx, qset.length, global.AppState.quiz.score);
  }

  function choose(choiceIndex) {
    var q = global.AppState.quiz.set[global.AppState.quiz.idx];
    var isCorrect = (choiceIndex === q.correctIndex);
    if (isCorrect) global.AppState.quiz.score++;

    global.Render.renderJudge(isCorrect, q.correctIndex, choiceIndex, q.explanation);
  }

  function next() {
    global.AppState.quiz.idx++;
    renderCurrent();
  }

  function end() {
    global.Render.showQuizBox(false);
    applyValidationResult(true, {
      questions: global.AppState.questions,
      stats: global.AppState.categoryStats,
      warnings: global.AppState.validation.warnings,
      summary: "終了：正解数 " + global.AppState.quiz.score + " / " + global.AppState.quiz.set.length
    });
  }

  function wireUI() {
    document.getElementById("btnAutoLoad").addEventListener("click", autoLoadFallback);
    document.getElementById("btnLoadSample").addEventListener("click", loadSample);

    document.getElementById("btnLoadFile").addEventListener("click", function () {
      var inp = document.getElementById("csvFile");
      if (!inp.files || inp.files.length === 0) {
        applyValidationResult(false, { errors: ["ファイルが選択されていません。"], warnings: [], summary: "ファイル読込：NG" });
        return;
      }
      global.CsvLoader.loadFromFile(inp.files[0], function (err, text) {
        if (err) {
          applyValidationResult(false, { errors: [String(err.message || err)], warnings: [], summary: "ファイル読込：NG" });
          return;
        }
        loadCsvText(text, "ファイル読込");
      });
    });

    document.getElementById("btnLoadPaste").addEventListener("click", function () {
      var text = document.getElementById("csvPaste").value || "";
      loadCsvText(text, "貼り付け読込");
    });

    document.getElementById("btnClear").addEventListener("click", function () {
      document.getElementById("csvPaste").value = "";
      document.getElementById("csvFile").value = "";
      global.AppState.questions = [];
      setStartEnabled(false);
      global.Render.renderValidation({ ok: null, summary: "クリアしました。", errors: [], warnings: [], count: 0, stats: {} });
    });

    document.getElementById("btnStart").addEventListener("click", startQuiz);
    document.getElementById("btnNext").addEventListener("click", next);
    document.getElementById("btnEnd").addEventListener("click", end);
  }

  global.App = {
    init: function () {
      wireUI();
      // 起動時にフォールバックを自動読込
      autoLoadFallback();
    },
    onChoose: function (choiceIndex) { choose(choiceIndex); }
  };

  // boot
  global.App.init();

})(window);
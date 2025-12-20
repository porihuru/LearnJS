// JST: 2025-12-19 06:37:29 / engine.js
(function (global) {
  "use strict";

  var Engine = {};

  Engine.reset = function () {
    var S = global.AppState;
    S.questions = [];
    S.total = 0;
    S.index = 0;
    S.correct = 0;
    S.startedAtMs = 0;
    S.current = null;
    S.currentChoices = [];
    S.answered = false;
  };

  Engine.setQuestions = function (rawQuestions) {
    var S = global.AppState;

    var normalized = global.Util.normalizeQuestions(rawQuestions || []);
    // 問題順もランダム（必要なければ外してOK）
    normalized = global.Util.shuffle(normalized);

    S.questions = normalized;
    S.total = normalized.length;
    S.index = 0;
    S.correct = 0;
    S.startedAtMs = global.Util.nowMs();
    S.answered = false;

    Engine.loadCurrent();
  };

  Engine.loadCurrent = function () {
    var S = global.AppState;
    if (S.index < 0) S.index = 0;

    if (S.index >= S.total) {
      S.current = null;
      S.currentChoices = [];
      return;
    }

    S.current = S.questions[S.index];
    S.answered = false;

    // choicesを {text,isCorrect} にしてシャッフル
    var c = [];
    for (var i = 0; i < S.current.choices.length; i++) {
      var t = S.current.choices[i];
      c.push({ text: t, isCorrect: (t === S.current.answerText) });
    }
    S.currentChoices = global.Util.shuffle(c);
  };

  Engine.answer = function (choiceObj) {
    var S = global.AppState;
    if (!S.current) return { done: true };
    if (S.answered) return { ignored: true };

    S.answered = true;

    var ok = !!(choiceObj && choiceObj.isCorrect);
    if (ok) S.correct++;

    return {
      ok: ok,
      correctAnswer: S.current.answerText,
      explain: S.current.explain || ""
    };
  };

  Engine.next = function () {
    var S = global.AppState;
    S.index++;
    Engine.loadCurrent();
  };

  Engine.restart = function () {
    var S = global.AppState;
    if (!S.questions || S.questions.length === 0) return;
    // restart時も並び替える
    var reshuffled = global.Util.shuffle(S.questions);
    S.questions = reshuffled;
    S.total = reshuffled.length;
    S.index = 0;
    S.correct = 0;
    S.startedAtMs = global.Util.nowMs();
    S.answered = false;
    Engine.loadCurrent();
  };

  Engine.getElapsedSec = function () {
    var S = global.AppState;
    if (!S.startedAtMs) return 0;
    var ms = global.Util.nowMs() - S.startedAtMs;
    return Math.max(0, Math.floor(ms / 1000));
  };

  global.Engine = Engine;

})(window);
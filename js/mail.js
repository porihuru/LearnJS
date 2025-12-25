/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-25 23:05:00
  VERSION: 20251225-01

  機能:
    [MAIL-01] 結果発表モーダルで「メール送信」ボタンを押すと、
              メーラーを開いて本文に結果＋履歴を挿入。
*/
(function (global) {
  "use strict";

  var MailManager = {};
  MailManager.VERSION = "20251225-01";
  Util.registerVersion("mail.js", MailManager.VERSION);

  MailManager.openMailClient = function () {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];
    var hist = State.App.histMap || {};

    var lines = [];
    lines.push("text_access問題集 結果報告");
    lines.push("");
    lines.push("【総合結果】");
    lines.push("問題数: " + r.total);
    lines.push("回答数: " + r.answered);
    lines.push("正解数: " + r.correct);
    lines.push("不正解数: " + r.wrong);
    lines.push("正答率: " + r.rate + "%");
    lines.push("");

    if (details.length) {
      lines.push("【詳細】");
      for (var i = 0; i < details.length; i++) {
        var d = details[i];
        lines.push((d.id || "") + ": " + (d.ok ? "正解" : "不正解"));
      }
      lines.push("");
    }

    var keys = Object.keys(hist);
    if (keys.length) {
      lines.push("【履歴】");
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        var h = hist[k];
        lines.push(k + ": 正解" + h.c + " / 不正解" + h.w);
      }
    }

    var body = encodeURIComponent(lines.join("\n"));
    var subject = encodeURIComponent("text_access問題集 結果報告");

    var url = "mailto:?subject=" + subject + "&body=" + body;
    window.location.href = url;

    State.log("メール送信: メーラーを開きました");
  };

  global.MailManager = MailManager;

})(window);
/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-27 11:55:00
  VERSION: 20260211-01

  目的:
    - メーラーを起動してメール本文を送信
    - Edge95/IEモードでも動作
*/
(function (global) {
  "use strict";

  var Mail = {};
  Mail.VERSION = "20260211-01";
  Util.registerVersion("mail.js", Mail.VERSION);

  var MAIL_LENGTH_LIMIT = 1500;

  /* [IDX-002] メール本文（セッション結果） */
  Mail.buildSessionText = function () {
    var sess = State.App.session;
    if (!sess) return "（セッションがありません）";

    var items = sess.items || [];
    var stats = sess.stats || { total: 0, correct: 0, wrong: 0, answered: 0 };

    var lines = [];
    lines.push("【結果】 " + Util.nowStamp());
    lines.push("");
    lines.push("名前: ___________________");
    lines.push("");
    lines.push("問題数: " + stats.total);
    lines.push("正解数: " + stats.correct);
    lines.push("不正解数: " + stats.wrong);
    lines.push("");
    lines.push("| ID | カテゴリ | 結果 |履歴 正解/不正解|");
    lines.push("");

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var row = it.row || {};
      var ans = it.ans || {};

      var id = row.idText || "";
      var cat = row.category || "";
      var result = ans.isAnswered ? (ans.isCorrect ? "正解" : "不正解") : "未回答";

      var hist = HistoryStore.get(State.App.histMap, id);
      var histText = (hist.c || 0) + "/" + (hist.w || 0);

      lines.push("| " + id + " | " + safe(cat) + " | " + result + " | " + histText + " |");
    }

    return lines.join("\n");
  };

  /* [IDX-010] メーラー起動 */
  Mail.openMailer = function () {
    var sess = State.App.session;
    var stats = (sess && sess.stats) ? sess.stats : { total: 0, correct: 0 };
    
    var subject = "結果 問題数" + stats.total + " 正解数" + stats.correct;
    var body = Mail.buildSessionText();

    /* 1500文字以上の場合は簡潔な内容に変更 */
    if (body.length >= MAIL_LENGTH_LIMIT) {
      State.log("[mail] body length " + body.length + " >= " + MAIL_LENGTH_LIMIT + " (truncated)");
      body = "【結果】 " + Util.nowStamp() + "\n" +
             "名前: ___________________\n" +
             "問題数: " + stats.total + "\n" +
             "正解数: " + stats.correct + "\n" +
             "不正解数: " + stats.wrong + "\n" +
             "\n" +
             "メール文字数超過のため省略";
    } else {
      State.log("[mail] body length " + body.length);
    }

    State.log("[mail] mailto start");
    location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  };

  /* =========================
     内部
  ========================= */

  function findRow(id) {
    var rows = State.App.rows || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) return rows[i];
    }
    return null;
  }

  function safe(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  global.Mail = Mail;

})(window);
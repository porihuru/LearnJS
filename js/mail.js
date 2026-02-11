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

  /* [IDX-002] メール本文（セッション結果） */
  Mail.buildSessionText = function () {
    var sess = State.App.session;
    if (!sess) return "（セッションがありません）";

    var items = sess.items || [];

    var lines = [];
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
    var subject = "クイズ結果";
    var body = Mail.buildSessionText();

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
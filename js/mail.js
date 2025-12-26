/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-02

  仕様変更:
    - メール本文は「印刷」と同じ情報構成にする
    - 累積履歴一覧は載せない
    - 明細各行に「履歴(正/不)=c/w」を載せる
*/
(function (global) {
  "use strict";

  var MailManager = {};
  MailManager.VERSION = "20251226-02";
  Util.registerVersion("mail.js", MailManager.VERSION);

  function buildBodyText() {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];

    var lines = [];
    lines.push("text_access問題集 結果");
    lines.push("日時: " + (r.at || Util.nowStamp()));
    lines.push("");
    lines.push("【今回の結果】");
    lines.push("問題数: " + (r.total || 0));
    lines.push("回答数: " + (r.answered || 0));
    lines.push("正解数: " + (r.correct || 0));
    lines.push("不正解数: " + (r.wrong || 0));
    lines.push("正答率: " + (r.rate || 0) + "%");
    lines.push("");

    lines.push("【今回の結果（全問）】");
    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      var hist = HistoryStore.get(State.App.histMap, d.id || "");
      var histText = String(hist.c || 0) + "/" + String(hist.w || 0);

      lines.push(
        "ID" + (d.id || "") +
        " [" + (d.category || "") + "] " +
        (d.ok ? "正解" : "不正解") +
        " / 履歴(正/不)=" + histText +
        " / 選択=" + (d.selected || "") +
        " / 正解=" + (d.correct || "")
      );
    }
    if (details.length === 0) lines.push("（明細なし）");

    return lines.join("\r\n");
  }

  MailManager.composeMail = function () {
    if (!State.App.lastResult) {
      State.log("メール: 失敗（結果データなし）");
      alert("メールに載せる結果がありません。");
      return;
    }

    var subject = "text_access問題集 結果";
    var body = buildBodyText();

    var url = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    State.log("メール: メーラー起動(mailto)を実行");
    global.location.href = url;
  };

  global.MailManager = MailManager;

})(window);

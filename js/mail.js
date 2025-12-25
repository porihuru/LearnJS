/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  目的:
    - mailto: を使ってメーラーを起動
    - 本文に「今回の結果」＋「累積履歴（Cookie）」を載せる
*/
(function (global) {
  "use strict";

  var MailManager = {};
  MailManager.VERSION = "20251226-01";
  Util.registerVersion("mail.js", MailManager.VERSION);

  function buildBodyText() {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];
    var histArr = HistoryStore.toArraySorted(State.App.histMap);

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

    lines.push("【今回の明細】");
    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      lines.push(
        "ID" + (d.id || "") +
        " [" + (d.category || "") + "] " +
        (d.ok ? "正解" : "不正解") +
        " / 選択=" + (d.selected || "") +
        " / 正解=" + (d.correct || "")
      );
    }
    if (details.length === 0) lines.push("（なし）");
    lines.push("");

    lines.push("【累積履歴（Cookie）】");
    for (var j = 0; j < histArr.length; j++) {
      var h = histArr[j];
      lines.push("ID" + h.id + "：正解" + h.c + " 不正解" + h.w);
    }
    if (histArr.length === 0) lines.push("（履歴なし）");

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

    /* [IDX-010] mailtoの長さ制限に注意（問題数が大きい場合は一部省略など調整可能） */
    var url = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

    State.log("メール: メーラー起動(mailto)を実行");
    /* Edge95/IEモード互換：location.hrefで起動 */
    global.location.href = url;
  };

  global.MailManager = MailManager;

})(window);

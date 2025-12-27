/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-05

  仕様（ユーザー指定）:
    【今回の結果（全問）】
    （1行空ける）
    | ID | カテゴリ | 結果 |履歴 正解/不正解|
    各問:
      | 1 | 相続 | 不正解 | 1/3 |
      問題: ...
      選択した答え: ...
      正解の答え: ...
      （1行空ける）
  ※解説は載せない
*/
(function (global) {
  "use strict";

  var MailManager = {};
  MailManager.VERSION = "20251226-05";
  Util.registerVersion("mail.js", MailManager.VERSION);

  /* [IDX-010] mailto本文の安全サイズ（環境差あり） */
  var MAX_BODY_CHARS = 6500;

  function normalizeOneLine(s) {
    s = (s === null || s === undefined) ? "" : String(s);
    s = s.replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  function clipLine(s, maxLen) {
    s = normalizeOneLine(s);
    if (s.length <= maxLen) return s;
    if (maxLen <= 1) return s.substring(0, maxLen);
    return s.substring(0, maxLen - 1) + "…";
  }

  /* [IDX-020] 見出し行（固定） */
  function buildHeaderLine() {
    return "| ID | カテゴリ | 結果 |履歴 正解/不正解|";
  }

  /* [IDX-030] 各問ブロック（1問=5行＋空行） */
  function buildAnswerBlock(d, shorten) {
    d = d || {};
    var id = d.id || "";
    var cat = d.category || "";
    var judge = d.ok ? "正解" : "不正解";

    var histObj = HistoryStore.get(State.App.histMap, id);
    var hist = String(histObj.c || 0) + "/" + String(histObj.w || 0);

    /* [IDX-031] mailto長さ対策：必要時のみ短縮 */
    var qMax = shorten ? 60 : 200;
    var aMax = shorten ? 60 : 200;

    var q = clipLine(d.question || "", qMax);
    var sel = clipLine(d.selected || "", aMax);
    var cor = clipLine(d.correct || "", aMax);

    var lines = [];
    lines.push("| " + id + " | " + cat + " | " + judge + " | " + hist + " |");
    lines.push("問題: " + q);
    lines.push("回答: " + sel);
    lines.push("正解: " + cor);
    lines.push(""); /* ← 1行空ける（各問の区切り） */
    return lines.join("\r\n");
  }

  function buildBodyText(shorten) {
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
    lines.push(""); /* ← 1行空ける（指定どおり） */
    lines.push(buildHeaderLine());

    for (var i = 0; i < details.length; i++) {
      lines.push(buildAnswerBlock(details[i], shorten));
    }

    if (details.length === 0) {
      lines.push("（明細なし）");
      lines.push("");
    }

    if (shorten) {
      lines.push("※本文が長いため、問題/選択/正解は短縮表示しています。");
    }

    return lines.join("\r\n");
  }

  MailManager.composeMail = function () {
    if (!State.App.lastResult) {
      State.log("メール: 失敗（結果データなし）");
      alert("メールに載せる結果がありません。");
      return;
    }

    var subject = "text_access問題集 結果";

    var body = buildBodyText(false);
    if (body.length > MAX_BODY_CHARS) {
      State.log("メール: 本文が長い(" + body.length + " chars)ため短縮版に切替");
      body = buildBodyText(true);
    }

    var url = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    State.log("メール: メーラー起動(mailto)を実行");
    global.location.href = url;
  };

  global.MailManager = MailManager;

})(window);
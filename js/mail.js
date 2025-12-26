/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-03

  要件:
    - メール本文は「印刷と同じ情報構成（明細の表）」にする
    - 問題文は載せる
    - 解説は載せない
    - mailto ではHTMLテーブルが崩れることが多いので、等幅テキスト表で出す

  注意:
    - mailto はURL長制限があるため、本文が長すぎる場合は「問題文/選択/正解」を短縮して送る（ログに記録）
*/
(function (global) {
  "use strict";

  var MailManager = {};
  MailManager.VERSION = "20251226-03";
  Util.registerVersion("mail.js", MailManager.VERSION);

  /* [IDX-010] mailto本文の安全サイズ（環境差あり。長いと起動しない/途中で切れる） */
  var MAX_BODY_CHARS = 6000;

  function normalizeOneLine(s) {
    s = (s === null || s === undefined) ? "" : String(s);
    s = s.replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  function padRight(s, width) {
    s = (s === null || s === undefined) ? "" : String(s);
    if (s.length >= width) return s;
    return s + new Array(width - s.length + 1).join(" ");
  }

  function clip(s, width) {
    s = normalizeOneLine(s);
    if (s.length <= width) return s;
    if (width <= 1) return s.substring(0, width);
    return s.substring(0, width - 1) + "…";
  }

  function buildTable(details, col) {
    // col: { idW, catW, judgeW, histW, qW, selW, corW }
    var lines = [];
    var sep =
      "+" + new Array(col.idW + 1).join("-") +
      "+" + new Array(col.catW + 1).join("-") +
      "+" + new Array(col.judgeW + 1).join("-") +
      "+" + new Array(col.histW + 1).join("-") +
      "+" + new Array(col.qW + 1).join("-") +
      "+" + new Array(col.selW + 1).join("-") +
      "+" + new Array(col.corW + 1).join("-") + "+";

    function rowLine(id, cat, judge, hist, q, sel, cor) {
      return "|" +
        padRight(clip(id, col.idW), col.idW) + "|" +
        padRight(clip(cat, col.catW), col.catW) + "|" +
        padRight(clip(judge, col.judgeW), col.judgeW) + "|" +
        padRight(clip(hist, col.histW), col.histW) + "|" +
        padRight(clip(q, col.qW), col.qW) + "|" +
        padRight(clip(sel, col.selW), col.selW) + "|" +
        padRight(clip(cor, col.corW), col.corW) + "|";
    }

    lines.push(sep);
    lines.push(rowLine("ID", "カテゴリ", "判定", "履歴", "問題", "選択", "正解"));
    lines.push(sep);

    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      var histObj = HistoryStore.get(State.App.histMap, d.id || "");
      var hist = String(histObj.c || 0) + "/" + String(histObj.w || 0);

      lines.push(
        rowLine(
          d.id || "",
          d.category || "",
          d.ok ? "正解" : "不正解",
          hist,
          d.question || "",
          d.selected || "",
          d.correct || ""
        )
      );
    }

    if (details.length === 0) {
      lines.push(rowLine("", "", "", "", "（明細なし）", "", ""));
    }

    lines.push(sep);
    return lines.join("\r\n");
  }

  function buildBodyText(tryShorten) {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];

    // [IDX-020] まずは“印刷相当”の列幅（メールなのでほどほどに短く）
    var col = {
      idW: 4,
      catW: 10,
      judgeW: 4,
      histW: 5,
      qW: tryShorten ? 36 : 60,
      selW: tryShorten ? 18 : 28,
      corW: tryShorten ? 18 : 28
    };

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
    lines.push(buildTable(details, col));

    if (tryShorten) {
      lines.push("");
      lines.push("※本文が長いため、問題文/選択/正解は短縮表示しています。");
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

    // [IDX-030] まずは通常版
    var body = buildBodyText(false);

    // [IDX-031] 長すぎる場合は短縮版へ切替（mailto制限対策）
    if (body.length > MAX_BODY_CHARS) {
      State.log("メール: 本文が長い(" + body.length + " chars)ため短縮版に切替");
      body = buildBodyText(true);
    }

    // [IDX-040] mailto起動
    var url = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    State.log("メール: メーラー起動(mailto)を実行");
    global.location.href = url;
  };

  global.MailManager = MailManager;

})(window);

/*
  ファイル: js/print.js
  作成日時(JST): 2025-12-26 20:00:00
  VERSION: 20251226-01

  追加仕様:
    - 印刷に「今までの正解/不正解履歴（Cookie）」を掲載
*/
(function (global) {
  "use strict";

  var PrintManager = {};
  PrintManager.VERSION = "20251226-01";
  Util.registerVersion("print.js", PrintManager.VERSION);

  function buildHtml() {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];
    var histArr = HistoryStore.toArraySorted(State.App.histMap);

    var html = "";
    html += "<!doctype html><html><head><meta charset='utf-8'>";
    html += "<meta http-equiv='X-UA-Compatible' content='IE=edge'>";
    html += "<title>結果発表</title>";
    html += "<style>";
    html += "body{font-family:Segoe UI,Meiryo,sans-serif;padding:16px;color:#111;}";
    html += "h1{font-size:18px;margin:0 0 10px 0;}";
    html += ".meta{font-size:12px;color:#333;margin-bottom:10px;}";
    html += ".box{border:1px solid #ccc;padding:10px;border-radius:8px;margin-bottom:12px;}";
    html += "table{border-collapse:collapse;width:100%;font-size:12px;}";
    html += "th,td{border:1px solid #ccc;padding:6px;vertical-align:top;}";
    html += "th{background:#f2f2f2;}";
    html += ".ok{color:#1f5fbf;font-weight:700;}";
    html += ".ng{color:#c12929;font-weight:700;}";
    html += "</style></head><body>";

    html += "<h1>text_access問題集 - 結果発表</h1>";
    html += "<div class='meta'>印刷日時: " + Util.esc(r.at || Util.nowStamp()) + "</div>";

    html += "<div class='box'>";
    html += "<div>問題数: " + Util.esc(r.total || 0) + "</div>";
    html += "<div>回答数: " + Util.esc(r.answered || 0) + "</div>";
    html += "<div>正解数: " + Util.esc(r.correct || 0) + "</div>";
    html += "<div>不正解数: " + Util.esc(r.wrong || 0) + "</div>";
    html += "<div>正答率: " + Util.esc(r.rate || 0) + "%</div>";
    html += "</div>";

    /* [IDX-010] セッション明細 */
    html += "<div class='box'><div style='font-weight:700;margin-bottom:6px;'>今回の結果（全問）</div>";
    html += "<table>";
    html += "<tr>";
    html += "<th style='width:70px;'>ID</th>";
    html += "<th style='width:110px;'>カテゴリ</th>";
    html += "<th>問題</th>";
    html += "<th>選択</th>";
    html += "<th>正解</th>";
    html += "<th style='width:70px;'>判定</th>";
    html += "</tr>";

    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      html += "<tr>";
      html += "<td>" + Util.esc(d.id) + "</td>";
      html += "<td>" + Util.esc(d.category) + "</td>";
      html += "<td>" + Util.esc(d.question) + "</td>";
      html += "<td>" + Util.esc(d.selected) + "</td>";
      html += "<td>" + Util.esc(d.correct) + "</td>";
      html += "<td class='" + (d.ok ? "ok" : "ng") + "'>" + (d.ok ? "正解" : "不正解") + "</td>";
      html += "</tr>";
    }
    html += "</table></div>";

    /* [IDX-020] Cookie履歴 */
    html += "<div class='box'><div style='font-weight:700;margin-bottom:6px;'>累積履歴（Cookie：IDごとの正解/不正解）</div>";
    html += "<table>";
    html += "<tr><th style='width:80px;'>ID</th><th style='width:120px;'>正解回数</th><th style='width:120px;'>不正解回数</th></tr>";
    for (var j = 0; j < histArr.length; j++) {
      var h = histArr[j];
      html += "<tr><td>" + Util.esc(h.id) + "</td><td>" + Util.esc(h.c) + "</td><td>" + Util.esc(h.w) + "</td></tr>";
    }
    if (histArr.length === 0) {
      html += "<tr><td colspan='3'>（履歴なし）</td></tr>";
    }
    html += "</table></div>";

    html += "</body></html>";
    return html;
  }

  PrintManager.printLastResult = function () {
    if (!State.App.lastResult) {
      State.log("印刷: 失敗（結果データなし）");
      alert("印刷できる結果がありません。");
      return;
    }

    State.log("印刷: 新規ウィンドウを開きます");
    var w = window.open("", "_blank");
    if (!w) {
      State.log("印刷: 失敗（ポップアップブロック等）");
      alert("印刷用ウィンドウを開けませんでした。ポップアップブロック設定を確認してください。");
      return;
    }

    var html = buildHtml();
    w.document.open();
    w.document.write(html);
    w.document.close();

    try {
      w.focus();
      w.print();
      w.close();
      State.log("印刷: 完了");
    } catch (e) {
      State.log("印刷: 例外 " + e);
    }
  };

  global.PrintManager = PrintManager;

})(window);

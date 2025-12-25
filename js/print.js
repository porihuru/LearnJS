/*
  ファイル: js/print.js
  作成日時(JST): 2025-12-25 22:25:00
  VERSION: 20251225-04

  目的:
    [PR-01] 結果発表の内容を印刷できるようにする（Edge95互換）
  方針:
    - window.open() で新しいウィンドウを作る
    - 結果HTMLを書き込む
    - ユーザークリック起点で print() 実行 → close()
*/
(function (global) {
  "use strict";

  var PrintManager = {};
  PrintManager.VERSION = "20251225-04";
  Util.registerVersion("print.js", PrintManager.VERSION);

  function esc(s) {
    s = (s === null || s === undefined) ? "" : String(s);
    return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
  }

  function buildHtml() {
    var r = State.App.lastResult || {};
    var details = State.App.lastResultDetails || [];

    var html = "";
    html += "<!doctype html><html><head><meta charset='utf-8'>";
    html += "<meta http-equiv='X-UA-Compatible' content='IE=edge'>";
    html += "<title>結果発表</title>";
    html += "<style>";
    html += "body{font-family:Segoe UI,Meiryo,sans-serif; padding:16px; color:#111;}";
    html += "h1{font-size:18px; margin:0 0 10px 0;}";
    html += ".meta{font-size:12px; color:#333; margin-bottom:10px;}";
    html += ".sum{border:1px solid #ccc; padding:10px; border-radius:8px; margin-bottom:12px;}";
    html += ".sum div{margin:2px 0;}";
    html += "table{border-collapse:collapse; width:100%; font-size:12px;}";
    html += "th,td{border:1px solid #ccc; padding:6px; vertical-align:top;}";
    html += "th{background:#f2f2f2;}";
    html += ".ok{color:#1f5fbf; font-weight:700;}";
    html += ".ng{color:#c12929; font-weight:700;}";
    html += "</style></head><body>";

    html += "<h1>text_access問題集 - 結果発表</h1>";
    html += "<div class='meta'>印刷日時: " + esc(r.at || "") + "</div>";

    html += "<div class='sum'>";
    html += "<div>問題数: " + esc(r.total) + "</div>";
    html += "<div>回答数: " + esc(r.answered) + "</div>";
    html += "<div>正解数: " + esc(r.correct) + "</div>";
    html += "<div>不正解数: " + esc(r.wrong) + "</div>";
    html += "<div>正答率: " + esc(r.rate) + "%</div>";
    html += "</div>";

    html += "<table>";
    html += "<tr>";
    html += "<th style='width:70px;'>ID</th>";
    html += "<th style='width:90px;'>カテゴリ</th>";
    html += "<th>問題</th>";
    html += "<th>選択</th>";
    html += "<th>正解</th>";
    html += "<th style='width:70px;'>判定</th>";
    html += "</tr>";

    for (var i = 0; i < details.length; i++) {
      var d = details[i] || {};
      html += "<tr>";
      html += "<td>" + esc(d.id) + "</td>";
      html += "<td>" + esc(d.category) + "</td>";
      html += "<td>" + esc(d.question) + "</td>";
      html += "<td>" + esc(d.selected) + "</td>";
      html += "<td>" + esc(d.correct) + "</td>";
      html += "<td class='" + (d.ok ? "ok" : "ng") + "'>" + (d.ok ? "正解" : "不正解") + "</td>";
      html += "</tr>";
    }

    html += "</table>";
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
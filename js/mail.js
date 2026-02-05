/*
  ファイル: js/mail.js
  作成日時(JST): 2025-12-27 11:55:00
  VERSION: 20251227-02

  目的:
    - メーラーが起動しない主因（mailto URL 長すぎ）を回避
    - 長文は「コピー + 短文mailto」で起動（起動ブロックに強い）
    - Edge95/IEモードでも動くように copy は execCommand フォールバック

  仕様:
    - メール本文は「印刷と同じ内容（表＋問題文）」だが、
      mailto に全て入れると長すぎて起動しないため、長文時は本文をコピーへ逃がす
*/
(function (global) {
  "use strict";

  var Mail = {};
  Mail.VERSION = "20260205-01";
  Util.registerVersion("mail.js", Mail.VERSION);

  /* [IDX-001] mailto の安全上限（環境差があるため保守的に） */
  // 2000 を超えると失敗するケースが増える。安全側に 1500 に設定。
  var MAILTO_SAFE_LEN = 1500;

  /* [IDX-002] メール本文（セッション結果） */
  // 指定フォーマット：
  // 【今回の結果（全問）】
  //
  // | ID | カテゴリ | 結果 |履歴 正解/不正解|
  // 問題
  // 選択した答え
  // 正解の答え
  //
  Mail.buildSessionText = function () {
    var sess = State.App.session;
    if (!sess) return "（セッションがありません）";

    // 互換：session構造が list/answers の場合
    var ids = sess.list || [];
    var answers = sess.answers || {};

    var lines = [];
    lines.push("【今回の結果（全問）】");
    lines.push("");
    lines.push("| ID | カテゴリ | 結果 |履歴 正解/不正解|");
    lines.push("問題");
    lines.push("選択した答え");
    lines.push("正解の答え");
    lines.push("");

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var row = findRow(id);
      var a = answers[id];

      var hist = Engine.getHistory(id);
      var histText = (hist.c || 0) + "/" + (hist.w || 0);

      var result = "未回答";
      var selected = "";
      var correct = row ? (row.choice1 || "") : "";

      if (a && a.isAnswered) {
        result = a.isCorrect ? "正解" : "不正解";
        selected = a.selectedText || "";
      }

      lines.push("| " + id + " | " + safe(row && row.category) + " | " + result + " | " + histText + " |");
      lines.push(safe(row && row.question));
      lines.push(safe(selected));
      lines.push(safe(correct));
      lines.push("");
    }

    return lines.join("\n");
  };

  /* [IDX-003] 累積履歴（全ID） */
  Mail.buildCumulativeText = function () {
    var rows = State.App.rows || [];
    var lines = [];
    lines.push("【累積履歴】");
    lines.push("");
    lines.push("| ID | カテゴリ | 正解 | 不正解 |");
    lines.push("");

    // ID昇順
    var ids = [];
    for (var i = 0; i < rows.length; i++) ids.push(rows[i].id);
    ids.sort(function (a, b) { return (a || 0) - (b || 0); });

    for (var k = 0; k < ids.length; k++) {
      var id = ids[k];
      var row = findRow(id);
      var h = Engine.getHistory(id);
      lines.push("| " + id + " | " + safe(row && row.category) + " | " + (h.c || 0) + " | " + (h.w || 0) + " |");
    }
    return lines.join("\n");
  };

  /* [IDX-010] 本文組み立て（長文） */
  Mail.buildMailFullBody = function () {
    return Mail.buildSessionText() + "\n\n" + Mail.buildCumulativeText();
  };

  /* [IDX-011] クリップボードへコピー（Edge95/IEモード対応） */
  function copyToClipboard(text) {
    // まずは新しい API
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        // ただしここは Promise で、環境によっては許可が必要
        // → 成功/失敗は呼び出し側でログする
        return navigator.clipboard.writeText(text).then(function () {
          return { ok: true, mode: "clipboard.writeText" };
        }, function () {
          return fallbackCopy(text);
        });
      }
    } catch (e) {}

    // フォールバック
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;

        // 画面外へ
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        ta.style.width = "1px";
        ta.style.height = "1px";
        ta.style.opacity = "0";

        document.body.appendChild(ta);
        ta.focus();
        ta.select();

        var ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (e2) {
          ok = false;
        }

        document.body.removeChild(ta);
        resolve({ ok: !!ok, mode: "execCommand(copy)" });
      } catch (e) {
        resolve({ ok: false, mode: "fallback failed" });
      }
    });
  }

  /* [IDX-020] mailto URL 作成 */
  function buildMailtoUrl(subject, body) {
    return "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  /* [IDX-030] メーラー起動（長文対策付き） */
  Mail.openMailer = function () {
    var subject = "クイズ結果";

    // (1) フル本文を作る（表＋問題文＋累積）
    var fullBody = Mail.buildMailFullBody();

    // (2) mailto URL を作って長さを見る
    var urlFull = buildMailtoUrl(subject, fullBody);
    var len = (urlFull && urlFull.length) ? urlFull.length : 0;

    State.log("[mail] build url length=" + len);

    // (3) 短いならそのまま起動
    if (len > 0 && len <= MAILTO_SAFE_LEN) {
      State.log("[mail] mode=direct mailto (short)");
      location.href = urlFull;
      return;
    }

    // (4) 長い場合：本文をコピー → 短文mailtoで起動
    // ここが「起動しない」対策の本体
    var shortBody =
      "【クイズ結果】\n" +
      "本文が長いため、結果本文はクリップボードにコピーします。\n" +
      "メール本文へ貼り付けて送信してください。\n\n" +
      "（このメールは短文化しています）";

    var urlShort = buildMailtoUrl(subject, shortBody);

    State.log("[mail] mode=copy+short mailto (too long)");

    // コピーは非同期になり得るが、mailto 起動は「同一操作内」で実行したいので、
    // 起動を先に行い、コピー結果はログで確認できるようにする。
    // ※環境により「先にコピー→起動」だと起動がブロックされることがあるため、この順にする。
    location.href = urlShort;

    // コピー実行（結果はログへ）
    copyToClipboard(fullBody).then(function (r) {
      State.log("[mail] copy " + (r.ok ? "OK" : "NG") + " via " + r.mode);
      if (!r.ok) {
        State.log("[mail] コピーに失敗しました。結果発表画面から手動でコピーしてください。");
      }
      try { Render.renderLogs(); } catch (e) {}
    });
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
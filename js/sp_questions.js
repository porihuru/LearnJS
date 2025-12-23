// sp_questions.js / 作成日時(JST): 2025-12-23 12:25:00
(function (global) {
  "use strict";

  function toStr(v) { return (v === undefined || v === null) ? "" : String(v); }
  function trimEndSlash(s) {
    s = toStr(s);
    while (s.length > 1 && s.charAt(s.length - 1) === "/") s = s.substring(0, s.length - 1);
    return s;
  }
  function parentPath(path) {
    path = trimEndSlash(path);
    if (!path || path === "/") return "";
    var i = path.lastIndexOf("/");
    if (i <= 0) return "";
    return path.substring(0, i);
  }
  function apiFromWebRoot(webRoot) {
    webRoot = trimEndSlash(webRoot);
    return webRoot ? (webRoot + "/_api") : "/_api";
  }

  function xhrGetJson(url, onOk, onNg) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    x.setRequestHeader("Accept", "application/json;odata=verbose");

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;

      if (x.status >= 200 && x.status < 300) {
        var obj = null;
        try { obj = JSON.parse(x.responseText || "{}"); }
        catch (e2) {
          onNg({ status: x.status, statusText: "JSON parse failed: " + e2, url: url });
          return;
        }
        onOk(obj);
        return;
      }
      onNg({ status: x.status, statusText: x.statusText || "", url: url });
    };

    try { x.send(null); }
    catch (e3) { onNg({ status: 0, statusText: "XHR send failed: " + e3, url: url }); }
  }

  function getVerboseResults(obj) {
    if (!obj) return null;
    if (obj.d && obj.d.results) return obj.d.results;
    if (obj.d) return obj.d;
    return obj;
  }

  function buildSelectQuery() {
    var c = global.SP_CONFIG && SP_CONFIG.col ? SP_CONFIG.col : {};
    var fields = ["Id"];
    if (c.qid) fields.push(c.qid);
    if (c.category) fields.push(c.category);
    if (c.question) fields.push(c.question);
    if (c.choice1) fields.push(c.choice1);
    if (c.choice2) fields.push(c.choice2);
    if (c.choice3) fields.push(c.choice3);
    if (c.choice4) fields.push(c.choice4);
    if (c.explanation) fields.push(c.explanation);

    var seen = {};
    var out = [];
    for (var i = 0; i < fields.length; i++) {
      var f = String(fields[i] || "");
      if (!f || seen[f]) continue;
      seen[f] = true;
      out.push(f);
    }
    return out.join(",");
  }

  function normalizeQuestionsFromItems(items) {
    var c = SP_CONFIG.col;
    var questions = [];
    var catMap = {};

    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var id = toStr(it[c.qid] || it.Id || "");
      var category = toStr(it[c.category] || "");
      var question = toStr(it[c.question] || "");
      var explanation = toStr(it[c.explanation] || "");

      questions.push({
        id: id,
        category: category,
        question: question,
        explanation: explanation,
        choicesRaw: [
          { key: "Choice1", text: toStr(it[c.choice1] || "") },
          { key: "Choice2", text: toStr(it[c.choice2] || "") },
          { key: "Choice3", text: toStr(it[c.choice3] || "") },
          { key: "Choice4", text: toStr(it[c.choice4] || "") }
        ]
      });

      if (category) catMap[category] = true;
    }

    var categories = [];
    for (var k in catMap) if (catMap.hasOwnProperty(k)) categories.push(k);
    categories.sort();

    return { questions: questions, categories: categories };
  }

  // タイトルで取得（日本語タイトルは “文字列をそのまま入れて、全体をencodeURI” が安定）
  function loadByTitle(apiBase, listTitle, onOk, onErr) {
    var select = buildSelectQuery();
    var safeTitle = String(listTitle || "").replace(/'/g, "''"); // シングルクォート対策

    var url = apiBase +
      "/web/lists/getbytitle('" + safeTitle + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    url = encodeURI(url);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items);
    }, function (err) {
      onErr(err);
    });
  }

  // GUIDで取得（これが最も確実）
  function loadByGuid(apiBase, listGuid, onOk, onErr) {
    var select = buildSelectQuery();
    var g = String(listGuid || "").replace(/[{}]/g, "").toUpperCase();

    var url = apiBase +
      "/web/lists(guid'" + g + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items);
    }, function (err) {
      onErr(err);
    });
  }

  function loadWithLimitedHop(onOk, onFail) {
    var listTitle = toStr(SP_CONFIG.listTitle || "");
    var listGuid  = toStr(SP_CONFIG.listGuid  || "");

    var hopMax = 0;
    try { hopMax = parseInt(SP_CONFIG.parentProbeMax, 10); } catch (e0) { hopMax = 0; }
    if (!(hopMax >= 0)) hopMax = 0;

    var startWebRoot = trimEndSlash(SP_BASE.webRoot || "");
    var tries = [];
    var cur = startWebRoot;

    for (var i = 0; i <= hopMax; i++) {
      tries.push(cur);
      if (!cur) break;
      cur = parentPath(cur);
    }

    var idx = 0;

    function nextTry() {
      if (idx >= tries.length) {
        onFail("リストが見つかりません（探索上限=" + hopMax + "）。listTitle=" + listTitle + " listGuid=" + (listGuid ? "あり" : "なし"));
        return;
      }

      var webRoot = tries[idx++];
      var apiBase = apiFromWebRoot(webRoot);

      if (global.Render && Render.log) {
        Render.log("SP list probe: webRoot=" + (webRoot || "(site-root)") + " api=" + apiBase);
      }

      // 1) まずタイトルで試す
      if (listTitle) {
        loadByTitle(apiBase, listTitle, function (items) {
          onOk(items);
        }, function (err) {
          // 404なら GUID へ（設定されていれば）
          if (err && err.status === 404 && listGuid) {
            if (global.Render && Render.log) {
              Render.log("getbytitle が 404。GUIDで再試行します。");
            }
            loadByGuid(apiBase, listGuid, function (items2) {
              onOk(items2);
            }, function (err2) {
              // 404なら次のwebRootへ
              if (err2 && err2.status === 404) { nextTry(); return; }
              onFail("SharePoint接続失敗（GUID） status=" + (err2.status || "?") + " url=" + (err2.url || ""));
            });
            return;
          }

          // 404なら次のwebRootへ
          if (err && err.status === 404) { nextTry(); return; }

          // 認証/権限系はここで止める（サインイン誘発回避）
          if (err && (err.status === 401 || err.status === 403)) {
            onFail("SharePoint接続が認証/権限で拒否されました（status=" + err.status + "）。探索を中止します。");
            return;
          }

          onFail("SharePoint接続失敗（Title） status=" + (err.status || "?") + " url=" + (err.url || ""));
        });
        return;
      }

      // タイトルが無いなら GUID だけ
      if (listGuid) {
        loadByGuid(apiBase, listGuid, function (items3) {
          onOk(items3);
        }, function (err3) {
          if (err3 && err3.status === 404) { nextTry(); return; }
          onFail("SharePoint接続失敗（GUID） status=" + (err3.status || "?") + " url=" + (err3.url || ""));
        });
        return;
      }

      onFail("SP_CONFIG に listTitle も listGuid も設定されていません。");
    }

    nextTry();
  }

  global.SP_Questions = {
    loadQuestions: function (success, failure) {
      loadWithLimitedHop(function (items) {
        success(normalizeQuestionsFromItems(items || []));
      }, function (msg) {
        failure(msg);
      });
    }
  };
})(window);
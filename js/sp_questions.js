// sp_questions.js / 作成日時(JST): 2025-12-23 11:55:00
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

    // 同一オリジンなら通常 cookie/認証は自動で載ります（withCredentials は不要）
    // ※IEモード/環境により挙動差はあるが、ここでは触らない

    x.setRequestHeader("Accept", "application/json;odata=verbose");

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;

      if (x.status >= 200 && x.status < 300) {
        var obj = null;
        try { obj = JSON.parse(x.responseText || "{}"); }
        catch (e2) {
          onNg({
            status: x.status,
            statusText: "JSON parse failed: " + e2,
            url: url,
            bodyHead: String((x.responseText || "").slice(0, 200))
          });
          return;
        }
        onOk(obj, x);
        return;
      }

      onNg({
        status: x.status,
        statusText: x.statusText || "",
        url: url,
        bodyHead: String((x.responseText || "").slice(0, 200))
      });
    };

    try { x.send(null); }
    catch (e3) {
      onNg({ status: 0, statusText: "XHR send failed: " + e3, url: url, bodyHead: "" });
    }
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

      var q = {
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
      };
      questions.push(q);
      if (category) catMap[category] = true;
    }

    var categories = [];
    for (var k in catMap) if (catMap.hasOwnProperty(k)) categories.push(k);
    categories.sort();

    return { questions: questions, categories: categories };
  }

  function loadItemsAtApi(apiBase, listTitle, onOk, onErr) {
    var select = buildSelectQuery();
    var encTitle = encodeURIComponent(listTitle);

    var url = apiBase +
      "/web/lists/getbytitle('" + encTitle + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items, apiBase);
    }, function (err) {
      onErr(err, apiBase);
    });
  }

  function loadWithLimitedHop(onOk, onFail) {
    var listTitle = toStr(SP_CONFIG.listTitle || "");
    if (!listTitle) { onFail("SP_CONFIG.listTitle が空です"); return; }

    var hopMax = 0;
    try { hopMax = parseInt(SP_CONFIG.parentProbeMax, 10); } catch (e0) { hopMax = 0; }
    if (!(hopMax >= 0)) hopMax = 0;

    // ★重要：探索は最大 hopMax 段まで（デフォルト0＝探索しない）★
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
        onFail("リスト『" + listTitle + "』が見つかりませんでした（探索上限=" + hopMax + "）。");
        return;
      }

      var webRoot = tries[idx++];
      var apiBase = apiFromWebRoot(webRoot);

      if (global.Render && Render.log) {
        Render.log("SP list probe: webRoot=" + (webRoot || "(site-root)") + " api=" + apiBase);
      }

      loadItemsAtApi(apiBase, listTitle, function (items, usedApi) {
        // 成功：このapiが正解
        if (usedApi !== SP_BASE.api) {
          SP_BASE.webRoot = webRoot || "";
          SP_BASE.api = usedApi;
          SP_BASE.source = (SP_BASE.source || "") + " / override:foundList@" + (webRoot || "(site-root)");
        }
        onOk(items);
      }, function (err, usedApi) {
        var st = (err && typeof err.status === "number") ? err.status : -1;

        // 404: このwebにはリストがない → 次へ（ただし hopMax=0 ならここで終了）
        if (st === 404) {
          nextTry();
          return;
        }

        // 401/403 などは Windows 認証/権限でポップアップ誘発源になりやすい
        // → これ以上の探索を止めてフォールバックへ（サインイン要求を避ける）
        if (st === 401 || st === 403) {
          onFail("SharePoint接続が認証/権限で拒否されました（status=" + st + "）。サインイン要求を避けるため探索を中止します。");
          return;
        }

        // その他エラーも中止（環境差で認証プロンプトが出ることがあるため）
        onFail("SharePoint接続エラー（status=" + st + "）url=" + (err.url || ""));
      });
    }

    nextTry();
  }

  var SP_Questions = {
    loadQuestions: function (success, failure) {
      if (!global.SP_BASE || !SP_BASE.api) {
        failure("SP_BASE.api が未確定です。SP_BASE.init() 後に呼んでください。");
        return;
      }

      loadWithLimitedHop(function (items) {
        success(normalizeQuestionsFromItems(items || []));
      }, function (msg) {
        failure(msg);
      });
    }
  };

  global.SP_Questions = SP_Questions;
})(window);
// sp_questions.js / 作成日時(JST): 2025-12-23 12:55:00
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

  function nowJstLike() {
    // 既存の Render.log が時刻を付けている前提だが、念のため
    return "";
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

  function normalizeListServerRelativeUrl(s) {
    s = toStr(s).trim();
    if (!s) return "";
    // AllItems.aspx などが付いていても落とす
    var p = s;
    // ドメインが混ざって貼られた場合にも対応
    p = p.replace(/^https?:\/\/[^\/]+/i, "");
    // クエリ除去
    var q = p.indexOf("?");
    if (q >= 0) p = p.substring(0, q);
    // .aspx で終わるなら 1つ上に上げる
    if (/\.(aspx)$/i.test(p)) {
      var lastSlash = p.lastIndexOf("/");
      if (lastSlash > 0) p = p.substring(0, lastSlash);
    }
    return trimEndSlash(p);
  }

  // 直打ちURLで取得（最優先）
  function loadByListUrl(apiBase, listServerRelativeUrl, onOk, onErr) {
    var select = buildSelectQuery();
    var u = normalizeListServerRelativeUrl(listServerRelativeUrl);
    if (!u) { onErr({ status: -1, statusText: "listServerRelativeUrl is empty", url: "" }); return; }

    // /_api/web/GetList(@u)?@u='...'/items?$top=...
    var url = apiBase +
      "/web/GetList(@u)/items" +
      "?@u='" + encodeURIComponent(u) + "'" +
      "&$top=5000&$select=" + encodeURIComponent(select);

    // @u='...' の中は encodeURIComponent 済みなので encodeURI は不要（余計に壊す場合がある）
    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items, url);
    }, function (err) {
      err.url = err.url || url;
      onErr(err);
    });
  }

  function loadByGuid(apiBase, listGuid, onOk, onErr) {
    var select = buildSelectQuery();
    var g = String(listGuid || "").replace(/[{}]/g, "").toUpperCase();
    if (!g) { onErr({ status: -1, statusText: "listGuid is empty", url: "" }); return; }

    var url = apiBase +
      "/web/lists(guid'" + g + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items, url);
    }, function (err) {
      err.url = err.url || url;
      onErr(err);
    });
  }

  function loadByTitle(apiBase, listTitle, onOk, onErr) {
    var select = buildSelectQuery();
    var safeTitle = String(listTitle || "").replace(/'/g, "''");
    if (!safeTitle) { onErr({ status: -1, statusText: "listTitle is empty", url: "" }); return; }

    var url = apiBase +
      "/web/lists/getbytitle('" + safeTitle + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    url = encodeURI(url);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items, url);
    }, function (err) {
      err.url = err.url || url;
      onErr(err);
    });
  }

  function loadWithLimitedHop(onOk, onFail) {
    var listTitle = toStr(SP_CONFIG.listTitle || "");
    var listGuid  = toStr(SP_CONFIG.listGuid || "");
    var listUrl   = toStr(SP_CONFIG.listServerRelativeUrl || "");

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

    function nextTry(lastErrText) {
      if (idx >= tries.length) {
        onFail("SharePoint接続失敗: " + (lastErrText || "不明") + "（探索上限=" + hopMax + "）");
        return;
      }

      var webRoot = tries[idx++];
      var apiBase = apiFromWebRoot(webRoot);

      if (global.Render && Render.log) {
        Render.log("SP list probe: webRoot=" + (webRoot || "(site-root)") + " api=" + apiBase);
      }

      // 優先順位：URL直打ち → GUID → Title
      var tried = [];

      function failOne(tag, err) {
        var st = (err && typeof err.status === "number") ? err.status : -1;
        var url = (err && err.url) ? err.url : "";
        var msg = tag + " failed: status=" + st + " url=" + url;

        if (global.Render && Render.log) {
          Render.log(msg);
        }

        // 認証/権限はここで止める（サインイン誘発を避ける）
        if (st === 401 || st === 403) {
          onFail("認証/権限で拒否（status=" + st + "）。URL=" + url);
          return;
        }

        // 次の方式へ
        runNext(tag + ": " + msg);
      }

      function runNext(lastText) {
        // URL直打ち
        if (listUrl && tried.indexOf("url") < 0) {
          tried.push("url");
          if (global.Render && Render.log) Render.log("Try: GetList(URL) = " + normalizeListServerRelativeUrl(listUrl));
          loadByListUrl(apiBase, listUrl, function (items, usedUrl) {
            if (global.Render && Render.log) Render.log("SharePoint読込成功（URL直打ち）: " + items.length + "件");
            onOk(items);
          }, function (err) { failOne("GetList(URL)", err); });
          return;
        }

        // GUID
        if (listGuid && tried.indexOf("guid") < 0) {
          tried.push("guid");
          if (global.Render && Render.log) Render.log("Try: GUID = " + listGuid);
          loadByGuid(apiBase, listGuid, function (items2, usedUrl2) {
            if (global.Render && Render.log) Render.log("SharePoint読込成功（GUID）: " + items2.length + "件");
            onOk(items2);
          }, function (err2) { failOne("GUID", err2); });
          return;
        }

        // Title
        if (listTitle && tried.indexOf("title") < 0) {
          tried.push("title");
          if (global.Render && Render.log) Render.log("Try: Title = " + listTitle);
          loadByTitle(apiBase, listTitle, function (items3, usedUrl3) {
            if (global.Render && Render.log) Render.log("SharePoint読込成功（Title）: " + items3.length + "件");
            onOk(items3);
          }, function (err3) { failOne("Title", err3); });
          return;
        }

        // この webRoot ではダメ → 次の webRoot へ（hopMax>0 の時だけ）
        nextTry(lastText || "all methods failed");
      }

      runNext("start");
    }

    nextTry("");
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
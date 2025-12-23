// sp_base.js / 作成日時(JST): 2025-12-23 11:20:00
(function (global) {
  "use strict";

  // 方針：
  // 1) _spPageContextInfo があれば最優先で webRoot を確定
  // 2) なければ現在URLから上位へ辿り /_api/contextinfo を probe
  // 3) status=200 のときは JSONを解析し、GetContextWebInformation の
  //    WebServerRelativeUrl / WebFullUrl から「本当の webRoot」を抽出して確定
  //    （DocLib配下でも200を返す問題を解消）
  // 4) version/source/contextStatus を表示可能にする

  function toStr(v) { return (v === undefined || v === null) ? "" : String(v); }

  function trimEndSlash(s) {
    s = toStr(s);
    while (s.length > 1 && s.charAt(s.length - 1) === "/") s = s.substring(0, s.length - 1);
    return s;
  }

  function dirname(pathname) {
    pathname = toStr(pathname);
    var i = pathname.lastIndexOf("/");
    if (i <= 0) return "/";
    return pathname.substring(0, i);
  }

  function parsePathFromAbsoluteUrl(absUrl) {
    // IEモードでも動く aタグ解析
    var a = document.createElement("a");
    a.href = absUrl;
    return a.pathname || "";
  }

  function splitPrefixes(dirPath, maxDepth) {
    dirPath = trimEndSlash(dirPath);
    var out = [];
    var cur = dirPath;
    var guard = 0;
    var limit = maxDepth || 14;

    while (cur && cur !== "/" && guard < limit) {
      out.push(cur);
      cur = dirname(cur);
      guard++;
    }
    out.push("/"); // 最後にルートも候補
    return out;
  }

  function xhrPost(url, onDone) {
    var x = new XMLHttpRequest();
    x.open("POST", url, true);
    try { x.withCredentials = true; } catch (e) {}

    x.setRequestHeader("Accept", "application/json;odata=verbose");

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      onDone(x.status, x.responseText || "", x);
    };

    try { x.send(""); } catch (e2) { onDone(0, String(e2), null); }
  }

  function tryFromPageContext() {
    try {
      if (global._spPageContextInfo) {
        var w = toStr(global._spPageContextInfo.webServerRelativeUrl);
        if (w) return { webRoot: w, source: "_spPageContextInfo.webServerRelativeUrl" };

        var abs = toStr(global._spPageContextInfo.webAbsoluteUrl);
        if (abs) return { webRoot: parsePathFromAbsoluteUrl(abs), source: "_spPageContextInfo.webAbsoluteUrl" };
      }
    } catch (e) {}
    return null;
  }

  function tryExtractWebRootFromContextInfoJson(respText) {
    // verbose: { d: { GetContextWebInformation: { WebFullUrl, SiteFullUrl, FormDigestValue... } } }
    // ここから WebServerRelativeUrl または WebFullUrl を取り出す
    try {
      var obj = JSON.parse(respText);
      var d = obj && obj.d ? obj.d : obj;
      if (!d) return "";

      var g = d.GetContextWebInformation;
      if (!g) return "";

      // SharePointの版により有無が違う可能性があるので両方対応
      var wsr = toStr(g.WebServerRelativeUrl);
      if (wsr) return wsr;

      var wfu = toStr(g.WebFullUrl);
      if (wfu) return parsePathFromAbsoluteUrl(wfu);

      return "";
    } catch (e) {
      return "";
    }
  }

  function finish(webRoot, source, contextStatus) {
    SP_BASE.webRoot = trimEndSlash(webRoot || "");
    if (SP_BASE.webRoot === "/") SP_BASE.webRoot = ""; // "/" は空扱いに統一
    SP_BASE.api = (SP_BASE.webRoot ? (SP_BASE.webRoot + "/_api") : "/_api");

    SP_BASE.source = source || "unknown";
    SP_BASE.contextStatus = contextStatus || 0;
    SP_BASE.isReady = true;

    var q = SP_BASE._queue.slice(0);
    SP_BASE._queue = [];
    for (var i = 0; i < q.length; i++) {
      try { q[i](); } catch (e) {}
    }
  }

  function probeByContextInfo(onOk, onFail) {
    var path = "/";
    try { path = toStr(global.location.pathname); } catch (e0) { path = "/"; }

    var dir = dirname(path);
    var prefixes = splitPrefixes(dir, 16);
    var idx = 0;

    function next() {
      if (idx >= prefixes.length) {
        onFail("probeで /_api/contextinfo を発見できませんでした。pathname=" + path);
        return;
      }

      var p = prefixes[idx++];
      var api = (p === "/" ? "/_api" : (trimEndSlash(p) + "/_api"));
      var url = encodeURI(api + "/contextinfo");

      xhrPost(url, function (status, resp) {
        // 200ならJSONから本当のwebRootを抽出して確定（ここが今回の肝）
        if (status === 200) {
          var extracted = tryExtractWebRootFromContextInfoJson(resp);
          if (extracted) {
            onOk(extracted, "probe:contextinfo->extractWebRoot", 200);
            return;
          }
          // 200でも抽出できない場合は暫定で p を使うが、次候補も試す
          // （古い/特殊レスポンス対策）
          onOk(p, "probe:contextinfo(200 but no extract)", 200);
          return;
        }

        // 401/403 は「_api自体は存在する」可能性が高いが、webRoot確定材料に弱いので次も探す
        if (status === 401 || status === 403) {
          // 次候補も試す（より上位のwebが見つかる可能性）
          next();
          return;
        }

        // 404などは不採用
        next();
      });
    }

    next();
  }

  var SP_BASE = {
    version: "sp_base-2025-12-23-1120",
    webRoot: "",
    api: "",
    source: "",
    contextStatus: 0,
    isReady: false,
    _queue: [],
    _started: false,

    init: function (cb) {
      if (cb) {
        if (SP_BASE.isReady) { cb(); return; }
        SP_BASE._queue.push(cb);
      }
      if (SP_BASE._started) return;
      SP_BASE._started = true;

      var fromCtx = tryFromPageContext();
      if (fromCtx && fromCtx.webRoot) {
        finish(fromCtx.webRoot, fromCtx.source, 200);
        return;
      }

      probeByContextInfo(function (webRoot, source, status) {
        finish(webRoot, source, status);
      }, function (reason) {
        // 最終手段：確定できない場合は空（= /_api）で回す
        finish("", "fallback:/_api / " + reason, 0);
      });
    }
  };

  global.SP_BASE = SP_BASE;
})(window);
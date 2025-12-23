// sp_base.js / 作成日時(JST): 2025-12-23 11:05:00
(function (global) {
  "use strict";

  // 目的：
  // - webRoot（/na/.../fin_csm 等）を「固定せず」自動検出
  // - 最優先：SharePointが提供する _spPageContextInfo から取得
  // - 無ければ：現在URLの上位階層へ順に /_api/contextinfo をプローブして特定
  // - version / source / contextStatus を公開してログ・画面に表示可能にする

  function toStr(v) { return (v === undefined || v === null) ? "" : String(v); }

  function parsePathFromAbsoluteUrl(absUrl) {
    // URLオブジェクトが無い環境（IEモード想定）でも動くように aタグで解析
    var a = document.createElement("a");
    a.href = absUrl;
    return a.pathname || "";
  }

  function trimEndSlash(s) {
    s = toStr(s);
    while (s.length > 1 && s.charAt(s.length - 1) === "/") {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  function dirname(pathname) {
    pathname = toStr(pathname);
    var i = pathname.lastIndexOf("/");
    if (i <= 0) return "/";
    return pathname.substring(0, i);
  }

  function splitPrefixes(dirPath, maxDepth) {
    // dirPath から上位へ：/a/b/c -> [/a/b/c, /a/b, /a, ""(除外)]
    dirPath = trimEndSlash(dirPath);
    var out = [];
    var cur = dirPath;
    var guard = 0;
    var limit = maxDepth || 12;

    while (cur && cur !== "/" && guard < limit) {
      out.push(cur);
      cur = dirname(cur);
      guard++;
    }
    // 最後に "/" も候補に入れる（必要なら）
    out.push("/");
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

  function finish(webRoot, source, contextStatus) {
    SP_BASE.webRoot = trimEndSlash(webRoot);
    SP_BASE.api = (SP_BASE.webRoot === "/") ? "/_api" : (SP_BASE.webRoot + "/_api");
    SP_BASE.source = source || "unknown";
    SP_BASE.contextStatus = contextStatus || 0;
    SP_BASE.isReady = true;

    var q = SP_BASE._queue.slice(0);
    SP_BASE._queue = [];
    for (var i = 0; i < q.length; i++) {
      try { q[i](); } catch (e) {}
    }
  }

  function tryFromPageContext() {
    // SharePointクラシック系だと入っていることが多い
    try {
      if (global._spPageContextInfo) {
        // webServerRelativeUrl が最優先（例：/na/NA/NAFin/fin_csm）
        var w = toStr(global._spPageContextInfo.webServerRelativeUrl);
        if (w) return { webRoot: w, source: "_spPageContextInfo.webServerRelativeUrl" };

        // webAbsoluteUrl から pathname を取る
        var abs = toStr(global._spPageContextInfo.webAbsoluteUrl);
        if (abs) {
          return { webRoot: parsePathFromAbsoluteUrl(abs), source: "_spPageContextInfo.webAbsoluteUrl" };
        }
      }
    } catch (e) {}
    return null;
  }

  function probeByContextInfo(onOk, onFail) {
    // 現在のディレクトリから上位へ順に /_api/contextinfo を叩いて存在確認
    var path = "/";
    try { path = toStr(global.location.pathname); } catch (e0) { path = "/"; }

    var dir = dirname(path); // index.htmlのあるフォルダ
    var prefixes = splitPrefixes(dir, 14);

    var idx = 0;

    function next() {
      if (idx >= prefixes.length) {
        onFail("probeで /_api/contextinfo を発見できませんでした。pathname=" + path);
        return;
      }

      var p = prefixes[idx++];
      // encodeURIで日本語パスも一応安全側へ（/ は保持）
      var url = encodeURI(trimEndSlash(p) + "/_api/contextinfo");

      xhrPost(url, function (status, resp) {
        // 200: OK
        // 401/403: 権限等で失敗だが _api は存在する可能性が高い → webRoot特定としては採用
        // 404: ここはwebRootではない
        if (status === 200 || status === 401 || status === 403) {
          onOk(p, "probe:/_api/contextinfo", status);
          return;
        }
        next();
      });
    }

    next();
  }

  var SP_BASE = {
    version: "sp_base-2025-12-23-1105",
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

      // 1) pageContext優先
      var fromCtx = tryFromPageContext();
      if (fromCtx && fromCtx.webRoot) {
        finish(fromCtx.webRoot, fromCtx.source, 200);
        return;
      }

      // 2) probe
      probeByContextInfo(function (webRoot, source, status) {
        finish(webRoot, source, status);
      }, function (reason) {
        // 最終手段：現在ディレクトリの1つ上を webRoot として仮採用（ログで分かるように）
        var path = "/";
        try { path = toStr(global.location.pathname); } catch (e1) { path = "/"; }
        var dir = dirname(path);
        finish(dir, "fallback:dirname (NOT GUARANTEED) / " + reason, 0);
      });
    }
  };

  global.SP_BASE = SP_BASE;
})(window);
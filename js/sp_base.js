// sp_base.js / 作成日時(JST): 2025-12-23 13:05:00
(function (global) {
  "use strict";

  function toStr(v) { return (v === undefined || v === null) ? "" : String(v); }

  function ensureLeadingSlash(p) {
    p = toStr(p);
    if (!p) return "";
    return (p.charAt(0) === "/") ? p : ("/" + p);
  }

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

  function normalizeStopAt(stopAt) {
    stopAt = trimEndSlash(ensureLeadingSlash(stopAt || ""));
    return stopAt;
  }

  function isUnderOrEqual(path, stopAt) {
    path = trimEndSlash(ensureLeadingSlash(path || ""));
    stopAt = normalizeStopAt(stopAt || "");
    if (!stopAt) return true;
    if (path === stopAt) return true;
    if (!path) return false;
    return (path.indexOf(stopAt + "/") === 0);
  }

  function log(msg) {
    if (global.Render && Render.log) Render.log(msg);
  }

  function probeContextInfo(apiBase, cb) {
    var url = apiBase + "/contextinfo";
    var x = new XMLHttpRequest();
    x.open("POST", url, true);
    x.setRequestHeader("Accept", "application/json;odata=verbose");
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      cb(x.status, url);
    };
    try { x.send(""); } catch (e) { cb(0, url); }
  }

  var SP_BASE = {
    version: "sp_base-2025-12-23-1305",
    webRoot: "",
    api: "",
    source: "",

    init: function (done) {
      // 現在URLのディレクトリを起点にする
      var path = ensureLeadingSlash(location.pathname || "/");
      // ファイル名を落とす（/index.html など）
      path = path.replace(/\/[^\/]*$/, "");
      path = trimEndSlash(path);

      var hopMax = 0;
      try { hopMax = parseInt((global.SP_CONFIG && SP_CONFIG.parentProbeMax), 10); } catch (e0) { hopMax = 0; }
      if (!(hopMax >= 0)) hopMax = 0;

      var stopAt = normalizeStopAt((global.SP_CONFIG && SP_CONFIG.parentProbeStopAt) || "/na/NA/NAFin");

      // 候補 webRoot を作る（上位は stopAt を超えない）
      var tries = [];
      var cur = path;

      for (var i = 0; i <= hopMax; i++) {
        cur = trimEndSlash(ensureLeadingSlash(cur));
        if (!cur) break;

        // stopAt を超えるなら打ち切り
        if (stopAt && !isUnderOrEqual(cur, stopAt)) break;

        tries.push(cur);
        cur = parentPath(cur);
      }

      // hopMax=0 でも、最低1回は現ディレクトリを試す
      if (tries.length === 0) {
        cur = trimEndSlash(ensureLeadingSlash(path));
        if (cur && (!stopAt || isUnderOrEqual(cur, stopAt))) tries.push(cur);
      }

      var idx = 0;

      function next() {
        if (idx >= tries.length) {
          // 最後の保険：fin_csm 直下を想定
          var fallback = "/na/NA/NAFin/fin_csm";
          SP_BASE.webRoot = fallback;
          SP_BASE.api = fallback + "/_api";
          SP_BASE.source = "fallback:/na/NA/NAFin/fin_csm";
          log("SP_BASE init fallback: webRoot=" + SP_BASE.webRoot + " api=" + SP_BASE.api);
          if (done) done();
          return;
        }

        var webRoot = trimEndSlash(ensureLeadingSlash(tries[idx++]));
        var apiBase = webRoot + "/_api";

        log("SP_BASE probe: webRoot=" + webRoot + " api=" + apiBase);

        probeContextInfo(apiBase, function (status, url) {
          if (status === 200) {
            SP_BASE.webRoot = webRoot;
            SP_BASE.api = apiBase;
            SP_BASE.source = "probe:contextinfo status=200";
            log("SP_BASE source: " + SP_BASE.source);
            log("SP webRoot " + SP_BASE.webRoot);
            log("SP api " + SP_BASE.api);
            if (done) done();
            return;
          }

          // 401/403 はサインイン誘発になりやすいので、これ以上は上がらない
          if (status === 401 || status === 403) {
            SP_BASE.webRoot = webRoot;
            SP_BASE.api = apiBase;
            SP_BASE.source = "probe:contextinfo status=" + status + " (stop to avoid signin)";
            log("SP_BASE source: " + SP_BASE.source);
            log("SP webRoot " + SP_BASE.webRoot);
            log("SP api " + SP_BASE.api);
            if (done) done();
            return;
          }

          // 404/0 は次の候補へ
          next();
        });
      }

      next();
    }
  };

  global.SP_BASE = SP_BASE;

})(window);
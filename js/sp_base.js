// sp_base.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  function getPathname() {
    try { return global.location.pathname || ""; } catch (e) { return ""; }
  }

  // /.../DocLib/text_access/index.html から、/DocLib より前を webRoot として採用
  // 見つからない場合は「現在ディレクトリの1つ上」を仮採用（環境で調整）
  function detectWebRoot() {
    var path = getPathname();
    var idx = path.indexOf("/DocLib/");
    if (idx !== -1) return path.substring(0, idx);

    // fallback: /a/b/c/index.html -> /a/b/c
    var last = path.lastIndexOf("/");
    if (last > 0) return path.substring(0, last);
    return "";
  }

  var webRoot = detectWebRoot();
  var api = webRoot + "/_api";

  global.SP_BASE = {
    webRoot: webRoot,
    api: api
  };
})(window);

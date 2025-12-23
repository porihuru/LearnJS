// sp_base.js / 作成日時(JST): 2025-12-23 10:30:00
(function (global) {
  "use strict";

  function getPathname() {
    try { return global.location.pathname || ""; } catch (e) { return ""; }
  }

  function trimEndSlash(s) {
    if (!s) return "";
    while (s.length > 1 && s.charAt(s.length - 1) === "/") {
      s = s.substring(0, s.length - 1);
    }
    return s;
  }

  // /.../DocLib/ や /.../DocLib1/ の「/DocLib(数字)/」より前を webRoot とする
  function detectWebRoot() {
    var path = getPathname();

    // DocLib, DocLib1, DocLib2 ... を想定
    var re = /\/DocLib\d*\//i;
    var m = re.exec(path);
    if (m && typeof m.index === "number" && m.index >= 0) {
      return path.substring(0, m.index);
    }

    // 互換：DocLib を含むが末尾に / が無い等のケース
    var idx2 = path.toLowerCase().indexOf("/doclib");
    if (idx2 !== -1) {
      return path.substring(0, idx2);
    }

    // 最終手段：現在ディレクトリ（＝ここは環境により不正になることがある）
    var last = path.lastIndexOf("/");
    if (last > 0) return path.substring(0, last);
    return "";
  }

  var webRoot = trimEndSlash(detectWebRoot());
  var api = webRoot ? (webRoot + "/_api") : "/_api";

  global.SP_BASE = {
    webRoot: webRoot,
    api: api
  };
})(window);
// JST: 2025-12-19 06:37:29 / sp_base.js
(function (global) {
  "use strict";

  var SP_BASE = {
    webRoot: "",
    api: ""
  };

  function detectWebRoot(pathname) {
    // 例: /na/.../syunin/DocLib/text_access/index.html
    // -> /na/.../syunin
    var p = pathname || "/";
    var markers = ["/DocLib/", "/Shared%20Documents/", "/Shared Documents/", "/Documents/"];
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      var idx = p.indexOf(m);
      if (idx >= 0) return p.substring(0, idx);
    }
    // fallback: 最終 / を切る（精度は落ちる）
    var last = p.lastIndexOf("/");
    if (last > 0) return p.substring(0, last);
    return "";
  }

  SP_BASE.init = function () {
    SP_BASE.webRoot = detectWebRoot(window.location.pathname);
    SP_BASE.api = SP_BASE.webRoot + "/_api";
  };

  global.SP_BASE = SP_BASE;

})(window);

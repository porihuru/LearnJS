// sp_api.js / 作成日時(JST): 2025-12-22 14:10:00
(function (global) {
  "use strict";

  function xhr(method, url, headers, body, onOk, onErr) {
    var x = new XMLHttpRequest();
    x.open(method, url, true);

    // same-origin想定。IEモードでも安定させる
    try { x.withCredentials = true; } catch (e) {}

    if (headers) {
      for (var k in headers) {
        if (headers.hasOwnProperty(k)) x.setRequestHeader(k, headers[k]);
      }
    }

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;

      if (x.status >= 200 && x.status < 300) {
        onOk(x);
        return;
      }

      var ct = "";
      try { ct = x.getResponseHeader("Content-Type") || ""; } catch (e2) {}
      var snippet = "";
      try { snippet = (x.responseText || "").slice(0, 300); } catch (e3) {}

      onErr(
        "HTTP失敗\n" +
        "method: " + method + "\n" +
        "url: " + url + "\n" +
        "status: " + x.status + " " + (x.statusText || "") + "\n" +
        (ct ? ("content-type: " + ct + "\n") : "") +
        (snippet ? ("---- snippet ----\n" + snippet) : "")
      );
    };

    try {
      x.send(body || null);
    } catch (sendErr) {
      onErr("XHR send例外: " + String(sendErr) + "\nurl: " + url);
    }
  }

  function parseJsonVerbose(text) {
    var obj = JSON.parse(text);
    // SharePoint古め：odata=verbose
    if (obj && obj.d) return obj.d;
    return obj;
  }

  function getContextInfo(onOk, onErr) {
    var url = SP_BASE.api + "/contextinfo";
    xhr("POST", url, {
      "Accept": "application/json;odata=verbose"
    }, "", function (x) {
      var d = parseJsonVerbose(x.responseText);
      var digest = d.GetContextWebInformation.FormDigestValue;
      onOk(digest);
    }, onErr);
  }

  function getListEntityType(listTitle, onOk, onErr) {
    var url = SP_BASE.api + "/web/lists/getbytitle('" + encodeURIComponent(listTitle) + "')?$select=ListItemEntityTypeFullName";
    xhr("GET", url, {
      "Accept": "application/json;odata=verbose"
    }, null, function (x) {
      var d = parseJsonVerbose(x.responseText);
      onOk(d.ListItemEntityTypeFullName);
    }, onErr);
  }

  function getItems(listTitle, selectCsv, top, onOk, onErr) {
    var t = top || 5000;
    var url = SP_BASE.api + "/web/lists/getbytitle('" + encodeURIComponent(listTitle) + "')/items?$top=" + t + "&$select=" + encodeURIComponent(selectCsv);
    xhr("GET", url, {
      "Accept": "application/json;odata=verbose"
    }, null, function (x) {
      var d = parseJsonVerbose(x.responseText);
      var results = (d && d.results) ? d.results : [];
      onOk(results);
    }, onErr);
  }

  global.SP_API = {
    xhr: xhr,
    getContextInfo: getContextInfo,
    getListEntityType: getListEntityType,
    getItems: getItems
  };
})(window);

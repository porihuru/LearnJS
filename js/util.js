// JST: 2025-12-19 06:37:29 / sp_api.js
(function (global) {
  "use strict";

  var SpApi = {};

  function xhr(method, url, headers, body, onOk, onErr) {
    try {
      var req = new XMLHttpRequest();
      req.open(method, url, true);
      req.onreadystatechange = function () {
        if (req.readyState !== 4) return;
        var ok = (req.status >= 200 && req.status < 300);
        if (ok) onOk(req);
        else onErr(req);
      };
      if (headers) {
        for (var k in headers) {
          if (headers.hasOwnProperty(k)) req.setRequestHeader(k, headers[k]);
        }
      }
      req.send(body || null);
    } catch (e) {
      onErr({ status: 0, responseText: String(e) });
    }
  }

  SpApi.getJson = function (url, onOk, onErr) {
    xhr("GET", url, {
      "Accept": "application/json;odata=verbose"
    }, null, function (req) {
      var data = null;
      try { data = JSON.parse(req.responseText); } catch (e) {}
      onOk(data, req);
    }, function (req) {
      onErr(req);
    });
  };

  SpApi.postJson = function (url, digest, bodyObj, extraHeaders, onOk, onErr) {
    var headers = {
      "Accept": "application/json;odata=verbose",
      "Content-Type": "application/json;odata=verbose"
    };
    if (digest) headers["X-RequestDigest"] = digest;
    if (extraHeaders) {
      for (var k in extraHeaders) if (extraHeaders.hasOwnProperty(k)) headers[k] = extraHeaders[k];
    }
    xhr("POST", url, headers, JSON.stringify(bodyObj || {}), function (req) {
      var data = null;
      try { data = JSON.parse(req.responseText); } catch (e) {}
      onOk(data, req);
    }, function (req) {
      onErr(req);
    });
  };

  SpApi.getContextInfo = function (onOk, onErr) {
    var url = global.SP_BASE.api + "/contextinfo";
    xhr("POST", url, { "Accept": "application/json;odata=verbose" }, null, function (req) {
      var data = null;
      try { data = JSON.parse(req.responseText); } catch (e) {}
      try {
        var digest = data.d.GetContextWebInformation.FormDigestValue;
        onOk(digest);
      } catch (e2) {
        onErr(req);
      }
    }, function (req) {
      onErr(req);
    });
  };

  SpApi.tryPing = function (onOk, onErr) {
    var url = global.SP_BASE.api + "/web?$select=Title";
    SpApi.getJson(url, function (data) {
      // 成功していれば data.d.Title があるはず
      onOk(data);
    }, function (req) {
      onErr(req);
    });
  };

  global.SpApi = SpApi;

})(window);
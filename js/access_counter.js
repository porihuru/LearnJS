/*
  ファイル: js/access_counter.js
  VERSION: 20260901-02

  LearnJS専用 SharePointアクセスカウンター
  - Edge 95 / IE11互換モード対応
  - ES5 / XMLHttpRequestのみ使用
  - SharePointの現在ユーザーを取得し、ユーザー別アクセス回数を記録
  - ホーム画面にはトータルアクセス数のみ表示
  - SharePoint接続失敗時もクイズ本体には影響させない

  SharePointリスト: learnjs_accesscounter
  必要列（内部名）:
    Title      : 1行テキスト（標準列。表示名を保存）
    spuserid   : 数値
    loginname  : 1行テキスト
    email      : 1行テキスト
    count      : 数値
    lastaccess : 日付と時刻
*/
(function (global) {
  "use strict";

  var AccessCounter = {};
  AccessCounter.VERSION = "20260901-02";

  var CONFIG = {
    webRoot: "/na/NA/NAFin/fin_csm",
    listTitle: "learnjs_accesscounter"
  };

  var counted = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function findTitleRight() {
    var host = null;
    var list;
    var divs;
    var i;

    if (document.getElementsByClassName) {
      list = document.getElementsByClassName("titleRight");
      if (list && list.length) host = list[0];
    }

    if (!host) {
      divs = document.getElementsByTagName("div");
      for (i = 0; i < divs.length; i++) {
        if ((" " + divs[i].className + " ").indexOf(" titleRight ") >= 0) {
          host = divs[i];
          break;
        }
      }
    }
    return host;
  }

  function ensureDisplay() {
    var host = findTitleRight();
    var el = byId("accessCounter");

    if (!host) return null;

    if (!el) {
      el = document.createElement("div");
      el.id = "accessCounter";
      el.innerHTML = "アクセス: --";
      el.style.fontSize = "11px";
      el.style.lineHeight = "1.25";
      el.style.color = "#607080";
      el.style.whiteSpace = "nowrap";
      el.style.marginBottom = "2px";
      el.style.textAlign = "right";
      el.title = "LearnJSアクセスカウンター";

      if (host.firstChild) host.insertBefore(el, host.firstChild);
      else host.appendChild(el);
    }

    return el;
  }

  function setDisplay(total) {
    var el = ensureDisplay();
    if (!el) return;
    el.innerHTML = "アクセス: " + String(total) + "回";
    el.style.color = "#607080";
    el.title = "LearnJS 総アクセス数";
  }

  function setUnavailable() {
    var el = ensureDisplay();
    if (!el) return;
    el.innerHTML = "アクセス: --";
    el.style.color = "#89939d";
    el.title = "SharePoint未接続";
  }

  function apiRoot() {
    var root = String(CONFIG.webRoot || "").replace(/^\s+|\s+$/g, "");
    if (root.length > 1 && root.charAt(root.length - 1) === "/") {
      root = root.substring(0, root.length - 1);
    }
    return root + "/_api";
  }

  function escapeListTitle(value) {
    return String(value || "").replace(/'/g, "''");
  }

  function xhr(method, url, headers, body, success, error) {
    var req;
    var key;

    try {
      req = new XMLHttpRequest();
      req.open(method, url, true);

      if (headers) {
        for (key in headers) {
          if (headers.hasOwnProperty(key)) {
            req.setRequestHeader(key, headers[key]);
          }
        }
      }

      req.onreadystatechange = function () {
        if (req.readyState !== 4) return;

        if (req.status >= 200 && req.status < 300) {
          if (success) success(req);
        } else {
          if (error) error(req);
        }
      };

      req.send(body || null);
    } catch (e) {
      if (error) error(null);
    }
  }

  function isoNow() {
    var d = new Date();
    function p(n) { return n < 10 ? "0" + n : String(n); }

    try {
      if (d.toISOString) return d.toISOString();
    } catch (e) {}

    return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) +
      "T" + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) + "Z";
  }

  function getCurrentUser(success, error) {
    xhr(
      "GET",
      apiRoot() + "/web/currentuser?$select=Id,Title,LoginName,Email",
      { "Accept": "application/json;odata=verbose" },
      null,
      function (req) {
        var data;
        try {
          data = JSON.parse(req.responseText);
          success(data.d || {});
        } catch (e) {
          if (error) error(req);
        }
      },
      error
    );
  }

  function loadRows(success, error) {
    var title = escapeListTitle(CONFIG.listTitle);
    var url = apiRoot() + "/web/lists/getbytitle('" + title + "')/items" +
      "?$select=Id,Title,spuserid,loginname,email,count,lastaccess&$top=5000";

    xhr(
      "GET",
      url,
      { "Accept": "application/json;odata=verbose" },
      null,
      function (req) {
        var data;
        try {
          data = JSON.parse(req.responseText);
          success((data.d && data.d.results) ? data.d.results : []);
        } catch (e) {
          if (error) error(req);
        }
      },
      error
    );
  }

  function getDigest(success, error) {
    xhr(
      "POST",
      apiRoot() + "/contextinfo",
      { "Accept": "application/json;odata=verbose" },
      null,
      function (req) {
        var data;
        try {
          data = JSON.parse(req.responseText);
          success(data.d.GetContextWebInformation.FormDigestValue);
        } catch (e) {
          if (error) error(req);
        }
      },
      error
    );
  }

  function getEntityType(success, error) {
    var title = escapeListTitle(CONFIG.listTitle);
    var url = apiRoot() + "/web/lists/getbytitle('" + title + "')?$select=ListItemEntityTypeFullName";

    xhr(
      "GET",
      url,
      { "Accept": "application/json;odata=verbose" },
      null,
      function (req) {
        var data;
        try {
          data = JSON.parse(req.responseText);
          success(data.d.ListItemEntityTypeFullName);
        } catch (e) {
          if (error) error(req);
        }
      },
      error
    );
  }

  function buildBody(entityType, user, nextCount) {
    return {
      "__metadata": { "type": entityType },
      "Title": String(user.Title || user.LoginName || "(unknown)"),
      "spuserid": parseInt(user.Id, 10) || 0,
      "loginname": String(user.LoginName || ""),
      "email": String(user.Email || ""),
      "count": nextCount,
      "lastaccess": isoNow()
    };
  }

  function saveRow(item, user, nextCount, success, error) {
    getEntityType(function (entityType) {
      getDigest(function (digest) {
        var title = escapeListTitle(CONFIG.listTitle);
        var url;
        var headers = {
          "Accept": "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
          "X-RequestDigest": digest
        };
        var body = JSON.stringify(buildBody(entityType, user, nextCount));

        if (item && item.Id) {
          url = apiRoot() + "/web/lists/getbytitle('" + title + "')/items(" + item.Id + ")";
          headers["X-HTTP-Method"] = "MERGE";
          headers["IF-MATCH"] = "*";
        } else {
          url = apiRoot() + "/web/lists/getbytitle('" + title + "')/items";
        }

        xhr("POST", url, headers, body, success, error);
      }, error);
    }, error);
  }

  function summarize(rows, userId) {
    var total = 0;
    var mine = 0;
    var mineRow = null;
    var i;
    var n;
    var rowUserId;

    for (i = 0; i < rows.length; i++) {
      n = parseInt(rows[i].count, 10);
      if (isNaN(n) || n < 0) n = 0;
      total += n;

      rowUserId = parseInt(rows[i].spuserid, 10);
      if (!isNaN(rowUserId) && rowUserId === userId) {
        mine += n;
        if (!mineRow) mineRow = rows[i];
      }
    }

    return { total: total, mine: mine, mineRow: mineRow };
  }

  AccessCounter.init = function () {
    ensureDisplay();

    if (counted) return;
    counted = true;

    getCurrentUser(function (user) {
      var userId = parseInt(user.Id, 10);
      if (isNaN(userId) || userId <= 0) {
        setUnavailable();
        return;
      }

      loadRows(function (rows) {
        var s = summarize(rows, userId);
        var nextMine = s.mine + 1;
        var nextTotal = s.total + 1;

        saveRow(
          s.mineRow,
          user,
          nextMine,
          function () {
            setDisplay(nextTotal);
          },
          function () {
            setUnavailable();
          }
        );
      }, function () {
        setUnavailable();
      });
    }, function () {
      setUnavailable();
    });
  };

  global.AccessCounter = AccessCounter;

  AccessCounter.init();

})(window);

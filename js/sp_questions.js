// sp_questions.js / 作成日時(JST): 2025-12-23 11:35:00
(function (global) {
  "use strict";

  // 目的：
  // - SP_BASE.api（例: /na/NA/NAFin/fin_csm/_api）で listTitle が404なら、
  //   webRoot を上位へ辿って自動探索（/na/NA/NAFin/_api → /na/NA/_api → ...）
  // - 見えているリスト名候補をログに出して、設定ミス（表示名違い/別Web）を切り分け
  // - Edge95/IEモード互換のため XHR + odata=verbose で実装

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
    if (!webRoot) return "/_api";
    return webRoot + "/_api";
  }

  function xhrGetJson(url, onOk, onNg) {
    var x = new XMLHttpRequest();
    x.open("GET", url, true);
    try { x.withCredentials = true; } catch (e) {}
    x.setRequestHeader("Accept", "application/json;odata=verbose");

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;

      if (x.status >= 200 && x.status < 300) {
        var obj = null;
        try { obj = JSON.parse(x.responseText || "{}"); }
        catch (e2) { onNg("JSON parse failed: " + e2 + "\nurl=" + url + "\nhead=" + String((x.responseText || "").slice(0, 120))); return; }

        onOk(obj, x);
        return;
      }

      // 失敗
      onNg({
        status: x.status,
        statusText: x.statusText || "",
        url: url,
        bodyHead: String((x.responseText || "").slice(0, 200))
      });
    };

    try { x.send(null); }
    catch (e3) { onNg("XHR send failed: " + e3 + "\nurl=" + url); }
  }

  function getVerboseResults(obj) {
    // odata=verbose: { d: { results: [...] } }  / item: { d: {...} }
    if (!obj) return null;
    if (obj.d && obj.d.results) return obj.d.results;
    if (obj.d) return obj.d;
    return obj;
  }

  function buildSelectQuery() {
    // state.js の内部名を使って select を作る
    var c = global.SP_CONFIG && SP_CONFIG.col ? SP_CONFIG.col : {};
    // 必須：Id, 各列
    var fields = ["Id"];
    if (c.qid) fields.push(c.qid);
    if (c.category) fields.push(c.category);
    if (c.question) fields.push(c.question);
    if (c.choice1) fields.push(c.choice1);
    if (c.choice2) fields.push(c.choice2);
    if (c.choice3) fields.push(c.choice3);
    if (c.choice4) fields.push(c.choice4);
    if (c.explanation) fields.push(c.explanation);

    // 重複除去
    var seen = {};
    var out = [];
    for (var i = 0; i < fields.length; i++) {
      var f = String(fields[i] || "");
      if (!f) continue;
      if (seen[f]) continue;
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
      var choice1 = toStr(it[c.choice1] || "");
      var choice2 = toStr(it[c.choice2] || "");
      var choice3 = toStr(it[c.choice3] || "");
      var choice4 = toStr(it[c.choice4] || "");
      var explanation = toStr(it[c.explanation] || "");

      // CSV版に合わせた形（Choice1が正解扱いは後段で engine 側で）
      var q = {
        id: id,
        category: category,
        question: question,
        explanation: explanation,
        choicesRaw: [
          { key: "Choice1", text: choice1 },
          { key: "Choice2", text: choice2 },
          { key: "Choice3", text: choice3 },
          { key: "Choice4", text: choice4 }
        ]
      };

      questions.push(q);
      if (category) catMap[category] = true;
    }

    var categories = [];
    for (var k in catMap) if (catMap.hasOwnProperty(k)) categories.push(k);
    categories.sort();

    return { questions: questions, categories: categories };
  }

  function diagnoseListTitles(apiBase, listTitle, done) {
    // 見えているリスト名の候補をログに出す（多すぎる場合はフィルタして上位のみ）
    var url = apiBase + "/web/lists?$top=5000&$select=Title,Hidden,BaseTemplate";
    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var arr = (res && res.results) ? res.results : (res instanceof Array ? res : []);
      var hits = [];
      var kw1 = "問題";
      var kw2 = "クイズ";
      var kw3 = "問";

      for (var i = 0; i < arr.length; i++) {
        var t = toStr(arr[i].Title);
        if (!t) continue;

        // 目的の名前に近いものだけ拾う
        if (t === listTitle) { hits.unshift(t); continue; }
        if (t.indexOf(listTitle) !== -1) { hits.push(t); continue; }
        if (t.indexOf(kw1) !== -1 || t.indexOf(kw2) !== -1 || t.indexOf(kw3) !== -1) { hits.push(t); continue; }
        if (t.indexOf("01") !== -1 || t.indexOf("1") !== -1) { hits.push(t); continue; }
      }

      // 先頭30件まで
      var show = hits.slice(0, 30);
      done(null, show, arr.length);
    }, function (err) {
      done(err, [], 0);
    });
  }

  function loadItemsAtApi(apiBase, listTitle, onOk, onErr) {
    var select = buildSelectQuery();
    var encTitle = encodeURIComponent(listTitle); // getbytitle('...') 内のエンコード

    var url = apiBase +
      "/web/lists/getbytitle('" + encTitle + "')/items" +
      "?$top=5000&$select=" + encodeURIComponent(select);

    xhrGetJson(url, function (obj) {
      var res = getVerboseResults(obj);
      var items = (res && res.results) ? res.results : [];
      onOk(items, apiBase);
    }, function (err) {
      onErr(err, apiBase);
    });
  }

  function loadWithAutoWebHop(onOk, onFail) {
    var listTitle = toStr(SP_CONFIG.listTitle || "");
    if (!listTitle) { onFail("SP_CONFIG.listTitle が空です"); return; }

    // 現在の確定webRootから上に最大6段試す
    var startWebRoot = trimEndSlash(SP_BASE.webRoot || "");
    var tries = [];
    var cur = startWebRoot;
    for (var i = 0; i < 6; i++) {
      tries.push(cur); // "" もあり得る
      if (!cur) break;
      cur = parentPath(cur);
    }

    var idx = 0;

    function nextTry() {
      if (idx >= tries.length) {
        onFail("上位Web探索でもリスト『" + listTitle + "』が見つかりませんでした。");
        return;
      }

      var webRoot = tries[idx++];
      var apiBase = apiFromWebRoot(webRoot);

      if (global.Render && Render.log) {
        Render.log("SP list probe: webRoot=" + (webRoot || "(site-root)") + " api=" + apiBase);
      }

      loadItemsAtApi(apiBase, listTitle, function (items, usedApi) {
        // 成功：このapiBaseが正解
        if (usedApi !== SP_BASE.api) {
          // 見つかったWebに合わせてSP_BASEを更新（固定ではなく“検出結果として”上書き）
          SP_BASE.webRoot = webRoot || "";
          SP_BASE.api = usedApi;
          SP_BASE.source = (SP_BASE.source || "") + " / override:foundList@" + (webRoot || "(site-root)");
        }
        onOk(items);
      }, function (err, usedApi) {
        // 404なら次の上位へ。その他は診断してから次へ。
        var st = (err && typeof err.status === "number") ? err.status : -1;

        if (st === 404) {
          // このWebにリストが無い。次へ。
          nextTry();
          return;
        }

        // 403/401 などは「見えない」可能性。診断を出して次へ。
        if (global.Render && Render.log) {
          Render.log("SP list probe failed: status=" + st + " url=" + (err.url || "") );
        }

        diagnoseListTitles(usedApi, listTitle, function (diagErr, candidates, total) {
          if (global.Render && Render.log) {
            if (diagErr) {
              Render.log("診断（lists取得）失敗: " + (typeof diagErr === "string" ? diagErr : ("status=" + diagErr.status)));
            } else {
              Render.log("診断（見えているリスト候補 / " + total + "件中）: " + (candidates.length ? candidates.join(" / ") : "(候補なし)"));
              Render.log("※候補に正しい名称があれば、state.js の SP_CONFIG.listTitle をその表示名に合わせてください。");
            }
          }
          nextTry();
        });
      });
    }

    nextTry();
  }

  var SP_Questions = {
    loadQuestions: function (success, failure) {
      if (!global.SP_BASE || !SP_BASE.api) {
        failure("SP_BASE.api が未確定です。SP_BASE.init() 後に呼んでください。");
        return;
      }

      loadWithAutoWebHop(function (items) {
        var norm = normalizeQuestionsFromItems(items || []);
        success(norm);
      }, function (msg) {
        failure(msg);
      });
    }
  };

  global.SP_Questions = SP_Questions;
})(window);
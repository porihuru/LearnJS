// JST: 2025-12-19 06:37:29 / sp_questions.js
(function (global) {
  "use strict";

  var SpQuestions = {};

  function buildItemsUrl() {
    var cfg = global.SP_CONFIG;
    var api = global.SP_BASE.api;

    // list title encode (日本語対応を優先)
    var listTitleEnc = encodeURIComponent(cfg.listTitle);

    var selectCols = [
      cfg.col.id,
      cfg.col.questionTitle,
      cfg.col.choice1,
      cfg.col.choice2,
      cfg.col.choice3,
      cfg.col.choice4,
      cfg.col.answer,
      cfg.col.explain
    ].join(",");

    var url = api
      + "/web/lists/getbytitle('" + listTitleEnc + "')/items"
      + "?$top=5000"
      + "&$select=" + encodeURIComponent(selectCols)
      + "&$orderby=" + encodeURIComponent(cfg.col.id + " asc");

    return url;
  }

  SpQuestions.loadAll = function (onOk, onErr) {
    var url = buildItemsUrl();

    global.SpApi.getJson(url, function (data, req) {
      try {
        var results = data.d.results;
        var list = [];

        for (var i = 0; i < results.length; i++) {
          var it = results[i];
          var cfg = global.SP_CONFIG;

          var rawChoices = [
            it[cfg.col.choice1],
            it[cfg.col.choice2],
            it[cfg.col.choice3],
            it[cfg.col.choice4]
          ];

          var q = {
            id: "sp-" + it[cfg.col.id],
            question: it[cfg.col.questionTitle] || "",
            choices: rawChoices,
            answer: it[cfg.col.answer] || "",
            explain: it[cfg.col.explain] || ""
          };

          list.push(q);
        }

        onOk(list);
      } catch (e) {
        onErr({ status: req.status, responseText: "Parse error: " + String(e) });
      }
    }, function (req) {
      onErr(req);
    });
  };

  global.SpQuestions = SpQuestions;

})(window);
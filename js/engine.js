// engine.js
// 2025-12-21 JST
(function (global) {
  "use strict";

  // Choice1 が正解。出題時に choices をシャッフルし correctIndex を作る。
  function prepForQuiz(row) {
    var correct = row.choice1;
    var arr = [row.choice1, row.choice2, row.choice3, row.choice4];
    Util.shuffleInPlace(arr);

    var correctIndex = -1;
    for (var i = 0; i < arr.length; i++) if (arr[i] === correct) { correctIndex = i; break; }

    return {
      id: row.id,
      category: row.category,
      question: row.question,
      choices: arr,
      correctIndex: correctIndex,
      explanation: row.explanation
    };
  }

  // balanced=true: カテゴリを交互に（ラウンドロビン）
  function buildQuizSet(allRows, total, balanced) {
    var pool = allRows.slice();
    Util.shuffleInPlace(pool);

    var picked = [];

    if (!balanced) {
      var m = Math.min(total, pool.length);
      for (var i = 0; i < m; i++) picked.push(pool[i]);
      return mapPrep(picked);
    }

    var byCat = Util.groupBy(pool, function (r) { return r.category; });
    var cats = Object.keys(byCat).sort();

    // カテゴリ内もシャッフル
    for (var c = 0; c < cats.length; c++) {
      Util.shuffleInPlace(byCat[cats[c]]);
    }

    var madeProgress = true;
    while (picked.length < total && madeProgress) {
      madeProgress = false;
      for (var ci = 0; ci < cats.length; ci++) {
        if (picked.length >= total) break;
        var list = byCat[cats[ci]];
        if (list && list.length) {
          picked.push(list.pop());
          madeProgress = true;
        }
      }
    }

    // まだ足りないなら残りから補完
    if (picked.length < total) {
      var rest = [];
      for (var ci2 = 0; ci2 < cats.length; ci2++) {
        var l2 = byCat[cats[ci2]];
        if (l2 && l2.length) rest = rest.concat(l2);
      }
      Util.shuffleInPlace(rest);
      while (picked.length < total && rest.length) picked.push(rest.pop());
    }

    return mapPrep(picked);
  }

  function mapPrep(rows) {
    var out = [];
    for (var i = 0; i < rows.length; i++) out.push(prepForQuiz(rows[i]));
    return out;
  }

  global.Engine = {
    buildQuizSet: buildQuizSet
  };
})(window);
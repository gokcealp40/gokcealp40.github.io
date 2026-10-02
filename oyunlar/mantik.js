/* Oyunların matematik kuralları. Görünen yazıların çoğu oyunlar/index.html içindedir. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.Carpim = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function hint(a, b) {
    var p = a * b;

    if (b === 1) return a + " × 1, sayının kendisidir: " + a + ".";
    if (a === 1) return "1 × " + b + ", sayının kendisidir: " + b + ".";

    if (b === 10) return a + " × 10, " + a + " sayısının sonuna sıfır yazmaktır: " + p + ".";
    if (a === 10) return "10 × " + b + ", " + b + " sayısının sonuna sıfır yazmaktır: " + p + ".";

    if (b === 2) return a + " × 2, " + a + " + " + a + " demektir: " + p + ".";
    if (a === 2) return "2 × " + b + ", " + b + " + " + b + " demektir: " + p + ".";

    if (b === 5) return a + " × 5, " + a + " × 10'un yarısıdır: " + (a * 10) + " ÷ 2 = " + p + ".";
    if (a === 5) return "5 × " + b + ", " + b + " × 10'un yarısıdır: " + (b * 10) + " ÷ 2 = " + p + ".";

    if (b === 9) return a + " × 9 = " + a + " × 10 − " + a + " = " + (a * 10) + " − " + a + " = " + p + ".";
    if (a === 9) return a + " × " + b + " = " + b + " × 10 − " + b + " = " + (b * 10) + " − " + b + " = " + p + ".";

    if (b % 2 === 0) {
      var hb = b / 2;
      var pb = a * hb;
      return a + " × " + b + " = " + a + " × " + hb + " + " + a + " × " + hb + " = " + pb + " + " + pb + " = " + p + ".";
    }
    if (a % 2 === 0) {
      var ha = a / 2;
      var pa = b * ha;
      return a + " × " + b + " = " + ha + " × " + b + " + " + ha + " × " + b + " = " + pa + " + " + pa + " = " + p + ".";
    }

    return a + " × " + b + " = " + a + " × " + (b - 1) + " + " + a + " = " + (a * (b - 1)) + " + " + a + " = " + p + ".";
  }

  function areaSentence(rows, cols) {
    var p = rows * cols;
    if (rows === 1 && cols === 1) return "Tek bir nokta. 1 × 1 = 1.";
    if (rows === 1) return "1 satır ve " + cols + " sütun. Toplam " + p + " nokta.";
    return rows + " satır ve " + cols + " sütun. Her satırda " + cols + " nokta var. Toplam " + p + " nokta.";
  }

  function shuffle(list, rng) {
    var a = list.slice();
    var i;
    var j;
    var t;
    for (i = a.length - 1; i > 0; i -= 1) {
      j = Math.floor(rng() * (i + 1));
      t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function distractors(a, b, rng) {
    var correct = a * b;
    var pool = [];
    var seen = {};

    function add(n) {
      n = Math.round(n);
      if (n > 0 && n !== correct && n < 220 && !seen[n]) {
        seen[n] = true;
        pool.push(n);
      }
    }

    add(a * (b + 1));
    add(a * (b - 1));
    add((a + 1) * b);
    add((a - 1) * b);
    add(a + b);
    add(correct + 1);
    add(correct - 1);
    add(correct + a);
    add(correct - a);
    add(correct + b);
    add(correct - b);
    add(correct + 10);
    add(correct - 10);

    var k = 2;
    while (pool.length < 3 && k < 50) {
      add(correct + k);
      add(correct - k);
      k += 1;
    }

    return shuffle(pool, rng).slice(0, 3);
  }

  function starsQuiz(correct, total) {
    if (!total || total < 1) return 0;
    var ratio = correct / total;
    if (ratio === 1) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio >= 0.4) return 1;
    return 0;
  }

  function starsMemory(moves, pairs) {
    if (moves <= pairs + 2) return 3;
    if (moves <= pairs * 2) return 2;
    return 1;
  }

  function starsTable(count) {
    if (count >= 100) return 3;
    if (count >= 50) return 2;
    if (count >= 20) return 1;
    return 0;
  }

  function isBetterQuiz(next, prev) {
    if (!prev || !prev.played) return true;
    var nextRatio = next.total ? next.correct / next.total : 0;
    var prevRatio = prev.bestTotal ? prev.bestCorrect / prev.bestTotal : 0;
    if (Math.abs(nextRatio - prevRatio) > 1e-9) return nextRatio > prevRatio;
    if ((next.streak || 0) !== (prev.bestStreak || 0)) return next.streak > prev.bestStreak;
    return (next.total || 0) > (prev.bestTotal || 0);
  }

  function makePairs(count, rng) {
    var used = {};
    var pairs = [];
    var guard = 0;
    var a;
    var b;
    var p;
    while (pairs.length < count && guard < 800) {
      guard += 1;
      a = 1 + Math.floor(rng() * 10);
      b = 1 + Math.floor(rng() * 10);
      p = a * b;
      if (used[p]) continue;
      used[p] = true;
      pairs.push({ a: a, b: b, p: p });
    }
    if (pairs.length < count) {
      throw new Error("Yeterli eşleşme kurulamadı.");
    }
    return pairs;
  }

  function nextQuestion(tables, rng, prevKey) {
    if (!tables || !tables.length) return null;
    var a = 1;
    var b = 1;
    var key = "";
    var i;
    for (i = 0; i < 40; i += 1) {
      a = tables[Math.floor(rng() * tables.length)];
      b = 1 + Math.floor(rng() * 10);
      if (rng() < 0.5) {
        var swap = a;
        a = b;
        b = swap;
      }
      key = a + "x" + b;
      if (key !== prevKey) break;
    }
    return { a: a, b: b, key: key };
  }

  function formatStars(n) {
    var full = "";
    var empty = "";
    var i;
    for (i = 0; i < n; i += 1) full += "★";
    for (i = n; i < 3; i += 1) empty += "☆";
    return full + empty;
  }

  return {
    hint: hint,
    areaSentence: areaSentence,
    shuffle: shuffle,
    distractors: distractors,
    starsQuiz: starsQuiz,
    starsMemory: starsMemory,
    starsTable: starsTable,
    isBetterQuiz: isBetterQuiz,
    makePairs: makePairs,
    nextQuestion: nextQuestion,
    formatStars: formatStars
  };
});

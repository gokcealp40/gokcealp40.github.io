/* Ortak oyun kuralları. Kısa yönergeler her oyunun html dosyasındadır.
   Günün bulmacaları alttaki PUZZLES listesindedir. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.Etkinlik = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function randInt(rng, a, b) {
    return a + Math.floor(rng() * (b - a + 1));
  }

  function shuffle(list, rng) {
    var a = list.slice();
    var i;
    for (i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function stars(correct, total) {
    if (!total || correct <= 0) return 0;
    var ratio = correct / total;
    if (ratio >= 1) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio >= 0.4) return 1;
    return 0;
  }

  function choiceNums(answer, rng) {
    var values = [answer];
    var d = 1;
    while (values.length < 4 && d < 50) {
      var plus = answer + d;
      var minus = answer - d;
      if (values.indexOf(plus) < 0) values.push(plus);
      if (values.length < 4 && minus >= 0 && values.indexOf(minus) < 0) values.push(minus);
      d += 1;
    }
    return shuffle(values.slice(0, 4), rng);
  }

  function sumQuestion(level, rng) {
    var max = level === "zor" ? 100 : level === "orta" ? 50 : 10;
    var lo = 0;
    var a = randInt(rng, lo, max);
    var b = randInt(rng, lo, max);
    var minusChance = level === "kolay" ? 0.35 : 0.5;
    var op = rng() < minusChance ? "-" : "+";
    var answer;
    if (op === "-") {
      if (a < b) {
        var swap = a;
        a = b;
        b = swap;
      }
      answer = a - b;
    } else {
      if (a + b > max) {
        b = randInt(rng, 0, Math.max(0, max - a));
      }
      answer = a + b;
    }
    var sign = op === "+" ? "+" : "−";
    return {
      kind: "sum",
      prompt: a + " " + sign + " " + b + " = ?",
      answer: answer,
      choices: choiceNums(answer, rng),
      hint: a + " " + sign + " " + b + " = " + answer + "."
    };
  }

  function fractionChoices(n, d, rng) {
    var correct = n + "/" + d;
    var pool = [correct];
    var candidates = [
      Math.min(d - 1, n + 1) + "/" + d,
      Math.max(1, n - 1) + "/" + d,
      n + "/" + (d + 1),
      "1/" + d,
      "1/" + (d + 1)
    ];
    var i;
    for (i = 0; i < candidates.length && pool.length < 4; i++) {
      if (pool.indexOf(candidates[i]) < 0) pool.push(candidates[i]);
    }
    var extra = 2;
    while (pool.length < 4) {
      var cand = extra + "/" + (d + 3);
      extra += 1;
      if (pool.indexOf(cand) < 0) pool.push(cand);
    }
    return shuffle(pool.slice(0, 4), rng);
  }

  function shadeQuestion(level, rng) {
    var dens = level === "kolay" ? [2, 3, 4] : level === "orta" ? [2, 3, 4, 6, 8] : [3, 4, 5, 6, 8, 10];
    var d = dens[randInt(rng, 0, dens.length - 1)];
    var n = randInt(rng, 1, d - 1);
    var shape = rng() < 0.5 ? "pizza" : "bar";
    return {
      kind: "shade",
      prompt: "Boyalı kısım hangi kesir?",
      shape: shape,
      n: n,
      d: d,
      answer: n + "/" + d,
      choices: fractionChoices(n, d, rng),
      hint: d + " eş parçadan " + n + " tanesi boyalı. Kesir " + n + "/" + d + "."
    };
  }

  function compareQuestion(level, rng) {
    var dens = [2, 3, 4, 5, 6, 8];
    var d1 = dens[randInt(rng, 0, dens.length - 1)];
    var d2 = level === "orta" ? d1 : dens[randInt(rng, 0, dens.length - 1)];
    var n1 = randInt(rng, 1, d1 - 1);
    var n2 = randInt(rng, 1, d2 - 1);
    var tries = 0;
    while (n1 / d1 === n2 / d2 && tries < 8) {
      n2 = randInt(rng, 1, Math.max(1, d2 - 1));
      tries += 1;
    }
    var left = n1 / d1;
    var right = n2 / d2;
    var answer = left === right ? "Eşit" : left > right ? "Soldaki" : "Sağdaki";
    var why = left === right
      ? "İkisi de aynı büyüklükte."
      : (answer === "Soldaki" ? "Soldaki daha büyük." : "Sağdaki daha büyük.");
    return {
      kind: "compare",
      prompt: "Hangisi daha büyük?",
      left: { n: n1, d: d1 },
      right: { n: n2, d: d2 },
      answer: answer,
      choices: ["Soldaki", "Sağdaki", "Eşit"],
      hint: "Soldaki " + n1 + "/" + d1 + ", sağdaki " + n2 + "/" + d2 + ". " + why
    };
  }

  function divideQuestion(level, rng) {
    var divisors = level === "zor" ? [2, 3, 4, 5, 6] : [2, 3, 4];
    var groups = divisors[randInt(rng, 0, divisors.length - 1)];
    var quot = randInt(rng, 1, level === "zor" ? 9 : 6);
    var total = groups * quot;
    return {
      kind: "divide",
      prompt: total + " nesneyi " + groups + " eşit gruba ayırırsan bir grupta kaç nesne olur?",
      total: total,
      groups: groups,
      answer: quot,
      choices: choiceNums(quot, rng),
      hint: total + " ÷ " + groups + " = " + quot + "."
    };
  }

  function fractionQuestion(level, rng) {
    var roll = rng();
    if (level === "kolay" || (level === "orta" && roll < 0.5) || (level === "zor" && roll < 0.34)) {
      return shadeQuestion(level, rng);
    }
    if (level === "orta" || roll < 0.67) {
      return compareQuestion(level, rng);
    }
    return divideQuestion(level, rng);
  }

  function tryCountdown(level, rng) {
    var count = level === "zor" ? 5 : level === "orta" ? 4 : 3;
    var hi = level === "zor" ? 12 : level === "orta" ? 10 : 9;
    var nums = [];
    var i;
    for (i = 0; i < count; i++) nums.push(randInt(rng, 1, hi));
    var pool = nums.slice();
    var steps = [];
    var guard = 0;
    while (pool.length > 1 && guard < 80) {
      guard += 1;
      var ia = randInt(rng, 0, pool.length - 1);
      var ib = randInt(rng, 0, pool.length - 1);
      if (ia === ib) continue;
      var a = pool[ia];
      var b = pool[ib];
      var ops = ["+", "-", "×", "÷"];
      var op = ops[randInt(rng, 0, ops.length - 1)];
      var left = a;
      var right = b;
      var value = null;
      if (op === "+") {
        value = a + b;
      } else if (op === "×") {
        value = a * b;
        if (value > 240) continue;
      } else if (op === "-") {
        if (a === b) continue;
        if (a < b) {
          left = b;
          right = a;
        }
        value = left - right;
        if (value === 0) continue;
      } else if (right !== 0 && left % right === 0) {
        value = left / right;
      } else if (left !== 0 && right % left === 0) {
        var tmp = left;
        left = right;
        right = tmp;
        value = left / right;
      } else {
        continue;
      }
      if (value === null || value !== Math.floor(value) || value < 1) continue;
      var next = [];
      var removedLeft = false;
      var removedRight = false;
      var k;
      for (k = 0; k < pool.length; k++) {
        if (!removedLeft && pool[k] === left) {
          removedLeft = true;
          continue;
        }
        if (!removedRight && pool[k] === right) {
          removedRight = true;
          continue;
        }
        next.push(pool[k]);
      }
      if (!removedLeft || !removedRight) continue;
      next.push(value);
      var shownOp = op === "-" ? "−" : op;
      steps.push({
        a: left,
        b: right,
        op: shownOp,
        value: value,
        text: left + " " + shownOp + " " + right + " = " + value
      });
      pool = next;
    }
    if (pool.length !== 1 || !steps.length) return null;
    var target = pool[0];
    if (nums.indexOf(target) >= 0) return null;
    return { numbers: nums, target: target, steps: steps };
  }

  function countdownPuzzle(level, rng) {
    var attempt;
    for (attempt = 0; attempt < 40; attempt++) {
      var puzzle = tryCountdown(level, rng);
      if (puzzle && checkCountdown(puzzle)) return puzzle;
    }
    if (level === "zor") {
      return {
        numbers: [1, 2, 3, 4, 5],
        target: 15,
        steps: [
          { a: 1, b: 2, op: "+", value: 3, text: "1 + 2 = 3" },
          { a: 3, b: 3, op: "+", value: 6, text: "3 + 3 = 6" },
          { a: 6, b: 4, op: "+", value: 10, text: "6 + 4 = 10" },
          { a: 10, b: 5, op: "+", value: 15, text: "10 + 5 = 15" }
        ]
      };
    }
    if (level === "orta") {
      return {
        numbers: [2, 3, 5, 8],
        target: 24,
        steps: [
          { a: 8, b: 2, op: "×", value: 16, text: "8 × 2 = 16" },
          { a: 5, b: 3, op: "+", value: 8, text: "5 + 3 = 8" },
          { a: 16, b: 8, op: "+", value: 24, text: "16 + 8 = 24" }
        ]
      };
    }
    return {
      numbers: [2, 3, 4],
      target: 20,
      steps: [
        { a: 2, b: 3, op: "+", value: 5, text: "2 + 3 = 5" },
        { a: 5, b: 4, op: "×", value: 20, text: "5 × 4 = 20" }
      ]
    };
  }

  function checkCountdown(puzzle) {
    var pool = puzzle.numbers.slice();
    var s;
    for (s = 0; s < puzzle.steps.length; s++) {
      var step = puzzle.steps[s];
      var next = [];
      var removedA = false;
      var removedB = false;
      var i;
      for (i = 0; i < pool.length; i++) {
        if (!removedA && pool[i] === step.a) {
          removedA = true;
          continue;
        }
        if (!removedB && pool[i] === step.b) {
          removedB = true;
          continue;
        }
        next.push(pool[i]);
      }
      if (!removedA || !removedB) return false;
      var expect = null;
      if (step.op === "+") expect = step.a + step.b;
      else if (step.op === "−" || step.op === "-") expect = step.a - step.b;
      else if (step.op === "×") expect = step.a * step.b;
      else if (step.op === "÷" && step.b !== 0 && step.a % step.b === 0) expect = step.a / step.b;
      if (expect !== step.value) return false;
      next.push(step.value);
      pool = next;
    }
    return pool.length === 1 && pool[0] === puzzle.target;
  }

  var SHAPES = ["daire", "kare", "üçgen", "yıldız"];

  function patternQuestion(level, rng) {
    var numeric = level === "kolay" ? rng() < 0.65 : rng() < 0.7;
    if (!numeric) {
      var cycleLen = level === "kolay" ? 2 : 3;
      var bag = SHAPES.slice();
      var cycle = [];
      var c;
      for (c = 0; c < cycleLen; c++) {
        cycle.push(bag.splice(randInt(rng, 0, bag.length - 1), 1)[0]);
      }
      var shown = [];
      var k;
      for (k = 0; k < 5; k++) shown.push(cycle[k % cycle.length]);
      var answer = cycle[5 % cycle.length];
      var choices = cycle.slice();
      var s;
      for (s = 0; s < SHAPES.length && choices.length < 4; s++) {
        if (choices.indexOf(SHAPES[s]) < 0) choices.push(SHAPES[s]);
      }
      return {
        kind: "shape",
        prompt: "Sıradaki şekil hangisi?",
        shown: shown,
        answer: answer,
        choices: shuffle(choices, rng),
        hint: "Şekiller aynı sırayla tekrar ediyor. Sıradaki: " + answer + "."
      };
    }
    var start = randInt(rng, 1, level === "zor" ? 8 : 12);
    var step = 2;
    var op = "+";
    if (level === "kolay") {
      step = [1, 2, 5, 10][randInt(rng, 0, 3)];
      op = "+";
    } else if (level === "orta") {
      if (rng() < 0.35) {
        op = "×";
        step = 2;
        start = randInt(rng, 1, 4);
      } else {
        op = "+";
        step = [3, 4, 5][randInt(rng, 0, 2)];
      }
    } else {
      var pick = randInt(rng, 0, 2);
      if (pick === 0) {
        op = "×";
        step = 2;
        start = randInt(rng, 1, 3);
      } else if (pick === 1) {
        op = "+";
        step = [6, 7, 8, 9][randInt(rng, 0, 3)];
      } else {
        op = "-";
        step = randInt(rng, 2, 5);
        start = step * 6;
      }
    }
    var seq = [start];
    var i;
    for (i = 0; i < 4; i++) {
      var prev = seq[seq.length - 1];
      var next = op === "+" ? prev + step : op === "×" ? prev * step : prev - step;
      seq.push(next);
    }
    var answerN = seq[4];
    var rule = op === "+"
      ? "Her adımda " + step + " ekleniyor."
      : op === "×"
        ? "Her adımda " + step + " ile çarpılıyor."
        : "Her adımda " + step + " çıkarılıyor.";
    return {
      kind: "number",
      prompt: "Sıradaki sayı hangisi?",
      shown: seq.slice(0, 4),
      answer: answerN,
      choices: choiceNums(answerN, rng),
      hint: rule + " Sıradaki sayı " + answerN + "."
    };
  }

  var SHAPE_INFO = {
    daire: { name: "daire", sides: 0, corners: 0 },
    üçgen: { name: "üçgen", sides: 3, corners: 3 },
    kare: { name: "kare", sides: 4, corners: 4 },
    dikdörtgen: { name: "dikdörtgen", sides: 4, corners: 4 },
    beşgen: { name: "beşgen", sides: 5, corners: 5 },
    altıgen: { name: "altıgen", sides: 6, corners: 6 }
  };

  function geometryQuestion(level, rng) {
    if (level === "kolay") {
      var keys = ["daire", "üçgen", "kare", "dikdörtgen"];
      var key = keys[randInt(rng, 0, keys.length - 1)];
      var info = SHAPE_INFO[key];
      if (rng() < 0.55) {
        return {
          kind: "name",
          shape: key,
          prompt: "Bu şeklin adı nedir?",
          answer: info.name,
          choices: shuffle(keys.map(function (k) { return SHAPE_INFO[k].name; }), rng),
          hint: "Bu bir " + info.name + "."
        };
      }
      var askSides = key !== "daire" && rng() < 0.5;
      var answer = askSides ? info.sides : info.corners;
      var prompt = askSides ? "Bu şeklin kaç kenarı var?" : "Bu şeklin kaç köşesi var?";
      var hint = key === "daire"
        ? "Dairenin düz kenarı ve köşesi yoktur. Cevap 0."
        : "Bu " + info.name + " için cevap " + answer + ".";
      return {
        kind: askSides ? "sides" : "corners",
        shape: key,
        prompt: prompt,
        answer: answer,
        choices: choiceNums(answer, rng),
        hint: hint
      };
    }
    if (level === "orta") {
      if (rng() < 0.5) {
        var keys2 = ["beşgen", "altıgen", "üçgen", "kare", "dikdörtgen"];
        var key2 = keys2[randInt(rng, 0, keys2.length - 1)];
        var info2 = SHAPE_INFO[key2];
        return {
          kind: "sides",
          shape: key2,
          prompt: "Bu şeklin kaç kenarı var?",
          answer: info2.sides,
          choices: shuffle([3, 4, 5, 6], rng),
          hint: info2.name + " için kenar sayısı " + info2.sides + "."
        };
      }
      var w = randInt(rng, 2, 8);
      var h = randInt(rng, 2, 6);
      if (w === h) h = w === 6 ? 3 : w + 1;
      var per = 2 * (w + h);
      return {
        kind: "perimeter",
        width: w,
        height: h,
        prompt: "Bu dikdörtgenin çevresi kaç birim?",
        answer: per,
        choices: choiceNums(per, rng),
        hint: "Çevre, bütün kenarların toplamıdır. 2 × (" + w + " + " + h + ") = " + per + "."
      };
    }
    if (rng() < 0.55) {
      var w2 = randInt(rng, 2, 6);
      var h2 = randInt(rng, 2, 5);
      var area = w2 * h2;
      return {
        kind: "area",
        width: w2,
        height: h2,
        prompt: "Izgarada boyalı kaç kare var?",
        answer: area,
        choices: choiceNums(area, rng),
        hint: "Satırdaki kareleri say, sütunla çarp: " + w2 + " × " + h2 + " = " + area + "."
      };
    }
    var W = randInt(rng, 4, 6);
    var H = randInt(rng, 4, 6);
    var cutW = randInt(rng, 1, W - 2);
    var cutH = randInt(rng, 1, H - 2);
    var cells = W * H - cutW * cutH;
    return {
      kind: "lshape",
      width: W,
      height: H,
      cutW: cutW,
      cutH: cutH,
      prompt: "Boyalı kareleri say. Kaç kare var?",
      answer: cells,
      choices: choiceNums(cells, rng),
      hint: "Büyük parça " + (W * H) + " kareydi. Boş kısım " + (cutW * cutH) + " kare. Kalan " + cells + "."
    };
  }

  var PUZZLES = [
    { id: "k1", level: "kolay", prompt: "Bir sepette 4 elma var. 3 elma daha konursa sepette kaç elma olur?", choices: ["5", "6", "7", "8"], answer: "7", explain: "4 + 3 = 7." },
    { id: "k2", level: "kolay", prompt: "Dalda 6 kuş var. 2 kuş uçarsa kaç kuş kalır?", choices: ["3", "4", "5", "8"], answer: "4", explain: "6 − 2 = 4." },
    { id: "k3", level: "kolay", prompt: "Bir üçgenin kaç köşesi vardır?", choices: ["2", "3", "4", "5"], answer: "3", explain: "Üçgenin 3 köşesi vardır." },
    { id: "k4", level: "kolay", prompt: "5 + 5 kaç eder?", choices: ["8", "9", "10", "11"], answer: "10", explain: "5 + 5 = 10." },
    { id: "k5", level: "kolay", prompt: "8 bilyenin 3'ü kırmızı. Kırmızı olmayan kaç bilye vardır?", choices: ["3", "4", "5", "6"], answer: "5", explain: "8 − 3 = 5." },
    { id: "k6", level: "kolay", prompt: "Bir haftada kaç gün vardır?", choices: ["5", "6", "7", "8"], answer: "7", explain: "Bir hafta 7 gündür." },
    { id: "k7", level: "kolay", prompt: "2, 4, 6, 8... Sıradaki sayı kaçtır?", choices: ["9", "10", "12", "14"], answer: "10", explain: "Sayılar ikişer ikişer artıyor. 8 + 2 = 10." },
    { id: "k8", level: "kolay", prompt: "Bir karenin kaç kenarı vardır?", choices: ["3", "4", "5", "6"], answer: "4", explain: "Karenin 4 eşit kenarı vardır." },
    { id: "k9", level: "kolay", prompt: "9'dan 4 çıkarsa kaç kalır?", choices: ["3", "4", "5", "13"], answer: "5", explain: "9 − 4 = 5." },
    { id: "k10", level: "kolay", prompt: "3 kedinin her birinin 2 kulağı varsa toplam kaç kulak olur?", choices: ["3", "5", "6", "8"], answer: "6", explain: "3 × 2 = 6." },
    { id: "o1", level: "orta", prompt: "4 kutu var. Her kutuda 3 kalem. Toplam kaç kalem vardır?", choices: ["7", "10", "12", "15"], answer: "12", explain: "4 × 3 = 12." },
    { id: "o2", level: "orta", prompt: "18 cevizin yarısı kaçtır?", choices: ["6", "8", "9", "10"], answer: "9", explain: "18 ÷ 2 = 9." },
    { id: "o3", level: "orta", prompt: "Bir sayı 7'den 5 fazladır. Bu sayı kaçtır?", choices: ["10", "11", "12", "13"], answer: "12", explain: "7 + 5 = 12." },
    { id: "o4", level: "orta", prompt: "12 dilim pastanın 3 dilimi yenmiş. Kaç dilim kalır?", choices: ["6", "8", "9", "15"], answer: "9", explain: "12 − 3 = 9." },
    { id: "o5", level: "orta", prompt: "4 × 4 kaç eder?", choices: ["8", "12", "16", "20"], answer: "16", explain: "4 × 4 = 16." },
    { id: "o6", level: "orta", prompt: "20 ÷ 4 kaç eder?", choices: ["4", "5", "6", "16"], answer: "5", explain: "20 ÷ 4 = 5." },
    { id: "o7", level: "orta", prompt: "En küçük iki basamaklı sayı kaçtır?", choices: ["1", "9", "10", "11"], answer: "10", explain: "İki basamaklı en küçük sayı 10'dur." },
    { id: "o8", level: "orta", prompt: "Bir düzine kaç tanedir?", choices: ["6", "10", "12", "20"], answer: "12", explain: "Bir düzine 12 tanedir." },
    { id: "o9", level: "orta", prompt: "2, 5, 8, 11... Sıradaki sayı kaçtır?", choices: ["12", "13", "14", "15"], answer: "14", explain: "Her adımda 3 ekleniyor. 11 + 3 = 14." },
    { id: "o10", level: "orta", prompt: "Kısa kenarı 2, uzun kenarı 6 olan dikdörtgenin çevresi kaç birimdir?", choices: ["8", "12", "16", "18"], answer: "16", explain: "2 + 6 + 2 + 6 = 16." },
    { id: "z1", level: "zor", prompt: "Bir sayı 3 ile çarpılınca 21 oluyor. Sayı kaçtır?", choices: ["6", "7", "8", "18"], answer: "7", explain: "21 ÷ 3 = 7." },
    { id: "z2", level: "zor", prompt: "24 bilye 6 çocuğa eşit paylaştırılırsa her birine kaç bilye düşer?", choices: ["3", "4", "5", "6"], answer: "4", explain: "24 ÷ 6 = 4." },
    { id: "z3", level: "zor", prompt: "Kenarları 4 ve 5 birim olan dikdörtgenin alanı kaç karedir?", choices: ["9", "18", "20", "24"], answer: "20", explain: "4 × 5 = 20." },
    { id: "z4", level: "zor", prompt: "1'den 4'e kadar olan sayıların toplamı kaçtır?", choices: ["8", "9", "10", "12"], answer: "10", explain: "1 + 2 + 3 + 4 = 10." },
    { id: "z5", level: "zor", prompt: "1/2 ile 1/4 kesirlerinden hangisi daha büyüktür?", choices: ["1/2", "1/4", "Eşit", "1/8"], answer: "1/2", explain: "1/2, bir bütünün yarısıdır. 1/4 ondan küçüktür." },
    { id: "z6", level: "zor", prompt: "3, 6, 12, 24... Sıradaki sayı kaçtır?", choices: ["30", "36", "48", "60"], answer: "48", explain: "Her adımda sayı iki katına çıkıyor. 24 × 2 = 48." },
    { id: "z7", level: "zor", prompt: "4 tavuğun toplam kaç bacağı vardır?", choices: ["4", "6", "8", "12"], answer: "8", explain: "Her tavuğun 2 bacağı vardır. 4 × 2 = 8." },
    { id: "z8", level: "zor", prompt: "100'ün yarısının yarısı kaçtır?", choices: ["10", "20", "25", "50"], answer: "25", explain: "100'ün yarısı 50, onun yarısı 25'tir." },
    { id: "z9", level: "zor", prompt: "8 + 8 − 6 kaç eder?", choices: ["8", "10", "12", "14"], answer: "10", explain: "8 + 8 = 16. 16 − 6 = 10." },
    { id: "z10", level: "zor", prompt: "Bir saatte 60 dakika vardır. Yarım saatte kaç dakika vardır?", choices: ["15", "20", "30", "40"], answer: "30", explain: "60'ın yarısı 30 dakikadır." }
  ];

  function dayOfYear(date) {
    var start = Date.UTC(date.getFullYear(), 0, 1);
    var current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((current - start) / 86400000);
  }

  function dayKey(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
  }

  function dailyPuzzle(date, level) {
    var lvl = level === "orta" || level === "zor" ? level : "kolay";
    var list = PUZZLES.filter(function (p) { return p.level === lvl; });
    var idx = dayOfYear(date) % list.length;
    var p = list[idx];
    return {
      id: p.id,
      level: p.level,
      prompt: p.prompt,
      choices: p.choices.slice(),
      answer: p.answer,
      explain: p.explain
    };
  }

  return {
    sumQuestion: sumQuestion,
    fractionQuestion: fractionQuestion,
    countdownPuzzle: countdownPuzzle,
    checkCountdown: checkCountdown,
    patternQuestion: patternQuestion,
    geometryQuestion: geometryQuestion,
    dailyPuzzle: dailyPuzzle,
    puzzles: PUZZLES,
    stars: stars,
    dayKey: dayKey,
    dayOfYear: dayOfYear,
    shuffle: shuffle
  };
});

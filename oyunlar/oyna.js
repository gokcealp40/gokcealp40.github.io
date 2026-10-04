/* Oyun ekranı. Yıldızlar yalnız bu tarayıcıda kalır. */
(function () {
  "use strict";

  var E = window.Etkinlik;
  var KEY = "pisagokce-mat-v1";
  var ROUND = 6;
  var PRAISE = ["Aferin!", "Çok güzel!", "Bildin!", "Harika!"];
  var GENTLE = ["Sorun değil, birlikte bakalım.", "Bu sefer değil.", "Olur böyle. Doğru cevaba bakalım."];
  var MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  var game = document.body.getAttribute("data-oyun");
  var state = load();
  var level = (state.levels && state.levels[game]) || "kolay";
  var round = null;
  var hedef = null;
  var daily = null;
  var dailyRevealed = false;
  var dailyAnswered = false;

  function empty() {
    return {
      levels: {},
      toplama: { stars: 0 },
      kesir: { stars: 0 },
      hedef: { stars: 0 },
      oruntu: { stars: 0 },
      geometri: { stars: 0 },
      gunun: { stars: 0, solved: [] }
    };
  }

  function load() {
    var base = empty();
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var data = JSON.parse(raw);
      ["toplama", "kesir", "hedef", "oruntu", "geometri", "gunun"].forEach(function (id) {
        if (data[id] && typeof data[id].stars === "number") base[id].stars = data[id].stars;
      });
      if (data.gunun && Array.isArray(data.gunun.solved)) base.gunun.solved = data.gunun.solved.slice();
      if (data.levels) base.levels = data.levels;
      return base;
    } catch (err) {
      return base;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      var note = document.getElementById("storage-note");
      if (note) note.hidden = false;
    }
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function show(id, on) {
    var node = byId(id);
    if (node) node.hidden = !on;
  }

  function setFeedback(text, kind) {
    var node = byId("geri");
    if (!node) return;
    node.textContent = text || "";
    node.className = "feedback" + (kind ? " " + kind : "");
  }

  function starLine(n) {
    n = Math.max(0, Math.min(3, n || 0));
    if (!n) return "Henüz yıldız yok";
    var marks = "";
    var i;
    for (i = 0; i < 3; i++) marks += i < n ? "★" : "☆";
    return marks + "  " + n + " yıldız";
  }

  function paintStars() {
    var node = byId("yildiz");
    if (!node || !state[game]) return;
    node.textContent = starLine(state[game].stars);
  }

  function award(earned) {
    if (!state[game]) return;
    if (earned > (state[game].stars || 0)) state[game].stars = earned;
    save();
    paintStars();
  }

  function paintLevel() {
    var buttons = document.querySelectorAll("[data-level]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var on = btn.getAttribute("data-level") === level;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-on", on);
    });
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function makeButton(className, text, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function shapeEl(name) {
    var span = document.createElement("span");
    var cls = name === "üçgen" ? "ucgen" : name === "yıldız" ? "yildiz" : name;
    span.className = "shape shape-" + cls;
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", name);
    return span;
  }

  function svgNS(name, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function fractionSvg(n, d, shape) {
    var svg = svgNS("svg", { viewBox: "0 0 120 120", role: "img" });
    svg.setAttribute("aria-label", d + " eş parçadan " + n + " tanesi boyalı " + (shape === "bar" ? "çubuk" : "pizza"));
    if (shape === "bar") {
      var gap = 4;
      var w = (100 - gap * (d - 1)) / d;
      var i;
      for (i = 0; i < d; i++) {
        svg.appendChild(svgNS("rect", {
          x: 8 + i * (w + gap),
          y: 40,
          width: w,
          height: 40,
          rx: 4,
          fill: i < n ? "#16483a" : "#fffaf3",
          stroke: "#1c1916",
          "stroke-width": 1.5
        }));
      }
      return svg;
    }
    var cx = 60;
    var cy = 60;
    var r = 46;
    var p;
    for (p = 0; p < d; p++) {
      var a0 = (p / d) * Math.PI * 2 - Math.PI / 2;
      var a1 = ((p + 1) / d) * Math.PI * 2 - Math.PI / 2;
      var large = a1 - a0 > Math.PI ? 1 : 0;
      var x0 = cx + r * Math.cos(a0);
      var y0 = cy + r * Math.sin(a0);
      var x1 = cx + r * Math.cos(a1);
      var y1 = cy + r * Math.sin(a1);
      svg.appendChild(svgNS("path", {
        d: "M " + cx + " " + cy + " L " + x0.toFixed(2) + " " + y0.toFixed(2) + " A " + r + " " + r + " 0 " + large + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + " Z",
        fill: p < n ? "#16483a" : "#fffaf3",
        stroke: "#1c1916",
        "stroke-width": 1.4
      }));
    }
    return svg;
  }

  function cardWrap(child, caption) {
    var fig = document.createElement("div");
    fig.className = "figure-card";
    fig.appendChild(child);
    if (caption) {
      var cap = document.createElement("p");
      cap.className = "caption";
      cap.textContent = caption;
      fig.appendChild(cap);
    }
    return fig;
  }

  function shapeSvg(name) {
    var svg = svgNS("svg", { viewBox: "0 0 120 120", class: "geo", role: "img" });
    svg.setAttribute("aria-label", name + " şekli");
    var node;
    if (name === "daire") {
      node = svgNS("circle", { cx: 60, cy: 60, r: 40, fill: "#e7f2ec", stroke: "#16483a", "stroke-width": 4 });
    } else if (name === "üçgen") {
      node = svgNS("polygon", { points: "60,16 108,104 12,104", fill: "#f8ebe3", stroke: "#6e2a1f", "stroke-width": 4 });
    } else if (name === "kare") {
      node = svgNS("rect", { x: 22, y: 22, width: 76, height: 76, fill: "#f8f1dc", stroke: "#5c4a22", "stroke-width": 4 });
    } else if (name === "dikdörtgen") {
      node = svgNS("rect", { x: 12, y: 36, width: 96, height: 48, fill: "#e5eef8", stroke: "#16483a", "stroke-width": 4 });
    } else if (name === "beşgen") {
      node = svgNS("polygon", { points: "60,12 108,48 90,104 30,104 12,48", fill: "#efe7f6", stroke: "#1c1916", "stroke-width": 4 });
    } else {
      node = svgNS("polygon", { points: "60,10 104,36 104,84 60,110 16,84 16,36", fill: "#fde8e4", stroke: "#6e2a1f", "stroke-width": 4 });
    }
    svg.appendChild(node);
    return svg;
  }

  function gridSvg(w, h, cutW, cutH) {
    var cell = 22;
    var pad = 6;
    var svg = svgNS("svg", {
      viewBox: "0 0 " + (w * cell + pad * 2) + " " + (h * cell + pad * 2),
      class: "geo",
      role: "img"
    });
    svg.setAttribute("aria-label", "boyalı karelerden oluşan ızgara");
    var y;
    var x;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (cutW && x >= w - cutW && y >= h - cutH) continue;
        svg.appendChild(svgNS("rect", {
          x: pad + x * cell,
          y: pad + y * cell,
          width: cell - 3,
          height: cell - 3,
          rx: 3,
          fill: "#16483a"
        }));
      }
    }
    return svg;
  }

  function renderScene(q) {
    var sahne = byId("sahne");
    clearNode(sahne);
    if (!q) return;
    if (q.kind === "shade") {
      sahne.appendChild(cardWrap(fractionSvg(q.n, q.d, q.shape)));
    } else if (q.kind === "compare") {
      var pair = document.createElement("div");
      pair.className = "pair";
      pair.appendChild(cardWrap(fractionSvg(q.left.n, q.left.d, "pizza"), "Soldaki"));
      pair.appendChild(cardWrap(fractionSvg(q.right.n, q.right.d, "bar"), "Sağdaki"));
      sahne.appendChild(pair);
    } else if (q.kind === "divide") {
      var dots = document.createElement("div");
      dots.className = "dots";
      dots.setAttribute("aria-hidden", "true");
      var i;
      for (i = 0; i < q.total; i++) {
        var dot = document.createElement("span");
        dot.className = "dot";
        dots.appendChild(dot);
      }
      var wrap = cardWrap(dots);
      var note = document.createElement("p");
      note.className = "sr-only";
      note.textContent = q.total + " nesne";
      wrap.appendChild(note);
      sahne.appendChild(wrap);
    } else if (q.kind === "number") {
      var seq = document.createElement("div");
      seq.className = "seq";
      q.shown.forEach(function (n) {
        var item = document.createElement("span");
        item.className = "seq-item";
        item.textContent = String(n);
        seq.appendChild(item);
      });
      var mark = document.createElement("span");
      mark.className = "seq-q";
      mark.textContent = "?";
      seq.appendChild(mark);
      sahne.appendChild(seq);
    } else if (q.kind === "shape") {
      var row = document.createElement("div");
      row.className = "seq";
      q.shown.forEach(function (name) {
        var item = document.createElement("span");
        item.className = "seq-item";
        item.appendChild(shapeEl(name));
        row.appendChild(item);
      });
      var qmark = document.createElement("span");
      qmark.className = "seq-q";
      qmark.textContent = "?";
      row.appendChild(qmark);
      sahne.appendChild(row);
    } else if (q.shape) {
      sahne.appendChild(cardWrap(shapeSvg(q.shape)));
    } else if (q.kind === "perimeter") {
      sahne.appendChild(cardWrap(shapeSvg("dikdörtgen"), q.width + " ve " + q.height + " birim"));
    } else if (q.kind === "area" || q.kind === "lshape") {
      sahne.appendChild(cardWrap(gridSvg(q.width, q.height, q.cutW || 0, q.cutH || 0)));
    }
  }

  function choiceLabel(value) {
    return String(value);
  }

  function renderChoices(q, locked) {
    var box = byId("secenekler");
    clearNode(box);
    if (game === "gunun") {
      q.choices.forEach(function (choice) {
        var dailyBtn = document.createElement("button");
        dailyBtn.type = "button";
        dailyBtn.className = "choice";
        dailyBtn.textContent = String(choice);
        dailyBtn.addEventListener("click", function () { onDailyAnswer(choice, dailyBtn); });
        box.appendChild(dailyBtn);
      });
      return;
    }
    q.choices.forEach(function (choice) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      if (q.kind === "shape") {
        btn.appendChild(shapeEl(choice));
        var word = document.createElement("span");
        word.textContent = choice;
        btn.appendChild(word);
      } else {
        btn.textContent = choiceLabel(choice);
      }
      btn.addEventListener("click", function () {
        onAnswer(choice, btn);
      });
      if (locked) btn.disabled = true;
      box.appendChild(btn);
    });
  }

  function makeQuestion() {
    var rng = Math.random;
    if (game === "toplama") return E.sumQuestion(level, rng);
    if (game === "kesir") return E.fractionQuestion(level, rng);
    if (game === "oruntu") return E.patternQuestion(level, rng);
    return E.geometryQuestion(level, rng);
  }

  function startRound() {
    var list = [];
    var i;
    for (i = 0; i < ROUND; i++) list.push(makeQuestion());
    round = { list: list, index: 0, correct: 0, locked: false };
    show("sonraki", false);
    show("yeniden", false);
    show("cozum", false);
    show("cevap", false);
    show("geri-al", false);
    show("adimlar", false);
    setFeedback("");
    showQuestion();
  }

  function showQuestion() {
    var q = round.list[round.index];
    round.locked = false;
    byId("durum").textContent = "Soru " + (round.index + 1) + " / " + ROUND;
    byId("soru").textContent = q.prompt;
    renderScene(q);
    renderChoices(q, false);
    setFeedback("");
    show("sonraki", false);
  }

  function onAnswer(choice, btn) {
    if (!round || round.locked) return;
    round.locked = true;
    var q = round.list[round.index];
    var ok = String(choice) === String(q.answer);
    var buttons = byId("secenekler").querySelectorAll("button");
    Array.prototype.forEach.call(buttons, function (node) {
      node.disabled = true;
      var value = node.textContent.trim();
      if (q.kind === "shape") {
        var word = node.querySelector("span:last-child");
        value = word ? word.textContent : value;
      }
      if (String(value) === String(q.answer)) node.classList.add("is-good");
    });
    if (!ok) btn.classList.add("is-bad");
    if (ok) {
      round.correct += 1;
      setFeedback(pick(PRAISE), "good");
    } else {
      setFeedback(pick(GENTLE) + " " + (q.hint || ("Doğru cevap: " + q.answer)), "soft");
    }
    if (round.index + 1 >= ROUND) finishRound();
    else {
      show("sonraki", true);
      byId("sonraki").focus();
    }
  }

  function finishRound() {
    var earned = E.stars(round.correct, ROUND);
    award(earned);
    var extra = earned
      ? " Bu tur " + earned + " yıldız."
      : " Yıldız için bir dahaki turda biraz daha deneyebilirsin.";
    var prev = byId("geri").textContent;
    setFeedback(prev + " Tur bitti: " + round.correct + " / " + ROUND + " doğru." + extra, round.correct ? "good" : "soft");
    show("yeniden", true);
  }

  function applyOp(a, op, b) {
    if (op === "+") return a + b;
    if (op === "×") return a * b;
    if (op === "−") return a >= b ? a - b : null;
    if (op === "÷") {
      if (b === 0 || a % b !== 0) return null;
      return a / b;
    }
    return null;
  }

  function newHedef() {
    var puzzle = E.countdownPuzzle(level, Math.random);
    var uid = 1;
    hedef = {
      puzzle: puzzle,
      tiles: puzzle.numbers.map(function (n) { return { uid: uid++, value: n }; }),
      nextUid: uid,
      sel: null,
      op: null,
      history: [],
      revealed: false,
      solved: false
    };
    show("sonraki", false);
    show("yeniden", false);
    show("cevap", false);
    show("cozum", true);
    show("geri-al", true);
    show("adimlar", false);
    clearNode(byId("adimlar"));
    setFeedback("");
    renderHedef();
  }

  function renderHedef() {
    var p = hedef.puzzle;
    byId("durum").textContent = "Hedef";
    byId("soru").textContent = "Hedef: " + p.target;
    var sahne = byId("sahne");
    clearNode(sahne);
    var note = document.createElement("p");
    note.className = "caption";
    note.textContent = "Bir sayı seç, işlem seç, sonra başka bir sayı seç.";
    sahne.appendChild(note);
    var box = byId("secenekler");
    clearNode(box);
    var tiles = document.createElement("div");
    tiles.className = "tiles";
    hedef.tiles.forEach(function (tile) {
      var btn = makeButton("tile" + (hedef.sel === tile.uid ? " is-on" : ""), String(tile.value), function () {
        tapTile(tile.uid);
      });
      btn.setAttribute("aria-pressed", hedef.sel === tile.uid ? "true" : "false");
      tiles.appendChild(btn);
    });
    var ops = document.createElement("div");
    ops.className = "ops";
    ["+", "−", "×", "÷"].forEach(function (op) {
      var btn = makeButton("op" + (hedef.op === op ? " is-on" : ""), op, function () {
        if (hedef.solved) return;
        hedef.op = hedef.op === op ? null : op;
        renderHedef();
      });
      btn.setAttribute("aria-label", "işlem " + op);
      btn.setAttribute("aria-pressed", hedef.op === op ? "true" : "false");
      ops.appendChild(btn);
    });
    box.appendChild(tiles);
    box.appendChild(ops);
    byId("geri-al").disabled = !hedef.history.length;
  }

  function tapTile(uid) {
    if (!hedef || hedef.solved) return;
    if (hedef.sel == null) {
      hedef.sel = uid;
      renderHedef();
      return;
    }
    if (hedef.sel === uid) {
      hedef.sel = null;
      renderHedef();
      return;
    }
    if (!hedef.op) {
      hedef.sel = uid;
      renderHedef();
      return;
    }
    var a = null;
    var b = null;
    hedef.tiles.forEach(function (tile) {
      if (tile.uid === hedef.sel) a = tile;
      if (tile.uid === uid) b = tile;
    });
    var value = applyOp(a.value, hedef.op, b.value);
    if (value == null) {
      setFeedback("Bu işlem tam sayı vermiyor ya da sonuç eksi oluyor. Başka bir yol dene.", "soft");
      return;
    }
    hedef.history.push({
      tiles: hedef.tiles.map(function (tile) { return { uid: tile.uid, value: tile.value }; }),
      sel: null,
      op: null
    });
    var opUsed = hedef.op;
    hedef.tiles = hedef.tiles.filter(function (tile) {
      return tile.uid !== a.uid && tile.uid !== b.uid;
    });
    hedef.tiles.push({ uid: hedef.nextUid++, value: value });
    hedef.sel = null;
    hedef.op = null;
    if (hedef.tiles.length === 1 && hedef.tiles[0].value === hedef.puzzle.target) {
      hedef.solved = true;
      if (!hedef.revealed) award(3);
      setFeedback("Hedefe ulaştın. " + pick(PRAISE), "good");
      show("yeniden", true);
    } else if (hedef.tiles.length === 1) {
      setFeedback("Sonuç " + value + ". Hedef " + hedef.puzzle.target + ". Geri alıp başka bir yol deneyebilirsin.", "soft");
    } else {
      setFeedback(a.value + " " + opUsed + " " + b.value + " = " + value + ".", "good");
    }
    renderHedef();
  }

  function undoHedef() {
    if (!hedef || !hedef.history.length) return;
    var prev = hedef.history.pop();
    hedef.tiles = prev.tiles;
    hedef.sel = null;
    hedef.op = null;
    hedef.solved = false;
    show("yeniden", false);
    setFeedback("Bir adım geri aldın.", "soft");
    renderHedef();
  }

  function showSolution() {
    if (!hedef) return;
    hedef.revealed = true;
    var list = byId("adimlar");
    clearNode(list);
    hedef.puzzle.steps.forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step.text;
      list.appendChild(li);
    });
    show("adimlar", true);
    setFeedback("Bir çözüm aşağıda. Sen de kendi yolunu deneyebilirsin.", "soft");
  }

  function showDaily() {
    daily = E.dailyPuzzle(new Date(), level);
    dailyRevealed = false;
    dailyAnswered = false;
    var today = new Date();
    byId("durum").textContent = today.getDate() + " " + MONTHS[today.getMonth()] + " " + today.getFullYear();
    byId("soru").textContent = daily.prompt;
    clearNode(byId("sahne"));
    renderChoices(daily, false);
    setFeedback("");
    show("cevap", true);
    show("sonraki", false);
    show("yeniden", false);
    show("cozum", false);
    show("geri-al", false);
    show("adimlar", false);
    var list = byId("adimlar");
    clearNode(list);
  }

  function revealDaily() {
    if (!daily || dailyRevealed) return;
    dailyRevealed = true;
    var buttons = byId("secenekler").querySelectorAll("button");
    Array.prototype.forEach.call(buttons, function (node) {
      node.disabled = true;
      if (node.textContent.trim() === String(daily.answer)) node.classList.add("is-good");
    });
    var list = byId("adimlar");
    clearNode(list);
    var li = document.createElement("li");
    li.textContent = daily.explain;
    list.appendChild(li);
    show("adimlar", true);
    if (!dailyAnswered) setFeedback("Cevap: " + daily.answer + ". " + daily.explain, "soft");
  }

  function onDailyAnswer(choice, btn) {
    if (!daily || dailyAnswered || dailyRevealed) return;
    dailyAnswered = true;
    var ok = String(choice) === String(daily.answer);
    var buttons = byId("secenekler").querySelectorAll("button");
    Array.prototype.forEach.call(buttons, function (node) {
      node.disabled = true;
      if (node.textContent.trim() === String(daily.answer)) node.classList.add("is-good");
    });
    if (!ok) btn.classList.add("is-bad");
    var list = byId("adimlar");
    clearNode(list);
    var li = document.createElement("li");
    li.textContent = daily.explain;
    list.appendChild(li);
    show("adimlar", true);
    if (ok) {
      var key = E.dayKey(new Date());
      if (state.gunun.solved.indexOf(key) < 0) state.gunun.solved.push(key);
      state.gunun.stars = Math.min(3, state.gunun.solved.length);
      save();
      paintStars();
      setFeedback(pick(PRAISE) + " " + daily.explain, "good");
    } else {
      setFeedback(pick(GENTLE) + " Doğru cevap: " + daily.answer + ". " + daily.explain, "soft");
    }
  }

  function start() {
    paintLevel();
    paintStars();
    if (game === "hedef") newHedef();
    else if (game === "gunun") showDaily();
    else startRound();
  }

  document.querySelectorAll("[data-level]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      level = btn.getAttribute("data-level");
      state.levels[game] = level;
      save();
      start();
    });
  });

  var sonraki = byId("sonraki");
  if (sonraki) {
    sonraki.addEventListener("click", function () {
      if (!round) return;
      round.index += 1;
      showQuestion();
    });
  }
  var yeniden = byId("yeniden");
  if (yeniden) yeniden.addEventListener("click", start);
  var cozum = byId("cozum");
  if (cozum) cozum.addEventListener("click", showSolution);
  var cevap = byId("cevap");
  if (cevap) cevap.addEventListener("click", revealDaily);
  var geriAl = byId("geri-al");
  if (geriAl) geriAl.addEventListener("click", undoHedef);

  if (E && game) start();
})();

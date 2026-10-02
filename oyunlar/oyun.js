/* Oyunlar burada çalışır. Skorlar tarayıcının kendi hafızasında durur, sunucuya gitmez.
   Doğru ve yanlış cümlelerini değiştirmek istersen alttaki iki listeye bak. */
(function () {
  "use strict";

  var M = window.Carpim;
  var KEY = "kubra-carpim-v1";
  var PAIRS = 6;
  var DOGRU = ["Aferin!", "Çok güzel!", "Bildin!", "Harika, devam."];
  var YANLIS = [
    "Sorun değil, birlikte bakalım.",
    "Bu sefer değil. Doğru cevabı görelim.",
    "Olur böyle. İpucuna bak."
  ];

  var state = emptyState();
  var storageOk = true;
  var round = null;
  var timerId = null;
  var mem = null;
  var resetArmed = false;
  var resetTimer = null;

  function emptyState() {
    return {
      table: { seen: [], stars: 0 },
      quiz: { played: false, bestCorrect: 0, bestTotal: 0, bestStreak: 0, stars: 0 },
      memory: { played: false, bestMoves: null, stars: 0 }
    };
  }

  function setText(id, text) {
    var node = document.getElementById(id);
    if (node) node.textContent = text;
  }

  function showStorageNote() {
    var note = document.getElementById("storage-note");
    if (note) note.hidden = false;
  }

  function loadState() {
    var base = emptyState();
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var data = JSON.parse(raw);
      if (data && data.table && Array.isArray(data.table.seen)) {
        base.table.seen = data.table.seen.filter(function (item) {
          return typeof item === "string" && /^\d+x\d+$/.test(item);
        });
        base.table.stars = M.starsTable(base.table.seen.length);
      }
      if (data && data.quiz && data.quiz.played) {
        base.quiz.played = true;
        base.quiz.bestCorrect = Number(data.quiz.bestCorrect) || 0;
        base.quiz.bestTotal = Number(data.quiz.bestTotal) || 0;
        base.quiz.bestStreak = Number(data.quiz.bestStreak) || 0;
        base.quiz.stars = M.starsQuiz(base.quiz.bestCorrect, base.quiz.bestTotal);
      }
      if (data && data.memory && data.memory.played && data.memory.bestMoves != null) {
        base.memory.played = true;
        base.memory.bestMoves = Number(data.memory.bestMoves);
        base.memory.stars = M.starsMemory(base.memory.bestMoves, PAIRS);
      }
      return base;
    } catch (err) {
      storageOk = false;
      return base;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      storageOk = false;
      showStorageNote();
    }
  }

  function renderProgress() {
    var seen = state.table.seen.length;
    if (!seen) {
      setText("score-table", "Henüz yok");
    } else if (state.table.stars) {
      setText("score-table", seen + " / 100 kare · " + state.table.stars + " yıldız");
    } else {
      setText("score-table", seen + " / 100 kare");
    }

    if (!state.quiz.played) {
      setText("score-quiz", "Henüz yok");
    } else {
      setText(
        "score-quiz",
        "En iyi " + state.quiz.bestCorrect + "/" + state.quiz.bestTotal +
          " · en uzun seri " + state.quiz.bestStreak +
          " · " + state.quiz.stars + " yıldız"
      );
    }

    if (!state.memory.played) {
      setText("score-memory", "Henüz yok");
    } else {
      setText(
        "score-memory",
        "En az " + state.memory.bestMoves + " hamle · " + state.memory.stars + " yıldız"
      );
    }
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function drawDots(rows, cols) {
    var box = document.getElementById("viz-dots");
    clearNode(box);
    box.style.setProperty("--cols", String(cols));
    var total = rows * cols;
    var i;
    for (i = 0; i < total; i += 1) {
      var dot = document.createElement("span");
      dot.className = "dot";
      box.appendChild(dot);
    }
  }

  function selectCell(r, c, focus, record) {
    var buttons = document.querySelectorAll(".m-table button");
    Array.prototype.forEach.call(buttons, function (btn) {
      var br = Number(btn.dataset.r);
      var bc = Number(btn.dataset.c);
      var on = br === r && bc === c;
      var line = br === r || bc === c;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.closest("td").classList.toggle("is-selected", on);
      btn.closest("td").classList.toggle("is-line", line && !on);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.m-table th[data-r]'), function (th) {
      th.classList.toggle("is-line", Number(th.dataset.r) === r);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.m-table th[data-c]'), function (th) {
      th.classList.toggle("is-line", Number(th.dataset.c) === c);
    });

    var product = r * c;
    setText("viz-eq", r + " × " + c + " = " + product);
    setText("viz-area", M.areaSentence(r, c));
    setText("viz-hint", "İpucu: " + M.hint(r, c));
    drawDots(r, c);

    if (record) {
      var key = r + "x" + c;
      if (state.table.seen.indexOf(key) === -1) {
        state.table.seen.push(key);
        state.table.stars = M.starsTable(state.table.seen.length);
        saveState();
        renderProgress();
      }
      setText(
        "table-live",
        r + " çarpı " + c + " eşittir " + product + ". " + M.areaSentence(r, c)
      );
    }

    if (focus) {
      var target = document.querySelector('.m-table button[data-r="' + r + '"][data-c="' + c + '"]');
      if (target) target.focus();
    }
  }

  function buildTable() {
    var host = document.getElementById("table-host");
    var table = document.createElement("table");
    table.className = "m-table";
    var caption = document.createElement("caption");
    caption.className = "sr-only";
    caption.textContent = "1'den 10'a çarpım tablosu. Bir kare seçince çarpım noktalarla gösterilir.";
    table.appendChild(caption);

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    var corner = document.createElement("th");
    corner.scope = "col";
    corner.textContent = "×";
    corner.setAttribute("aria-label", "çarpım");
    headRow.appendChild(corner);
    var c;
    for (c = 1; c <= 10; c += 1) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = String(c);
      th.dataset.c = String(c);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    var r;
    for (r = 1; r <= 10; r += 1) {
      var tr = document.createElement("tr");
      var rh = document.createElement("th");
      rh.scope = "row";
      rh.textContent = String(r);
      rh.dataset.r = String(r);
      tr.appendChild(rh);
      for (c = 1; c <= 10; c += 1) {
        var td = document.createElement("td");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        btn.textContent = String(r * c);
        btn.setAttribute("aria-label", r + " çarpı " + c + " eşittir " + (r * c));
        btn.setAttribute("aria-pressed", "false");
        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    host.appendChild(table);

    table.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-r]");
      if (!btn) return;
      selectCell(Number(btn.dataset.r), Number(btn.dataset.c), false, true);
    });

    table.addEventListener("keydown", function (event) {
      var btn = event.target.closest("button[data-r]");
      if (!btn) return;
      var row = Number(btn.dataset.r);
      var col = Number(btn.dataset.c);
      var nextRow = row;
      var nextCol = col;
      if (event.key === "ArrowRight") nextCol = Math.min(10, col + 1);
      else if (event.key === "ArrowLeft") nextCol = Math.max(1, col - 1);
      else if (event.key === "ArrowDown") nextRow = Math.min(10, row + 1);
      else if (event.key === "ArrowUp") nextRow = Math.max(1, row - 1);
      else if (event.key === "Home") nextCol = 1;
      else if (event.key === "End") nextCol = 10;
      else return;
      event.preventDefault();
      selectCell(nextRow, nextCol, true, true);
    });
  }

  function selectedFactors() {
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll("#factor-grid button"), function (btn) {
      if (btn.getAttribute("aria-pressed") === "true") list.push(Number(btn.dataset.n));
    });
    return list;
  }

  function updateFactorCount() {
    setText("factor-count", "Seçili: " + selectedFactors().length + " çarpım");
  }

  function setFactor(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      btn.dataset.n + " çarpım tablosu, " + (on ? "seçili" : "seçili değil")
    );
  }

  function buildFactors() {
    var grid = document.getElementById("factor-grid");
    var n;
    for (n = 1; n <= 10; n += 1) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "factor";
      btn.textContent = String(n);
      btn.dataset.n = String(n);
      setFactor(btn, true);
      btn.addEventListener("click", function () {
        var on = this.getAttribute("aria-pressed") !== "true";
        setFactor(this, on);
        updateFactorCount();
      });
      grid.appendChild(btn);
    }
    document.getElementById("factors-all").addEventListener("click", function () {
      Array.prototype.forEach.call(grid.querySelectorAll("button"), function (btn) {
        setFactor(btn, true);
      });
      updateFactorCount();
    });
    updateFactorCount();
  }

  function syncChips() {
    Array.prototype.forEach.call(document.querySelectorAll(".pick label"), function (label) {
      var input = label.querySelector("input");
      label.classList.toggle("is-on", !!(input && input.checked));
    });
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    var timeEl = document.getElementById("quiz-time");
    if (timeEl) timeEl.hidden = true;
  }

  function startTimer(seconds) {
    stopTimer();
    round.remaining = seconds;
    var timeEl = document.getElementById("quiz-time");
    timeEl.hidden = false;
    timeEl.classList.remove("is-low");
    timeEl.textContent = "Kalan: " + seconds + " sn";
    timerId = setInterval(function () {
      if (!round || round.finished) {
        stopTimer();
        return;
      }
      round.remaining -= 1;
      var left = Math.max(0, round.remaining);
      timeEl.textContent = "Kalan: " + left + " sn";
      timeEl.classList.toggle("is-low", left <= 10);
      if (round.remaining <= 0) {
        stopTimer();
        finishQuiz(true);
      }
    }, 1000);
  }

  function readSetup() {
    return {
      total: Number(document.querySelector('input[name="adet"]:checked').value),
      mode: document.querySelector('input[name="mod"]:checked').value,
      seconds: Number(document.querySelector('input[name="sure"]:checked').value)
    };
  }

  function startQuiz() {
    var tables = selectedFactors();
    var err = document.getElementById("setup-error");
    if (!tables.length) {
      err.hidden = false;
      err.textContent = "En az bir çarpım seç.";
      return;
    }
    err.hidden = true;
    var setup = readSetup();
    var questions = [];
    var prev = "";
    var i;
    for (i = 0; i < setup.total; i += 1) {
      var q = M.nextQuestion(tables, Math.random, prev);
      prev = q.key;
      questions.push(q);
    }
    round = {
      questions: questions,
      index: 0,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      answered: 0,
      mode: setup.mode,
      seconds: setup.seconds,
      remaining: setup.seconds,
      locked: false,
      finished: false
    };
    document.getElementById("quiz-setup").hidden = true;
    document.getElementById("quiz-result").hidden = true;
    document.getElementById("quiz-play").hidden = false;
    showQuestion();
    if (setup.seconds > 0) startTimer(setup.seconds);
    else stopTimer();
  }

  function showQuestion() {
    var q = round.questions[round.index];
    round.locked = false;
    setText("quiz-progress", "Soru " + (round.index + 1) + " / " + round.questions.length);
    setText("quiz-score", "Doğru: " + round.correct + " · Seri: " + round.streak);
    setText("quiz-question", q.a + " × " + q.b + " = ?");
    var fb = document.getElementById("quiz-feedback");
    clearNode(fb);
    document.getElementById("quiz-next").hidden = true;

    var choices = document.getElementById("quiz-choices");
    var typeBox = document.getElementById("quiz-type");
    if (round.mode === "choice") {
      typeBox.hidden = true;
      choices.hidden = false;
      renderChoices(q);
    } else {
      choices.hidden = true;
      clearNode(choices);
      typeBox.hidden = false;
      var input = document.getElementById("quiz-input");
      input.value = "";
      input.readOnly = false;
      setKeypadDisabled(false);
      input.focus();
    }
  }

  function renderChoices(q) {
    var box = document.getElementById("quiz-choices");
    clearNode(box);
    var options = M.shuffle([q.a * q.b].concat(M.distractors(q.a, q.b, Math.random)), Math.random);
    options.forEach(function (n) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      var num = document.createElement("span");
      num.className = "choice-n";
      num.textContent = String(n);
      var tag = document.createElement("span");
      tag.className = "choice-tag";
      btn.appendChild(num);
      btn.appendChild(tag);
      btn.addEventListener("click", function () {
        grade(n);
      });
      box.appendChild(btn);
    });
  }

  function setKeypadDisabled(off) {
    Array.prototype.forEach.call(document.querySelectorAll("#quiz-keypad button"), function (btn) {
      btn.setAttribute("aria-disabled", off ? "true" : "false");
    });
  }

  function grade(value) {
    if (!round || round.locked || round.finished) return;
    var q = round.questions[round.index];
    var correct = q.a * q.b;
    round.locked = true;
    round.answered += 1;
    var right = value === correct;
    if (right) {
      round.correct += 1;
      round.streak += 1;
      if (round.streak > round.bestStreak) round.bestStreak = round.streak;
    } else {
      round.streak = 0;
    }
    setText("quiz-score", "Doğru: " + round.correct + " · Seri: " + round.streak);

    if (round.mode === "choice") {
      Array.prototype.forEach.call(document.querySelectorAll("#quiz-choices button"), function (btn) {
        var n = Number(btn.querySelector(".choice-n").textContent);
        btn.setAttribute("aria-disabled", "true");
        if (n === correct) {
          btn.classList.add("is-right");
          btn.querySelector(".choice-tag").textContent = "doğru";
        } else if (n === value) {
          btn.classList.add("is-wrong");
          btn.querySelector(".choice-tag").textContent = "bu değil";
        }
      });
    } else {
      document.getElementById("quiz-input").readOnly = true;
      setKeypadDisabled(true);
    }

    var praise = right ? DOGRU[round.index % DOGRU.length] : YANLIS[round.index % YANLIS.length];
    var fb = document.getElementById("quiz-feedback");
    clearNode(fb);
    var title = document.createElement("p");
    title.className = right ? "fb-title is-good" : "fb-title is-soft";
    title.textContent = praise;
    var eq = document.createElement("p");
    eq.className = "big-eq";
    eq.textContent = q.a + " × " + q.b + " = " + correct;
    var tip = document.createElement("p");
    tip.className = "ipucu";
    tip.textContent = (right ? "Bunu şöyle de düşünebilirsin: " : "İpucu: ") + M.hint(q.a, q.b);
    fb.appendChild(title);
    fb.appendChild(eq);
    fb.appendChild(tip);

    var next = document.getElementById("quiz-next");
    var last = round.index >= round.questions.length - 1;
    next.hidden = false;
    next.textContent = last ? "Sonucu gör" : "Sonraki";
  }

  function finishQuiz(timedOut) {
    if (!round || round.finished) return;
    round.finished = true;
    stopTimer();
    var total = round.questions.length;
    var stars = M.starsQuiz(round.correct, total);
    if (round.answered > 0) {
      var better = M.isBetterQuiz(
        { correct: round.correct, total: total, streak: round.bestStreak },
        state.quiz
      );
      if (better) {
        state.quiz.played = true;
        state.quiz.bestCorrect = round.correct;
        state.quiz.bestTotal = total;
        state.quiz.stars = stars;
      }
      if (round.bestStreak > state.quiz.bestStreak) {
        state.quiz.bestStreak = round.bestStreak;
        state.quiz.played = true;
      }
      if (!state.quiz.played) state.quiz.played = true;
      saveState();
      renderProgress();
    }

    document.getElementById("quiz-play").hidden = true;
    document.getElementById("quiz-result").hidden = false;
    var title = document.getElementById("quiz-result-title");
    title.textContent = timedOut ? "Süre doldu" : "Tur bitti";
    var lines = [];
    if (timedOut && round.answered === 0) {
      lines.push("Bu turda soru cevaplamadın. Acele etmek zorunda değilsin. İstersen süresiz bir tur aç.");
    } else if (timedOut) {
      lines.push(round.correct + " / " + total + " doğru. Süre doldu; yetişmeyen sorular yanlış sayılmaz, skor turdaki bütün sorulara göredir.");
      lines.push("Acele etmek zorunda değilsin. İstersen süresiz oyna.");
    } else {
      lines.push(round.correct + " / " + total + " doğru.");
    }
    if (round.answered > 0) {
      lines.push("Bu turdaki en uzun seri: " + round.bestStreak + ".");
      lines.push("Yıldız: " + M.formatStars(stars) + " (" + stars + " yıldız).");
    }
    if (state.quiz.played) {
      lines.push(
        "En iyi skorun: " + state.quiz.bestCorrect + "/" + state.quiz.bestTotal +
          ". En uzun serin: " + state.quiz.bestStreak + "."
      );
    }
    setText("quiz-result-body", lines.join(" "));
    title.focus();
  }

  function quitQuiz() {
    stopTimer();
    round = null;
    document.getElementById("quiz-play").hidden = true;
    document.getElementById("quiz-result").hidden = true;
    document.getElementById("quiz-setup").hidden = false;
  }

  function submitTyped() {
    if (!round || round.locked || round.finished) return;
    var raw = document.getElementById("quiz-input").value.trim();
    var fb = document.getElementById("quiz-feedback");
    if (!/^\d{1,3}$/.test(raw)) {
      clearNode(fb);
      fb.textContent = "Bir sayı yaz. Örneğin 42.";
      return;
    }
    grade(Number(raw));
  }

  function onKey(k) {
    if (!round || round.locked || round.finished || round.mode !== "type") return;
    var input = document.getElementById("quiz-input");
    if (input.readOnly) return;
    if (k === "sil") {
      input.value = input.value.slice(0, -1);
      return;
    }
    if (k === "tamam") {
      submitTyped();
      return;
    }
    if (input.value.length >= 3) return;
    if (!/^\d$/.test(k)) return;
    input.value += k;
  }

  function buildKeypad() {
    var pad = document.getElementById("quiz-keypad");
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "sil", "0", "tamam"];
    keys.forEach(function (k) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.textContent = k;
      if (k === "sil") btn.setAttribute("aria-label", "Son rakamı sil");
      if (k === "tamam") btn.setAttribute("aria-label", "Cevabı onayla");
      btn.addEventListener("click", function () {
        onKey(k);
      });
      pad.appendChild(btn);
    });
    document.getElementById("quiz-input").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitTyped();
      }
    });
  }

  function buttonAt(index) {
    return document.querySelector('#memory-board button[data-index="' + index + '"]');
  }

  function paintCard(btn, card) {
    var up = !!(card.up || card.matched);
    btn.classList.toggle("is-up", up);
    btn.classList.toggle("is-matched", !!card.matched);
    btn.querySelector(".kind").textContent = up ? card.kind : "";
    btn.querySelector(".value").textContent = up ? card.label : "";
    if (card.matched) btn.setAttribute("aria-label", "Eşleşti: " + card.spoken);
    else if (up) btn.setAttribute("aria-label", card.spoken);
    else btn.setAttribute("aria-label", "Kapalı kart");
  }

  function updateMemoryStatus() {
    setText("memory-moves", "Hamle: " + mem.moves);
    setText("memory-left", "Kalan çift: " + (PAIRS - mem.matched));
  }

  function renderMemory() {
    var board = document.getElementById("memory-board");
    clearNode(board);
    mem.cards.forEach(function (card, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.dataset.index = String(index);
      var kind = document.createElement("span");
      kind.className = "kind";
      var value = document.createElement("span");
      value.className = "value";
      btn.appendChild(kind);
      btn.appendChild(value);
      paintCard(btn, card);
      btn.addEventListener("click", function () {
        flipCard(index);
      });
      board.appendChild(btn);
    });
  }

  function dealMemory() {
    if (mem && mem.timer) clearTimeout(mem.timer);
    var pairs = M.makePairs(PAIRS, Math.random);
    var cards = [];
    pairs.forEach(function (pair, i) {
      cards.push({
        pairId: i,
        kind: "çarpım",
        label: pair.a + " × " + pair.b,
        spoken: pair.a + " çarpı " + pair.b,
        up: false,
        matched: false
      });
      cards.push({
        pairId: i,
        kind: "sonuç",
        label: String(pair.p),
        spoken: String(pair.p),
        up: false,
        matched: false
      });
    });
    mem = {
      cards: M.shuffle(cards, Math.random),
      lock: false,
      first: null,
      moves: 0,
      matched: 0,
      timer: null
    };
    var win = document.getElementById("memory-win");
    win.hidden = true;
    clearNode(win);
    setText("memory-live", "");
    renderMemory();
    updateMemoryStatus();
  }

  function winMemory() {
    var stars = M.starsMemory(mem.moves, PAIRS);
    if (!state.memory.played || mem.moves < state.memory.bestMoves) {
      state.memory.played = true;
      state.memory.bestMoves = mem.moves;
      state.memory.stars = stars;
      saveState();
      renderProgress();
    }
    var win = document.getElementById("memory-win");
    win.hidden = false;
    win.textContent = "Hepsini eşleştirdin. " + mem.moves + " hamle. " + stars + " yıldız " + M.formatStars(stars) + ".";
    setText("memory-live", win.textContent);
  }

  function flipCard(index) {
    if (!mem || mem.lock) return;
    var card = mem.cards[index];
    if (!card || card.matched || card.up) return;
    card.up = true;
    paintCard(buttonAt(index), card);
    if (mem.first == null) {
      mem.first = index;
      return;
    }
    mem.moves += 1;
    updateMemoryStatus();
    var firstIndex = mem.first;
    var other = mem.cards[firstIndex];
    mem.first = null;
    if (other.pairId === card.pairId) {
      other.matched = true;
      card.matched = true;
      other.up = true;
      card.up = true;
      paintCard(buttonAt(firstIndex), other);
      paintCard(buttonAt(index), card);
      mem.matched += 1;
      setText("memory-live", "Eşleşti. " + other.spoken + " ve " + card.spoken + ".");
      updateMemoryStatus();
      if (mem.matched === PAIRS) winMemory();
    } else {
      mem.lock = true;
      setText("memory-live", "Bu ikisi eş değil.");
      var wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1400 : 900;
      mem.timer = setTimeout(function () {
        other.up = false;
        card.up = false;
        paintCard(buttonAt(firstIndex), other);
        paintCard(buttonAt(index), card);
        mem.lock = false;
      }, wait);
    }
  }

  function wireReset() {
    var btn = document.getElementById("reset-progress");
    btn.addEventListener("click", function () {
      if (!resetArmed) {
        resetArmed = true;
        btn.textContent = "Emin misin? Sil";
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
          resetArmed = false;
          btn.textContent = "İlerlemeyi sil";
        }, 4000);
        return;
      }
      clearTimeout(resetTimer);
      resetArmed = false;
      btn.textContent = "İlerlemeyi sil";
      state = emptyState();
      saveState();
      renderProgress();
    });
  }

  function init() {
    if (!M) return;
    try {
      localStorage.setItem("__kubra_test", "1");
      localStorage.removeItem("__kubra_test");
    } catch (err) {
      storageOk = false;
      showStorageNote();
    }
    state = loadState();
    renderProgress();
    buildTable();
    selectCell(3, 4, false, false);
    buildFactors();
    buildKeypad();
    syncChips();
    Array.prototype.forEach.call(document.querySelectorAll(".pick input"), function (input) {
      input.addEventListener("change", syncChips);
    });
    document.getElementById("quiz-start").addEventListener("click", startQuiz);
    document.getElementById("quiz-next").addEventListener("click", function () {
      if (!round || round.finished) return;
      if (round.index >= round.questions.length - 1) finishQuiz(false);
      else {
        round.index += 1;
        showQuestion();
      }
    });
    document.getElementById("quiz-quit").addEventListener("click", quitQuiz);
    document.getElementById("quiz-again").addEventListener("click", function () {
      document.getElementById("quiz-result").hidden = true;
      document.getElementById("quiz-setup").hidden = false;
      round = null;
    });
    dealMemory();
    document.getElementById("memory-new").addEventListener("click", dealMemory);
    wireReset();
  }

  init();
})();

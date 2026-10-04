/* Hub yıldızları. Çarpım skorları eski anahtardan, diğerleri ortak anahtardan okunur. */
(function () {
  "use strict";

  var MAT = "pisagokce-mat-v1";
  var CARPIM = "kubra-carpim-v1";

  function carpimStars() {
    try {
      var data = JSON.parse(localStorage.getItem(CARPIM) || "null");
      if (!data) return 0;
      var table = data.table && typeof data.table.stars === "number" ? data.table.stars : 0;
      var quiz = data.quiz && typeof data.quiz.stars === "number" ? data.quiz.stars : 0;
      var memory = data.memory && typeof data.memory.stars === "number" ? data.memory.stars : 0;
      return table + quiz + memory;
    } catch (err) {
      return 0;
    }
  }

  function matStars(id) {
    try {
      var data = JSON.parse(localStorage.getItem(MAT) || "null");
      if (!data || !data[id] || typeof data[id].stars !== "number") return 0;
      return data[id].stars;
    } catch (err) {
      return 0;
    }
  }

  function line(n, cap) {
    n = n || 0;
    if (!n) return "Henüz yıldız yok";
    if (!cap) return n + " yıldız";
    n = Math.max(0, Math.min(cap, n));
    var marks = "";
    var i;
    for (i = 0; i < cap; i++) marks += i < n ? "★" : "☆";
    return marks + "  " + n + " yıldız";
  }

  document.querySelectorAll(".hub-stars").forEach(function (node) {
    var id = node.getAttribute("data-game");
    if (id === "carpim") node.textContent = line(carpimStars(), 0);
    else node.textContent = line(matStars(id), 3);
  });
})();

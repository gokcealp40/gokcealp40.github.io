/* Yazı boyu yalnız bu tarayıcıda hatırlanır. */
(function () {
  var KEY = "pisagokce-yazi";
  var root = document.documentElement;
  var btn = document.getElementById("yazi-boyu");
  if (!btn) return;

  function apply(big) {
    root.classList.toggle("buyuk-yazi", big);
    btn.setAttribute("aria-pressed", big ? "true" : "false");
    btn.textContent = big ? "Yazıyı küçült" : "Yazıyı büyüt";
  }

  var big = false;
  try {
    big = localStorage.getItem(KEY) === "buyuk";
  } catch (err) {
    big = false;
  }
  apply(big);

  btn.addEventListener("click", function () {
    big = !root.classList.contains("buyuk-yazi");
    apply(big);
    try {
      localStorage.setItem(KEY, big ? "buyuk" : "normal");
    } catch (err) {
      /* Boyut bu sayfada yine de değişir. */
    }
  });
})();

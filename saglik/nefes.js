/* Kısa nefes çalışması. Dört saniye al, dört saniye ver. */
(function () {
  var daire = document.getElementById("nefes-daire");
  var yazi = document.getElementById("nefes-yazi");
  var btn = document.getElementById("nefes-basla");
  if (!daire || !yazi || !btn) return;

  var timer = null;
  var running = false;
  var al = true;

  function goster() {
    yazi.textContent = al ? "Nefes al." : "Nefes ver.";
  }

  function durdur() {
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
    daire.classList.remove("calisiyor");
    btn.textContent = "Nefese başla";
    btn.setAttribute("aria-pressed", "false");
    yazi.textContent = "Durdu. İstediğin zaman yeniden başlayabilirsin.";
  }

  btn.addEventListener("click", function () {
    if (running) {
      durdur();
      return;
    }
    running = true;
    al = true;
    goster();
    daire.classList.add("calisiyor");
    btn.textContent = "Durdur";
    btn.setAttribute("aria-pressed", "true");
    timer = setInterval(function () {
      al = !al;
      goster();
    }, 4000);
  });
})();

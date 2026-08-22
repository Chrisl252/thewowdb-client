/* Reckful Stormwind pin — copy /way and announce the live pin. */
(function () {
  "use strict";

  var PLACE = {
    name: "Reckful",
    zone: "Stormwind City",
    subzone: "Cathedral of Light",
    x: 51.6,
    y: 44.4,
    uiMapId: 84,
    zoneId: 1519,
    npcId: 173819,
    way: "/way Stormwind City 51.6 44.4 Reckful",
  };

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  function flash(btn, label) {
    var old = btn.getAttribute("data-label") || btn.textContent;
    btn.setAttribute("data-label", old);
    btn.textContent = label;
    btn.classList.add("is-ok");
    setTimeout(function () {
      btn.textContent = old;
      btn.classList.remove("is-ok");
    }, 1500);
  }

  function writeClipboard(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone, function () {
        fallbackCopy(text);
        onDone();
      });
    } else {
      fallbackCopy(text);
      onDone();
    }
  }

  function copyText(text, btn, okLabel) {
    writeClipboard(text, function () { flash(btn, okLabel); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var pin = document.querySelector("[data-rk-pin]");
    if (pin) {
      pin.style.setProperty("--rk-x", PLACE.x + "%");
      pin.style.setProperty("--rk-y", PLACE.y + "%");
    }

    document.querySelectorAll("[data-rk-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-rk-copy") || PLACE.way;
        copyText(text, btn, "Copied");
      });
    });

    var pinBtn = document.getElementById("rk-pin");
    var live = document.getElementById("rk-pin-live");
    if (pinBtn) {
      pinBtn.addEventListener("click", function () {
        if (live) {
          live.textContent = PLACE.subzone + " — " + PLACE.x.toFixed(1) + ", " + PLACE.y.toFixed(1);
        }
        writeClipboard(PLACE.way, function () {
          var label = pinBtn.querySelector(".rk-pin__label");
          if (!label) return;
          var prev = label.textContent;
          label.textContent = "Copied /way";
          setTimeout(function () { label.textContent = prev; }, 1500);
        });
      });
    }
  });
})();

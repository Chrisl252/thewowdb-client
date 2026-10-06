(function () {
  "use strict";

  document.querySelectorAll(".ah-cat-row[data-has-children='1']").forEach((row) => {
    row.addEventListener("click", () => {
      const caret = row.querySelector(".ah-cat-caret");
      const open = row.classList.toggle("is-open");
      if (caret) caret.textContent = open ? "▾" : "▸";
    });
  });

  document.querySelectorAll(".js-fav").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const on = btn.classList.toggle("is-tracked");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      const name = (btn.getAttribute("aria-label") || "").replace(/^(Stop tracking|Track)\s+/i, "");
      const label = (on ? "Stop tracking " : "Track ") + name;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  });
})();

const payload = await fetch("/assets/comments/item-227774.json").then((r) => r.json());

const root = document.getElementById("related");
window.WGFComments.mount(root, payload);

const countEl = document.querySelector("[data-comment-count]");
if (countEl) countEl.textContent = "(" + (payload.comments || []).length + ")";

root.querySelectorAll("[data-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.getAttribute("data-tab");
    root.querySelectorAll("[data-tab]").forEach((btn) => {
      const on = btn === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    root.querySelectorAll("[data-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-panel") === name;
      panel.classList.toggle("is-hidden", !on);
      panel.hidden = !on;
    });
  });
});

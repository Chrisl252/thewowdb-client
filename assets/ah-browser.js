const searchInput = document.getElementById("ahSearch");
const cheapestLink = document.getElementById("ahCheapestRealm");
const searchForm = document.getElementById("ahSearchForm");
const rows = [...document.querySelectorAll("[data-ah-row]")];
const empty = document.getElementById("ahEmpty");
const catButtons = [...document.querySelectorAll("[data-ah-cat]")];

function cheapestHref(query) {
  const q = query.trim();
  return q ? `/cheapest-realm/?q=${encodeURIComponent(q)}` : "/cheapest-realm/";
}

function syncCheapestLink() {
  if (!cheapestLink || !searchInput) return;
  cheapestLink.href = cheapestHref(searchInput.value);
}

function applyFilters() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const activeCat = catButtons.find((btn) => btn.classList.contains("is-active"))?.dataset.ahCat || "all";
  let shown = 0;

  for (const row of rows) {
    const name = (row.dataset.name || "").toLowerCase();
    const cat = row.dataset.cat || "";
    const matchQ = !q || name.includes(q);
    const matchCat = activeCat === "all" || cat === activeCat;
    const visible = matchQ && matchCat;
    row.hidden = !visible;
    if (visible) shown += 1;
  }

  if (empty) empty.hidden = shown > 0;
  syncCheapestLink();
}

searchInput?.addEventListener("input", applyFilters);
searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

catButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    catButtons.forEach((other) => {
      other.classList.toggle("is-active", other === btn);
      other.setAttribute("aria-current", other === btn ? "true" : "false");
    });
    applyFilters();
  });
});

syncCheapestLink();

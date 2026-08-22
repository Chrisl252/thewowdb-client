const CATALOG = [
  {
    name: "Peacebloom",
    type: "Herb · commodity",
    listings: [
      { realm: "Mal'Ganis", price: "1g 02s", stock: 21400 },
      { realm: "Area 52", price: "1g 24s", stock: 18420 },
      { realm: "Stormrage", price: "1g 31s", stock: 9800 },
      { realm: "Illidan", price: "1g 44s", stock: 7200 },
      { realm: "Proudmoore", price: "1g 58s", stock: 4100 },
    ],
  },
  {
    name: "Silverleaf",
    type: "Herb · commodity",
    listings: [
      { realm: "Tichondrius", price: "88s 10c", stock: 16300 },
      { realm: "Area 52", price: "96s 40c", stock: 12110 },
      { realm: "Stormrage", price: "1g 05s", stock: 6400 },
    ],
  },
  {
    name: "Lightweave Cloth",
    type: "Cloth · commodity",
    listings: [
      { realm: "Sargeras", price: "3g 80s", stock: 9100 },
      { realm: "Area 52", price: "4g 10s", stock: 6804 },
      { realm: "Proudmoore", price: "4g 55s", stock: 2200 },
    ],
  },
  {
    name: "Flask of Alchemical Chaos",
    type: "Flask · commodity",
    listings: [
      { realm: "Thrall", price: "298g 00s", stock: 410 },
      { realm: "Area 52", price: "312g 50s", stock: 240 },
      { realm: "Illidan", price: "331g 20s", stock: 88 },
    ],
  },
  {
    name: "Pummel Permit",
    type: "Crafting reagent · realm-priced",
    listings: [
      { realm: "Hyjal", price: "76,400g", stock: 3 },
      { realm: "Area 52", price: "84,200g", stock: 7 },
      { realm: "Stormrage", price: "91,000g", stock: 2 },
    ],
  },
];

const input = document.getElementById("crSearch");
const suggest = document.getElementById("crSuggest");
const selected = document.getElementById("crSelected");
const list = document.getElementById("crList");
const prompt = document.getElementById("crPrompt");
const empty = document.getElementById("crEmpty");

function findItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG;
  return CATALOG.filter((item) => item.name.toLowerCase().includes(q));
}

function renderSuggest(items, query) {
  if (!suggest) return;
  const q = query.trim();
  if (!q) {
    suggest.hidden = true;
    suggest.innerHTML = "";
    return;
  }
  suggest.innerHTML = items
    .map((item, index) => `<li data-name="${item.name}" class="${index === 0 ? "is-active" : ""}"><span class="nm">${item.name}</span><span class="sub">${item.type}</span></li>`)
    .join("");
  suggest.hidden = items.length === 0;
}

function renderItem(item) {
  if (!item) {
    if (selected) selected.hidden = true;
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    if (prompt) prompt.hidden = false;
    if (empty) empty.hidden = true;
    return;
  }

  if (prompt) prompt.hidden = true;
  if (empty) empty.hidden = item.listings.length > 0;
  if (selected) {
    selected.hidden = false;
    selected.innerHTML = `<div><div class="nm">${item.name}</div><div class="tags">${item.type} · cheapest US realm first</div></div>`;
  }
  if (list) {
    list.hidden = item.listings.length === 0;
    list.innerHTML = item.listings
      .map((row, index) => {
        const top = index === 0;
        return `<article class="row${top ? " row--top" : ""}">
          <span class="rank">${index + 1}</span>
          <span class="realm">${row.realm}</span>
          ${top ? `<span class="crown">Cheapest</span>` : ""}
          <span class="grow"></span>
          <span class="price">${row.price}</span>
          <span class="stock">${row.stock.toLocaleString()} listed</span>
        </article>`;
      })
      .join("");
  }
  if (input && input.value !== item.name) input.value = item.name;
  suggest.hidden = true;
}

function pickFromQuery() {
  const q = new URLSearchParams(location.search).get("q") || "";
  if (input && q) input.value = q;
  const matches = findItems(q);
  if (q && matches.length === 1) renderItem(matches[0]);
  else if (q && matches.length > 1) {
    renderItem(null);
    renderSuggest(matches, q);
    if (prompt) prompt.hidden = true;
  } else if (q) {
    renderItem(null);
    if (prompt) prompt.hidden = true;
    if (empty) empty.hidden = false;
  } else {
    renderItem(null);
  }
}

input?.addEventListener("input", () => {
  const matches = findItems(input.value);
  renderSuggest(matches, input.value);
  if (!input.value.trim()) {
    renderItem(null);
    history.replaceState(null, "", "/cheapest-realm/");
  }
});

suggest?.addEventListener("click", (event) => {
  const li = event.target.closest("[data-name]");
  if (!li) return;
  const item = CATALOG.find((entry) => entry.name === li.dataset.name);
  if (!item) return;
  history.replaceState(null, "", `/cheapest-realm/?q=${encodeURIComponent(item.name)}`);
  renderItem(item);
});

document.getElementById("crSearchForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const matches = findItems(input?.value || "");
  const item = matches[0];
  if (item) {
    history.replaceState(null, "", `/cheapest-realm/?q=${encodeURIComponent(item.name)}`);
    renderItem(item);
  } else {
    renderItem(null);
    if (empty) empty.hidden = false;
    if (prompt) prompt.hidden = true;
  }
});

pickFromQuery();

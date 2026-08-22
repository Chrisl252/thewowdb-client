// assets/item-index.js - WoW Item Price Guide (/item/) interactivity.
// Hero search + category browse over commodities; both navigate to /item/<slug>/.
// Mirrors the cheapest-realm pattern (apiGet + first-party iconUrl + typeahead).
(function () {
  "use strict";
  // API host selection has ONE home: assets/wgf-api-base.js (window.WGFApi). The
  // literal below is only the standalone degraded path for a page that has not loaded
  // that kit yet; it must stay behaviourally identical to WGFApi.bases().
  var API_BASES = (window.WGFApi && WGFApi.bases()) ||
    (/^(www\.)?(thewowdb|wowgoldfarms)\.com$/.test(location.hostname)
      ? ["https://api.thewowdb.com", "https://api.wowgoldfarms.com", ""]
      : ["", "https://api.thewowdb.com", "https://api.wowgoldfarms.com"]);
  // First-party inline placeholder: a neutral dark "?" tile served as a data URI,
  // so a missing icon never hits a competitor CDN or shows a broken image. Quotes
  // are %27-encoded so it embeds safely in single- or double-quoted contexts.
  var QMARK = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2756%27%20height=%2756%27%3E%3Crect%20width=%2756%27%20height=%2756%27%20rx=%276%27%20fill=%27%23232838%27/%3E%3Ctext%20x=%2728%27%20y=%2739%27%20font-size=%2734%27%20font-family=%27sans-serif%27%20fill=%27%23566677%27%20text-anchor=%27middle%27%3E%3F%3C/text%3E%3C/svg%3E";
  var ICON_ERR = 'onerror="this.onerror=null;this.src=\'' + QMARK + '\'"';
  var QC = {
    poor: "--q-poor", common: "--q-common", uncommon: "--q-uncommon",
    rare: "--q-rare", epic: "--q-epic", legendary: "--q-legendary", heirloom: "--q-heirloom"
  };

  function apiGet(path) {
    var i = 0;
    return (function next() {
      if (i >= API_BASES.length) return Promise.reject(new Error("all bases failed"));
      var b = API_BASES[i++];
      return fetch(b + path, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : next(); })
        .catch(next);
    })();
  }
  // Delegates to the ONE icon home (assets/wgf-icon.js). The API returns an already
  // resolved local-first path or absolute CDN URL - never re-mangle it into a slug.
  function iconUrl(icon) {
    return window.WGFIcon ? WGFIcon.url(icon, QMARK) : QMARK;
  }
  function qvarOf(q) { return "var(" + (QC[(q || "").toLowerCase()] || "--q-common") + ")"; }
  function fromG(c) {
    if (!c) return " - ";
    if (window.WGFCoins) return WGFCoins.html(Math.floor(c), { compact: true });  // canonical compact coin
    return Math.floor(c / 10000).toLocaleString() + "g";
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = (s == null ? "" : s); return d.innerHTML; }
  function el(id) { return document.getElementById(id); }
  function go(slug) { if (slug) window.location.href = "/item/" + slug + "/"; }

  var input = el("ii-q"), results = el("ii-results");
  var debounce, lastQuery = "", curItems = [], activeIdx = -1;

  /* ---- search typeahead ---- */
  function renderTypeahead(items) {
    curItems = items; activeIdx = -1; results.innerHTML = "";
    items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.style.setProperty("--qc", qvarOf(it.quality));
      li.innerHTML =
        '<span class="ic"><img alt="" src="' + esc(iconUrl(it.icon)) + '" ' + ICON_ERR + '><span class="qring"></span></span>' +
        '<span class="meta"><span class="nm">' + esc(it.item_name) + '</span><span class="sub">#' + esc(String(it.item_id)) + " · " + esc(it.type || "") + '</span></span>' +
        '<span class="from">' + fromG(it.min_price) + '<small>from</small></span>';
      li.addEventListener("mouseenter", function () { setActive(i); });
      li.addEventListener("click", function () { go(it.slug); });
      results.appendChild(li);
    });
    results.hidden = items.length === 0;
  }
  function setActive(i) {
    results.querySelectorAll("li").forEach(function (li, n) {
      li.classList.toggle("is-active", n === i);
      if (n === i) li.scrollIntoView({ block: "nearest" });
    });
    activeIdx = i;
  }
  function doSearch(q) {
    q = q.trim(); lastQuery = q; clearTimeout(debounce);
    if (q.length < 2) { results.hidden = true; return; }
    debounce = setTimeout(function () {
      apiGet("/api/item-index/search?q=" + encodeURIComponent(q))
        .then(function (j) { if (q !== lastQuery) return; renderTypeahead(((j && j.items) || []).slice(0, 10)); })
        .catch(function () { results.hidden = true; });
    }, 180);
  }
  input.addEventListener("input", function () { clearCat(); doSearch(input.value); });
  input.addEventListener("focus", function () { if (input.value.trim()) doSearch(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if (curItems.length) setActive(Math.min(activeIdx + 1, curItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (curItems.length) setActive(Math.max(activeIdx - 1, 0)); }
    else if (e.key === "Enter") { if (curItems.length) { e.preventDefault(); go((activeIdx >= 0 ? curItems[activeIdx] : curItems[0]).slug); } }
    else if (e.key === "Escape") { results.hidden = true; }
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".search")) results.hidden = true; });

  /* ---- category browse ---- */
  function clearCat() { document.querySelectorAll(".catchip").forEach(function (c) { c.classList.remove("is-active"); }); }
  document.querySelectorAll(".catchip").forEach(function (b) {
    b.addEventListener("click", function () { pickCat(b.dataset.cat); });
  });
  function pickCat(cat) {
    document.querySelectorAll(".catchip").forEach(function (c) { c.classList.toggle("is-active", c.dataset.cat === cat); });
    input.value = ""; results.hidden = true;
    var chip = document.querySelector('.catchip[data-cat="' + cat + '"]');
    var label = chip ? chip.textContent.trim() : cat;
    el("ii-browse-h").textContent = "Browse " + label + "…";
    el("ii-browse-grid").innerHTML = '<span style="color:var(--wgf-muted)">Loading…</span>';
    el("ii-toplist").hidden = true;
    el("ii-browse").hidden = false;
    el("ii-browse").scrollIntoView({ block: "nearest" });
    apiGet("/api/item-index/browse?category=" + encodeURIComponent(cat) + "&limit=48").then(function (j) {
      var items = (j && j.items) || [];
      var g = el("ii-browse-grid");
      el("ii-browse-h").textContent = "Browse " + label + " · " + items.length + " item" + (items.length === 1 ? "" : "s");
      g.innerHTML = "";
      if (!items.length) { g.innerHTML = '<span style="color:var(--wgf-muted)">No items found in this category.</span>'; return; }
      items.forEach(function (it) {
        var a = document.createElement("a");
        a.className = "tile"; a.href = "/item/" + it.slug + "/";
        a.style.setProperty("--qc", qvarOf(it.quality));
        a.innerHTML =
          '<span class="ic"><img alt="" src="' + esc(iconUrl(it.icon)) + '" ' + ICON_ERR + '><span class="qring"></span></span>' +
          '<span class="info"><span class="nm">' + esc(it.item_name) + '</span><span class="mt">' + esc(it.type || "") + '</span></span>' +
          '<span class="fr">' + fromG(it.min_price) + '<small>from</small></span>';
        g.appendChild(a);
      });
    }).catch(function () {
      el("ii-browse-grid").innerHTML = '<span style="color:var(--wgf-muted)">Failed to load items. Please try again.</span>';
    });
  }
  el("ii-browse-clear").addEventListener("click", function () {
    el("ii-browse").hidden = true; el("ii-toplist").hidden = false; clearCat();
  });
})();

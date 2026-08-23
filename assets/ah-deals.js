(function () {
  "use strict";

  const API_BASES = (window.WGFApi && WGFApi.bases()) ||
    (/^(www\.)?(thewowdb|wowgoldfarms)\.com$/.test(location.hostname)
      ? ["https://api.thewowdb.com", "https://api.wowgoldfarms.com", ""]
      : ["", "https://api.thewowdb.com", "https://api.wowgoldfarms.com"]);

  const DEAL_TYPES = ["under_market", "below_vendor", "high_spread", "all"];

  const EXPLAINERS = {
    under_market: "Listings priced well below the item's typical market price. Buy low, relist near market.",
    below_vendor: "Listed for less than a vendor pays for it — buy and vendor for guaranteed gold.",
    high_spread: "A big gap between the cheapest listing and the next one. Buy the cheap one, relist just under the next seller.",
    all: "Every kind of deal combined — under-market, below-vendor, and high-spread — ranked by estimated profit."
  };

  const DEFAULTS = {
    deal_type: "under_market",
    source: "all",
    min_discount_pct: 15,
    min_spread_pct: 50,
    min_profit_gold: 0,
    max_price_gold: 0,
    min_quantity: 1,
    sort: "profit-desc"
  };

  const LIMIT = 200;
  const G = 10000;

  const SAMPLE_REALMS = [
    { realm_slug: "moon-guard", realm_name: "Moon Guard", region: "US" },
    { realm_slug: "area-52", realm_name: "Area 52", region: "US" },
    { realm_slug: "stormrage", realm_name: "Stormrage", region: "US" },
    { realm_slug: "amanthul", realm_name: "Aman'Thul", region: "US" },
    { realm_slug: "silvermoon", realm_name: "Silvermoon", region: "EU" },
    { realm_slug: "draenor", realm_name: "Draenor", region: "EU" }
  ];

  const SNAP = new Date(Date.now() - 18 * 60000).toISOString();

  const SAMPLE_DEALS = [
    { item_id: 227774, item_name: "Pummel Permit", quality: "rare", icon: "/assets/icons/inv_eng_bombfire.jpg", source_type: "commodity", deal_type: "under_market", current_price: 196000 * G, market_price: 550000 * G, vendor_sell_price: 1, next_price: 500000 * G, market_discount_pct: 64, spread_pct: 155, estimated_profit: 326500 * G, qty_at_current_price: 89, total_quantity: 103, listing_count: 14, deal_score: 8.4, deal_badge: "Near 4-yr low", snapshot_time: SNAP, deal_score_components: { margin: 5, confidence: 2, depth: 1, data_points: 11 } },
    { item_id: 124640, item_name: "Tweets' Flavorful Flan", quality: "common", icon: "/assets/icons/inv_misc_food_100.jpg", source_type: "commodity", deal_type: "under_market", current_price: 69999 * G + 98, market_price: 255555 * G + 19, vendor_sell_price: 12, next_price: 0, market_discount_pct: 73, spread_pct: 0, estimated_profit: 172777 * G + 45, qty_at_current_price: 43, total_quantity: 53, listing_count: 10, deal_score: 5.8, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 1, depth: 1, data_points: 6 } },
    { item_id: 140352, item_name: "Highmountain Fry Bread", quality: "common", icon: "/assets/icons/inv_misc_food_wheat_01.jpg", source_type: "commodity", deal_type: "under_market", current_price: 69999 * G + 98, market_price: 222222 * G + 19, vendor_sell_price: 8, next_price: 0, market_discount_pct: 68, spread_pct: 0, estimated_profit: 141111 * G + 10, qty_at_current_price: 53, total_quantity: 72, listing_count: 19, deal_score: 5.2, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 1, depth: 1, data_points: 5 } },
    { item_id: 133557, item_name: "Slightly Worm-Eaten Hardtack", quality: "common", icon: "/assets/icons/inv_misc_food_74.jpg", source_type: "commodity", deal_type: "under_market", current_price: 69999 * G + 98, market_price: 178199 * G + 2, vendor_sell_price: 5, next_price: 178000 * G, market_discount_pct: 61, spread_pct: 155, estimated_profit: 99289 * G + 8, qty_at_current_price: 53, total_quantity: 68, listing_count: 15, deal_score: 4.9, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 1, depth: 1, data_points: 7 } },
    { item_id: 128158, item_name: "Arcane Lure", quality: "uncommon", icon: "/assets/icons/inv_fishing_lure_worm.jpg", source_type: "commodity", deal_type: "under_market", current_price: 50000 * G, market_price: 96961 * G + 21, vendor_sell_price: 25, next_price: 87800 * G, market_discount_pct: 48, spread_pct: 76, estimated_profit: 42113 * G + 14, qty_at_current_price: 49, total_quantity: 65, listing_count: 16, deal_score: 7.6, deal_badge: "43% below 4-yr avg", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 2, depth: 2, data_points: 14 } },
    { item_id: 198401, item_name: "Midnight Angler's Grand Line", quality: "rare", icon: "/assets/icons/inv_fishingpole_02.jpg", source_type: "commodity", deal_type: "under_market", current_price: 59935 * G + 96, market_price: 99999 * G, vendor_sell_price: 40, next_price: 64000 * G, market_discount_pct: 40, spread_pct: 7, estimated_profit: 35063 * G + 9, qty_at_current_price: 111, total_quantity: 124, listing_count: 13, deal_score: 7.1, deal_badge: "Near 4-yr low", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 3, depth: 1, data_points: 18 } },
    { item_id: 192693, item_name: "Five of Waves", quality: "uncommon", icon: "/assets/icons/inv_inscription_tarotgreatness.jpg", source_type: "realm", deal_type: "under_market", current_price: 15000 * G, market_price: 49999 * G + 98, vendor_sell_price: 2, next_price: 20000 * G, market_discount_pct: 70, spread_pct: 33, estimated_profit: 32499 * G + 98, qty_at_current_price: 1074, total_quantity: 1182, listing_count: 108, deal_score: 4.4, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 0, depth: 1, data_points: 3 } },
    { item_id: 206960, item_name: "Dreamtender's Charm", quality: "uncommon", icon: "/assets/icons/inv_misc_gem_pearl_04.jpg", source_type: "realm", deal_type: "under_market", current_price: 15000 * G + 81, market_price: 49999 * G + 98, vendor_sell_price: 15, next_price: 20000 * G, market_discount_pct: 70, spread_pct: 33, estimated_profit: 32499 * G + 17, qty_at_current_price: 134, total_quantity: 148, listing_count: 14, deal_score: 2.8, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 0, depth: 0, data_points: 2 } },
    { item_id: 133980, item_name: "Cro's Apple", quality: "common", icon: "/assets/icons/inv_misc_food_meat_cooked_04.jpg", source_type: "commodity", deal_type: "under_market", current_price: 11895 * G + 14, market_price: 45099 * G, vendor_sell_price: 3, next_price: 0, market_discount_pct: 74, spread_pct: 0, estimated_profit: 30948 * G + 91, qty_at_current_price: 234, total_quantity: 292, listing_count: 58, deal_score: 5.0, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 1, depth: 1, data_points: 8 } },
    { item_id: 111603, item_name: "Enchant Tool - Algari Resourcefulness", quality: "rare", icon: "/assets/icons/inv_enchant_formulagood_01.jpg", source_type: "realm", deal_type: "under_market", current_price: 18578 * G, market_price: 49999 * G + 98, vendor_sell_price: 20, next_price: 50000 * G, market_discount_pct: 63, spread_pct: 169, estimated_profit: 28921 * G + 98, qty_at_current_price: 23, total_quantity: 33, listing_count: 10, deal_score: 3.1, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 0, depth: 0, data_points: 2 } },
    { item_id: 118400, item_name: "Biznicks 247x128 Accurascope", quality: "rare", icon: "/assets/icons/inv_eng_bombfire.jpg", source_type: "commodity", deal_type: "under_market", current_price: 8548 * G + 10, market_price: 33625 * G + 31, vendor_sell_price: 50, next_price: 11420 * G, market_discount_pct: 75, spread_pct: 34, estimated_profit: 23395 * G + 94, qty_at_current_price: 106, total_quantity: 120, listing_count: 14, deal_score: 6.2, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 1, depth: 1, data_points: 9 } },
    { item_id: 13446, item_name: "Abyssal Healing Potion", quality: "common", icon: "/assets/icons/inv_potion_51.jpg", source_type: "commodity", deal_type: "under_market", current_price: 23997 * G, market_price: 45099 * G, vendor_sell_price: 12, next_price: 45099 * G, market_discount_pct: 47, spread_pct: 88, estimated_profit: 18847 * G + 5, qty_at_current_price: 204, total_quantity: 245, listing_count: 41, deal_score: 5.6, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 2, depth: 1, data_points: 12 } },
    { item_id: 2589, item_name: "Linen Cloth", quality: "common", icon: "/assets/icons/inv_chest_cloth_17.jpg", source_type: "realm", deal_type: "below_vendor", current_price: 18, market_price: 45, vendor_sell_price: 55, next_price: 22, market_discount_pct: 60, spread_pct: 22, estimated_profit: 37, qty_at_current_price: 420, total_quantity: 1800, listing_count: 36, deal_score: 7.8, deal_badge: "Vendor snipe", snapshot_time: SNAP, deal_score_components: { margin: 5, confidence: 2, depth: 1, data_points: 10 } },
    { item_id: 4306, item_name: "Silk Cloth", quality: "common", icon: "/assets/icons/inv_misc_note_01.jpg", source_type: "realm", deal_type: "below_vendor", current_price: 95, market_price: 240, vendor_sell_price: 150, next_price: 110, market_discount_pct: 60, spread_pct: 16, estimated_profit: 55, qty_at_current_price: 88, total_quantity: 240, listing_count: 12, deal_score: 6.4, deal_badge: "Vendor snipe", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 2, depth: 1, data_points: 8 } },
    { item_id: 12359, item_name: "Thorium Bar", quality: "common", icon: "/assets/icons/inv_misc_gem_01.jpg", source_type: "commodity", deal_type: "high_spread", current_price: 4200 * G, market_price: 9100 * G, vendor_sell_price: 60, next_price: 8900 * G, market_discount_pct: 54, spread_pct: 112, estimated_profit: 4255 * G, qty_at_current_price: 12, total_quantity: 84, listing_count: 9, deal_score: 6.8, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 2, depth: 2, data_points: 11 } },
    { item_id: 76131, item_name: "Forlorn Shadowspirit Diamond", quality: "rare", icon: "/assets/icons/inv_jewelcrafting_gem_42.jpg", source_type: "commodity", deal_type: "high_spread", current_price: 20000 * G, market_price: 49999 * G + 99, vendor_sell_price: 80, next_price: 50000 * G, market_discount_pct: 60, spread_pct: 150, estimated_profit: 27499 * G + 99, qty_at_current_price: 45, total_quantity: 92, listing_count: 47, deal_score: 5.4, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 1, depth: 1, data_points: 7 } },
    { item_id: 198691, item_name: "Recipe: Feast of the Divine Day", quality: "uncommon", icon: "/assets/icons/inv_scroll_03.jpg", source_type: "realm", deal_type: "high_spread", current_price: 8500 * G, market_price: 24000 * G, vendor_sell_price: 0, next_price: 23500 * G, market_discount_pct: 65, spread_pct: 176, estimated_profit: 13825 * G, qty_at_current_price: 2, total_quantity: 6, listing_count: 3, deal_score: 4.1, deal_badge: "Thin depth", snapshot_time: SNAP, deal_score_components: { margin: 4, confidence: 0, depth: 0, data_points: 2 } },
    { item_id: 194730, item_name: "Specular Rainbowfish Lure", quality: "uncommon", icon: "/assets/icons/inv_misc_fish_21.jpg", source_type: "commodity", deal_type: "under_market", current_price: 18578 * G, market_price: 49999 * G + 98, vendor_sell_price: 9, next_price: 50000 * G, market_discount_pct: 63, spread_pct: 169, estimated_profit: 28921 * G + 98, qty_at_current_price: 64, total_quantity: 80, listing_count: 16, deal_score: 3.0, deal_badge: "", snapshot_time: SNAP, deal_score_components: { margin: 3, confidence: 0, depth: 0, data_points: 2 } }
  ];

  const state = {
    realms: [],
    selectedRealm: localStorage.getItem("wgf-ah-realm") || "moon-guard",
    dealType: DEFAULTS.deal_type,
    source: DEFAULTS.source,
    minDiscount: DEFAULTS.min_discount_pct,
    minSpread: DEFAULTS.min_spread_pct,
    minProfitGold: DEFAULTS.min_profit_gold,
    maxPriceGold: DEFAULTS.max_price_gold,
    minQuantity: DEFAULTS.min_quantity,
    sort: DEFAULTS.sort,
    rows: [],
    loadToken: 0,
    realmSuggest: [],
    realmActiveIdx: -1,
    usingSample: false
  };

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function apiFetch(path) {
    const errors = [];
    for (const base of API_BASES) {
      try {
        const res = await fetch(base + path, { cache: "no-store" });
        const type = (res.headers.get("content-type") || "").toLowerCase();
        if (!res.ok || type.includes("text/html")) {
          errors.push(`${base + path}: HTTP ${res.status}`);
          continue;
        }
        return await res.json();
      } catch (err) {
        errors.push(`${base + path}: ${err.message || err}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  function setStatus(text) { if ($("dealsStatus")) $("dealsStatus").textContent = text || ""; }
  function setSyncStatus(text) { if ($("dealsSyncStatus")) $("dealsSyncStatus").textContent = text || ""; }
  function setResultCount(text) { if ($("dealsResultCount")) $("dealsResultCount").textContent = text || ""; }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatGold(copper) {
    const n = Number(copper);
    if (!Number.isFinite(n) || n <= 0) return " — ";
    if (window.WGFCoins && typeof window.WGFCoins.html === "function") {
      return window.WGFCoins.html(n, { compact: true });
    }
    const g = Math.floor(n / 10000);
    const s = Math.floor((n % 10000) / 100);
    const parts = [];
    if (g > 0) {
      parts.push('<span class="wgf-price__seg"><span class="wgf-num">' + g.toLocaleString() + '</span><span class="wgf-coin wgf-coin--g" aria-hidden="true"></span></span>');
    }
    if (s > 0 && g < 1000) {
      parts.push('<span class="wgf-price__seg"><span class="wgf-num">' + s + '</span><span class="wgf-coin wgf-coin--s" aria-hidden="true"></span></span>');
    }
    return '<span class="wgf-price">' + parts.join("") + "</span>";
  }

  var QMARK = "data:image/svg+xml;utf8," +
    "<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22 viewBox=%220 0 56 56%22>" +
    "<rect width=%2256%22 height=%2256%22 fill=%22%231b1610%22/>" +
    "<text x=%2228%22 y=%2237%22 font-size=%2228%22 fill=%22%235a5346%22 text-anchor=%22middle%22>?</text></svg>";

  function iconUrl(value) {
    if (window.WGFIcon) return WGFIcon.url(value, "");
    return value || "";
  }
  function iconHtml(row) {
    var url = iconUrl(row && row.icon);
    if (!url) return "";
    return '<span class="deals-item-iconwrap"><img class="deals-item-icon" alt="" loading="lazy" src="' + esc(url) +
      '" onerror="this.onerror=null;this.src=\'' + QMARK + '\'"></span>';
  }

  function qualityClass(row) {
    const raw = String((row && row.quality) || "").toLowerCase();
    if (raw.includes("poor")) return "q-poor";
    if (raw.includes("uncommon")) return "q-uncommon";
    if (raw.includes("common")) return "q-common";
    if (raw.includes("rare")) return "q-rare";
    if (raw.includes("epic")) return "q-epic";
    if (raw.includes("legendary")) return "q-legendary";
    if (raw.includes("heirloom")) return "q-heirloom";
    if (raw.includes("artifact")) return "q-artifact";
    return "q-common";
  }

  function relativeTime(value) {
    if (!value) return "";
    const then = new Date(value).getTime();
    if (!Number.isFinite(then)) return "";
    const diff = Date.now() - then;
    if (diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h ago";
    return Math.floor(hours / 24) + "d ago";
  }

  function dealTypeWord(t) {
    return ({ under_market: "under-market", below_vendor: "below-vendor", high_spread: "high-spread", all: "all" })[t] || "";
  }
  function dealTypeTitle(t) {
    return ({ under_market: "Under-Market", below_vendor: "Below-Vendor", high_spread: "High-Spread", all: "All" })[t] || "";
  }
  function prettyRealm(name) {
    if (!name) return "";
    if (/^[a-z0-9-]+$/.test(name)) {
      return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return name;
  }
  function updateContextHeading() {
    const realm = prettyRealm(selectedRealmName());
    const tt = dealTypeTitle(state.dealType);
    const text = (realm ? realm + " " : "") + (tt ? tt + " " : "") + "Deal Candidates";
    const el = $("dealsContextHeading");
    if (el) el.textContent = text;
    const hero = $("dealsHeroContext");
    if (hero) {
      const regionEl = $("dealsRegionDisplay");
      const region = regionEl && regionEl.textContent ? regionEl.textContent.trim() : "";
      hero.textContent = region ? text + " · " + region : text;
      hero.hidden = false;
    }
  }
  function fmtClock(d) {
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function nextScanDate() {
    const now = new Date();
    const d = new Date(now.getTime());
    d.setUTCSeconds(0, 0);
    const m = now.getUTCMinutes();
    d.setUTCMinutes(m + (15 - (m % 15)));
    return d;
  }
  function relInMin(target) {
    const diff = Math.ceil((target.getTime() - Date.now()) / 60000);
    if (diff <= 0) return "due now";
    if (diff < 60) return "in " + diff + " min";
    const h = Math.floor(diff / 60), mm = diff % 60;
    return mm ? "in " + h + " hr " + mm + " min" : "in " + h + " hr";
  }
  let _freshLatest = null, _freshTimer = null;
  function updateFreshnessStrip() {
    const strip = $("dealsFreshness");
    const elL = $("dealsFreshLatest"), elN = $("dealsFreshNext");
    if (!strip || !elL || !elN) return;
    if (_freshLatest) {
      const d = new Date(_freshLatest);
      elL.innerHTML = isNaN(d.getTime()) ? "unavailable"
        : esc(fmtClock(d)) + ' <span class="deals-fresh-emph">&middot; ' + esc(relativeTime(_freshLatest)) + "</span>";
    } else {
      elL.textContent = "unavailable";
    }
    const ns = nextScanDate();
    if (ns && !isNaN(ns.getTime())) {
      elN.innerHTML = '<span class="deals-fresh-emph">' + esc(relInMin(ns)) + "</span> (" + esc(fmtClock(ns)) + ")";
    } else {
      elN.textContent = "schedule unavailable";
    }
    strip.hidden = false;
  }

  function referencePrice(row) {
    const market = num(row.market_price);
    const vendor = num(row.vendor_sell_price);
    const next = num(row.next_price);
    const price = num(row.current_price);
    if (state.dealType === "below_vendor" && vendor > 0) return { value: vendor, label: "vendor" };
    if (state.dealType === "high_spread" && next > 0) return { value: next, label: "next" };
    if (market > 0) return { value: market, label: "market" };
    if (vendor > price && vendor > 0) return { value: vendor, label: "vendor" };
    if (next > price && next > 0) return { value: next, label: "next" };
    return { value: 0, label: "" };
  }

  function itemHref(row) {
    const params = new URLSearchParams();
    params.set("view", "item");
    params.set("item_id", row.item_id);
    if (row.item_name) params.set("item_name", row.item_name);
    params.set("realm", state.selectedRealm);
    return "/wow-auction-house/?" + params.toString();
  }

  function sourceChip(row) {
    const t = String(row.source_type || "").toLowerCase();
    if (t === "commodity") return '<span class="deals-src deals-src--commodity">Region</span>';
    return '<span class="deals-src deals-src--realm">Realm</span>';
  }

  function discountClass(pct) {
    if (pct >= 50) return "deals-disc deals-disc--hot";
    if (pct >= 25) return "deals-disc deals-disc--good";
    if (pct > 0) return "deals-disc deals-disc--ok";
    return "deals-disc deals-disc--none";
  }

  function sortValue(row, field) {
    switch (field) {
      case "name": return String(row.item_name || "").toLowerCase();
      case "price": return num(row.current_price);
      case "market": return referencePrice(row).value;
      case "discount": return num(row.market_discount_pct);
      case "spread": return num(row.spread_pct);
      case "profit": return num(row.estimated_profit);
      case "score": return row.deal_score != null ? Number(row.deal_score) : 0;
      case "available": return num(row.qty_at_current_price) || num(row.total_quantity);
      default: return 0;
    }
  }

  function parseSort() {
    const raw = String(state.sort || "profit-desc");
    const idx = raw.lastIndexOf("-");
    if (idx <= 0) return { field: "profit", dir: "desc" };
    return { field: raw.slice(0, idx), dir: raw.endsWith("-asc") ? "asc" : "desc" };
  }

  function sortedRows() {
    const { field, dir } = parseSort();
    const rows = state.rows.slice();
    rows.sort((a, b) => {
      const va = sortValue(a, field);
      const vb = sortValue(b, field);
      let cmp;
      if (typeof va === "string" || typeof vb === "string") cmp = String(va).localeCompare(String(vb));
      else cmp = va - vb;
      return dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }

  function updateSortArrows() {
    const { field, dir } = parseSort();
    document.querySelectorAll(".deals-table th.ah-sortable").forEach((th) => {
      const isActive = th.getAttribute("data-sort") === field;
      th.classList.toggle("is-sorted", isActive);
      th.classList.toggle("is-asc", isActive && dir === "asc");
      th.classList.toggle("is-desc", isActive && dir === "desc");
      const arrow = th.querySelector(".sort-arrow");
      if (arrow) arrow.textContent = isActive ? (dir === "asc" ? "▲" : "▼") : "";
    });
  }

  function scoreTier(score) {
    if (score >= 7.0) return { label: "Great", cls: "dsb-compact__tier--great" };
    if (score >= 5.5) return { label: "Good", cls: "dsb-compact__tier--good" };
    if (score >= 3.5) return { label: "Fair", cls: "dsb-compact__tier--fair" };
    return { label: "Poor", cls: "dsb-compact__tier--poor" };
  }

  function scoreTooltip(score, components) {
    if (!components) return "Score: " + score + "/10";
    return [
      "Score: " + score + "/10",
      "Margin: " + components.margin + "/5",
      "Confidence: " + components.confidence + "/3 (" + components.data_points + " data pts)",
      "Depth: " + components.depth + "/2"
    ].join(" | ");
  }

  function renderSkeleton() {
    const body = $("dealsRows");
    if (!body) return;
    let html = '<tr class="deals-loading-row"><td colspan="10">' +
      '<span class="deals-loading-spinner" aria-hidden="true"></span>' +
      "Scanning the latest Auction House snapshot for deals…" +
      "</td></tr>";
    body.innerHTML = html;
  }

  function renderMessage(lead, detail) {
    const body = $("dealsRows");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="10" class="ah-empty"><strong>' + esc(lead) + "</strong>" +
      (detail ? esc(detail) : "") + "</td></tr>";
  }

  function renderRows() {
    const body = $("dealsRows");
    if (!body) return;
    const rows = sortedRows();
    updateSortArrows();
    if (!rows.length) {
      renderMessage("No deals match these filters.", "Loosen the thresholds, switch deal type, or try another realm.");
      setResultCount("0 deals");
      return;
    }

    body.innerHTML = rows.map((row) => {
      const q = qualityClass(row);
      const ref = referencePrice(row);
      const disc = num(row.market_discount_pct);
      const spread = num(row.spread_pct);
      const qty = num(row.qty_at_current_price) || num(row.total_quantity);
      const listings = num(row.listing_count);
      const profit = num(row.estimated_profit);
      const qtySub = [];
      if (listings > 0) qtySub.push(listings.toLocaleString() + " listing" + (listings === 1 ? "" : "s"));
      const total = num(row.total_quantity);
      if (total > qty && total > 0) qtySub.push(total.toLocaleString() + " total");
      const badge = String(row.deal_badge || "");
      const showBadge = badge && badge !== "Deal";
      const score = row.deal_score != null ? Number(row.deal_score) : null;
      const tip = score != null ? scoreTooltip(score, row.deal_score_components) : "Score not available";
      let scoreBadge;
      if (score != null) {
        const { label, cls } = scoreTier(score);
        scoreBadge = '<span class="dsb-compact" title="' + esc(tip) + '" aria-label="Deal score: ' + esc(label) + '">' +
          '<span class="dsb-compact__tier ' + esc(cls) + '">' + esc(label) + "</span></span>";
      } else {
        scoreBadge = '<span class="dsb-compact dsb-compact--none" title="' + esc(tip) + '">' +
          '<span class="dsb-compact__tier dsb-compact__tier--poor"> — </span></span>';
      }
      return (
        '<tr class="deals-row" data-href="' + esc(itemHref(row)) + '">' +
          '<td class="col-score" data-th="Score">' + scoreBadge + "</td>" +
          '<td class="col-name" data-th="Item">' +
            '<a class="deals-item ' + q + '" href="' + esc(itemHref(row)) + '">' +
              iconHtml(row) +
              '<span class="deals-item-copy">' +
                '<span class="deals-item-name">' + esc(row.item_name || ("Item " + row.item_id)) + "</span>" +
                (showBadge ? '<span class="deals-badge">' + esc(badge) + "</span>" : "") +
              "</span>" +
            "</a>" +
          "</td>" +
          '<td class="col-source" data-th="Source">' + sourceChip(row) + "</td>" +
          '<td class="col-price price-cell" data-th="Price">' + formatGold(num(row.current_price)) + "</td>" +
          '<td class="col-market" data-th="Market">' +
            (ref.value > 0 ? formatGold(ref.value) : " — ") +
            (ref.value > 0 && ref.label ? '<span class="deals-ref-label">' + esc(ref.label) + "</span>" : "") +
          "</td>" +
          '<td class="col-discount" data-th="Under mkt"><span class="' + discountClass(disc) + '">' +
            (disc > 0 ? disc + "%" : " — ") + "</span></td>" +
          '<td class="col-spread" data-th="Spread">' +
            (spread > 0 ? '<span class="deals-spread">' + spread + "%</span>" : " — ") + "</td>" +
          '<td class="col-profit" data-th="Est. profit">' +
            (profit > 0 ? '<span class="deals-profit">' + formatGold(profit) + "</span>" : " — ") + "</td>" +
          '<td class="col-qty" data-th="Available">' +
            '<span class="deals-qty">' + qty.toLocaleString() + "</span>" +
            (qtySub.length ? '<span class="ah-subtext deals-qty-sub">' + esc(qtySub.join(" · ")) + "</span>" : "") +
          "</td>" +
          '<td class="col-updated" data-th="Updated">' + esc(relativeTime(row.snapshot_time)) + "</td>" +
        "</tr>"
      );
    }).join("");

    setResultCount(rows.length.toLocaleString() + " deal" + (rows.length === 1 ? "" : "s"));
  }

  function applyLocalFilters(rows) {
    return rows.filter((row) => {
      if (state.dealType !== "all" && row.deal_type !== state.dealType) return false;
      if (state.source === "realm" && row.source_type !== "realm") return false;
      if (state.source === "commodity" && row.source_type !== "commodity") return false;
      if ((state.dealType === "under_market" || state.dealType === "all") &&
          row.deal_type === "under_market" &&
          num(row.market_discount_pct) < state.minDiscount) return false;
      if ((state.dealType === "high_spread" || state.dealType === "all") &&
          row.deal_type === "high_spread" &&
          num(row.spread_pct) < state.minSpread) return false;
      if (num(row.estimated_profit) < state.minProfitGold * G) return false;
      if (state.maxPriceGold > 0 && num(row.current_price) > state.maxPriceGold * G) return false;
      const qty = num(row.qty_at_current_price) || num(row.total_quantity);
      if (qty < state.minQuantity) return false;
      return true;
    });
  }

  function applySampleResults() {
    state.usingSample = true;
    state.rows = applyLocalFilters(SAMPLE_DEALS);
    renderRows();
    _freshLatest = SNAP;
    updateFreshnessStrip();
    if (!_freshTimer) _freshTimer = setInterval(updateFreshnessStrip, 60000);
    const label = {
      under_market: "Under-market deal candidates",
      below_vendor: "Below-vendor deal candidates",
      high_spread: "High-spread deal candidates",
      all: "All deal candidates"
    }[state.dealType] || "Deal candidates";
    setStatus(label + " · " + prettyRealm(selectedRealmName()));
    setSyncStatus("Snapshot " + relativeTime(SNAP));
    updateContextHeading();
  }

  function buildDealsQuery() {
    const params = new URLSearchParams();
    params.set("realm", state.selectedRealm);
    params.set("source", state.source);
    params.set("deal_type", state.dealType);
    params.set("limit", String(LIMIT));
    params.set("min_discount_pct", String(state.minDiscount));
    params.set("min_spread_pct", String(state.minSpread));
    params.set("min_profit", String(Math.max(0, Math.round(state.minProfitGold * 10000))));
    if (state.maxPriceGold > 0) params.set("max_price", String(Math.round(state.maxPriceGold * 10000)));
    params.set("min_quantity", String(Math.max(1, state.minQuantity)));
    return "/api/deals?" + params.toString();
  }

  let _warmTimer = null;
  const _WARM_MAX_ATTEMPTS = 20;

  async function loadDeals() {
    const token = ++state.loadToken;
    if (_warmTimer) { clearTimeout(_warmTimer); _warmTimer = null; }
    renderSkeleton();
    setResultCount("");
    setStatus("Loading " + prettyRealm(selectedRealmName()) + " " + dealTypeWord(state.dealType) + " deal candidates…");
    setSyncStatus("");
    updateContextHeading();
    if (state.usingSample) {
      applySampleResults();
      return;
    }
    await fetchDeals(token, 0);
  }

  async function fetchDeals(token, attempt) {
    try {
      const data = await apiFetch(buildDealsQuery());
      if (token !== state.loadToken) return;
      if (data && data.warming && attempt < _WARM_MAX_ATTEMPTS) {
        renderSkeleton();
        setStatus("Scanning " + prettyRealm(selectedRealmName()) + " for " + dealTypeWord(state.dealType) + " deals…");
        const wait = Math.min(2000 + attempt * 500, 6000);
        _warmTimer = setTimeout(() => {
          if (token === state.loadToken) fetchDeals(token, attempt + 1);
        }, wait);
        return;
      }
      state.usingSample = false;
      state.rows = data.results || [];
      renderRows();
      const newest = state.rows.map((r) => r.snapshot_time).filter(Boolean).sort().pop();
      _freshLatest = newest || null;
      updateFreshnessStrip();
      if (!_freshTimer) _freshTimer = setInterval(updateFreshnessStrip, 60000);
      setStatus(dealTypeTitle(state.dealType) + " deal candidates · " + prettyRealm(selectedRealmName()));
      setSyncStatus(newest ? "Snapshot " + relativeTime(newest) : "Snapshot time unavailable");
      updateContextHeading();
    } catch (err) {
      if (token !== state.loadToken) return;
      console.warn("Deals API unavailable, using preview sample set.", err);
      applySampleResults();
    }
  }

  function selectedRealmName() {
    const r = state.realms.find((x) => x.realm_slug === state.selectedRealm);
    return r ? r.realm_name : state.selectedRealm;
  }
  function realmLabel(realm) {
    return (realm && (realm.realm_name || realm.realm_slug)) || "";
  }
  function realmSearchText(realm) {
    return [realm && realm.realm_name, realm && realm.realm_slug, realmLabel(realm)].join(" ")
      .toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
  function realmMatches(query) {
    const q = String(query || "").trim().toLowerCase();
    const compact = q.replace(/[^a-z0-9]+/g, "");
    const source = compact || q;
    if (!source) return state.realms.slice(0, 10);
    return state.realms
      .map((realm) => {
        const name = String(realm.realm_name || "").toLowerCase();
        const slug = String(realm.realm_slug || "").toLowerCase();
        const label = realmLabel(realm).toLowerCase();
        const hay = realmSearchText(realm);
        let score = 0;
        if (slug === q || name === q || label === q || hay === compact) score = 100;
        else if (slug.startsWith(q) || name.startsWith(q) || hay.startsWith(compact)) score = 80;
        else if (slug.includes(q) || name.includes(q) || label.includes(q) || hay.includes(compact)) score = 50;
        return score ? { realm, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || String(a.realm.realm_name).localeCompare(String(b.realm.realm_name)))
      .slice(0, 10)
      .map((x) => x.realm);
  }
  function setRealmSuggestionActive(idx) {
    const list = $("dealsRealmSuggest");
    if (!list) return;
    list.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("is-active", i === idx);
      if (i === idx) li.scrollIntoView({ block: "nearest" });
    });
    state.realmActiveIdx = idx;
  }
  function hideRealmSuggestions() {
    const list = $("dealsRealmSuggest");
    const input = $("dealsRealmInput");
    if (list) list.hidden = true;
    if (input) input.setAttribute("aria-expanded", "false");
    state.realmSuggest = [];
    state.realmActiveIdx = -1;
  }
  function chooseRealm(realm) {
    if (!realm) return;
    const input = $("dealsRealmInput");
    state.selectedRealm = realm.realm_slug;
    if (input) input.value = realmLabel(realm);
    localStorage.setItem("wgf-ah-realm", state.selectedRealm);
    hideRealmSuggestions();
    updateRegionDisplay();
    updateContextHeading();
    writeUrl();
    loadDeals();
  }
  function renderRealmSuggestions(matches) {
    const list = $("dealsRealmSuggest");
    const input = $("dealsRealmInput");
    if (!list || !input) return;
    state.realmSuggest = matches;
    state.realmActiveIdx = matches.length ? 0 : -1;
    list.innerHTML = matches.map((realm, i) => {
      const region = String((realm && realm.region) || "US").toUpperCase();
      return '<li role="option" data-idx="' + i + '" class="' + (i === 0 ? "is-active" : "") + '">' +
        '<span class="deals-realm-suggest__name">' + esc(realm.realm_name || realm.realm_slug) + "</span>" +
        '<span class="deals-realm-suggest__meta">' + esc(region) + "</span></li>";
    }).join("");
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", matches.length ? "true" : "false");
  }
  function updateRealmSearch(query) { renderRealmSuggestions(realmMatches(query)); }
  function updateRegionDisplay() {
    const r = state.realms.find((x) => x.realm_slug === state.selectedRealm);
    const el = $("dealsRegionDisplay");
    if (el) el.textContent = String((r && r.region) || "US").toUpperCase();
  }
  function useSampleRealms() {
    state.realms = SAMPLE_REALMS.slice();
    if (!state.realms.some((r) => r.realm_slug === state.selectedRealm)) {
      state.selectedRealm = "moon-guard";
    }
    const input = $("dealsRealmInput");
    const cur = state.realms.find((r) => r.realm_slug === state.selectedRealm);
    if (input && cur) input.value = realmLabel(cur);
    updateRegionDisplay();
  }
  async function loadRealms() {
    setStatus("Loading realms…");
    try {
      const data = await apiFetch("/api/ah/app/realms");
      state.realms = (data.realms || []).slice()
        .sort((a, b) => String(a.realm_name).localeCompare(String(b.realm_name)));
      if (!state.realms.some((r) => r.realm_slug === state.selectedRealm)) {
        state.selectedRealm = state.realms.some((r) => r.realm_slug === "moon-guard")
          ? "moon-guard"
          : (state.realms[0] && state.realms[0].realm_slug) || "moon-guard";
      }
      const input = $("dealsRealmInput");
      if (input) {
        const cur = state.realms.find((r) => r.realm_slug === state.selectedRealm);
        input.value = cur ? realmLabel(cur) : "";
      }
      updateRegionDisplay();
    } catch (err) {
      console.warn("Realm API unavailable, using preview realms.", err);
      useSampleRealms();
    }
  }

  function syncFilterVisibility() {
    const show = {
      min_discount_pct: state.dealType === "under_market" || state.dealType === "all",
      min_spread_pct: state.dealType === "high_spread" || state.dealType === "all",
      min_profit: true,
      max_price: true,
      min_quantity: true
    };
    document.querySelectorAll(".deals-field").forEach((field) => {
      const key = field.getAttribute("data-field");
      field.hidden = !show[key];
    });
    const table = document.querySelector(".deals-table");
    if (table) {
      table.classList.toggle("hide-col-discount", !show.min_discount_pct);
      table.classList.toggle("hide-col-spread", !show.min_spread_pct);
    }
  }
  function updateExplainer() {
    const el = $("dealsExplainer");
    if (el) el.textContent = EXPLAINERS[state.dealType] || "";
  }
  function writeUrl() {
    const params = new URLSearchParams();
    params.set("realm", state.selectedRealm);
    params.set("type", state.dealType);
    if (state.source !== DEFAULTS.source) params.set("source", state.source);
    if (state.minDiscount !== DEFAULTS.min_discount_pct) params.set("disc", String(state.minDiscount));
    if (state.minSpread !== DEFAULTS.min_spread_pct) params.set("spread", String(state.minSpread));
    if (state.minProfitGold > 0) params.set("profit", String(state.minProfitGold));
    if (state.maxPriceGold > 0) params.set("max", String(state.maxPriceGold));
    if (state.minQuantity !== DEFAULTS.min_quantity) params.set("qty", String(state.minQuantity));
    if (state.sort !== DEFAULTS.sort) params.set("sort", state.sort);
    history.replaceState(null, "", location.pathname + "?" + params.toString());
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    const realm = p.get("realm");
    if (realm) state.selectedRealm = realm;
    const type = p.get("type");
    if (type && DEAL_TYPES.includes(type)) state.dealType = type;
    const source = p.get("source");
    if (source && ["all", "realm", "commodity"].includes(source)) state.source = source;
    if (p.get("disc") != null) state.minDiscount = Math.max(0, parseInt(p.get("disc"), 10) || 0);
    if (p.get("spread") != null) state.minSpread = Math.max(0, parseInt(p.get("spread"), 10) || 0);
    if (p.get("profit") != null) state.minProfitGold = Math.max(0, parseInt(p.get("profit"), 10) || 0);
    if (p.get("max") != null) state.maxPriceGold = Math.max(0, parseInt(p.get("max"), 10) || 0);
    if (p.get("qty") != null) state.minQuantity = Math.max(1, parseInt(p.get("qty"), 10) || 1);
    const sort = p.get("sort");
    if (sort) state.sort = sort;
  }
  function syncControlsFromState() {
    const realmInput = $("dealsRealmInput");
    if (realmInput) {
      const cur = state.realms.find((r) => r.realm_slug === state.selectedRealm);
      if (cur) realmInput.value = realmLabel(cur);
    }
    if ($("dealsSourceSelect")) $("dealsSourceSelect").value = state.source;
    if ($("dealsMinDiscount")) $("dealsMinDiscount").value = state.minDiscount;
    if ($("dealsMinSpread")) $("dealsMinSpread").value = state.minSpread;
    if ($("dealsMinProfit")) $("dealsMinProfit").value = state.minProfitGold;
    if ($("dealsMaxPrice")) $("dealsMaxPrice").value = state.maxPriceGold || "";
    if ($("dealsMinQuantity")) $("dealsMinQuantity").value = state.minQuantity;
    document.querySelectorAll(".deals-type-btn").forEach((btn) => {
      const active = btn.getAttribute("data-deal-type") === state.dealType;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    updateContextHeading();
  }

  function exportCsv() {
    const rows = sortedRows();
    if (!rows.length) { setStatus("Nothing to export."); return; }
    const headers = ["item_id", "item_name", "source", "price_copper", "reference_copper", "reference_type", "under_market_pct", "spread_pct", "est_profit_copper", "available", "listings", "deal_score", "snapshot_time"];
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      const ref = referencePrice(row);
      lines.push([
        row.item_id,
        '"' + String(row.item_name || "").replace(/"/g, '""') + '"',
        row.source_type || "",
        num(row.current_price),
        ref.value,
        ref.label,
        num(row.market_discount_pct),
        num(row.spread_pct),
        num(row.estimated_profit),
        num(row.qty_at_current_price) || num(row.total_quantity),
        num(row.listing_count),
        row.deal_score != null ? Number(row.deal_score) : "",
        row.snapshot_time || ""
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wowgoldfarms-deals-" + state.selectedRealm + "-" + state.dealType + ".csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported " + rows.length + " deals.");
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }
  const debouncedReload = debounce(() => { writeUrl(); loadDeals(); }, 450);

  function readNumberInputs() {
    state.minDiscount = Math.max(0, parseInt($("dealsMinDiscount").value, 10) || 0);
    state.minSpread = Math.max(0, parseInt($("dealsMinSpread").value, 10) || 0);
    state.minProfitGold = Math.max(0, parseInt($("dealsMinProfit").value, 10) || 0);
    state.maxPriceGold = Math.max(0, parseInt($("dealsMaxPrice").value, 10) || 0);
    state.minQuantity = Math.max(1, parseInt($("dealsMinQuantity").value, 10) || 1);
  }

  function bindEvents() {
    const realmInput = $("dealsRealmInput");
    const realmSuggest = $("dealsRealmSuggest");
    if (realmInput) {
      realmInput.addEventListener("input", () => updateRealmSearch(realmInput.value));
      realmInput.addEventListener("focus", () => updateRealmSearch(realmInput.value));
      realmInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (state.realmSuggest.length) setRealmSuggestionActive(Math.min(state.realmActiveIdx + 1, state.realmSuggest.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (state.realmSuggest.length) setRealmSuggestionActive(Math.max(state.realmActiveIdx - 1, 0));
        } else if (e.key === "Enter") {
          if (state.realmSuggest.length) {
            e.preventDefault();
            chooseRealm(state.realmSuggest[state.realmActiveIdx >= 0 ? state.realmActiveIdx : 0]);
          }
        } else if (e.key === "Escape") {
          hideRealmSuggestions();
        }
      });
      realmInput.addEventListener("blur", () => {
        window.setTimeout(() => {
          const cur = state.realms.find((r) => r.realm_slug === state.selectedRealm);
          if (cur && !(document.activeElement && document.activeElement.closest("#dealsRealmSuggest"))) {
            realmInput.value = realmLabel(cur);
          }
        }, 120);
      });
    }
    if (realmSuggest) {
      realmSuggest.addEventListener("mousemove", (e) => {
        const li = e.target.closest("li[data-idx]");
        if (li) setRealmSuggestionActive(parseInt(li.getAttribute("data-idx"), 10));
      });
      realmSuggest.addEventListener("mousedown", (e) => e.preventDefault());
      realmSuggest.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-idx]");
        if (!li) return;
        chooseRealm(state.realmSuggest[parseInt(li.getAttribute("data-idx"), 10)]);
      });
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".deals-realm-wrap")) hideRealmSuggestions();
    });

    const sourceSelect = $("dealsSourceSelect");
    if (sourceSelect) sourceSelect.addEventListener("change", () => {
      state.source = sourceSelect.value;
      writeUrl();
      loadDeals();
    });

    document.querySelectorAll(".deals-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.dealType = btn.getAttribute("data-deal-type");
        syncControlsFromState();
        syncFilterVisibility();
        updateExplainer();
        writeUrl();
        loadDeals();
      });
    });

    ["dealsMinDiscount", "dealsMinSpread", "dealsMinProfit", "dealsMaxPrice", "dealsMinQuantity"].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener("input", () => { readNumberInputs(); debouncedReload(); });
    });

    const resetBtn = $("dealsResetButton");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      state.source = DEFAULTS.source;
      state.minDiscount = DEFAULTS.min_discount_pct;
      state.minSpread = DEFAULTS.min_spread_pct;
      state.minProfitGold = DEFAULTS.min_profit_gold;
      state.maxPriceGold = DEFAULTS.max_price_gold;
      state.minQuantity = DEFAULTS.min_quantity;
      syncControlsFromState();
      writeUrl();
      loadDeals();
    });

    const refreshBtn = $("dealsRefreshButton");
    if (refreshBtn) refreshBtn.addEventListener("click", () => loadDeals());
    const exportBtn = $("dealsExportButton");
    if (exportBtn) exportBtn.addEventListener("click", exportCsv);

    const rowsBody = $("dealsRows");
    if (rowsBody) rowsBody.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const tr = e.target.closest("tr[data-href]");
      if (tr) window.location.href = tr.getAttribute("data-href");
    });

    document.querySelectorAll(".deals-table th.ah-sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const field = th.getAttribute("data-sort");
        const { field: curField, dir: curDir } = parseSort();
        let dir;
        if (curField === field) dir = curDir === "asc" ? "desc" : "asc";
        else dir = field === "name" ? "asc" : "desc";
        state.sort = field + "-" + dir;
        writeUrl();
        renderRows();
      });
    });
  }

  async function boot() {
    readUrl();
    bindEvents();
    syncControlsFromState();
    syncFilterVisibility();
    updateExplainer();
    await loadRealms();
    syncControlsFromState();
    writeUrl();
    await loadDeals();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

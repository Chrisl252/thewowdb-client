/* wgf-pve-dungeons.js — Mythic+ dungeon listing (`/pve/mythic-plus/dungeons/`).
   Hydrates destination tiles from the existing 5-column table so pve_app.py
   does not need a scoring rewrite. Extra fields render only when present on
   the row (data-* attrs) or an injected payload.

   Art: first-party `/assets/dungeon-tiles/*.jpg`. Midnight Season 2 (site
   Season 18) has no 1:1 tiles in that folder yet, so each slug maps to the
   closest hosted tile. Do not invent CDN hotlinks.

   Mapping (slug → tile → why)
   -------------------------------------------------------------------------
   murder-row            windrunner-spire.jpg         Silvermoon street.
                          Same Quel'Thalas tile as the homepage Hall.
   ruby-life-pools       algethar-academy.jpg         Dragonflight sibling;
                          no Life Pools extract is hosted.
   kings-rest            magisters-terrace.jpg        Regal gold-stone interior;
                          closest royal / tomb tile.
   temple-of-sethraliss  skyreach.jpg                 High desert-spire temple.
   altar-of-fangs        skyreach.jpg                 Elevated ritual temple;
                          no Coiled Isle / loa tile yet.
   den-of-nalorakk       pit-of-saron.jpg             Enclosed predator den,
                          dark carved stone.
   the-blinding-vale     seat-of-the-triumvirate.jpg  Pale void / light otherworld.
   voidscar-arena        seat-of-the-triumvirate.jpg  Void-scarred Argus cousin.
   (default)             windrunner-spire.jpg         Hall default.

   Optional upgrade: if a row sets data-loadscreen to a FileDataID that the
   site already vends at /assets/loading-screens/{id}.jpg (see wgf-loadscreen.js),
   that official loading art is preferred over the tile fallback.
*/
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WgfPveDungeons = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TILE_DIR = "/assets/dungeon-tiles/";
  var LOADSCREEN_DIR = "/assets/loading-screens/";
  var ICON_DIR = "/assets/icons/";
  var DEFAULT_TILE = "windrunner-spire.jpg";

  var TILES = {
    "murder-row": "windrunner-spire.jpg",
    "ruby-life-pools": "algethar-academy.jpg",
    "kings-rest": "magisters-terrace.jpg",
    "kingsrest": "magisters-terrace.jpg",
    "temple-of-sethraliss": "skyreach.jpg",
    "altar-of-fangs": "skyreach.jpg",
    "den-of-nalorakk": "pit-of-saron.jpg",
    "the-blinding-vale": "seat-of-the-triumvirate.jpg",
    "blinding-vale": "seat-of-the-triumvirate.jpg",
    "voidscar-arena": "seat-of-the-triumvirate.jpg",
    "voidscar": "seat-of-the-triumvirate.jpg",
  };

  var NAME_ALIASES = {
    "murder row": "murder-row",
    "ruby life pools": "ruby-life-pools",
    "kings rest": "kings-rest",
    "king's rest": "kings-rest",
    "kings' rest": "kings-rest",
    "temple of sethraliss": "temple-of-sethraliss",
    "altar of fangs": "altar-of-fangs",
    "den of nalorakk": "den-of-nalorakk",
    "the blinding vale": "the-blinding-vale",
    "blinding vale": "the-blinding-vale",
    "voidscar arena": "voidscar-arena",
  };

  var CLASS_SLUGS = {
    "death knight": "deathknight",
    "deathknight": "deathknight",
    "demon hunter": "demonhunter",
    "demonhunter": "demonhunter",
    "druid": "druid",
    "evoker": "evoker",
    "hunter": "hunter",
    "mage": "mage",
    "monk": "monk",
    "paladin": "paladin",
    "priest": "priest",
    "rogue": "rogue",
    "shaman": "shaman",
    "warlock": "warlock",
    "warrior": "warrior",
  };

  var REGIONS = ["us", "eu", "kr", "tw"];

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function dungeonSlug(nameOrSlug) {
    var raw = String(nameOrSlug || "").trim().toLowerCase();
    if (!raw) return "";
    if (TILES[raw]) return raw;
    if (NAME_ALIASES[raw]) return NAME_ALIASES[raw];
    var slug = slugify(raw);
    return NAME_ALIASES[slug.replace(/-/g, " ")] || slug;
  }

  function tileFor(nameOrSlug) {
    var slug = dungeonSlug(nameOrSlug);
    return TILE_DIR + (TILES[slug] || DEFAULT_TILE);
  }

  function artFor(dungeon) {
    var id = dungeon && dungeon.loadscreen;
    if (id && /^\d+$/.test(String(id))) {
      return LOADSCREEN_DIR + id + ".jpg";
    }
    return tileFor((dungeon && (dungeon.slug || dungeon.name)) || "");
  }

  function classSlug(name) {
    var key = String(name || "").trim().toLowerCase();
    return CLASS_SLUGS[key] || slugify(key).replace(/-/g, "");
  }

  function classIcon(name) {
    var slug = classSlug(name);
    if (!slug) return "";
    return ICON_DIR + "classicon_" + slug + ".jpg";
  }

  function factionIcon(faction) {
    var f = String(faction || "").toLowerCase();
    if (f === "horde") return ICON_DIR + "ui_hordeicon.jpg";
    if (f === "alliance") return ICON_DIR + "ui_allianceicon.jpg";
    return "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function textOf(el) {
    return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function attr(el, name) {
    if (!el || !el.getAttribute) return "";
    var v = el.getAttribute(name);
    return v == null ? "" : String(v).trim();
  }

  function splitList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/\s*[|,]\s*/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function parseRow(row) {
    if (!row) return null;
    var cells = row.cells ? Array.prototype.slice.call(row.cells) : [];
    var nameCell = cells[0] || null;
    var nameLink = nameCell ? nameCell.querySelector("a[data-dungeon-name], .wgf-mpd-name, a:not(.wgf-mpd-snap)") : null;
    var name = attr(row, "data-name") || (nameLink ? textOf(nameLink) : "") || textOf(nameCell).replace(/group snapshots\s*→?/i, "").trim();
    var slug = attr(row, "data-slug") || dungeonSlug(name);
    var snap = nameCell ? nameCell.querySelector("a.wgf-mpd-snap, a[href*='snapshot']") : null;
    var boardHref = attr(row, "data-href") || (nameLink && nameLink.getAttribute("href")) || (slug ? "/pve/mythic-plus/dungeons/" + slug + "/" : "");
    var snapHref = attr(row, "data-snapshots") || (snap && snap.getAttribute("href")) || (slug ? "/pve/mythic-plus/dungeons/" + slug + "/snapshots/" : "");

    return {
      slug: slug,
      name: name,
      origin: attr(row, "data-origin"),
      href: boardHref,
      snapshots: snapHref,
      loadscreen: attr(row, "data-loadscreen"),
      topPlayer: attr(row, "data-top-player") || textOf(cells[1] && cells[1].querySelector(".wgf-mpd-player, .char-name, .wgf-pvp-name")),
      topClass: attr(row, "data-top-class"),
      topSpec: attr(row, "data-top-spec"),
      topRealm: attr(row, "data-top-realm"),
      topKey: attr(row, "data-top-key") || textOf(cells[1] && cells[1].querySelector(".wgf-mpd-key, .wgf-pve-key")),
      topTime: attr(row, "data-top-time"),
      highestKey: attr(row, "data-highest-key") || textOf(cells[2]),
      fastestTimed: attr(row, "data-fastest") || textOf(cells[3]),
      rankedRuns: attr(row, "data-ranked") || textOf(cells[4]),
      score: attr(row, "data-score"),
      timer: attr(row, "data-timer"),
      timeVsTimer: attr(row, "data-vs-timer"),
      faction: attr(row, "data-faction"),
      affixes: splitList(attr(row, "data-affixes")),
      party: splitList(attr(row, "data-party")),
    };
  }

  function parseTable(table) {
    if (!table) return [];
    var body = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table;
    var rows = body.querySelectorAll ? body.querySelectorAll("tr[data-slug], tbody tr") : [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].closest && rows[i].closest("thead")) continue;
      var dungeon = parseRow(rows[i]);
      if (dungeon && dungeon.name) out.push(dungeon);
    }
    return out;
  }

  function readFilters(search) {
    var params;
    try {
      params = new URLSearchParams(search || "");
    } catch (err) {
      params = { get: function () { return ""; } };
    }
    var region = String(params.get("region") || "us").toLowerCase();
    if (REGIONS.indexOf(region) === -1) region = "us";
    var season = String(params.get("season") || "18");
    if (!/^\d+$/.test(season)) season = "18";
    var sort = String(params.get("sort") || "name").toLowerCase();
    if (["name", "key", "fastest", "runs"].indexOf(sort) === -1) sort = "name";
    return { region: region, season: season, sort: sort };
  }

  function keyNumber(value) {
    var n = parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? -1 : n;
  }

  function timeSeconds(value) {
    var m = String(value || "").match(/(\d+):(\d+)/);
    if (!m) return Number.POSITIVE_INFINITY;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function runCount(value) {
    var n = parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? -1 : n;
  }

  function sortDungeons(list, sort) {
    var copy = list.slice();
    copy.sort(function (a, b) {
      if (sort === "key") return keyNumber(b.highestKey) - keyNumber(a.highestKey) || a.name.localeCompare(b.name);
      if (sort === "fastest") return timeSeconds(a.fastestTimed) - timeSeconds(b.fastestTimed) || a.name.localeCompare(b.name);
      if (sort === "runs") return runCount(b.rankedRuns) - runCount(a.rankedRuns) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return copy;
  }

  function hasValue(value) {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    var s = String(value).trim();
    return s !== "" && s !== "—" && s !== "-";
  }

  function formatKey(value) {
    if (!hasValue(value)) return "";
    var s = String(value).trim();
    return s.charAt(0) === "+" ? s : "+" + s.replace(/^\+/, "");
  }

  function classTone(name) {
    var slug = classSlug(name);
    return slug ? "wgf-mpd-name--" + slug : "";
  }

  function renderParty(party) {
    if (!party || !party.length) return "";
    var icons = party.map(function (member) {
      var cls = typeof member === "string" ? member : member.class || member;
      var spec = typeof member === "object" ? member.spec || "" : "";
      var src = classIcon(cls);
      if (!src) return "";
      var label = escapeHtml((spec ? spec + " " : "") + cls);
      return '<img class="wgf-mpd-party__icon" src="' + escapeHtml(src) + '" alt="' + label + '" title="' + label + '" width="20" height="20">';
    }).join("");
    if (!icons) return "";
    return '<div class="wgf-mpd-party" aria-label="Party composition">' + icons + "</div>";
  }

  function renderAffixes(affixes) {
    if (!affixes || !affixes.length) return "";
    return (
      '<ul class="wgf-mpd-affixes">' +
      affixes.map(function (name) {
        return '<li class="wgf-mpd-affix">' + escapeHtml(name) + "</li>";
      }).join("") +
      "</ul>"
    );
  }

  function renderMeta(dungeon) {
    var bits = [];
    if (hasValue(dungeon.score)) {
      bits.push('<span class="wgf-mpd-chip">Score <b>' + escapeHtml(dungeon.score) + "</b></span>");
    }
    if (hasValue(dungeon.timer)) {
      bits.push('<span class="wgf-mpd-chip">Timer <b>' + escapeHtml(dungeon.timer) + "</b></span>");
    }
    if (hasValue(dungeon.timeVsTimer)) {
      bits.push('<span class="wgf-mpd-chip wgf-mpd-chip--up">' + escapeHtml(dungeon.timeVsTimer) + "</span>");
    }
    if (hasValue(dungeon.faction)) {
      var crest = factionIcon(dungeon.faction);
      bits.push(
        '<span class="wgf-mpd-chip wgf-mpd-chip--' + escapeHtml(String(dungeon.faction).toLowerCase()) + '">' +
        (crest ? '<img src="' + escapeHtml(crest) + '" alt="" width="14" height="14">' : "") +
        escapeHtml(dungeon.faction) +
        "</span>"
      );
    }
    if (!bits.length) return "";
    return '<div class="wgf-mpd-extras">' + bits.join("") + "</div>";
  }

  function renderTopRun(dungeon) {
    if (!hasValue(dungeon.topPlayer) && !hasValue(dungeon.topKey)) {
      return '<p class="wgf-mpd-empty">No timed run in this snapshot.</p>';
    }
    var icon = classIcon(dungeon.topClass);
    var nameClass = "wgf-mpd-player " + classTone(dungeon.topClass);
    var spec = hasValue(dungeon.topSpec) ? '<span class="wgf-mpd-spec">' + escapeHtml(dungeon.topSpec) + "</span>" : "";
    var realm = hasValue(dungeon.topRealm) ? '<span class="wgf-mpd-realm">' + escapeHtml(dungeon.topRealm) + "</span>" : "";
    var key = hasValue(dungeon.topKey) ? '<span class="wgf-mpd-key">' + escapeHtml(formatKey(dungeon.topKey)) + "</span>" : "";
    var time = hasValue(dungeon.topTime) ? '<span class="wgf-mpd-time">' + escapeHtml(dungeon.topTime) + "</span>" : "";
    return (
      '<div class="wgf-mpd-run">' +
        (icon ? '<img class="wgf-mpd-run__icon" src="' + escapeHtml(icon) + '" alt="" width="28" height="28">' : "") +
        '<div class="wgf-mpd-run__who">' +
          '<span class="' + nameClass + '">' + escapeHtml(dungeon.topPlayer || "Top timed") + "</span>" +
          '<span class="wgf-mpd-run__meta">' + spec + realm + "</span>" +
        "</div>" +
        '<div class="wgf-mpd-run__key">' + key + time + "</div>" +
      "</div>"
    );
  }

  function renderStat(label, value) {
    var shown = hasValue(value) ? escapeHtml(value) : "—";
    return (
      '<div class="wgf-mpd-stat">' +
        '<small>' + escapeHtml(label) + "</small>" +
        "<b>" + shown + "</b>" +
      "</div>"
    );
  }

  function renderCard(dungeon, filters) {
    var art = artFor(dungeon);
    var region = (filters && filters.region) || "us";
    var season = (filters && filters.season) || "18";
    var href = dungeon.href || "/pve/mythic-plus/dungeons/" + dungeon.slug + "/";
    if (href.indexOf("?") === -1) href += "?region=" + encodeURIComponent(region) + "&season=" + encodeURIComponent(season);
    var snap = dungeon.snapshots || "/pve/mythic-plus/dungeons/" + dungeon.slug + "/snapshots/";
    var origin = hasValue(dungeon.origin)
      ? '<span class="wgf-mpd-origin">' + escapeHtml(dungeon.origin) + "</span>"
      : "";

    return (
      '<article class="wgf-mpd-card" data-slug="' + escapeHtml(dungeon.slug) + '" style="--mpd-art:url(\'' + escapeHtml(art) + "')\">" +
        '<a class="wgf-mpd-card__art" href="' + escapeHtml(href) + '" aria-hidden="true" tabindex="-1"></a>' +
        '<div class="wgf-mpd-card__body">' +
          '<header class="wgf-mpd-card__head">' +
            origin +
            '<h2 class="wgf-mpd-card__title"><a href="' + escapeHtml(href) + '">' + escapeHtml(dungeon.name) + "</a></h2>" +
          "</header>" +
          '<div class="wgf-mpd-card__runblock">' +
            '<span class="wgf-mpd-k">Top run</span>' +
            renderTopRun(dungeon) +
            renderParty(dungeon.party) +
            renderAffixes(dungeon.affixes) +
            renderMeta(dungeon) +
          "</div>" +
          '<div class="wgf-mpd-stats">' +
            renderStat("Highest key", formatKey(dungeon.highestKey) || dungeon.highestKey) +
            renderStat("Fastest timed", dungeon.fastestTimed) +
            renderStat("Ranked runs", dungeon.rankedRuns) +
          "</div>" +
          '<footer class="wgf-mpd-card__foot">' +
            '<a class="wgf-btn-red wgf-mpd-board" href="' + escapeHtml(href) + '">Full board</a>' +
            '<a class="wgf-mpd-snap" href="' + escapeHtml(snap) + '">Group snapshots <span aria-hidden="true">→</span></a>' +
          "</footer>" +
        "</div>" +
      "</article>"
    );
  }

  function renderBoard(dungeons, filters) {
    var list = sortDungeons(dungeons || [], (filters && filters.sort) || "name");
    if (!list.length) {
      return '<p class="wgf-mpd-empty wgf-mpd-empty--board">No dungeon snapshot for this season and region.</p>';
    }
    return '<div class="wgf-mpd-grid">' + list.map(function (d) { return renderCard(d, filters); }).join("") + "</div>";
  }

  function regionLabel(region) {
    return String(region || "us").toUpperCase();
  }

  function applyFilters(form, filters) {
    if (!form) return;
    var regionInputs = form.querySelectorAll("[name='region']");
    for (var i = 0; i < regionInputs.length; i++) {
      var el = regionInputs[i];
      if (el.type === "radio" || el.type === "checkbox") {
        el.checked = el.value === filters.region;
      } else {
        el.value = filters.region;
      }
      if (el.classList) {
        el.classList.toggle("on", el.value === filters.region);
        el.classList.toggle("is-active", el.value === filters.region);
      }
    }
    var season = form.querySelector("[name='season']");
    if (season) season.value = filters.season;
    var sort = form.querySelector("[name='sort']");
    if (sort) sort.value = filters.sort;
    var tabs = form.querySelectorAll(".wgf-pvp-pill-tab[data-region], .wgf-mpd-region");
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      var val = attr(tab, "data-region") || attr(tab, "href").replace(/^.*region=([a-z]+).*$/i, "$1");
      var on = val === filters.region;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-current", on ? "page" : "false");
      if (tab.tagName === "A") {
        tab.setAttribute(
          "href",
          "?region=" + encodeURIComponent(val) +
            "&season=" + encodeURIComponent(filters.season) +
            "&sort=" + encodeURIComponent(filters.sort)
        );
      }
    }
  }

  function updateChrome(root, filters, dungeons) {
    var title = root.querySelector("[data-mpd-title], .wgf-pve-hero h1, .wgf-mpd-hero h1");
    if (title) {
      title.textContent = "Mythic+ Dungeon Leaderboards (" + regionLabel(filters.region) + ")";
    }
    var count = root.querySelector("[data-mpd-dungeons]");
    if (count) count.textContent = String(dungeons.length);
    var runs = root.querySelector("[data-mpd-runs]");
    if (runs) {
      var total = dungeons.reduce(function (sum, d) {
        var n = runCount(d.rankedRuns);
        return n > 0 ? sum + n : sum;
      }, 0);
      if (total > 0) runs.textContent = String(total);
    }
  }

  function hydrate(root) {
    var scope = root || (typeof document !== "undefined" ? document : null);
    if (!scope || !scope.querySelector) return [];
    var table = scope.querySelector("#pve-dungeon-table, table.wgf-pve-table, table.wgf-mpd-source");
    var board = scope.querySelector("#pve-dungeon-board, .wgf-mpd-board");
    var form = scope.querySelector("#pve-dungeon-filters, form.wgf-mpd-filters");
    var filters = readFilters((typeof location !== "undefined" && location.search) || "");
    applyFilters(form, filters);

    var dungeons = [];
    if (typeof window !== "undefined" && window.__WGF_PVE_BOARD__ && Array.isArray(window.__WGF_PVE_BOARD__.dungeons)) {
      dungeons = window.__WGF_PVE_BOARD__.dungeons.map(function (d) {
        return Object.assign({ slug: dungeonSlug(d.slug || d.name) }, d);
      });
    } else {
      dungeons = parseTable(table);
    }

    if (filters.season !== "18") dungeons = [];

    updateChrome(scope, filters, dungeons);
    if (board) {
      board.innerHTML = renderBoard(dungeons, filters);
      board.hidden = false;
    }
    if (table) {
      table.hidden = true;
      table.setAttribute("aria-hidden", "true");
    }
    return dungeons;
  }

  return {
    TILE_DIR: TILE_DIR,
    TILES: TILES,
    DEFAULT_TILE: DEFAULT_TILE,
    NAME_ALIASES: NAME_ALIASES,
    slugify: slugify,
    dungeonSlug: dungeonSlug,
    tileFor: tileFor,
    artFor: artFor,
    classSlug: classSlug,
    classIcon: classIcon,
    factionIcon: factionIcon,
    parseRow: parseRow,
    parseTable: parseTable,
    readFilters: readFilters,
    sortDungeons: sortDungeons,
    renderBoard: renderBoard,
    renderCard: renderCard,
    applyFilters: applyFilters,
    hydrate: hydrate,
  };
});

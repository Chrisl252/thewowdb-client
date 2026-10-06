/* wgf-pve-dungeons.js — Mythic+ dungeon listing (`/pve/mythic-plus/dungeons/`)
   and per-dungeon boards (`/pve/mythic-plus/dungeon/{slug}/`).

   Hydrates Hall tiles / heroes from the tables pve_app.py already emits.
   Extra fields render only when present. Do not invent ranks.

   Art: first-party `/assets/dungeon-tiles/{slug}.jpg` — real dungeon / zone
   loading-screen crops, not S1 stand-ins and not empty gold boxes. If a row
   later sets data-loadscreen to a FileDataID already vended at
   /assets/loading-screens/{id}.jpg, that official loading art wins.
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
  var BOARD_BASE = "/pve/mythic-plus/dungeon/";
  var LIST_BASE = "/pve/mythic-plus/dungeons/";

  var TILES = {
    "altar-of-fangs": "altar-of-fangs.jpg",
    "den-of-nalorakk": "den-of-nalorakk.jpg",
    "kings-rest": "kings-rest.jpg",
    "kingsrest": "kings-rest.jpg",
    "murder-row": "murder-row.jpg",
    "ruby-life-pools": "ruby-life-pools.jpg",
    "temple-of-sethraliss": "temple-of-sethraliss.jpg",
    "the-blinding-vale": "the-blinding-vale.jpg",
    "blinding-vale": "the-blinding-vale.jpg",
    "voidscar-arena": "voidscar-arena.jpg",
    "voidscar": "voidscar-arena.jpg",
    "magisters-terrace": "magisters-terrace.jpg",
    "windrunner-spire": "windrunner-spire.jpg",
    "pit-of-saron": "pit-of-saron.jpg",
    "seat-of-the-triumvirate": "seat-of-the-triumvirate.jpg",
    "algethar-academy": "algethar-academy.jpg",
    "skyreach": "skyreach.jpg",
    "maisara-caverns": "maisara-caverns.jpg",
    "nexus-point-xenas": "nexus-point-xenas.jpg",
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

  var SEASON_DUNGEONS = [
    { slug: "altar-of-fangs", name: "Altar of Fangs", origin: "Midnight", timer: "32:00" },
    { slug: "den-of-nalorakk", name: "Den of Nalorakk", origin: "Midnight", timer: "30:00" },
    { slug: "kings-rest", name: "Kings' Rest", origin: "Battle for Azeroth", timer: "36:00" },
    { slug: "murder-row", name: "Murder Row", origin: "Midnight", timer: "30:00" },
    { slug: "ruby-life-pools", name: "Ruby Life Pools", origin: "Dragonflight", timer: "30:00" },
    { slug: "temple-of-sethraliss", name: "Temple of Sethraliss", origin: "Battle for Azeroth", timer: "33:00" },
    { slug: "the-blinding-vale", name: "The Blinding Vale", origin: "Midnight", timer: "34:00" },
    { slug: "voidscar-arena", name: "Voidscar Arena", origin: "Midnight", timer: "28:00" },
  ];

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
    if (TILES[raw]) return raw === "kingsrest" ? "kings-rest"
      : raw === "blinding-vale" ? "the-blinding-vale"
      : raw === "voidscar" ? "voidscar-arena"
      : raw;
    if (NAME_ALIASES[raw]) return NAME_ALIASES[raw];
    var slug = slugify(raw);
    return NAME_ALIASES[slug.replace(/-/g, " ")] || slug;
  }

  function tileFile(nameOrSlug) {
    var slug = dungeonSlug(nameOrSlug);
    return TILES[slug] || DEFAULT_TILE;
  }

  function tileFor(nameOrSlug) {
    return TILE_DIR + tileFile(nameOrSlug);
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

  function ratingNumber(value) {
    var n = parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? -1 : n;
  }

  function dungeonHref(slug, filters) {
    var href = BOARD_BASE + slug + "/";
    if (filters) {
      href += "?region=" + encodeURIComponent(filters.region || "us") +
        "&season=" + encodeURIComponent(filters.season || "18");
    }
    return href;
  }

  function snapshotsHref(slug) {
    return BOARD_BASE + slug + "/snapshots/";
  }

  function slugFromHref(href) {
    var m = String(href || "").match(/\/pve\/mythic-plus\/dungeons?\/([a-z0-9-]+)\/?/i);
    if (!m) return "";
    if (m[1] === "snapshots") return "";
    return dungeonSlug(m[1]);
  }

  function parseRow(row) {
    if (!row) return null;
    var cells = row.cells ? Array.prototype.slice.call(row.cells) : [];
    var nameCell = cells[0] || null;
    var nameLink = nameCell ? nameCell.querySelector("a[data-dungeon-name], .wgf-mpd-name, a:not(.wgf-mpd-snap)") : null;
    var name = attr(row, "data-name") || (nameLink ? textOf(nameLink) : "") || textOf(nameCell).replace(/group snapshots\s*→?/i, "").trim();
    var slug = attr(row, "data-slug") || dungeonSlug(name);
    var snap = nameCell ? nameCell.querySelector("a.wgf-mpd-snap, a[href*='snapshot']") : null;
    var boardHref = attr(row, "data-href") || (nameLink && nameLink.getAttribute("href")) || (slug ? dungeonHref(slug) : "");
    var snapHref = attr(row, "data-snapshots") || (snap && snap.getAttribute("href")) || (slug ? snapshotsHref(slug) : "");

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

  function parsePlayerCell(cell, row) {
    var name = attr(row, "data-player") || textOf(cell && cell.querySelector(".wgf-mpd-player, .char-name, .wgf-pvp-cname, .wgf-pvp-name")) || "";
    var rest = "";
    if (!name && cell) {
      var raw = textOf(cell);
      var bits = raw.split("·");
      if (bits.length > 1) {
        var left = bits[0].trim();
        rest = bits.slice(1).join("·").trim();
        var leftParts = left.split(/\s+/);
        if (leftParts.length >= 3) {
          name = leftParts[0];
          row && !attr(row, "data-spec") && (rest = leftParts.slice(1).join(" ") + (rest ? " · " + rest : ""));
        } else {
          name = left;
        }
      } else {
        name = raw;
      }
    }
    var specClass = attr(row, "data-spec") || attr(row, "data-class") || "";
    var realm = attr(row, "data-realm") || "";
    if (!specClass && cell) {
      var specEl = cell.querySelector(".wgf-mpd-spec, .wgf-pve-spec");
      specClass = specEl ? textOf(specEl) : specClass;
    }
    if (!realm && cell) {
      var realmEl = cell.querySelector(".wgf-mpd-realm, .wgf-pve-realm");
      realm = realmEl ? textOf(realmEl) : realm;
    }
    if ((!specClass || !realm) && rest) {
      var extra = rest.split("·").map(function (s) { return s.trim(); });
      if (!specClass && extra[0]) specClass = extra[0];
      if (!realm && extra[1]) realm = extra[1];
    }
    var spec = "";
    var cls = "";
    if (specClass) {
      var words = specClass.replace(/\s+/g, " ").trim().split(" ");
      if (words.length >= 2) {
        var lastTwo = (words[words.length - 2] + " " + words[words.length - 1]).toLowerCase();
        if (lastTwo === "death knight" || lastTwo === "demon hunter") {
          cls = lastTwo;
          spec = words.slice(0, -2).join(" ");
        } else {
          cls = words[words.length - 1];
          spec = words.slice(0, -1).join(" ");
        }
      } else {
        cls = specClass;
      }
    }
    return { name: name, spec: spec, className: cls, specClass: specClass, realm: realm };
  }

  function parseRunRow(row) {
    if (!row) return null;
    var cells = row.cells ? Array.prototype.slice.call(row.cells) : [];
    var player = parsePlayerCell(cells[1], row);
    var result = attr(row, "data-result") || textOf(cells[4]);
    return {
      rank: attr(row, "data-rank") || textOf(cells[0]),
      player: player.name,
      spec: player.spec || attr(row, "data-spec-name"),
      className: player.className || attr(row, "data-class"),
      specClass: player.specClass,
      realm: player.realm,
      key: attr(row, "data-key") || textOf(cells[2]),
      time: attr(row, "data-time") || textOf(cells[3]),
      result: result,
      timed: /timed/i.test(result) && !/deplet/i.test(result),
      rating: attr(row, "data-rating") || textOf(cells[5]),
      ilvl: attr(row, "data-ilvl") || textOf(cells[6]),
      faction: attr(row, "data-faction"),
    };
  }

  function parseRunTable(table) {
    if (!table) return [];
    var body = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table;
    var rows = body.querySelectorAll ? body.querySelectorAll("tr") : [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].closest && rows[i].closest("thead")) continue;
      var run = parseRunRow(rows[i]);
      if (run && (hasValue(run.player) || hasValue(run.key))) out.push(run);
    }
    return out;
  }

  function parseMeta(list) {
    if (!list) return [];
    var items = list.querySelectorAll ? list.querySelectorAll("li, [data-spec]") : [];
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var spec = attr(el, "data-spec") || textOf(el.querySelector("[data-name], .wgf-mpd-meta__name")) || "";
      var share = attr(el, "data-share") || textOf(el.querySelector("[data-share], .wgf-mpd-meta__share"));
      var count = attr(el, "data-count") || textOf(el.querySelector("[data-count], .wgf-mpd-meta__n"));
      if (!spec) {
        var raw = textOf(el);
        var m = raw.match(/^(.*?)(\d+(?:\.\d+)%)?\s*(\d+)?$/);
        if (m) {
          spec = (m[1] || "").replace(/^\d+\s*/, "").trim();
          share = share || m[2] || "";
          count = count || m[3] || "";
        }
      }
      if (spec) out.push({ spec: spec, share: share, count: count });
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
    if (["name", "key", "fastest", "runs", "time", "result", "rating", "ilvl"].indexOf(sort) === -1) {
      sort = "name";
    }
    var result = String(params.get("result") || "all").toLowerCase();
    if (["all", "timed", "depleted"].indexOf(result) === -1) result = "all";
    return { region: region, season: season, sort: sort, result: result };
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

  function sortRuns(list, sort) {
    var copy = list.slice();
    copy.sort(function (a, b) {
      if (sort === "key") return keyNumber(b.key) - keyNumber(a.key) || timeSeconds(a.time) - timeSeconds(b.time);
      if (sort === "time" || sort === "fastest") return timeSeconds(a.time) - timeSeconds(b.time);
      if (sort === "rating") return ratingNumber(b.rating) - ratingNumber(a.rating);
      if (sort === "ilvl") return ratingNumber(b.ilvl) - ratingNumber(a.ilvl);
      if (sort === "result") return (b.timed ? 1 : 0) - (a.timed ? 1 : 0) || keyNumber(b.key) - keyNumber(a.key);
      return keyNumber(b.key) - keyNumber(a.key) || timeSeconds(a.time) - timeSeconds(b.time);
    });
    return copy;
  }

  function filterRuns(list, filters) {
    if (!filters || filters.result === "all") return list.slice();
    return list.filter(function (run) {
      if (filters.result === "timed") return run.timed;
      if (filters.result === "depleted") return !run.timed;
      return true;
    });
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
        "<small>" + escapeHtml(label) + "</small>" +
        "<b>" + shown + "</b>" +
      "</div>"
    );
  }

  function artImg(src, className, alt) {
    return (
      '<img class="' + escapeHtml(className || "") + '" src="' + escapeHtml(src) +
      '" alt="' + escapeHtml(alt || "") + '" width="600" height="300" loading="lazy">'
    );
  }

  function renderCard(dungeon, filters) {
    var art = artFor(dungeon);
    var region = (filters && filters.region) || "us";
    var season = (filters && filters.season) || "18";
    var href = dungeon.href || dungeonHref(dungeon.slug, { region: region, season: season });
    if (href.indexOf("?") === -1) href += "?region=" + encodeURIComponent(region) + "&season=" + encodeURIComponent(season);
    var snap = dungeon.snapshots || snapshotsHref(dungeon.slug);
    var origin = hasValue(dungeon.origin)
      ? '<span class="wgf-mpd-origin">' + escapeHtml(dungeon.origin) + "</span>"
      : "";

    return (
      '<article class="wgf-mpd-card" data-slug="' + escapeHtml(dungeon.slug) + '" style="--mpd-art:url(\'' + escapeHtml(art) + "')\">" +
        '<a class="wgf-mpd-card__art" href="' + escapeHtml(href) + '" tabindex="-1">' +
          artImg(art, "wgf-mpd-card__img", dungeon.name || "") +
        "</a>" +
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

  function seasonRoster() {
    return SEASON_DUNGEONS.slice();
  }

  function renderSeasonStrip(currentSlug, filters) {
    var region = (filters && filters.region) || "us";
    var season = (filters && filters.season) || "18";
    var tiles = SEASON_DUNGEONS.map(function (d) {
      var on = d.slug === currentSlug;
      var href = dungeonHref(d.slug, { region: region, season: season });
      var art = tileFor(d.slug);
      return (
        '<a class="wgf-mpd-season__tile' + (on ? " on" : "") + '" data-slug="' + escapeHtml(d.slug) +
        '" href="' + escapeHtml(href) + '"' + (on ? ' aria-current="page"' : "") +
        " style=\"--mpd-art:url('" + escapeHtml(art) + "')\">" +
          artImg(art, "wgf-mpd-season__img", "") +
          '<span class="wgf-mpd-season__name">' + escapeHtml(d.name) + "</span>" +
        "</a>"
      );
    }).join("");
    return (
      '<nav class="wgf-mpd-season" aria-label="This season\'s dungeons">' +
        '<p class="wgf-mpd-season__k">This season\'s dungeons</p>' +
        '<div class="wgf-mpd-season__row">' + tiles + "</div>" +
      "</nav>"
    );
  }

  function renderHero(dungeon, filters, runs) {
    var art = artFor(dungeon);
    var timed = runs.filter(function (r) { return r.timed; }).length;
    var depleted = runs.length - timed;
    var highest = runs.reduce(function (max, r) { return Math.max(max, keyNumber(r.key)); }, -1);
    var fastest = runs.filter(function (r) { return r.timed; }).reduce(function (best, r) {
      var sec = timeSeconds(r.time);
      return sec < best.sec ? { time: r.time, sec: sec } : best;
    }, { time: dungeon.fastestTimed || "", sec: timeSeconds(dungeon.fastestTimed) });
    var ratings = runs.map(function (r) { return ratingNumber(r.rating); }).filter(function (n) { return n > 0; });
    var topRating = ratings.length ? Math.max.apply(null, ratings) : "";

    var stats = [
      renderStat("Ranked runs", String(runs.length || dungeon.rankedRuns || "")),
      renderStat("Highest key", highest > 0 ? formatKey(highest) : formatKey(dungeon.highestKey)),
      renderStat("Fastest timed", fastest.time || dungeon.fastestTimed || "—"),
      renderStat("Timed", timed ? String(timed) : "—"),
      renderStat("Depleted", depleted > 0 ? String(depleted) : "—"),
    ];
    if (topRating) stats.push(renderStat("Top M+ rating", String(topRating)));
    if (hasValue(dungeon.timer)) stats.push(renderStat("Timer", dungeon.timer));

    return (
      '<header class="wgf-mpd-dungeon-hero" data-slug="' + escapeHtml(dungeon.slug) +
      "\" style=\"--mpd-art:url('" + escapeHtml(art) + "')\">" +
        artImg(art, "wgf-mpd-dungeon-hero__img", dungeon.name || "") +
        '<div class="wgf-mpd-dungeon-hero__veil" aria-hidden="true"></div>' +
        '<div class="wgf-mpd-dungeon-hero__copy">' +
          (hasValue(dungeon.origin) ? '<span class="wgf-mpd-origin">' + escapeHtml(dungeon.origin) + "</span>" : "") +
          "<h1>" + escapeHtml(dungeon.name || "Dungeon") + "</h1>" +
          '<p class="wgf-mpd-sub">Best keys and fastest times in this dungeon — ' +
            escapeHtml(((filters && filters.region) || "us").toUpperCase()) +
            (filters && filters.season ? " · Season " + escapeHtml(filters.season) : "") +
          ".</p>" +
          '<div class="wgf-mpd-statband">' + stats.join("") + "</div>" +
        "</div>" +
      "</header>"
    );
  }

  function renderPodium(runs) {
    var top = sortRuns(runs, "key").slice(0, 3);
    if (!top.length) return "";
    return (
      '<ol class="wgf-mpd-podium" aria-label="Top keys">' +
      top.map(function (run, i) {
        var icon = classIcon(run.className);
        return (
          '<li class="wgf-mpd-podium__slot wgf-mpd-podium__slot--' + (i + 1) + '">' +
            '<span class="wgf-mpd-podium__rk">' + escapeHtml(String(i + 1)) + "</span>" +
            (icon ? '<img src="' + escapeHtml(icon) + '" alt="" width="28" height="28">' : "") +
            '<span class="wgf-mpd-player ' + classTone(run.className) + '">' + escapeHtml(run.player) + "</span>" +
            '<span class="wgf-mpd-key">' + escapeHtml(formatKey(run.key) || run.key) + "</span>" +
            '<span class="wgf-mpd-time">' + escapeHtml(run.time) + "</span>" +
            (hasValue(run.result)
              ? '<span class="wgf-mpd-result' + (run.timed ? " wgf-mpd-result--in" : " wgf-mpd-result--out") + '">' +
                escapeHtml(run.result) + "</span>"
              : "") +
          "</li>"
        );
      }).join("") +
      "</ol>"
    );
  }

  function renderMetaBoard(meta, dungeonName) {
    if (!meta || !meta.length) return "";
    return (
      '<section class="wgf-mpd-meta" aria-label="Most played specs">' +
        "<h2>The meta in " + escapeHtml(dungeonName || "this dungeon") + "</h2>" +
        '<p class="wgf-mpd-meta__sub">Share of the ladder at key level 10 and up, most played first. Only specs already on the board.</p>' +
        '<ol class="wgf-mpd-meta__list">' +
        meta.map(function (row) {
          return (
            "<li>" +
              '<span class="wgf-mpd-meta__name">' + escapeHtml(row.spec) + "</span>" +
              (hasValue(row.share) ? '<span class="wgf-mpd-meta__share">' + escapeHtml(row.share) + "</span>" : "") +
              (hasValue(row.count) ? '<span class="wgf-mpd-meta__n">' + escapeHtml(row.count) + "</span>" : "") +
            "</li>"
          );
        }).join("") +
        "</ol>" +
      "</section>"
    );
  }

  function renderRunRow(run) {
    var icon = classIcon(run.className);
    var resultClass = run.timed ? "wgf-mpd-result--in" : "wgf-mpd-result--out";
    return (
      "<tr>" +
        '<td class="wgf-mpd-c-rank">' + escapeHtml(run.rank || "") + "</td>" +
        '<td class="wgf-mpd-c-char">' +
          '<span class="wgf-mpd-who">' +
            (icon ? '<img class="wgf-mpd-run__icon" src="' + escapeHtml(icon) + '" alt="" width="24" height="24">' : "") +
            '<span class="wgf-mpd-who__txt">' +
              '<span class="wgf-mpd-player ' + classTone(run.className) + '">' + escapeHtml(run.player) + "</span>" +
              '<span class="wgf-mpd-run__meta">' +
                (hasValue(run.specClass) ? '<span class="wgf-mpd-spec">' + escapeHtml(run.specClass) + "</span>" : "") +
                (hasValue(run.realm) ? '<span class="wgf-mpd-realm">' + escapeHtml(run.realm) + "</span>" : "") +
              "</span>" +
            "</span>" +
          "</span>" +
        "</td>" +
        '<td class="wgf-mpd-c-key"><span class="wgf-mpd-key">' + escapeHtml(formatKey(run.key) || run.key || "—") + "</span></td>" +
        '<td class="wgf-mpd-c-time"><span class="wgf-mpd-time">' + escapeHtml(run.time || "—") + "</span></td>" +
        '<td class="wgf-mpd-c-result"><span class="wgf-mpd-result ' + resultClass + '">' + escapeHtml(run.result || "—") + "</span></td>" +
        '<td class="wgf-mpd-c-rating">' + (hasValue(run.rating) ? escapeHtml(run.rating) : "—") + "</td>" +
        '<td class="wgf-mpd-c-ilvl">' + (hasValue(run.ilvl) ? escapeHtml(run.ilvl) : "—") + "</td>" +
      "</tr>"
    );
  }

  function renderRunBoard(runs, filters) {
    var list = sortRuns(filterRuns(runs || [], filters), (filters && filters.sort) || "key");
    if (!list.length) {
      return '<p class="wgf-mpd-empty wgf-mpd-empty--board">No ranked runs for this filter.</p>';
    }
    return (
      '<div class="wgf-mpd-runboard">' +
        '<table class="wgf-mpd-runs">' +
          "<thead><tr>" +
            "<th>#</th><th>Player</th><th>Key</th><th>Time</th><th>Result</th><th>M+ rating</th><th>Item level</th>" +
          "</tr></thead>" +
          "<tbody>" + list.map(renderRunRow).join("") + "</tbody>" +
        "</table>" +
        '<p class="wgf-mpd-count">' + list.length + " run" + (list.length === 1 ? "" : "s") + " on this page</p>" +
      "</div>"
    );
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
    var result = form.querySelector("[name='result']");
    if (result) result.value = filters.result;
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
            "&sort=" + encodeURIComponent(filters.sort) +
            (filters.result && filters.result !== "all" ? "&result=" + encodeURIComponent(filters.result) : "")
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

  function paintArtOn(el, slug, name) {
    if (!el) return;
    var art = tileFor(slug);
    el.setAttribute("data-slug", slug);
    el.style.setProperty("--mpd-art", "url('" + art + "')");
    if (!el.querySelector("img.wgf-mpd-card__img, img.wgf-mpd-season__img, img.wgf-mpd-dungeon-hero__img")) {
      var img = artImg(art, el.classList.contains("wgf-mpd-dungeon-hero") ? "wgf-mpd-dungeon-hero__img"
        : el.classList.contains("wgf-mpd-season__tile") ? "wgf-mpd-season__img"
        : "wgf-mpd-card__img", name || "");
      el.insertAdjacentHTML("afterbegin", img);
    }
  }

  function upgradeSeasonLinks(root, currentSlug, filters) {
    var mount = root.querySelector("#pve-season-dungeons, .wgf-mpd-season, [data-mpd-season], .wgf-pve-season");
    if (mount && !mount.querySelector(".wgf-mpd-season__tile, img")) {
      mount.innerHTML = renderSeasonStrip(currentSlug, filters);
      return;
    }
    if (mount && mount.querySelector(".wgf-mpd-season__tile")) return;
    var links = (mount || root).querySelectorAll("a[href*='/pve/mythic-plus/dungeon/']");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (/snapshot/i.test(a.getAttribute("href") || "") || a.classList.contains("wgf-mpd-snap")) continue;
      var slug = slugFromHref(a.getAttribute("href")) || dungeonSlug(textOf(a));
      if (!slug) continue;
      a.classList.add("wgf-mpd-season__tile");
      if (slug === currentSlug) a.classList.add("on");
      paintArtOn(a, slug, textOf(a));
    }
  }

  function currentDungeon(root) {
    var body = root.body || (root.querySelector && root.querySelector("body")) || root;
    var slug = attr(body, "data-slug") || attr(root.documentElement || {}, "data-slug");
    if (!slug && typeof location !== "undefined") slug = slugFromHref(location.pathname);
    slug = dungeonSlug(slug);
    var named = SEASON_DUNGEONS.filter(function (d) { return d.slug === slug; })[0] || {};
    return {
      slug: slug,
      name: attr(body, "data-name") || named.name || "",
      origin: attr(body, "data-origin") || named.origin || "",
      timer: attr(body, "data-timer") || named.timer || "",
      loadscreen: attr(body, "data-loadscreen"),
      rankedRuns: attr(body, "data-ranked"),
      highestKey: attr(body, "data-highest-key"),
      fastestTimed: attr(body, "data-fastest"),
    };
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

  function hydrateDungeon(root) {
    var scope = root || (typeof document !== "undefined" ? document : null);
    if (!scope || !scope.querySelector) return [];
    var dungeon = currentDungeon(scope);
    var filters = readFilters((typeof location !== "undefined" && location.search) || "");
    if (!filters.sort || filters.sort === "name") filters.sort = "key";
    applyFilters(scope.querySelector("#pve-dungeon-filters, form.wgf-mpd-filters"), filters);

    var table = scope.querySelector("#pve-dungeon-runs, table.wgf-mpd-runsource, table.wgf-pve-table");
    var runs = [];
    if (typeof window !== "undefined" && window.__WGF_PVE_DUNGEON__ && Array.isArray(window.__WGF_PVE_DUNGEON__.runs)) {
      runs = window.__WGF_PVE_DUNGEON__.runs;
    } else {
      runs = parseRunTable(table);
    }

    var metaList = scope.querySelector("#pve-dungeon-meta, .wgf-mpd-meta__source, .wgf-pve-meta");
    var meta = [];
    if (typeof window !== "undefined" && window.__WGF_PVE_DUNGEON__ && Array.isArray(window.__WGF_PVE_DUNGEON__.meta)) {
      meta = window.__WGF_PVE_DUNGEON__.meta;
    } else {
      meta = parseMeta(metaList);
    }

    var heroMount = scope.querySelector("#pve-dungeon-hero, .wgf-mpd-dungeon-hero");
    if (heroMount) {
      heroMount.outerHTML = renderHero(dungeon, filters, runs);
    } else {
      var main = scope.querySelector("main.wgf-mpd-dungeon, main.wgf-mpd");
      if (main) main.insertAdjacentHTML("afterbegin", renderHero(dungeon, filters, runs));
    }

    var seasonMount = scope.querySelector("#pve-season-dungeons, .wgf-mpd-season");
    if (seasonMount) {
      seasonMount.outerHTML = renderSeasonStrip(dungeon.slug, filters);
    } else {
      upgradeSeasonLinks(scope, dungeon.slug, filters);
    }

    var metaMount = scope.querySelector("#pve-dungeon-meta-board, .wgf-mpd-meta");
    var metaHtml = renderMetaBoard(meta, dungeon.name);
    if (metaMount) {
      if (metaHtml) {
        metaMount.outerHTML = metaHtml;
      }
    } else if (metaHtml) {
      var afterSeason = scope.querySelector(".wgf-mpd-season");
      if (afterSeason) afterSeason.insertAdjacentHTML("afterend", metaHtml);
    }
    if (metaList) {
      metaList.hidden = true;
      metaList.setAttribute("aria-hidden", "true");
    }

    var podiumMount = scope.querySelector("#pve-dungeon-podium, .wgf-mpd-podium");
    var podium = renderPodium(runs);
    if (podiumMount) {
      podiumMount.outerHTML = podium || '<p class="wgf-mpd-empty">No podium runs in this snapshot.</p>';
    } else if (podium) {
      var boardAnchor = scope.querySelector("#pve-dungeon-board, form.wgf-mpd-filters");
      if (boardAnchor) boardAnchor.insertAdjacentHTML("beforebegin", podium);
    }

    var board = scope.querySelector("#pve-dungeon-board, .wgf-mpd-runboard-mount");
    if (board) {
      board.innerHTML = renderRunBoard(runs, filters);
      board.hidden = false;
    }
    if (table) {
      table.hidden = true;
      table.setAttribute("aria-hidden", "true");
    }

    var page = scope.body || scope.querySelector && scope.querySelector("body") || scope;
    if (page && page.style) {
      page.setAttribute("data-slug", dungeon.slug);
      page.style.setProperty("--mpd-art", "url('" + artFor(dungeon) + "')");
    }
    return runs;
  }

  function boot(root) {
    var scope = root || (typeof document !== "undefined" ? document : null);
    if (!scope || !scope.querySelector) return [];
    var dungeonPage = scope.querySelector("[data-wgf-page='pve-dungeon'], .wgf-mpd-dungeon") ||
      (scope.body && (scope.body.getAttribute("data-wgf-page") === "pve-dungeon" || scope.body.classList.contains("wgf-mpd-dungeon")));
    if (dungeonPage) return hydrateDungeon(scope);
    return hydrate(scope);
  }

  return {
    TILE_DIR: TILE_DIR,
    TILES: TILES,
    DEFAULT_TILE: DEFAULT_TILE,
    NAME_ALIASES: NAME_ALIASES,
    SEASON_DUNGEONS: SEASON_DUNGEONS,
    BOARD_BASE: BOARD_BASE,
    LIST_BASE: LIST_BASE,
    slugify: slugify,
    dungeonSlug: dungeonSlug,
    tileFor: tileFor,
    artFor: artFor,
    classSlug: classSlug,
    classIcon: classIcon,
    factionIcon: factionIcon,
    dungeonHref: dungeonHref,
    snapshotsHref: snapshotsHref,
    slugFromHref: slugFromHref,
    parseRow: parseRow,
    parseTable: parseTable,
    parseRunRow: parseRunRow,
    parseRunTable: parseRunTable,
    parseMeta: parseMeta,
    readFilters: readFilters,
    sortDungeons: sortDungeons,
    sortRuns: sortRuns,
    filterRuns: filterRuns,
    renderBoard: renderBoard,
    renderCard: renderCard,
    renderSeasonStrip: renderSeasonStrip,
    renderHero: renderHero,
    renderPodium: renderPodium,
    renderRunBoard: renderRunBoard,
    renderMetaBoard: renderMetaBoard,
    applyFilters: applyFilters,
    hydrate: hydrate,
    hydrateDungeon: hydrateDungeon,
    boot: boot,
    seasonRoster: seasonRoster,
  };
});

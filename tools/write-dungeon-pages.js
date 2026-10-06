#!/usr/bin/env node
/* Generate thin per-dungeon preview pages. Production hydrates the live
   # / Player / Key / Time / Result / M+ rating / Item level table. */
"use strict";

const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..", "pve", "mythic-plus", "dungeon");

const SEASON = [
  { slug: "altar-of-fangs", name: "Altar of Fangs", origin: "Midnight", timer: "32:00", ranked: 174 },
  { slug: "den-of-nalorakk", name: "Den of Nalorakk", origin: "Midnight", timer: "30:00", ranked: 168 },
  { slug: "kings-rest", name: "Kings' Rest", origin: "Battle for Azeroth", timer: "36:00", ranked: 181 },
  { slug: "murder-row", name: "Murder Row", origin: "Midnight", timer: "30:00", ranked: 159 },
  { slug: "ruby-life-pools", name: "Ruby Life Pools", origin: "Dragonflight", timer: "30:00", ranked: 190 },
  { slug: "temple-of-sethraliss", name: "Temple of Sethraliss", origin: "Battle for Azeroth", timer: "33:00", ranked: 164 },
  { slug: "the-blinding-vale", name: "The Blinding Vale", origin: "Midnight", timer: "34:00", ranked: 176 },
  { slug: "voidscar-arena", name: "Voidscar Arena", origin: "Midnight", timer: "28:00", ranked: 173 },
];

/* First page of the live US Altar board (2026-08-22). */
const ALTAR_RUNS = [
  [1, "Kev", "Holy Paladin", "Drenden", "+12", "30:21", "Depleted", "3018", "270"],
  [2, "Jasonqthehe", "Devourer Demon Hunter", "Frostmourne", "+11", "27:39", "Timed", "1174", "291"],
  [3, "Mordiggian", "Blood Death Knight", "Laughing Skull", "+11", "30:04", "Depleted", "2400", "299"],
  [4, "Suiseimage", "Arcane Mage", "Tichondrius", "+11", "33:22", "Depleted", "2474", "299"],
  [5, "Eighthour", "Preservation Evoker", "Bleeding Hollow", "+11", "37:24", "Depleted", "2176", "295"],
  [6, "Balddia", "Fire Mage", "Moon Guard", "+11", "40:59", "Depleted", "2002", "266"],
  [7, "Yokkuu", "Holy Paladin", "Malganis", "+10", "22:46", "Timed", "1388", "274"],
  [8, "Rakalaka", "Mistweaver Monk", "Sargeras", "+10", "22:58", "Timed", "2805", "307"],
  [9, "Fivew", "Elemental Shaman", "Illidan", "+10", "25:37", "Timed", "2492", "295"],
  [10, "Sugarveggie", "Arms Warrior", "Illidan", "+10", "26:40", "Timed", "2575", "308"],
  [11, "Nahte", "Subtlety Rogue", "Stormrage", "+10", "26:48", "Timed", "1791", "263"],
  [12, "Unassuring", "Havoc Demon Hunter", "Frostmourne", "+10", "27:08", "Timed", "2445", "301"],
  [13, "Deadjkwog", "Retribution Paladin", "Stormrage", "+10", "30:57", "Depleted", "2666", "301"],
  [14, "Boring", "Arms Warrior", "Turalyon", "+10", "31:05", "Depleted", "2151", "267"],
  [15, "Sitten", "Outlaw Rogue", "Emerald Dream", "+10", "31:59", "Depleted", "2201", "292"],
  [16, "Mindeater", "Discipline Priest", "Dalaran", "+10", "33:36", "Depleted", "2443", "305"],
  [17, "Voidxelfx", "Arcane Mage", "Proudmoore", "+10", "33:43", "Depleted", "2467", "307"],
  [18, "Nostaxo", "Frost Mage", "Stormrage", "+10", "37:13", "Depleted", "2536", "302"],
  [19, "Redzêrg", "Arms Warrior", "Illidan", "+10", "38:35", "Depleted", "2385", "307"],
  [20, "Ancestraljr", "Restoration Shaman", "Icecrown", "+10", "38:47", "Depleted", "2042", "296"],
];

const ALTAR_META = [
  ["Arms Warrior", "1.7%", "3"],
  ["Arcane Mage", "1.1%", "2"],
  ["Holy Paladin", "1.1%", "2"],
  ["Balance Druid", "0.6%", "1"],
  ["Preservation Evoker", "0.6%", "1"],
  ["Fire Mage", "0.6%", "1"],
  ["Frost Mage", "0.6%", "1"],
  ["Blood Death Knight", "0.6%", "1"],
  ["Retribution Paladin", "0.6%", "1"],
  ["Discipline Priest", "0.6%", "1"],
  ["Outlaw Rogue", "0.6%", "1"],
  ["Subtlety Rogue", "0.6%", "1"],
];

/* Sibling preview rows — named after the listing top run, then extra
   shapes so the board is not a single line. Production replaces these. */
const SIBLING = {
  "den-of-nalorakk": {
    seed: ["Kezra", "Beast Mastery Hunter", "Illidan", "+17", "25:08"],
    extra: [
      ["Thalys", "Preservation Evoker", "Stormrage", "+16", "26:41", "Timed", "2210", "301"],
      ["Vesh", "Blood Death Knight", "Tichondrius", "+16", "31:02", "Depleted", "1988", "294"],
      ["Nerith", "Discipline Priest", "Area 52", "+15", "24:18", "Timed", "2401", "299"],
      ["Oruun", "Restoration Shaman", "Mal'Ganis", "+15", "29:55", "Timed", "1760", "288"],
      ["Qaleth", "Havoc Demon Hunter", "Illidan", "+14", "22:11", "Timed", "2512", "304"],
      ["Lyraen", "Assassination Rogue", "Moon Guard", "+14", "28:40", "Depleted", "1882", "291"],
      ["Silex", "Protection Paladin", "Area 52", "+13", "23:04", "Timed", "1644", "286"],
    ],
    meta: [
      ["Beast Mastery Hunter", "2.1%", "4"],
      ["Blood Death Knight", "1.2%", "2"],
      ["Restoration Shaman", "1.2%", "2"],
    ],
  },
  "kings-rest": {
    seed: ["Vesh", "Blood Death Knight", "Tichondrius", "+16", "29:54"],
    extra: [
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+16", "33:10", "Depleted", "2011", "293"],
      ["Thalys", "Preservation Evoker", "Stormrage", "+15", "27:02", "Timed", "2190", "300"],
      ["Silex", "Protection Paladin", "Area 52", "+15", "30:44", "Timed", "1888", "289"],
      ["Oruun", "Restoration Shaman", "Mal'Ganis", "+14", "26:18", "Timed", "1742", "284"],
      ["Nerith", "Discipline Priest", "Area 52", "+14", "31:55", "Depleted", "2304", "297"],
      ["Lyraen", "Assassination Rogue", "Moon Guard", "+13", "24:09", "Timed", "1995", "292"],
    ],
    meta: [
      ["Blood Death Knight", "1.8%", "3"],
      ["Protection Paladin", "1.2%", "2"],
      ["Discipline Priest", "1.2%", "2"],
    ],
  },
  "murder-row": {
    seed: ["Lyraen", "Assassination Rogue", "Moon Guard", "+18", "24:12"],
    extra: [
      ["Qaleth", "Havoc Demon Hunter", "Illidan", "+17", "23:40", "Timed", "2601", "305"],
      ["Silex", "Protection Paladin", "Area 52", "+17", "28:02", "Timed", "2144", "298"],
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+16", "25:16", "Timed", "1980", "291"],
      ["Nerith", "Discipline Priest", "Area 52", "+16", "29:33", "Depleted", "2410", "300"],
      ["Thalys", "Preservation Evoker", "Stormrage", "+15", "24:51", "Timed", "2208", "296"],
      ["Vesh", "Blood Death Knight", "Tichondrius", "+15", "27:19", "Timed", "1876", "288"],
    ],
    meta: [
      ["Assassination Rogue", "2.4%", "4"],
      ["Havoc Demon Hunter", "1.2%", "2"],
      ["Arcane Mage", "1.2%", "2"],
    ],
  },
  "ruby-life-pools": {
    seed: ["Thalys", "Preservation Evoker", "Stormrage", "+16", "26:03"],
    extra: [
      ["Nerith", "Discipline Priest", "Area 52", "+16", "28:47", "Timed", "2388", "302"],
      ["Oruun", "Restoration Shaman", "Mal'Ganis", "+15", "25:11", "Timed", "1810", "287"],
      ["Silex", "Holy Paladin", "Area 52", "+15", "29:40", "Depleted", "2055", "293"],
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+14", "23:22", "Timed", "1922", "290"],
      ["Qaleth", "Havoc Demon Hunter", "Illidan", "+14", "26:58", "Timed", "2440", "301"],
      ["Lyraen", "Assassination Rogue", "Moon Guard", "+13", "22:05", "Timed", "1766", "284"],
    ],
    meta: [
      ["Preservation Evoker", "2.0%", "4"],
      ["Discipline Priest", "1.5%", "3"],
      ["Restoration Shaman", "1.0%", "2"],
    ],
  },
  "temple-of-sethraliss": {
    seed: ["Oruun", "Restoration Shaman", "Mal'Ganis", "+15", "28:17"],
    extra: [
      ["Thalys", "Preservation Evoker", "Stormrage", "+15", "29:01", "Timed", "2166", "299"],
      ["Silex", "Holy Paladin", "Area 52", "+14", "26:44", "Timed", "1904", "288"],
      ["Vesh", "Blood Death Knight", "Tichondrius", "+14", "31:12", "Depleted", "1788", "286"],
      ["Nerith", "Discipline Priest", "Area 52", "+13", "25:08", "Timed", "2290", "297"],
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+13", "27:36", "Timed", "1640", "281"],
      ["Lyraen", "Assassination Rogue", "Moon Guard", "+12", "23:19", "Timed", "1712", "279"],
    ],
    meta: [
      ["Restoration Shaman", "1.9%", "3"],
      ["Holy Paladin", "1.3%", "2"],
      ["Elemental Shaman", "0.6%", "1"],
    ],
  },
  "the-blinding-vale": {
    seed: ["Nerith", "Discipline Priest", "Area 52", "+17", "31:06"],
    extra: [
      ["Thalys", "Preservation Evoker", "Stormrage", "+16", "29:48", "Timed", "2233", "300"],
      ["Silex", "Holy Paladin", "Area 52", "+16", "33:21", "Depleted", "2010", "294"],
      ["Qaleth", "Havoc Demon Hunter", "Illidan", "+15", "27:04", "Timed", "2488", "303"],
      ["Oruun", "Restoration Shaman", "Mal'Ganis", "+15", "30:12", "Timed", "1799", "289"],
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+14", "26:33", "Timed", "1881", "286"],
      ["Vesh", "Blood Death Knight", "Tichondrius", "+14", "32:40", "Depleted", "1704", "284"],
    ],
    meta: [
      ["Discipline Priest", "2.2%", "4"],
      ["Preservation Evoker", "1.1%", "2"],
      ["Holy Paladin", "1.1%", "2"],
    ],
  },
  "voidscar-arena": {
    seed: ["Qaleth", "Havoc Demon Hunter", "Illidan", "+18", "22:58"],
    extra: [
      ["Lyraen", "Assassination Rogue", "Moon Guard", "+17", "23:11", "Timed", "2310", "298"],
      ["Kezra", "Beast Mastery Hunter", "Illidan", "+17", "25:40", "Timed", "2044", "292"],
      ["Silex", "Protection Paladin", "Area 52", "+16", "24:02", "Timed", "1966", "290"],
      ["Nerith", "Discipline Priest", "Area 52", "+16", "27:55", "Depleted", "2398", "301"],
      ["Thalys", "Preservation Evoker", "Stormrage", "+15", "22:18", "Timed", "2180", "297"],
      ["Vesh", "Blood Death Knight", "Tichondrius", "+15", "26:07", "Timed", "1812", "285"],
    ],
    meta: [
      ["Havoc Demon Hunter", "2.6%", "5"],
      ["Assassination Rogue", "1.2%", "2"],
      ["Arcane Mage", "1.2%", "2"],
    ],
  },
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runsFor(d) {
  if (d.slug === "altar-of-fangs") return ALTAR_RUNS;
  const pack = SIBLING[d.slug];
  const seed = pack.seed;
  const first = [1, seed[0], seed[1], seed[2], seed[3], seed[4], "Timed", "3124", "306"];
  return [first].concat(pack.extra.map((row, i) => [i + 2].concat(row.slice(0, 8))));
}

function metaFor(d) {
  return d.slug === "altar-of-fangs" ? ALTAR_META : SIBLING[d.slug].meta;
}

function runRows(runs) {
  return runs.map(function (r) {
    return (
      "          <tr data-rank=\"" + r[0] + "\" data-player=\"" + esc(r[1]) +
      "\" data-spec=\"" + esc(r[2]) + "\" data-realm=\"" + esc(r[3]) +
      "\" data-key=\"" + esc(r[4]) + "\" data-time=\"" + esc(r[5]) +
      "\" data-result=\"" + esc(r[6]) + "\" data-rating=\"" + esc(r[7]) +
      "\" data-ilvl=\"" + esc(r[8]) + "\">\n" +
      "            <td>" + r[0] + "</td>\n" +
      "            <td>" + esc(r[1]) + " " + esc(r[2]) + " · " + esc(r[3]) + "</td>\n" +
      "            <td>" + esc(r[4]) + "</td>\n" +
      "            <td>" + esc(r[5]) + "</td>\n" +
      "            <td>" + esc(r[6]) + "</td>\n" +
      "            <td>" + esc(r[7]) + "</td>\n" +
      "            <td>" + esc(r[8]) + "</td>\n" +
      "          </tr>"
    );
  }).join("\n");
}

function metaItems(meta) {
  return meta.map(function (m) {
    return (
      "          <li data-spec=\"" + esc(m[0]) + "\" data-share=\"" + esc(m[1]) +
      "\" data-count=\"" + esc(m[2]) + "\">" + esc(m[0]) + " " + esc(m[1]) + " " + esc(m[2]) + "</li>"
    );
  }).join("\n");
}

function page(d) {
  const art = "/assets/dungeon-tiles/" + d.slug + ".jpg";
  const runs = runsFor(d);
  const meta = metaFor(d);
  const note = d.slug === "altar-of-fangs"
    ? "Preview of the per-dungeon board. Hero / picker art is the official Altar of Fangs loading screen. The 20 runs and meta specs are from the live US ladder (page 1 of 2, 174 ranked runs). Production hydrates the existing table — it does not invent ranks."
    : "Preview of the per-dungeon board. Hero / picker art is the official " + d.name + " loading screen. Runners below are fixtures so the board has a body — production hydrates the live # / Player / Key / Time / Result / M+ rating / Item level table.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(d.name)} Mythic+ Leaderboard (US) — TheWoWDB</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Crimson+Text:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap">
  <link rel="stylesheet" href="/preview.css">
  <link rel="stylesheet" href="/assets/wgf-pve-dungeons.css">
</head>
<body class="wgf-shell-page" data-wgf-page="pve-dungeon" data-slug="${esc(d.slug)}" data-name="${esc(d.name)}" data-origin="${esc(d.origin)}" data-timer="${esc(d.timer)}" data-ranked="${d.ranked}" style="--mpd-art:url('${art}')">
  <nav class="wgf-seo-breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/pve/">PvE</a></li>
      <li><a href="/pve/mythic-plus/">Mythic+</a></li>
      <li><a href="/pve/mythic-plus/dungeons/">Dungeons</a></li>
      <li aria-current="page">${esc(d.name)}</li>
    </ol>
  </nav>

  <main class="wgf-mpd wgf-mpd-dungeon">
    <header class="wgf-mpd-dungeon-hero" data-slug="${esc(d.slug)}" style="--mpd-art:url('${art}')">
      <img class="wgf-mpd-dungeon-hero__img" src="${art}" alt="${esc(d.name)}" width="600" height="300">
      <div class="wgf-mpd-dungeon-hero__veil" aria-hidden="true"></div>
      <div class="wgf-mpd-dungeon-hero__copy">
        <span class="wgf-mpd-origin">${esc(d.origin)}</span>
        <h1>${esc(d.name)}</h1>
        <p class="wgf-mpd-sub">Best keys and fastest times in this dungeon — US · Season 18.</p>
      </div>
    </header>

    <p class="wgf-mpd-preview-note">${esc(note)}</p>

    <div id="pve-season-dungeons" class="wgf-mpd-season" data-mpd-season></div>

    <p class="wgf-mpd-snapline">
      <a class="wgf-mpd-snap" href="/pve/mythic-plus/dungeon/${esc(d.slug)}/snapshots/">Group snapshots for ${esc(d.name)}: see the full team comps and their gear →</a>
    </p>

    <ol id="pve-dungeon-meta" class="wgf-mpd-meta__source">
${metaItems(meta)}
    </ol>
    <div id="pve-dungeon-meta-board" class="wgf-mpd-meta" hidden></div>

    <form class="wgf-mpd-filters" id="pve-dungeon-filters" method="get" action="/pve/mythic-plus/dungeon/${esc(d.slug)}/">
      <div class="wgf-mpd-regions" role="group" aria-label="Region">
        <a class="wgf-mpd-region on" data-region="us" href="?region=us&amp;season=18">US</a>
        <a class="wgf-mpd-region" data-region="eu" href="?region=eu&amp;season=18">EU</a>
        <a class="wgf-mpd-region" data-region="kr" href="?region=kr&amp;season=18">KR</a>
        <a class="wgf-mpd-region" data-region="tw" href="?region=tw&amp;season=18">TW</a>
      </div>
      <label class="wgf-mpd-label" for="mpd-season">Season
        <select class="wgf-mpd-sel" id="mpd-season" name="season" onchange="this.form.submit()">
          <option value="18" selected>Season 18</option>
          <option value="17">Season 17</option>
        </select>
      </label>
      <label class="wgf-mpd-label" for="mpd-sort">Sort
        <select class="wgf-mpd-sel" id="mpd-sort" name="sort" onchange="this.form.submit()">
          <option value="key" selected>Key</option>
          <option value="time">Time</option>
          <option value="result">Result</option>
          <option value="rating">M+ rating</option>
          <option value="ilvl">Item level</option>
        </select>
      </label>
      <label class="wgf-mpd-label" for="mpd-result">Result
        <select class="wgf-mpd-sel" id="mpd-result" name="result" onchange="this.form.submit()">
          <option value="all" selected>All runs</option>
          <option value="timed">Timed</option>
          <option value="depleted">Depleted</option>
        </select>
      </label>
      <input type="hidden" name="region" value="us">
    </form>

    <div id="pve-dungeon-podium" class="wgf-mpd-podium" hidden></div>

    <table class="wgf-pve-table wgf-mpd-runsource" id="pve-dungeon-runs">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Key</th>
          <th>Time</th>
          <th>Result</th>
          <th>M+ rating</th>
          <th>Item level</th>
        </tr>
      </thead>
      <tbody>
${runRows(runs)}
      </tbody>
    </table>

    <div id="pve-dungeon-board" class="wgf-mpd-runboard-mount" hidden></div>

    <section class="wgf-mpd-explore">
      <h2>Explore more</h2>
      <a href="/pve/mythic-plus/dungeons/">All dungeon boards</a>
      <a href="/pve/mythic-plus/">Mythic+ rating ladder</a>
    </section>
  </main>

  <script src="/assets/wgf-pve-dungeons.js"></script>
  <script>
    window.WgfPveDungeons.boot(document);
  </script>
</body>
</html>
`;
}

for (const d of SEASON) {
  const dir = join(ROOT, d.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(d));
  console.log("wrote", d.slug);
}

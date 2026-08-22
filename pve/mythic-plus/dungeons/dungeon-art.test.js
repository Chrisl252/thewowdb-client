"use strict";

const { readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const assert = require("node:assert/strict");

const api = require("../../../assets/wgf-pve-dungeons.js");
const css = readFileSync(join(dirname(__filename), "../../../assets/wgf-pve-dungeons.css"), "utf8");
const html = readFileSync(join(dirname(__filename), "index.html"), "utf8");

const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

const season = [
  ["Altar of Fangs", "altar-of-fangs", "skyreach.jpg"],
  ["Den of Nalorakk", "den-of-nalorakk", "pit-of-saron.jpg"],
  ["Kings' Rest", "kings-rest", "magisters-terrace.jpg"],
  ["Murder Row", "murder-row", "windrunner-spire.jpg"],
  ["Ruby Life Pools", "ruby-life-pools", "algethar-academy.jpg"],
  ["Temple of Sethraliss", "temple-of-sethraliss", "skyreach.jpg"],
  ["The Blinding Vale", "the-blinding-vale", "seat-of-the-triumvirate.jpg"],
  ["Voidscar Arena", "voidscar-arena", "seat-of-the-triumvirate.jpg"],
];

for (const [name, slug, tile] of season) {
  check(api.dungeonSlug(name) === slug, "slug(" + name + ") → " + api.dungeonSlug(name));
  check(api.tileFor(name).endsWith(tile), name + " should use " + tile + " but got " + api.tileFor(name));
  check(api.tileFor(slug).endsWith(tile), slug + " should use " + tile);
}

check(api.tileFor("Some Future Dungeon").endsWith(api.DEFAULT_TILE), "unknown dungeon falls back to default tile");
check(api.artFor({ slug: "murder-row", loadscreen: "1033059" }).includes("loading-screens/1033059.jpg"), "official loadscreen FileDataID wins when present");
check(api.artFor({ slug: "murder-row", loadscreen: "not-an-id" }).includes("windrunner-spire.jpg"), "invalid loadscreen id does not invent a URL");

check(api.classSlug("Demon Hunter") === "demonhunter", "demon hunter class slug");
check(api.classIcon("mage").endsWith("classicon_mage.jpg"), "mage class icon is first-party");
check(api.classIcon("") === "", "empty class does not invent an icon");
check(api.factionIcon("Horde").endsWith("ui_hordeicon.jpg"), "horde crest is first-party");

const filters = api.readFilters("?region=eu&season=18&sort=key");
check(filters.region === "eu" && filters.season === "18" && filters.sort === "key", "region/season/sort query params");
check(api.readFilters("?region=xx&season=nope&sort=nope").region === "us", "bad region falls back to us");
check(api.readFilters("?region=xx&season=nope").season === "18", "bad season falls back to 18");

const sorted = api.sortDungeons(
  [
    { name: "B", highestKey: "16", fastestTimed: "30:00", rankedRuns: "10" },
    { name: "A", highestKey: "18", fastestTimed: "22:00", rankedRuns: "4" },
  ],
  "key"
);
check(sorted[0].name === "A", "sort by highest key");

const row = {
  getAttribute: function (name) {
    const attrs = {
      "data-slug": "murder-row",
      "data-name": "Murder Row",
      "data-top-player": "Lyraen",
      "data-top-class": "rogue",
      "data-top-key": "18",
      "data-highest-key": "18",
      "data-fastest": "24:12",
      "data-ranked": "159",
      "data-affixes": "Tyrannical, Fortified",
      "data-party": "rogue,mage",
      "data-score": "312.4",
    };
    return attrs[name] || "";
  },
  cells: [],
};
const parsed = api.parseRow(row);
check(parsed.affixes.length === 2, "affixes parse from data-affixes");
check(parsed.party.length === 2, "party parse from data-party");
check(parsed.score === "312.4", "score is surfaced when present");

const rich = api.renderCard(parsed, { region: "us", season: "18" });
check(rich.includes("dungeon-tiles/windrunner-spire.jpg"), "card uses mapped tile");
check(rich.includes("classicon_rogue.jpg"), "card shows class icon");
check(rich.includes("Tyrannical"), "card shows affixes when present");
check(rich.includes("312.4"), "card shows score when present");
check(rich.includes("Full board"), "card links to the full board");
check(rich.includes("Group snapshots"), "card keeps group snapshots");

const bare = api.renderCard(
  { slug: "den-of-nalorakk", name: "Den of Nalorakk", highestKey: "17", fastestTimed: "25:08", rankedRuns: "168" },
  { region: "us", season: "18" }
);
check(!bare.includes("wgf-mpd-affix"), "affixes omitted when the API did not send them");
check(!bare.includes("Score"), "score omitted when the API did not send it");
check(bare.includes("Highest key"), "five live columns still render as card stats");

check(!/rgba\(\s*12\s*,\s*12\s*,\s*30/.test(css), "no condemned navy tooltip gradient");
check(!/rgba\(\s*5\s*,\s*5\s*,\s*16/.test(css), "no condemned navy tooltip well");
check(css.includes("classhall-stone-tile.png"), "Class Hall stone plates");
check(css.includes("dungeon-tiles/seat-of-the-triumvirate.jpg"), "page uses a first-party dungeon tile");
check(css.includes(".wgf-mpd-card__art"), "cards have an art banner");

check(html.includes('data-wgf-page="pve-dungeons"'), "preview is scoped to the dungeon listing");
check(html.includes("Home") && html.includes("PvE") && html.includes("Mythic+"), "breadcrumbs Home > PvE > Mythic+ > Dungeons");
check(html.includes("1,383") || html.includes("1383"), "page total ranked runs from the live board");
check(html.includes("Season 18"), "season filter is present");
for (const [name] of season) {
  check(html.includes(name), "season dungeon present: " + name);
}

if (fails.length) {
  console.error("M+ dungeon board checks failed:");
  fails.forEach(function (f) { console.error(" - " + f); });
  process.exit(1);
}
console.log("M+ dungeon board checks passed (" + season.length + " dungeons, art mapping, extras-if-present)");

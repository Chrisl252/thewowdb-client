"use strict";

const { existsSync, readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const assert = require("node:assert/strict");

const api = require("../../../assets/wgf-pve-dungeons.js");
const css = readFileSync(join(dirname(__filename), "../../../assets/wgf-pve-dungeons.css"), "utf8");
const html = readFileSync(join(dirname(__filename), "index.html"), "utf8");
const tileDir = join(dirname(__filename), "../../../assets/dungeon-tiles");

const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

const season = [
  ["Altar of Fangs", "altar-of-fangs", "altar-of-fangs.jpg"],
  ["Den of Nalorakk", "den-of-nalorakk", "den-of-nalorakk.jpg"],
  ["Kings' Rest", "kings-rest", "kings-rest.jpg"],
  ["Murder Row", "murder-row", "murder-row.jpg"],
  ["Ruby Life Pools", "ruby-life-pools", "ruby-life-pools.jpg"],
  ["Temple of Sethraliss", "temple-of-sethraliss", "temple-of-sethraliss.jpg"],
  ["The Blinding Vale", "the-blinding-vale", "the-blinding-vale.jpg"],
  ["Voidscar Arena", "voidscar-arena", "voidscar-arena.jpg"],
];

for (const [name, slug, tile] of season) {
  check(api.dungeonSlug(name) === slug, "slug(" + name + ") → " + api.dungeonSlug(name));
  check(api.tileFor(name).endsWith(tile), name + " should use " + tile + " but got " + api.tileFor(name));
  check(api.tileFor(slug).endsWith(tile), slug + " should use " + tile);
  check(existsSync(join(tileDir, tile)), "first-party tile exists: " + tile);
  check(css.includes("dungeon-tiles/" + tile), "CSS binds --mpd-art for " + tile);
  check(!api.tileFor(slug).includes("skyreach.jpg"), slug + " must not use a Season 1 stand-in");
}

check(api.tileFor("Some Future Dungeon").endsWith(api.DEFAULT_TILE), "unknown dungeon falls back to default tile");
check(api.artFor({ slug: "murder-row", loadscreen: "1033059" }).includes("loading-screens/1033059.jpg"), "official loadscreen FileDataID wins when present");
check(api.artFor({ slug: "murder-row", loadscreen: "not-an-id" }).includes("murder-row.jpg"), "invalid loadscreen id does not invent a URL");

check(api.classSlug("Demon Hunter") === "demonhunter", "demon hunter class slug");
check(api.classIcon("mage").endsWith("classicon_mage.jpg"), "mage class icon is first-party");
check(api.classIcon("") === "", "empty class does not invent an icon");
check(api.factionIcon("Horde").endsWith("ui_hordeicon.jpg"), "horde crest is first-party");

const filters = api.readFilters("?region=eu&season=18&sort=key");
check(filters.region === "eu" && filters.season === "18" && filters.sort === "key", "region/season/sort query params");
check(api.readFilters("?region=xx&season=nope&sort=nope").region === "us", "bad region falls back to us");
check(api.readFilters("?region=xx&season=nope").season === "18", "bad season falls back to 18");
check(api.readFilters("?result=timed").result === "timed", "result=timed filter");

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
check(rich.includes("dungeon-tiles/murder-row.jpg"), "card uses this dungeon's own tile");
check(rich.includes("<img"), "card paints an img so a missing CSS background cannot leave a gold box");
check(rich.includes("/pve/mythic-plus/dungeon/murder-row/"), "card links to the singular dungeon board");
check(!rich.includes("/pve/mythic-plus/dungeons/murder-row/"), "card does not use the plural listing path for a slug");
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
check(bare.includes("dungeon-tiles/den-of-nalorakk.jpg"), "bare card still has Den of Nalorakk art");

const strip = api.renderSeasonStrip("altar-of-fangs", { region: "us", season: "18" });
check(strip.includes("dungeon-tiles/altar-of-fangs.jpg"), "season picker has Altar art");
check(strip.includes("dungeon-tiles/voidscar-arena.jpg"), "season picker has Voidscar art");
check((strip.match(/wgf-mpd-season__img/g) || []).length === 8, "season picker paints an img on every dungeon");
check(strip.includes('aria-current="page"'), "current dungeon is marked in the picker");

const altarRuns = [
  { rank: "1", player: "Kev", specClass: "Holy Paladin", className: "paladin", realm: "Drenden", key: "+12", time: "30:21", result: "Depleted", timed: false, rating: "3018", ilvl: "270" },
  { rank: "2", player: "Jasonqthehe", specClass: "Devourer Demon Hunter", className: "demon hunter", realm: "Frostmourne", key: "+11", time: "27:39", result: "Timed", timed: true, rating: "1174", ilvl: "291" },
];
const hero = api.renderHero({ slug: "altar-of-fangs", name: "Altar of Fangs", origin: "Midnight", timer: "32:00" }, { region: "us", season: "18" }, altarRuns);
check(hero.includes("dungeon-tiles/altar-of-fangs.jpg"), "Altar hero uses Altar art");
check(hero.includes("wgf-mpd-dungeon-hero__img"), "Altar hero paints an img, not an empty gold frame");
check(hero.includes("Altar of Fangs"), "hero names the dungeon");
check(hero.includes("32:00"), "hero surfaces the timer when present");
check(hero.includes("Timed"), "hero counts timed runs from existing rows");

const board = api.renderRunBoard(altarRuns, { sort: "key", result: "all" });
check(board.includes("M+ rating"), "run board keeps the live rating column");
check(board.includes("Item level"), "run board keeps the live ilvl column");
check(board.includes("Jasonqthehe"), "run board lists players from the table");
check(api.filterRuns(altarRuns, { result: "timed" }).length === 1, "result=timed keeps timed keys only");

const runRow = {
  getAttribute: function (name) {
    const attrs = {
      "data-player": "Kev",
      "data-spec": "Holy Paladin",
      "data-realm": "Drenden",
      "data-key": "+12",
      "data-time": "30:21",
      "data-result": "Depleted",
      "data-rating": "3018",
      "data-ilvl": "270",
    };
    return attrs[name] || "";
  },
  cells: [],
};
const run = api.parseRunRow(runRow);
check(run.player === "Kev" && run.rating === "3018" && run.ilvl === "270", "parseRunRow reads the live columns");
check(run.timed === false, "Depleted is not timed");

check(!/rgba\(\s*12\s*,\s*12\s*,\s*30/.test(css), "no condemned navy tooltip gradient");
check(!/rgba\(\s*5\s*,\s*5\s*,\s*16/.test(css), "no condemned navy tooltip well");
check(css.includes("classhall-stone-tile.png"), "Class Hall stone plates");
check(css.includes("dungeon-tiles/the-blinding-vale.jpg"), "page uses a first-party dungeon tile");
check(css.includes(".wgf-mpd-card__art"), "cards have an art banner");
check(css.includes(".wgf-mpd-dungeon-hero"), "per-dungeon hero is styled");
check(css.includes(".wgf-mpd-season__tile"), "season picker tiles are styled");
check(!css.includes("zamimg"), "no Wowhead hotlinks in the sheet");

check(html.includes('data-wgf-page="pve-dungeons"'), "preview is scoped to the dungeon listing");
check(html.includes("Home") && html.includes("PvE") && html.includes("Mythic+"), "breadcrumbs Home > PvE > Mythic+ > Dungeons");
check(html.includes("1,383") || html.includes("1383"), "page total ranked runs from the live board");
check(html.includes("Season 18"), "season filter is present");
check(html.includes("/pve/mythic-plus/dungeon/altar-of-fangs/"), "listing points at the singular Altar board");
for (const [name] of season) {
  check(html.includes(name), "season dungeon present: " + name);
}

const altarHtml = readFileSync(join(dirname(__filename), "../dungeon/altar-of-fangs/index.html"), "utf8");
check(altarHtml.includes('data-wgf-page="pve-dungeon"'), "Altar page is scoped as a dungeon board");
check(altarHtml.includes('data-slug="altar-of-fangs"'), "Altar page declares its slug");
check(altarHtml.includes("/assets/dungeon-tiles/altar-of-fangs.jpg"), "Altar hero img is the Altar tile");
check(altarHtml.includes("Kev"), "Altar page keeps a live ladder row");
check(altarHtml.includes("3018"), "Altar page keeps M+ rating from the live table");
check(altarHtml.includes("Item level"), "Altar page keeps the ilvl column");
check(altarHtml.includes("Arms Warrior"), "Altar page keeps the live meta list");
check(altarHtml.includes("Group snapshots"), "Altar page keeps group snapshots");
check(altarHtml.includes("All dungeon boards"), "Altar page links back to the listing");

for (const [, slug, tile] of season) {
  const page = readFileSync(join(dirname(__filename), "../dungeon/" + slug + "/index.html"), "utf8");
  check(page.includes("dungeon-tiles/" + tile), slug + " page ships its own tile");
  check(page.includes('data-slug="' + slug + '"'), slug + " page sets data-slug");
  check(page.includes("Player") && page.includes("Key") && page.includes("Result"), slug + " page has the live columns");
}

if (fails.length) {
  console.error("M+ dungeon board checks failed:");
  fails.forEach(function (f) { console.error(" - " + f); });
  process.exit(1);
}
console.log("M+ dungeon board checks passed (" + season.length + " dungeons, real art, per-dungeon boards)");

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "item-index.css"),
  "utf8"
);

const fails = [];
if (/rgba\(\s*12\s*,\s*12\s*,\s*30/.test(css) || /rgba\(\s*5\s*,\s*5\s*,\s*16/.test(css)) {
  fails.push("condemned navy tooltip gradient rgba(12,12,30) → rgba(5,5,16) is present");
}
if (!css.includes("dungeon-tiles/magisters-terrace.jpg")) {
  fails.push("missing Magisters' Terrace page/hero tile");
}
if (!css.includes("dungeon-tiles/pit-of-saron.jpg")) {
  fails.push("missing Pit of Saron hero art window");
}
if (!css.includes(".wgf-item-index-layout .wgf-seo-hero")) {
  fails.push("hero restyle is not scoped to the item-index layout");
}
if (!css.includes("classhall-stone-tile.png")) {
  fails.push("missing Class Hall stone plate");
}
if (!css.includes("spellbook-item-iconframe.png")) {
  fails.push("missing spellbook crest frame");
}

if (fails.length) {
  console.error("item-index destination CSS checks failed:");
  fails.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
console.log("item-index destination CSS checks passed");

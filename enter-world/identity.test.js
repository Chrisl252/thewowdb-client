const test = require("node:test");
const assert = require("node:assert/strict");
const fmt = require("../assets/wgf-identity-format.js");

test("realm labels include the region in plain text", () => {
  assert.equal(fmt.formatRealmLabel("Proudmoore", "us"), "Proudmoore US");
  assert.equal(fmt.formatRealmLabel("Faerlina", "US"), "Faerlina US");
  assert.equal(fmt.formatRealmLabel("Proudmoore", ""), "Proudmoore");
});

test("WoW version is a readable word, not an icon key", () => {
  assert.equal(fmt.formatVersionLabel("retail"), "Retail");
  assert.equal(fmt.formatVersionLabel("classic"), "Classic");
  assert.equal(fmt.formatVersionLabel("classic-era"), "Classic Era");
  assert.equal(fmt.formatVersionLabel("Classic Era"), "Classic Era");
});

test("header context keeps realm and version visible together", () => {
  assert.equal(
    fmt.formatHeaderContext({ realmName: "Proudmoore", region: "US", version: "retail" }),
    "Proudmoore US · Retail",
  );
  assert.equal(
    fmt.formatHeaderContext({ realmName: "Benediction", region: "US", version: "classic" }),
    "Benediction US · Classic",
  );
});

test("modal selected banner uses the Selected: realm · version label", () => {
  assert.equal(
    fmt.formatSelectedSummary({ realmName: "Proudmoore", region: "US", version: "retail" }),
    "Selected: Proudmoore US · Retail",
  );
  assert.equal(fmt.formatSelectedSummary({}), "");
});

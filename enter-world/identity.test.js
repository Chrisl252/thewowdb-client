const test = require("node:test");
const assert = require("node:assert/strict");
const fmt = require("../assets/wgf-identity-format.js");
const HID = require("../assets/wgf-header-identity.js");

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

test("Midnight is the Retail expansion, never a realm name", () => {
  assert.equal(fmt.formatExpansionLabel("retail"), "Midnight");
  assert.equal(fmt.formatExpansionLabel("classic"), "");
  assert.equal(
    fmt.formatGameContext({ region: "US", version: "retail" }),
    "US Region · Retail (Midnight)",
  );
  assert.equal(
    fmt.formatGameContext({ region: "us", version: "classic" }),
    "US Region · Classic",
  );
  assert.notEqual(fmt.formatRealmLabel("Proudmoore", "US"), "Midnight");
});

test("live status copy matches the mid-page strip", () => {
  assert.equal(fmt.formatLiveLabel(true), "Live · updated hourly");
  assert.equal(fmt.formatLiveLabel(false), "Offline · last verified");
  assert.equal(fmt.formatCadence(), "Usually refreshed hourly");
  assert.match(fmt.formatLastUpdated("2026-08-22T19:00:00.000Z"), /^Last updated /);
});

test("signed-in status bar includes account, realm, version, and live plate", () => {
  const model = HID.identityModel({
    signed_in: true,
    user: { name: "Alterrboy" },
    active_character: { realm_name: "Proudmoore", region: "US", game: "retail" },
  }, { getItem: () => null });
  const bar = HID.statusBarHTML(model, {
    live: true,
    lastUpdated: "2026-08-22T19:00:00.000Z",
    expansion: "Midnight",
  });
  assert.match(bar, /Alterrboy/);
  assert.match(bar, /Proudmoore US/);
  assert.match(bar, />Retail</);
  assert.match(bar, /Live · updated hourly/);
  assert.match(bar, /Last updated /);
  assert.match(bar, /Usually refreshed hourly/);
  assert.match(bar, /US Region · Retail \(Midnight\)/);
});

test("logged-out status bar still shows default US / Retail context", () => {
  const model = HID.identityModel({ signed_in: false }, { getItem: () => null });
  const bar = HID.statusBarHTML(model, {
    live: true,
    lastUpdated: "2026-08-22T19:00:00.000Z",
    expansion: "Midnight",
  });
  assert.doesNotMatch(bar, /Alterrboy/);
  assert.match(bar, /US Region · Retail \(Midnight\)/);
  assert.match(bar, /Live · updated hourly/);
});

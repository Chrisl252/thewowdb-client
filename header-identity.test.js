const test = require("node:test");
const assert = require("node:assert/strict");
const HID = require("./assets/wgf-header-identity.js");

function mem(seed) {
  const data = Object.assign({}, seed || {});
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; },
    _data: data
  };
}

test("account label strips the battletag discriminator", () => {
  assert.equal(
    HID.accountLabel({ user: { battletag: "Alterrboy#1234" } }),
    "Alterrboy"
  );
  assert.equal(HID.accountLabel({ user: { name: "Alterrboy" } }), "Alterrboy");
  assert.equal(HID.accountLabel(null, "Alterrboy#99"), "Alterrboy");
});

test("realm label is name plus region, from character or storage", () => {
  const store = mem({
    "wgf-ah-realm": "proudmoore",
    "wgf-ah-region": "us",
    "wgf-ah-realm-name": "Proudmoore"
  });
  const model = HID.identityModel(null, store);
  assert.equal(model.realm, "Proudmoore US");

  const fromChar = HID.identityModel({
    signed_in: true,
    user: { battletag: "Alterrboy#1" },
    active_character: { realm_name: "Proudmoore", realm_slug: "proudmoore", region: "us" }
  }, mem());
  assert.equal(fromChar.realm, "Proudmoore US");
});

test("version label maps retail / classic / era / anniversary", () => {
  assert.equal(HID.versionLabel("retail"), "Retail");
  assert.equal(HID.versionLabel("_classic_"), "Classic");
  assert.equal(HID.versionLabel("classic_era"), "Classic Era");
  assert.equal(HID.versionLabel("anniversary"), "Anniversary");
  assert.equal(HID.normalizeGame("profile-classic1x-us"), "classic_era");
  assert.equal(HID.normalizeGame("profile-classic-us"), "classic");
  assert.equal(HID.normalizeGame("profile-us"), "retail");
});

test("signed-in model always carries account, realm, and version", () => {
  const store = mem({
    "wgf-ah-realm": "proudmoore",
    "wgf-ah-region": "us",
    "wgf-ah-game": "retail",
    "wgf-auth-account": "Alterrboy"
  });
  const model = HID.identityModel({
    signed_in: true,
    user: { battletag: "Alterrboy#1823" }
  }, store);
  assert.equal(model.signedIn, true);
  assert.equal(model.account, "Alterrboy");
  assert.equal(model.realm, "Proudmoore US");
  assert.equal(model.version, "Retail");
});

test("persisted account survives a null auth snapshot (modal close / stale tab)", () => {
  const store = mem({
    "wgf-auth-account": "Alterrboy",
    "wgf-ah-realm": "proudmoore",
    "wgf-ah-region": "us",
    "wgf-ah-game": "classic"
  });
  const model = HID.identityModel(null, store);
  assert.equal(model.signedIn, true);
  assert.equal(model.account, "Alterrboy");
  assert.equal(model.version, "Classic");
  const html = HID.chipHTML(model);
  assert.match(html, /Alterrboy/);
  assert.match(html, /Proudmoore US/);
  assert.match(html, /Classic/);
});

test("explicit sign-out clears the account and shows Enter World", () => {
  const store = mem({ "wgf-auth-account": "Alterrboy" });
  const model = HID.identityModel({ signed_in: false }, store);
  assert.equal(model.signedIn, false);
  assert.equal(model.account, "");
  assert.match(HID.chipHTML(model), /Enter World/);
});

test("mount injects .wgf-shell-right when a template omitted it", () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(`<!doctype html><header class="wgf-shell-topbar">
    <div class="wgf-shell-topbar__inner">
      <a class="wgf-shell-logo" href="/">TheWoWDB</a>
      <nav class="wgf-shell-nav"></nav>
    </div>
  </header>`);
  const chip = HID.mountChip(dom.window.document);
  assert.ok(chip);
  assert.equal(chip.classList.contains("wgf-header-identity"), true);
  assert.ok(dom.window.document.querySelector(".wgf-shell-right .wgf-header-identity"));
});

test("guides username-only nav is hidden once the global chip mounts", () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(`<!doctype html><header class="wgf-shell-topbar">
    <div class="wgf-shell-topbar__inner">
      <a class="wgf-shell-logo" href="/">TheWoWDB</a>
      <div class="gsh-user-nav"><a class="gsh-user-link" href="/account/">Alterrboy</a></div>
    </div>
  </header>`);
  HID.mountChip(dom.window.document);
  const nav = dom.window.document.querySelector(".gsh-user-nav");
  assert.equal(nav.hidden, true);
  assert.equal(nav.getAttribute("data-wgf-replaced-by"), "header-identity");
  assert.ok(dom.window.document.querySelector(".wgf-header-identity"));
});

test("paint never hides the chip and persists identity for the next page", () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(`<!doctype html><header class="wgf-shell-topbar">
    <div class="wgf-shell-topbar__inner"><div class="wgf-shell-right"></div></div>
  </header>`);
  const store = mem();
  const btn = HID.mountChip(dom.window.document);
  HID.paint(btn, {
    signed_in: true,
    user: { battletag: "Alterrboy#1" },
    active_character: { realm_name: "Proudmoore", realm_slug: "proudmoore", region: "us", game: "retail" }
  }, store);
  assert.equal(btn.hidden, false);
  assert.match(btn.innerHTML, /Alterrboy/);
  assert.match(btn.innerHTML, /Proudmoore US/);
  assert.match(btn.innerHTML, /Retail/);
  assert.equal(store.getItem("wgf-auth-account"), "Alterrboy");
  assert.equal(store.getItem("wgf-ah-realm"), "proudmoore");
  assert.equal(store.getItem("wgf-ah-game"), "retail");

  // Modal close: auth object gone, storage remains — chip still full identity.
  HID.paint(btn, null, store);
  assert.equal(btn.hidden, false);
  assert.match(btn.innerHTML, /Alterrboy/);
  assert.match(btn.innerHTML, /Proudmoore US/);
  assert.match(btn.innerHTML, /Retail/);
});

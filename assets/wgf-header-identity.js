/* TheWoWDB — always-visible header identity (2026-08-22).
 *
 * The Enter World window is the only place the battletag used to appear. Closing
 * it, landing on a page without .wgf-shell-right, or hitting a guides template
 * that only prints .gsh-user-nav left the header as a realm slug or a username.
 *
 * This module is the one sitewide chip: account + selected realm + selected WoW
 * version, painted from localStorage first so it never waits on a fetch and
 * never unmounts when the picker closes. Loaded by wgf-shell.js (already on
 * every page). Vanilla; UMD so the same file is the node test target.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.WGFHeaderIdentity = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var LS_REALM = "wgf-ah-realm";
  var LS_REGION = "wgf-ah-region";
  var LS_GAME = "wgf-ah-game";
  var LS_ACCOUNT = "wgf-auth-account";
  var LS_REALM_NAME = "wgf-ah-realm-name";

  var GAME_LABELS = {
    retail: "Retail",
    classic: "Classic",
    classic_era: "Classic Era",
    anniversary: "Anniversary",
    ptr: "PTR",
    xptr: "PTR 2",
    beta: "Beta",
    classic_ptr: "Classic PTR",
    classic_beta: "Classic Beta"
  };

  var GAME_ALIASES = {
    _retail_: "retail",
    live: "retail",
    wow: "retail",
    retail: "retail",
    _classic_: "classic",
    classic: "classic",
    mop: "classic",
    mists: "classic",
    cata: "classic",
    cataclysm: "classic",
    _classic_era_: "classic_era",
    classic_era: "classic_era",
    classicera: "classic_era",
    era: "classic_era",
    vanilla: "classic_era",
    classic1x: "classic_era",
    _anniversary_: "anniversary",
    anniversary: "anniversary",
    _ptr_: "ptr",
    ptr: "ptr",
    _xptr_: "xptr",
    xptr: "xptr",
    _beta_: "beta",
    beta: "beta",
    _classic_ptr_: "classic_ptr",
    classic_ptr: "classic_ptr",
    _classic_beta_: "classic_beta",
    classic_beta: "classic_beta"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function titleCaseSlug(slug) {
    return String(slug || "").split(/[-_]/).filter(Boolean).map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
  }

  function accountLabel(auth, stored) {
    var user = (auth && auth.user) || {};
    var raw = user.battletag || user.battle_tag || user.name || stored || "";
    return String(raw).split("#")[0].trim();
  }

  function readStorage(storage) {
    var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    var out = { realm: "", realmName: "", region: "us", game: "retail", account: "" };
    if (!store) return out;
    try {
      out.realm = store.getItem(LS_REALM) || "";
      out.realmName = store.getItem(LS_REALM_NAME) || "";
      out.region = store.getItem(LS_REGION) || "us";
      out.game = store.getItem(LS_GAME) || "retail";
      out.account = store.getItem(LS_ACCOUNT) || "";
    } catch (e) { /* private mode */ }
    return out;
  }

  function writeStorage(store, patch) {
    if (!store) return;
    try {
      if (patch.realm != null) store.setItem(LS_REALM, patch.realm);
      if (patch.realmName != null) store.setItem(LS_REALM_NAME, patch.realmName);
      if (patch.region != null) store.setItem(LS_REGION, patch.region);
      if (patch.game != null) store.setItem(LS_GAME, patch.game);
      if (patch.account != null) {
        if (patch.account) store.setItem(LS_ACCOUNT, patch.account);
        else store.removeItem(LS_ACCOUNT);
      }
    } catch (e) { /* private mode */ }
  }

  function normalizeGame(raw) {
    if (raw == null || raw === "") return "";
    var s = String(raw).trim();
    var key = s.toLowerCase().replace(/^_+|_+$/g, "").replace(/[-\s]+/g, "_");
    if (GAME_ALIASES[key]) return GAME_ALIASES[key];
    if (GAME_ALIASES[s]) return GAME_ALIASES[s];

    var ns = s.toLowerCase();
    if (ns.indexOf("classic1x") >= 0 || ns.indexOf("classic_era") >= 0 ||
        ns.indexOf("classic-era") >= 0) return "classic_era";
    if (ns.indexOf("anniversary") >= 0) return "anniversary";
    if (ns.indexOf("classic") >= 0) return "classic";
    if (ns.indexOf("retail") >= 0) return "retail";
    if (ns.indexOf("profile-") === 0 && ns.indexOf("classic") < 0) return "retail";
    return "";
  }

  function versionKey(auth, stored) {
    var ch = auth && auth.active_character;
    var raw = (ch && (ch.game || ch.version || ch.flavor || ch.namespace)) || stored || "";
    return normalizeGame(raw) || "retail";
  }

  function versionLabel(key) {
    var k = normalizeGame(key) || key;
    return GAME_LABELS[k] || titleCaseSlug(String(k || "retail").replace(/_/g, "-"));
  }

  function realmLabel(auth, store) {
    var ch = auth && auth.active_character;
    var name = "";
    var region = "";
    if (ch) {
      name = ch.realm_name || titleCaseSlug(ch.realm_slug);
      region = ch.region || "";
    }
    if (!name) name = (store && store.realmName) || titleCaseSlug(store && store.realm);
    if (!region) region = (store && store.region) || "";
    region = String(region).toUpperCase();
    if (!name) return "";
    return region ? name + " " + region : name;
  }

  function identityModel(auth, storage) {
    var store = readStorage(storage);
    var explicitOut = auth && auth.signed_in === false;
    var signedIn = explicitOut ? false : !!(auth && auth.signed_in);
    if (!auth && store.account) signedIn = true;

    var account = signedIn ? (accountLabel(auth, store.account) || store.account) : "";
    var ch = auth && auth.active_character;
    var model = {
      signedIn: signedIn,
      account: account,
      realm: realmLabel(auth, store),
      version: versionLabel(versionKey(auth, store.game)),
      gameKey: versionKey(auth, store.game),
      region: String((ch && ch.region) || store.region || "us").toLowerCase(),
      realmSlug: (ch && ch.realm_slug) || store.realm || "",
      realmName: (ch && ch.realm_name) || store.realmName || titleCaseSlug(store.realm)
    };
    return model;
  }

  function persistModel(model, storage) {
    var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store) return;
    writeStorage(store, {
      realm: model.realmSlug || undefined,
      realmName: model.realmName || undefined,
      region: model.region || undefined,
      game: model.gameKey || undefined,
      account: model.signedIn ? model.account : ""
    });
  }

  function chipHTML(model) {
    if (!model.signedIn || !model.account) {
      return '<span class="wgf-header-identity__account">Enter World</span>';
    }
    var realm = model.realm || "Choose realm";
    var version = model.version || "Retail";
    return (
      '<span class="wgf-header-identity__account">' + esc(model.account) + "</span>" +
      '<span class="wgf-header-identity__meta">' +
      '  <span class="wgf-header-identity__realm">' + esc(realm) + "</span>" +
      '  <span class="wgf-header-identity__dot" aria-hidden="true">·</span>' +
      '  <span class="wgf-header-identity__version">' + esc(version) + "</span>" +
      "</span>"
    );
  }

  function chipLabel(model) {
    if (!model.signedIn || !model.account) {
      return "Choose your realm, or log in with Battle.net";
    }
    return model.account + " — " + (model.realm || "no realm") + " — " + (model.version || "Retail") +
      ". Click to switch character, realm, or version";
  }

  function ensureRightCluster(doc) {
    doc = doc || document;
    var topbar = doc.querySelector(".wgf-shell-topbar");
    if (!topbar) return null;
    var inner = topbar.querySelector(".wgf-shell-topbar__inner") || topbar;
    var right = inner.querySelector(":scope > .wgf-shell-right") ||
                topbar.querySelector(".wgf-shell-right");
    if (!right) {
      right = doc.createElement("div");
      right.className = "wgf-shell-right";
      inner.appendChild(right);
    }
    return right;
  }

  function adoptGuidesUserNav(doc, chip) {
    doc = doc || document;
    var navs = doc.querySelectorAll(".gsh-user-nav");
    for (var i = 0; i < navs.length; i++) {
      navs[i].hidden = true;
      navs[i].setAttribute("data-wgf-replaced-by", "header-identity");
    }
    return chip;
  }

  function mountChip(doc) {
    doc = doc || document;
    var existing = doc.querySelector(".wgf-header-identity");
    if (existing) return existing;

    var host = ensureRightCluster(doc);
    if (!host) {
      var gsh = doc.querySelector(".gsh-user-nav");
      if (gsh) {
        host = gsh.parentNode || gsh;
      }
    }
    if (!host) return null;

    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "wgf-realm-btn wgf-header-identity";
    btn.setAttribute("data-wgf-identity", "1");
    host.appendChild(btn);
    adoptGuidesUserNav(doc, btn);
    return btn;
  }

  function paint(btn, auth, storage) {
    if (!btn) return identityModel(auth, storage);
    var model = identityModel(auth, storage);
    persistModel(model, storage);
    btn.innerHTML = chipHTML(model);
    btn.title = chipLabel(model);
    btn.setAttribute("aria-label", chipLabel(model));
    btn.classList.toggle("wgf-header-identity--signedin", model.signedIn && !!model.account);
    btn.classList.toggle("wgf-header-identity--guest", !(model.signedIn && model.account));
    btn.classList.toggle("wgf-realm-btn--signedin", model.signedIn && !!model.account);
    btn.classList.toggle("wgf-realm-btn--character", false);
    btn.style.color = "";
    btn.hidden = false;
    btn.removeAttribute("hidden");
    return model;
  }

  return {
    LS_REALM: LS_REALM,
    LS_REGION: LS_REGION,
    LS_GAME: LS_GAME,
    LS_ACCOUNT: LS_ACCOUNT,
    LS_REALM_NAME: LS_REALM_NAME,
    GAME_LABELS: GAME_LABELS,
    esc: esc,
    titleCaseSlug: titleCaseSlug,
    accountLabel: accountLabel,
    normalizeGame: normalizeGame,
    versionKey: versionKey,
    versionLabel: versionLabel,
    realmLabel: realmLabel,
    identityModel: identityModel,
    persistModel: persistModel,
    chipHTML: chipHTML,
    chipLabel: chipLabel,
    ensureRightCluster: ensureRightCluster,
    mountChip: mountChip,
    paint: paint,
    readStorage: readStorage,
    writeStorage: writeStorage
  };
});

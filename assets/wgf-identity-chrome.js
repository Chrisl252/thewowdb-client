/* Identity chrome: persistent header realm + WoW version, plus a clearer
   selected state inside the Enter World character-select window.

   This is the drop-in that live wgf-shell.js paint() was missing. That function
   currently does `btn.textContent = ch.name`, so after the modal closes the
   header only shows a class-coloured name. Realm lived in a tooltip; version
   was an icon on the character row. */

(function () {
  "use strict";

  var fmt = window.WGFIdentityFormat;
  if (!fmt) return;

  var STORAGE_KEY = "wgf-identity-context";
  var ACCOUNT = { name: "Alterrboy", battletag: "Alterrboy#1234" };

  var CHARACTERS = [
    { id: "alterrboy-proudmoore", name: "Alterrboy", className: "Rogue", classColor: "#FFF468", level: 90, realmName: "Proudmoore", region: "US", version: "retail" },
    { id: "nightbloom-proudmoore", name: "Nightbloom", className: "Druid", classColor: "#FF7C0A", level: 90, realmName: "Proudmoore", region: "US", version: "retail" },
    { id: "cindervow-proudmoore", name: "Cindervow", className: "Warlock", classColor: "#8788EE", level: 90, realmName: "Proudmoore", region: "US", version: "retail" },
    { id: "tidecaller-proudmoore", name: "Tidecaller", className: "Shaman", classColor: "#0070DD", level: 80, realmName: "Proudmoore", region: "US", version: "retail" },
    { id: "ashenvale-faerlina", name: "Ashenvale", className: "Hunter", classColor: "#AAD372", level: 60, realmName: "Faerlina", region: "US", version: "classic-era" },
    { id: "stormbrew-benediction", name: "Stormbrew", className: "Paladin", classColor: "#F48CBA", level: 80, realmName: "Benediction", region: "US", version: "classic" },
    { id: "frostlane-grobbulus", name: "Frostlane", className: "Mage", classColor: "#3FC7EB", level: 80, realmName: "Grobbulus", region: "US", version: "classic" },
    { id: "oakenshield-whitemane", name: "Oakenshield", className: "Warrior", classColor: "#C69B6D", level: 60, realmName: "Whitemane", region: "US", version: "classic-era" },
  ];

  var REALMS = [
    { id: "proudmoore-us-retail", realmName: "Proudmoore", region: "US", version: "retail", count: 4 },
    { id: "benediction-us-classic", realmName: "Benediction", region: "US", version: "classic", count: 1 },
    { id: "grobbulus-us-classic", realmName: "Grobbulus", region: "US", version: "classic", count: 1 },
    { id: "faerlina-us-classic-era", realmName: "Faerlina", region: "US", version: "classic-era", count: 1 },
    { id: "whitemane-us-classic-era", realmName: "Whitemane", region: "US", version: "classic-era", count: 1 },
  ];

  var state = {
    signedIn: true,
    characterId: CHARACTERS[0].id,
    tab: "characters",
    pendingId: CHARACTERS[0].id,
  };

  var els = {};

  function byId(id) {
    for (var i = 0; i < CHARACTERS.length; i++) {
      if (CHARACTERS[i].id === id) return CHARACTERS[i];
    }
    return null;
  }

  function currentCharacter() {
    return state.signedIn ? byId(state.characterId) : null;
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      if (typeof saved.signedIn === "boolean") state.signedIn = saved.signedIn;
      if (saved.characterId && byId(saved.characterId)) {
        state.characterId = saved.characterId;
        state.pendingId = saved.characterId;
      }
    } catch (e) { /* keep demo defaults */ }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        signedIn: state.signedIn,
        characterId: state.characterId,
      }));
    } catch (e) { /* private mode */ }

    var ch = currentCharacter();
    try {
      if (!state.signedIn) {
        localStorage.removeItem("wgf-auth-account");
        return;
      }
      localStorage.setItem("wgf-auth-account", ACCOUNT.name);
      if (ch) {
        localStorage.setItem("wgf-ah-realm", String(ch.realmName || "").toLowerCase().replace(/\s+/g, "-"));
        localStorage.setItem("wgf-ah-realm-name", ch.realmName);
        localStorage.setItem("wgf-ah-region", String(ch.region || "us").toLowerCase());
        localStorage.setItem("wgf-ah-game", ch.version);
      }
    } catch (e) { /* private mode */ }
  }

  function versionMark(version) {
    var label = fmt.formatVersionLabel(version);
    return label ? label.charAt(0) : "R";
  }

  function paintHeader() {
    var btn = els.identity;
    if (!btn) return;
    btn.replaceChildren();
    btn.style.color = "";
    btn.classList.toggle("wgf-realm-btn--signedin", state.signedIn);
    btn.classList.toggle("wgf-realm-btn--character", !!(state.signedIn && currentCharacter()));

    if (!state.signedIn) {
      btn.appendChild(document.createTextNode("Enter World"));
      btn.title = "Choose your realm, or log in with Battle.net to play as your character";
      btn.setAttribute("aria-label", "Enter World");
      syncStatusBar(null);
      return;
    }

    var ch = currentCharacter();
    if (!ch) {
      var nameOnly = document.createElement("span");
      nameOnly.className = "wgf-realm-btn__name";
      nameOnly.textContent = ACCOUNT.name;
      var hint = document.createElement("span");
      hint.className = "wgf-realm-btn__context";
      hint.textContent = "Pick a character";
      btn.appendChild(nameOnly);
      btn.appendChild(hint);
      btn.title = "Signed in as " + ACCOUNT.name + " — click to pick a character, change realm, or sign out";
      btn.setAttribute("aria-label", "Signed in as " + ACCOUNT.name + ", no character selected");
      syncStatusBar(null);
      return;
    }

    var name = document.createElement("span");
    name.className = "wgf-realm-btn__name";
    name.textContent = ch.name;
    name.style.color = ch.classColor || "";

    var context = document.createElement("span");
    context.className = "wgf-realm-btn__context";

    var realm = document.createElement("span");
    realm.className = "wgf-realm-btn__realm";
    realm.textContent = fmt.formatRealmLabel(ch.realmName, ch.region);

    var dot = document.createElement("span");
    dot.className = "wgf-realm-btn__dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = "·";

    var version = document.createElement("span");
    version.className = "wgf-realm-btn__version wgf-version-text";
    version.textContent = fmt.formatVersionLabel(ch.version);

    var icon = document.createElement("span");
    icon.className = "wgf-version-icon";
    icon.dataset.version = ch.version;
    icon.title = fmt.formatVersionLabel(ch.version);
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = versionMark(ch.version);

    context.appendChild(realm);
    context.appendChild(dot);
    context.appendChild(version);
    context.appendChild(icon);

    btn.appendChild(name);
    btn.appendChild(context);

    var summary = fmt.formatHeaderContext(ch);
    btn.title = ch.name + " — " + summary + " — click to switch character or realm";
    btn.setAttribute("aria-label", ch.name + ", " + summary + ". Open Enter World to switch.");

    try {
      localStorage.setItem("wgf-ah-realm", String(ch.realmName || "").toLowerCase().replace(/\s+/g, "-"));
      localStorage.setItem("wgf-ah-realm-name", ch.realmName || "");
      localStorage.setItem("wgf-ah-region", String(ch.region || "us").toLowerCase());
      localStorage.setItem("wgf-ah-game", ch.version || "retail");
      localStorage.setItem("wgf-auth-account", ACCOUNT.name);
    } catch (e) {}
    syncStatusBar(ch);
  }

  function syncStatusBar(ch) {
    var HID = window.WGFHeaderIdentity;
    if (!HID || !HID.paintStatusBar) return;
    var model = {
      signedIn: state.signedIn,
      account: state.signedIn ? ACCOUNT.name : "",
      realm: ch ? fmt.formatRealmLabel(ch.realmName, ch.region) : "",
      version: ch ? fmt.formatVersionLabel(ch.version) : "Retail",
      gameKey: ch ? ch.version : "retail",
      region: (ch && ch.region) || "us",
      realmName: ch ? ch.realmName : "",
      realmSlug: ch ? String(ch.realmName || "").toLowerCase() : ""
    };
    HID.paintStatusBar(document, model);
  }

  function groupCharacters() {
    var groups = [];
    var index = {};
    CHARACTERS.forEach(function (ch) {
      var key = ch.realmName + "|" + ch.region + "|" + ch.version;
      if (!index[key]) {
        index[key] = { key: key, realmName: ch.realmName, region: ch.region, version: ch.version, chars: [] };
        groups.push(index[key]);
      }
      index[key].chars.push(ch);
    });
    return groups;
  }

  function paintSelectedBanner() {
    var ch = byId(state.pendingId) || currentCharacter();
    if (!els.selected || !ch) {
      if (els.selected) els.selected.hidden = true;
      return;
    }
    els.selected.hidden = false;
    els.selected.textContent = fmt.formatSelectedSummary(ch);
  }

  function renderCharacters() {
    var host = els.list;
    host.replaceChildren();
    var groups = groupCharacters();
    els.count.textContent = CHARACTERS.length + " characters";
    groups.forEach(function (group) {
      var head = document.createElement("div");
      head.className = "wgf-rp-group";
      head.textContent = group.realmName + " " + group.chars.length;
      host.appendChild(head);
      group.chars.forEach(function (ch) {
        host.appendChild(characterRow(ch));
      });
    });
  }

  function characterRow(ch) {
    var selected = ch.id === state.pendingId;
    var row = document.createElement("button");
    row.type = "button";
    row.className = "wgf-plate-row" + (selected ? " is-selected" : "");
    row.dataset.characterId = ch.id;
    row.setAttribute("aria-pressed", selected ? "true" : "false");
    if (selected) row.setAttribute("aria-current", "true");

    var portrait = document.createElement("div");
    portrait.className = "wgf-rp-portrait";
    portrait.style.background = ch.classColor;
    portrait.textContent = ch.className.charAt(0);

    var body = document.createElement("div");
    body.className = "wgf-plate-row__body";

    var name = document.createElement("div");
    name.className = "wgf-plate-row__name";
    name.style.color = selected ? "" : ch.classColor;
    name.textContent = ch.name;

    var meta = document.createElement("div");
    meta.className = "wgf-plate-row__meta";
    meta.textContent = "Level " + ch.level + " " + ch.className;

    var sub = document.createElement("div");
    sub.className = "wgf-plate-row__sub";
    var realm = document.createElement("span");
    realm.textContent = fmt.formatRealmLabel(ch.realmName, ch.region);
    var version = document.createElement("span");
    version.className = "wgf-plate-row__version";
    var icon = document.createElement("span");
    icon.className = "wgf-version-icon";
    icon.dataset.version = ch.version;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = versionMark(ch.version);
    var versionText = document.createElement("span");
    versionText.className = "wgf-version-text";
    versionText.textContent = fmt.formatVersionLabel(ch.version);
    version.appendChild(icon);
    version.appendChild(versionText);
    sub.appendChild(realm);
    sub.appendChild(version);

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(sub);

    var crest = document.createElement("div");
    crest.className = "wgf-rp-crest";
    var crestIcon = document.createElement("span");
    crestIcon.className = "wgf-version-icon";
    crestIcon.dataset.version = ch.version;
    crestIcon.setAttribute("aria-hidden", "true");
    crestIcon.textContent = versionMark(ch.version);
    crest.appendChild(crestIcon);
    if (selected) {
      var current = document.createElement("span");
      current.className = "wgf-rp-current";
      current.textContent = "Selected";
      crest.appendChild(current);
    }

    row.appendChild(portrait);
    row.appendChild(body);
    row.appendChild(crest);
    row.addEventListener("click", function () {
      state.pendingId = ch.id;
      renderActiveTab();
    });
    return row;
  }

  function renderRealms() {
    var host = els.list;
    host.replaceChildren();
    els.count.textContent = REALMS.length + " realms";
    var pending = byId(state.pendingId) || currentCharacter();
    REALMS.forEach(function (realm) {
      var selected = pending &&
        pending.realmName === realm.realmName &&
        pending.region === realm.region &&
        pending.version === realm.version;
      var row = document.createElement("button");
      row.type = "button";
      row.className = "wgf-plate-row" + (selected ? " is-selected" : "");
      row.setAttribute("aria-pressed", selected ? "true" : "false");

      var body = document.createElement("div");
      body.className = "wgf-plate-row__body";
      var name = document.createElement("div");
      name.className = "wgf-plate-row__name";
      name.textContent = fmt.formatRealmLabel(realm.realmName, realm.region);
      var meta = document.createElement("div");
      meta.className = "wgf-plate-row__meta";
      var version = document.createElement("span");
      version.className = "wgf-plate-row__version";
      var icon = document.createElement("span");
      icon.className = "wgf-version-icon";
      icon.dataset.version = realm.version;
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = versionMark(realm.version);
      var versionText = document.createElement("span");
      versionText.className = "wgf-version-text";
      versionText.textContent = fmt.formatVersionLabel(realm.version);
      version.appendChild(icon);
      version.appendChild(versionText);
      meta.appendChild(version);
      var sub = document.createElement("div");
      sub.className = "wgf-plate-row__sub";
      sub.textContent = realm.count + (realm.count === 1 ? " character" : " characters");
      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(sub);

      var crest = document.createElement("div");
      crest.className = "wgf-rp-crest";
      if (selected) {
        var current = document.createElement("span");
        current.className = "wgf-rp-current";
        current.textContent = "Selected";
        crest.appendChild(current);
      }

      row.appendChild(body);
      row.appendChild(crest);
      row.addEventListener("click", function () {
        var match = CHARACTERS.filter(function (ch) {
          return ch.realmName === realm.realmName &&
            ch.region === realm.region &&
            ch.version === realm.version;
        })[0];
        if (match) state.pendingId = match.id;
        renderActiveTab();
      });
      host.appendChild(row);
    });
  }

  function renderActiveTab() {
    if (state.tab === "realms") renderRealms();
    else renderCharacters();
    paintSelectedBanner();
    els.tabCharacters.classList.toggle("is-active", state.tab === "characters");
    els.tabRealms.classList.toggle("is-active", state.tab === "realms");
    els.tabCharacters.setAttribute("aria-selected", state.tab === "characters" ? "true" : "false");
    els.tabRealms.setAttribute("aria-selected", state.tab === "realms" ? "true" : "false");
  }

  function openModal() {
    if (!state.signedIn) {
      state.signedIn = true;
      persist();
      paintHeader();
    }
    state.pendingId = state.characterId;
    els.root.hidden = false;
    els.root.setAttribute("aria-hidden", "false");
    renderActiveTab();
    els.close.focus();
  }

  function closeModal() {
    els.root.hidden = true;
    els.root.setAttribute("aria-hidden", "true");
    els.identity.focus();
  }

  function enterWorld() {
    var next = byId(state.pendingId);
    if (next) {
      state.signedIn = true;
      state.characterId = next.id;
      persist();
      paintHeader();
    }
    closeModal();
  }

  function signOut() {
    state.signedIn = false;
    persist();
    paintHeader();
    closeModal();
    toast("Signed out");
  }

  function signIn() {
    state.signedIn = true;
    persist();
    paintHeader();
    toast("Signed in as " + ACCOUNT.name);
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.hidden = true; }, 2200);
  }

  function bind() {
    els.identity = document.getElementById("wgf-identity");
    if (els.identity) els.identity.setAttribute("data-wgf-chrome-owned", "1");
    els.root = document.getElementById("wgf-enter-world");
    els.list = document.getElementById("wgf-rp-list");
    els.count = document.getElementById("wgf-rp-count");
    els.selected = document.getElementById("wgf-rp-selected");
    els.tabCharacters = document.getElementById("wgf-rp-tab-characters");
    els.tabRealms = document.getElementById("wgf-rp-tab-realms");
    els.close = document.getElementById("wgf-rp-close");
    els.toast = document.getElementById("wgf-rp-toast");
    if (!els.identity || !els.root) return;

    els.identity.addEventListener("click", function () {
      if (els.root.hidden) openModal();
      else closeModal();
    });

    els.close.addEventListener("click", closeModal);
    document.getElementById("wgf-rp-cancel").addEventListener("click", closeModal);
    document.getElementById("wgf-rp-enter").addEventListener("click", enterWorld);
    document.getElementById("wgf-rp-backdrop").addEventListener("click", closeModal);

    els.tabCharacters.addEventListener("click", function () {
      state.tab = "characters";
      renderActiveTab();
    });
    els.tabRealms.addEventListener("click", function () {
      state.tab = "realms";
      renderActiveTab();
    });

    document.getElementById("wgf-rp-refresh").addEventListener("click", function () {
      renderActiveTab();
      toast("Characters refreshed");
    });
    document.getElementById("wgf-rp-account").addEventListener("click", function () {
      toast("Account stays at /account/");
    });
    document.getElementById("wgf-rp-signout").addEventListener("click", signOut);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !els.root.hidden) closeModal();
    });

    window.WGFRealmPicker = { open: openModal, close: closeModal, signIn: signIn };
    window.WGFAuth = {
      signed_in: state.signedIn,
      user: ACCOUNT,
      get active_character() { return currentCharacter(); },
    };
  }

  loadState();
  bind();
  paintHeader();
})();

/* WoW Gold Farms - Realm Selection window (2026-07-31, owner spec: the classic
   in-game realm list). Lazy-loaded by wgf-shell.js when the nav's Change Realm
   button is first clicked; exposes window.WGFRealmPicker.open().

   Behavior contract:
   - Lists every connected realm from /api/realms (name / timezone / population,
     population colored with the classic ladder).
   - Region tabs at the TOP of the realm pane (United States | Europe), stuck in
     place so a long realm list never scrolls them away. Europe reads live from
     /api/realms?region=eu and states honestly when no EU realms are available.
   - Click selects, double-click confirms, Okay applies, Cancel/Esc closes.
   - Applying writes the ONE shared realm context (localStorage wgf-ah-realm +
     wgf-ah-region) every surface reads (AH browser, deals, /search/, item pages),
     then reloads the page with ?realm= stuck on realm-aware paths so the current
     view flips too. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var LS_REALM = "wgf-ah-realm";
  var LS_REGION = "wgf-ah-region";
  var LS_GAME = "wgf-ah-game";
  var LS_REALM_NAME = "wgf-ah-realm-name";

  var GAME_CHOICES = [
    { key: "retail", label: "Retail" },
    { key: "classic", label: "Classic" },
    { key: "classic_era", label: "Classic Era" },
    { key: "anniversary", label: "Anniversary" }
  ];

  var TZ_LABEL = {
    "America/New_York": "Eastern",
    "America/Chicago": "Central",
    "America/Denver": "Mountain",
    "America/Los_Angeles": "Pacific",
    "Australia/Melbourne": "Oceanic",
    "America/Sao_Paulo": "Brazil",
    "America/Mexico_City": "Mexico",
  };

  // Classic realm-list population ladder colors via CSS classes.
  function popClass(name) {
    var p = String(name || "").toLowerCase();
    if (p.indexOf("full") >= 0) return "wgf-rp-pop--full";
    if (p.indexOf("high") >= 0) return "wgf-rp-pop--high";
    if (p.indexOf("medium") >= 0) return "wgf-rp-pop--medium";
    if (p.indexOf("low") >= 0) return "wgf-rp-pop--low";
    if (p.indexOf("new") >= 0 || p.indexOf("recommended") >= 0) return "wgf-rp-pop--new";
    if (p.indexOf("lock") >= 0) return "wgf-rp-pop--locked";
    return "";
  }

  var state = {
    region: null,        // active tab
    selected: null,      // {slug, name} pending until Okay
    cache: {},           // region -> rows
    overlay: null,
    roster: null,        // in-flight /api/account/characters promise, per open
    activeChar: null,    // the character the player currently posts as
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function currentRealm() {
    try { return localStorage.getItem(LS_REALM) || ""; } catch (e) { return ""; }
  }
  function currentRegion() {
    try { return localStorage.getItem(LS_REGION) || "us"; } catch (e) { return "us"; }
  }
  function currentGame() {
    try { return localStorage.getItem(LS_GAME) || "retail"; } catch (e) { return "retail"; }
  }

  function persistGame(key) {
    if (!key) return;
    try { localStorage.setItem(LS_GAME, key); } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent("wgf:identity-change", { detail: { game: key } }));
    } catch (e) {}
  }

  function notifyClose() {
    try { document.dispatchEvent(new CustomEvent("wgf:realm-picker-close")); }
    catch (e) {}
  }

  function fetchRealms(region) {
    if (state.cache[region]) return Promise.resolve(state.cache[region]);
    return fetch("/api/realms?region=" + encodeURIComponent(region), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { realms: [] }; })
      .then(function (d) {
        state.cache[region] = d.realms || [];
        return state.cache[region];
      })
      .catch(function () { return []; });
  }

  function primaryName(row) {
    // "Aegwynn, Bonechewer, ..." -> lead name; the rest ride the title tooltip.
    return String(row.realm_names || row.primary_slug || "").split(",")[0].trim();
  }

  function renderRows(rows) {
    var listEl = state.overlay.querySelector(".wgf-rp-list");
    if (!rows.length) {
      listEl.innerHTML =
        '<div class="wgf-rp-empty">No realms available for this region yet. ' +
        "European realm data is on its way back online - United States realms " +
        "are fully live.</div>";
      return;
    }
    var cur = currentRealm();
    listEl.innerHTML = rows.map(function (r) {
      var name = primaryName(r);
      var slug = r.primary_slug;
      var connected = (r.realm_count > 1)
        ? ' title="Connected: ' + esc(r.realm_names) + '"' : "";
      var tz = TZ_LABEL[r.timezone] || String(r.timezone || "").split("/").pop().replace(/_/g, " ");
      var sel = (state.selected ? state.selected.slug === slug : slug === cur);
      return '<div class="wgf-rp-row' + (sel ? " is-selected" : "") + '" data-slug="' +
        esc(slug) + '" data-name="' + esc(name) + '"' + connected + ">" +
        '<span class="wgf-rp-name">' + esc(name) +
        (r.realm_count > 1 ? ' <span class="wgf-rp-linked">(' + r.realm_count + ")</span>" : "") +
        "</span>" +
        '<span class="wgf-rp-tz">' + esc(tz) + "</span>" +
        '<span class="wgf-rp-pop ' + popClass(r.population) + '">' + esc(r.population || "-") + "</span>" +
        "</div>";
    }).join("");
  }

  function switchRegion(region) {
    state.region = region;
    var tabs = state.overlay.querySelectorAll(".wgf-rp-tab");
    tabs.forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-region") === region);
    });
    var listEl = state.overlay.querySelector(".wgf-rp-list");
    listEl.innerHTML = '<div class="wgf-rp-empty">Retrieving realm list...</div>';
    fetchRealms(region).then(function (rows) {
      if (state.region === region) renderRows(rows);
    });
  }

  function applySelection() {
    if (!state.selected) { close(); return; }
    try {
      localStorage.setItem(LS_REALM, state.selected.slug);
      localStorage.setItem(LS_REGION, state.region || "us");
      if (state.selected.name) localStorage.setItem(LS_REALM_NAME, state.selected.name);
      if (state.game) localStorage.setItem(LS_GAME, state.game);
    } catch (e) { /* private mode: the reload param still applies it once */ }
    // Realm-aware paths reload with ?realm= so the CURRENT view flips immediately;
    // everything else just reloads and reads the stored context. Region coherence:
    // the site routes region by PATH (/eu/item/... vs /item/...), and realm slugs
    // resolve inside their region - so an EU realm pick must also flip the path
    // prefix or the slug silently fails to resolve on a US route (and vice versa).
    var p = location.pathname;
    var base = p.replace(/^\/eu(\/|$)/, "/");
    if ((state.region || "us") === "eu") {
      base = "/eu" + (base === "/" ? "/" : base);
    }
    if (/^(\/eu)?\/(item|search|wow-auction-house|deals|cheapest-realm)\//.test(base + "/") ||
        base.indexOf("/item/") === 0 || base.indexOf("/search/") === 0) {
      var u = new URL(location.origin + base + location.search);
      u.searchParams.set("realm", state.selected.slug);
      location.href = u.toString();
    } else if (base !== p) {
      location.href = location.origin + base;
    } else {
      location.reload();
    }
  }

  /* ---- Character Select (2026-08-02) --------------------------------------------
     In the client, Realm Selection and Character Select are one flow ending in
     "Enter World". Merging them here means picking a character sets BOTH who you
     post as and which realm's prices you see - one act instead of two controls.
     Signed out, the same window is where you log in. */

  function authState() {
    return window.WGFAuth || null;   // shell.js already asked; never fetch twice
  }

  /* Who you are signed in as, and the way out. Until now the ONLY account surface
     was /account/, which you had to already know about - the window said "no
     characters" without ever saying whose account it was looking at, or offering a
     way to sign out and try another. Owner, 2026-08-02: "i need to be able to login
     and logout easily but i don't see any account details here."
     Rendered ONCE into its own slot above BOTH panes; the label prefers the active
     character over the battletag once the roster resolves. */
  function accountBar(auth) {
    var user = (auth && auth.user) || {};
    var who = (state.activeChar && state.activeChar.name) ||
      user.battletag || user.name || "your Battle.net account";
    return (
      '<div class="wgf-rp-acct">' +
      '  <span class="wgf-rp-acct__who">Signed in as <strong>' + esc(who) + "</strong></span>" +
      '  <span class="wgf-rp-acct__actions">' +
           refreshLink("wgf-rp-acct__link wgf-rp-refresh") +
      '    <a class="wgf-rp-acct__link" href="/account/" data-no-loadscreen>Account</a>' +
      '    <form method="post" action="/auth/signout" class="wgf-rp-acct__form">' +
      '      <button type="submit" class="wgf-rp-acct__link wgf-rp-acct__signout">Sign out</button>' +
      "    </form>" +
      "  </span>" +
      "</div>"
    );
  }

  /* Roster refresh is a fast Battle.net round-trip: tokens are deliberately never
     stored, so re-syncing the roster server-side IS a login (bnet_characters
     sync_on_login runs on the way back). One builder, so the account bar and the
     empty-roster state can never drift apart. */
  function refreshLink(cls) {
    var back = encodeURIComponent(location.pathname + location.search);
    return '<a class="' + cls + '" rel="nofollow" data-no-loadscreen ' +
      'title="Re-checks your Battle.net account for new characters" ' +
      'href="/auth/bnet/start?next=' + back + '">Refresh characters</a>';
  }

  /* The roster request starts the moment the window opens - in parallel with the
     realm list, not serially behind anything. One request per open (close() clears
     it so reopening reads fresh). */
  function fetchRoster() {
    if (!state.roster) {
      state.roster = fetch("/api/account/characters",
                           { cache: "no-store", credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return state.roster;
  }

  /* One character card, laid out like the client's character list: portrait, name,
     then "Level N Class" with the class name in its own colour, and the realm as
     the quiet third line. */
  function charRow(c, activeId) {
    var realm = c.realm_name || c.realm_slug;
    var colour = esc(c.class_color || "");
    // Blizzard's own portrait of THIS character when we have it (prebaked at
    // /api/account/characters); the generic race icon is the fallback while renders
    // are still filling in, and for characters that have none.
    var face = c.render_avatar || c.race_icon;
    var portrait = face
      ? '<img class="wgf-rp-char__face" src="' + esc(face) + '" alt="" ' +
        'width="40" height="40" loading="lazy">'
      : '<span class="wgf-rp-char__face wgf-rp-char__face--blank"></span>';
    // The full-body render is a click away, not an auto-load: 23 transparent PNGs
    // would be megabytes nobody asked for.
    if (c.render_main) {
      portrait =
        '<button type="button" class="wgf-rp-char__view" title="View ' +
        esc(c.name) + '" data-main="' + esc(c.render_main) + '" data-name="' +
        esc(c.name) + '">' + portrait +
        '<span class="wgf-rp-char__zoom" aria-hidden="true">&#9974;</span></button>';
    }

    var line2 = c.level ? "Level " + esc(c.level) : "";
    if (c.class_name) {
      line2 += (line2 ? " " : "") +
        '<span class="wgf-rp-char__class" style="color:' + colour + '">' +
        esc(c.class_name) + "</span>";
    }

    // Faction crest on the card's right edge, exactly like the Warband character
    // list. The URL is server-resolved (pvp_icons via the API), first-party art;
    // neutral/unknown factions simply carry no crest.
    var crest = c.faction_crest
      ? '<img class="wgf-rp-char__crest" src="' + esc(c.faction_crest) +
        '" alt="' + esc(c.faction || "") + '" width="22" height="22" ' +
        'loading="lazy" decoding="async">'
      : "";

    var game = c.game || c.version || c.flavor || c.namespace || "";
    return '<div class="wgf-rp-char' + (c.id === activeId ? " is-active" : "") +
      '" role="option" tabindex="0"' +
      ' aria-selected="' + (c.id === activeId ? "true" : "false") + '"' +
      ' data-char-id="' + esc(c.id) +
      '" data-realm="' + esc(c.realm_slug || "") +
      '" data-region="' + esc(c.region || "") +
      '" data-game="' + esc(game) + '">' +
      portrait +
      '<span class="wgf-rp-char__body">' +
      '  <span class="wgf-rp-char__name" style="color:' + colour + '">' +
           esc(c.name) + "</span>" +
      '  <span class="wgf-rp-char__meta">' + line2 + "</span>" +
      '  <span class="wgf-rp-char__where">' + esc(realm) +
      '    <span class="wgf-rp-char__region">' +
           esc(String(c.region || "").toUpperCase()) + "</span></span>" +
      "</span>" +
      crest +
      "</div>";
  }

  function renderCharacters() {
    var box = state.overlay && state.overlay.querySelector(".wgf-rp-chars");
    if (!box) return;
    var acctSlot = box.querySelector(".wgf-rp-acct-slot");
    var slot = box.querySelector(".wgf-rp-chars-slot");
    var auth = authState();

    if (auth && !auth.signed_in) {
      // Signed out: this window IS the login. Only offer Battle.net when it is
      // actually configured, so the row can never be a dead link.
      if (auth.providers && auth.providers.bnet) {
        var back = encodeURIComponent(location.pathname + location.search);
        slot.innerHTML =
          '<div class="wgf-rp-login">' +
          '  <p class="wgf-rp-login__copy">Log in to play as your character - your ' +
          "     realm follows you, and you post under your own name.</p>" +
          '  <a class="wgf-btn-red wgf-rp-login__btn" rel="nofollow" ' +
          '     data-no-loadscreen href="/auth/bnet/start?next=' + back + '">' +
          "     Log In with Blizzard Battle.net</a>" +
          "</div>";
        box.hidden = false;
      } else {
        box.hidden = true;
      }
      return;
    }

    // Signed in - or the shell's auth snapshot has not resolved yet, in which case
    // the roster call itself is the authority: it answers 401 for a signed-out
    // reader and the strip simply stays hidden.
    if (auth && auth.signed_in) {
      // The account bar paints ONCE, into its own slot above both panes. The
      // roster states below repaint THEIR slot only, so the bar never flickers.
      acctSlot.innerHTML = accountBar(auth);
      slot.innerHTML = '<div class="wgf-rp-chars__loading">Loading characters&hellip;</div>';
      box.hidden = false;
    }

    fetchRoster()
      .then(function (data) {
        if (!state.overlay) return;
        if (!data) {
          // Failed or 401. A confirmed sign-in keeps its account bar (the roster
          // just is not available right now); anything else stays hidden.
          if (auth && auth.signed_in) slot.innerHTML = "";
          else box.hidden = true;
          return;
        }
        if (!acctSlot.innerHTML) acctSlot.innerHTML = accountBar(auth);
        box.hidden = false;
        var list = data.characters || [];
        if (!list.length) {
          // Signed in with an empty roster. The old copy said "no characters found
          // on this account", which is usually a LIE and sent readers looking for a
          // problem on Blizzard's side: the account has characters, this sign-in
          // just predates the point where we started asking Blizzard for permission
          // to read them. Say that, and give them the one button that fixes it -
          // the same Battle.net round-trip the Refresh characters control uses.
          var back = encodeURIComponent(location.pathname + location.search);
          slot.innerHTML =
            '<div class="wgf-rp-chars__empty">' +
            "  <p>We haven&rsquo;t got your characters yet. This sign-in was made before " +
            "     we started asking Blizzard for character access, so the permission was " +
            "     never granted. Signing in again fixes it.</p>" +
            '  <a class="wgf-btn-red wgf-rp-login__btn wgf-rp-refresh" rel="nofollow" ' +
            '     data-no-loadscreen title="Re-checks your Battle.net account for new characters" ' +
            '     href="/auth/bnet/start?next=' + back + '">Sign in again to load characters</a>' +
            "</div>";
          return;
        }
        // The active character anchors the account-bar label and the realm
        // divergence notice.
        state.activeChar = null;
        list.forEach(function (c) {
          if (c.id === data.active_id) state.activeChar = c;
        });
        if (state.activeChar) {
          var whoEl = acctSlot.querySelector(".wgf-rp-acct__who strong");
          if (whoEl) whoEl.textContent = state.activeChar.name;
        }
        // Grouped by realm, active character's realm first. 23 characters in one
        // flat strip is a wall; the client groups them too, and the realm is the
        // thing you actually navigate by.
        var groups = {};
        var order = [];
        list.forEach(function (c) {
          var key = (c.region || "") + "|" + (c.realm_slug || "");
          if (!groups[key]) {
            groups[key] = { label: c.realm_name || c.realm_slug, region: c.region, rows: [] };
            order.push(key);
          }
          groups[key].rows.push(c);
        });
        var activeKey = null;
        list.forEach(function (c) {
          if (c.id === data.active_id) activeKey = (c.region || "") + "|" + (c.realm_slug || "");
        });
        order.sort(function (a, b) {
          if (a === activeKey) return -1;
          if (b === activeKey) return 1;
          return groups[b].rows.length - groups[a].rows.length;
        });

        var body = order.map(function (key) {
          var g = groups[key];
          return '<div class="wgf-rp-chars__realm">' + esc(g.label) +
                 '<span class="wgf-rp-chars__realmn">' + g.rows.length + "</span></div>" +
                 g.rows.map(function (c) { return charRow(c, data.active_id); }).join("");
        }).join("");

        // Strip = who you are. Pane = the list. Keeping them apart is what lets the
        // account bar stay put while you flip to Realms.
        slot.innerHTML =
          '<div class="wgf-rp-chars__head">Character Select' +
          '<span class="wgf-rp-chars__count">' + list.length + " characters</span></div>";
        var pane = state.overlay.querySelector(".wgf-rp-charlist");
        if (pane) pane.innerHTML = body;
        var views = state.overlay.querySelector(".wgf-rp-views");
        if (views) views.hidden = false;
        setView("chars");
        updateDivergence();
      });
  }

  /* One-line note above the character list ("" hides it). The character-set POST
     used to fail silently and navigate anyway, leaving the nav on the OLD character
     with no hint anything went wrong. */
  function charNote(msg) {
    var el = state.overlay && state.overlay.querySelector(".wgf-rp-charnote");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  /* Manual realm pick vs the active character's realm: they are allowed to differ
     (browsing another market is legitimate), but silently is how people get
     confused. One informational line, never a block. */
  function updateDivergence() {
    if (!state.overlay) return;
    var note = state.overlay.querySelector(".wgf-rp-diverge");
    if (!note) return;
    var ch = state.activeChar;
    var sel = state.selected;
    if (ch && sel && sel.slug && ch.realm_slug && sel.slug !== ch.realm_slug) {
      note.textContent = "Browsing " + (sel.name || sel.slug) + ". " + ch.name +
        " is on " + (ch.realm_name || ch.realm_slug) + ".";
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }

  /* Enter the world as this character: remember the pick, then apply its realm
     through the SAME path as a manual realm choice so region routing stays
     coherent (an EU realm on a US path silently fails to resolve). The realm only
     applies AFTER the identity POST succeeds; a failure keeps the window open and
     says so instead of navigating away as the wrong character. */
  function enterWorldAs(charId) {
    var row = state.overlay.querySelector('.wgf-rp-char[data-char-id="' + charId + '"]');
    if (!row) return;
    var realm = row.getAttribute("data-realm");
    var region = row.getAttribute("data-region");
    var game = row.getAttribute("data-game");
    if (game) {
      var gk = (window.WGFHeaderIdentity && window.WGFHeaderIdentity.normalizeGame)
        ? window.WGFHeaderIdentity.normalizeGame(game) : "";
      if (!gk) {
        var ns = String(game).toLowerCase();
        if (ns.indexOf("classic1x") >= 0 || ns.indexOf("classic_era") >= 0) gk = "classic_era";
        else if (ns.indexOf("classic") >= 0) gk = "classic";
        else if (ns) gk = "retail";
      }
      if (gk) { state.game = gk; persistGame(gk); }
    }
    charNote("");
    fetch("/api/account/characters/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ character_id: Number(charId) })
    }).then(function (r) {
      if (!r.ok) throw new Error("set_active_failed");
      return r.json();
    }).then(function (d) {
      if (!d || d.ok !== true) throw new Error("set_active_failed");
      // The nav caches /api/auth/me in sessionStorage; drop it so the next page
      // paints THIS character, not the previous one for the rest of the TTL.
      try { sessionStorage.removeItem("wgf-auth-me"); } catch (e) {}
      if (realm) {
        state.region = region || state.region || "us";
        state.selected = { slug: realm, name: realm };
        applySelection();
      } else {
        location.reload();
      }
    }).catch(function () {
      charNote("Could not set your character. Try again.");
    });
  }

  /* The full-body view. Loaded on demand, dismissed by clicking anywhere on it or
     by Escape - which must not also close the whole window underneath. */
  function showRender(src, name) {
    if (!src || !state.overlay) return;
    closeRender();
    var panel = document.createElement("div");
    panel.className = "wgf-rp-render";
    panel.innerHTML =
      '<figure class="wgf-rp-render__fig">' +
      '  <img class="wgf-rp-render__img" src="' + esc(src) + '" alt="' +
           esc(name || "") + '">' +
      '  <figcaption class="wgf-rp-render__cap">' + esc(name || "") +
      '    <span class="wgf-rp-render__hint">click to close</span></figcaption>' +
      "</figure>";
    state.overlay.appendChild(panel);
    state.render = panel;
  }

  function closeRender() {
    if (state.render) { state.render.remove(); state.render = null; }
  }

  /* Show exactly one pane. Called after the roster resolves, so a player with
     characters lands on them and a signed-out reader lands straight on realms with
     no empty switcher above it. */
  function setView(which) {
    if (!state.overlay) return;
    state.view = which;
    var chars = state.overlay.querySelector(".wgf-rp-pane--chars");
    var realms = state.overlay.querySelector(".wgf-rp-pane--realms");
    if (chars) chars.hidden = which !== "chars";
    if (realms) realms.hidden = which !== "realms";
    state.overlay.querySelectorAll(".wgf-rp-view").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-view") === which);
    });
    if (which === "realms") {
      var s = state.overlay.querySelector(".wgf-rp-search");
      if (s) s.focus();
    }
  }

  /* Hundreds of realms is not a list you scan - it is a list you search. Filters the
     already-rendered rows so it works the same on every region tab. */
  function filterRealms(term) {
    if (!state.overlay) return;
    var q = String(term || "").trim().toLowerCase();
    var rows = state.overlay.querySelectorAll(".wgf-rp-row");
    var shown = 0;
    rows.forEach(function (r) {
      var name = (r.getAttribute("data-name") || "").toLowerCase();
      var hit = !q || name.indexOf(q) !== -1;
      r.hidden = !hit;
      if (hit) shown++;
    });
    var empty = state.overlay.querySelector(".wgf-rp-noresult");
    if (!shown) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "wgf-rp-empty wgf-rp-noresult";
        state.overlay.querySelector(".wgf-rp-list").appendChild(empty);
      }
      empty.textContent = 'No realm matches "' + q + '".';
    } else if (empty) {
      empty.remove();
    }
  }

  function close() {
    closeRender();
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
      state.selected = null;
      state.roster = null;      // next open refetches a fresh roster
      state.activeChar = null;
      document.removeEventListener("keydown", onKey);
    }
    notifyClose();
  }

  function onKey(e) {
    // Escape closes the render first, not the whole window: dismissing a portrait
    // you opened should not also throw away the realm/character list behind it.
    if (e.key === "Escape") { if (state.render) { closeRender(); return; } close(); }
    if (e.key === "Enter" && state.selected) applySelection();
  }

  function open() {
    if (state.overlay) return;
    // The roster request leaves FIRST, in parallel with the realm list below -
    // never serially behind an auth check. Skipped only when the shell already
    // knows for certain we are signed out.
    var auth0 = authState();
    if (!auth0 || auth0.signed_in) fetchRoster();
    var ov = document.createElement("div");
    ov.className = "wgf-rp-overlay";
    // TWO VIEWS, one at a time - the client keeps Realm Selection and Character
    // Select on separate screens for a reason. Stacking a 348px character list on
    // top of the realm list gave the window two scrollers fighting each other and
    // squeezed the realms into a slot (owner: "realm selector is a bit clunky and
    // hard to use now"). The switcher only appears when there is something to
    // switch between.
    ov.innerHTML =
      '<div class="wgf-rp-window" role="dialog" aria-modal="true" aria-label="Enter World">' +
      '  <div class="wgf-rp-plaque">Enter World</div>' +
      // The account strip sits ABOVE the panes, not inside one: it carries the
      // account bar, the signed-out login, and the empty-roster fix, all of which
      // must stay reachable no matter which list you are looking at. The bar and
      // the roster state get separate slots so the bar renders exactly once.
      '  <div class="wgf-rp-chars" hidden>' +
      '    <div class="wgf-rp-acct-slot"></div>' +
      '    <div class="wgf-rp-chars-slot"></div>' +
      "  </div>" +
      '  <div class="wgf-rp-versions" role="tablist" aria-label="WoW version">' +
           GAME_CHOICES.map(function (g) {
             return '<button type="button" class="wgf-rp-version' +
               (g.key === (state.game || currentGame()) ? " is-on" : "") +
               '" data-game="' + g.key + '">' + g.label + "</button>";
           }).join("") +
      "  </div>" +
      '  <div class="wgf-rp-views" hidden>' +
      '    <button type="button" class="wgf-rp-view is-on" data-view="chars">Characters</button>' +
      '    <button type="button" class="wgf-rp-view" data-view="realms">Realms</button>' +
      "  </div>" +
      '  <div class="wgf-rp-pane wgf-rp-pane--chars">' +
      '    <div class="wgf-rp-charnote" hidden></div>' +
      '    <div class="wgf-rp-charlist" role="listbox"></div>' +
      "  </div>" +
      '  <div class="wgf-rp-pane wgf-rp-pane--realms">' +
      // Region tabs LEAD the realm view, stuck to the top of the pane: with 100+
      // realms on a phone, switching region must never require scrolling past the
      // whole list first.
      '    <div class="wgf-rp-tabs wgf-rp-tabs--top">' +
      '      <button type="button" class="wgf-rp-tab" data-region="us">United States</button>' +
      '      <button type="button" class="wgf-rp-tab" data-region="eu">Europe</button>' +
      "    </div>" +
      '    <div class="wgf-rp-filter">' +
      '      <input type="search" class="wgf-rp-search" autocomplete="off" ' +
      '             placeholder="Search realms&hellip;" aria-label="Search realms">' +
      "    </div>" +
      '    <div class="wgf-rp-head">' +
      '      <span class="wgf-rp-h wgf-rp-h--name">Realm Name</span>' +
      '      <span class="wgf-rp-h wgf-rp-h--tz">Timezone</span>' +
      '      <span class="wgf-rp-h wgf-rp-h--pop">Population</span>' +
      "    </div>" +
      '    <div class="wgf-rp-list" role="listbox"></div>' +
      '    <div class="wgf-rp-diverge" hidden></div>' +
      "  </div>" +
      '  <div class="wgf-rp-foot">' +
      '    <div class="wgf-rp-actions">' +
      '      <button type="button" class="wgf-btn-red wgf-rp-ok">Enter World</button>' +
      '      <button type="button" class="wgf-btn-red wgf-rp-cancel">Cancel</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(ov);
    state.overlay = ov;
    state.game = currentGame();

    ov.addEventListener("click", function (e) {
      if (e.target === ov) { close(); return; }
      var gameBtn = e.target.closest(".wgf-rp-version");
      if (gameBtn) {
        state.game = gameBtn.getAttribute("data-game") || "retail";
        persistGame(state.game);
        ov.querySelectorAll(".wgf-rp-version").forEach(function (b) {
          b.classList.toggle("is-on", b === gameBtn);
        });
        return;
      }
      var view = e.target.closest(".wgf-rp-view");
      if (view) { setView(view.getAttribute("data-view")); return; }
      var tab = e.target.closest(".wgf-rp-tab");
      if (tab) { switchRegion(tab.getAttribute("data-region")); return; }
      // The portrait opens the full-body render; it must be checked BEFORE the row,
      // or looking at a character would silently switch you to it.
      var view = e.target.closest(".wgf-rp-char__view");
      if (view) {
        e.stopPropagation();
        showRender(view.getAttribute("data-main"), view.getAttribute("data-name"));
        return;
      }
      if (e.target.closest(".wgf-rp-render")) { closeRender(); return; }
      // A character is a complete choice - identity AND realm - so it enters the
      // world on a single click rather than waiting for the Okay button.
      var ch = e.target.closest(".wgf-rp-char");
      if (ch) { enterWorldAs(ch.getAttribute("data-char-id")); return; }
      var row = e.target.closest(".wgf-rp-row");
      if (row) {
        state.selected = { slug: row.getAttribute("data-slug"),
                           name: row.getAttribute("data-name") };
        ov.querySelectorAll(".wgf-rp-row").forEach(function (el) {
          el.classList.toggle("is-selected", el === row);
        });
        updateDivergence();
        return;
      }
      if (e.target.closest(".wgf-rp-ok")) { applySelection(); return; }
      if (e.target.closest(".wgf-rp-cancel")) { close(); return; }
    });
    ov.addEventListener("dblclick", function (e) {
      var row = e.target.closest(".wgf-rp-row");
      if (row) {
        state.selected = { slug: row.getAttribute("data-slug"),
                           name: row.getAttribute("data-name") };
        applySelection();
      }
    });
    // Keyboard parity with the realm rows: a character row is focusable, so Enter
    // must commit it too.
    ov.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var ch = e.target.closest && e.target.closest(".wgf-rp-char");
      if (ch) { e.preventDefault(); enterWorldAs(ch.getAttribute("data-char-id")); }
    });
    var search = ov.querySelector(".wgf-rp-search");
    if (search) {
      search.addEventListener("input", function () { filterRealms(search.value); });
      // Enter in the box commits the single remaining match - the whole point of
      // filtering down to one realm.
      search.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var vis = ov.querySelectorAll(".wgf-rp-row:not([hidden])");
        if (vis.length === 1) {
          e.preventDefault();
          state.selected = { slug: vis[0].getAttribute("data-slug"),
                             name: vis[0].getAttribute("data-name") };
          applySelection();
        }
      });
    }

    document.addEventListener("keydown", onKey);
    // Realms is the honest default: it needs no session and is always populated.
    // renderCharacters() promotes to the character view once a roster actually
    // arrives, so nobody watches an empty pane while a fetch is in flight.
    setView("realms");
    renderCharacters();
    switchRegion(currentRegion());
  }

  window.WGFRealmPicker = { open: open };
})();

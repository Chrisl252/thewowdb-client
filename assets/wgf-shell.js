/* WoW Gold Farms — site shell behavior (mobile nav toggle).
   Progressive enhancement: the static header works without JS; this only
   adds the collapsing mobile menu. Added 2026-06-12. */
(function () {
  "use strict";

  // Game-menu nav skin (2026-07-31, MOONSHOTS #19 rung 1): DEFAULT ON since the
  // owner ready-check approval ("launch", 2026-07-31 evening). ?navskin=off is the
  // troubleshooting opt-out (sticky); ?navskin=game clears the opt-out. Follow-up
  // brick: emit the class server-side/static so the skin never waits on JS.
  try {
    var q = new URLSearchParams(location.search).get("navskin");
    if (q === "off") localStorage.setItem("wgfNavSkin", "off");
    if (q === "game") localStorage.removeItem("wgfNavSkin");
    if (localStorage.getItem("wgfNavSkin") !== "off") {
      document.documentElement.classList.add("wgf-navskin-game");
    }
  } catch (e) {
    document.documentElement.classList.add("wgf-navskin-game");
  }

  // Realm-aware search (2026-07-31): the header search inherits the AH realm context
  // (wgf-ah-realm, the same key the AH browser/deals/item cards share) so /search/
  // shows YOUR realm's item prices. Server validates the slug; absent key = region view.
  var searchForm = document.querySelector('form.wgf-shell-search');
  if (searchForm) {
    searchForm.addEventListener("submit", function () {
      try {
        var r = localStorage.getItem("wgf-ah-realm");
        if (r && /^[a-z0-9-]{2,40}$/.test(r) && !searchForm.querySelector('input[name="realm"]')) {
          var inp = document.createElement("input");
          inp.type = "hidden";
          inp.name = "realm";
          inp.value = r;
          searchForm.appendChild(inp);
        }
      } catch (e) { /* storage blocked: region-wide search still works */ }
    });
  }

  // Header identity + Enter World (2026-08-22).
  //
  // The chip is global: account + selected realm + selected WoW version, always
  // in the top-right. It does not live inside the picker, so closing Enter World
  // cannot take it with it. It does not require the search form or .wgf-shell-right
  // (those are created if a template omitted them). Guides' username-only
  // .gsh-user-nav is hidden in favour of this chip.
  //
  // Painted from localStorage first so a slow / failed /api/auth/me never blanks
  // the header. /api/auth/me only upgrades it.
  (function () {
    function loadScript(src, done) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { done(); };
      s.onerror = function () { done(); };
      document.head.appendChild(s);
    }

    function loadIdentity(done) {
      function after() {
        if (window.WGFHeaderIdentity) { done(window.WGFHeaderIdentity); return; }
        loadScript("/assets/wgf-header-identity.js?v=hid2", function () {
          done(window.WGFHeaderIdentity || null);
        });
      }
      if (window.WGFIdentityFormat) { after(); return; }
      loadScript("/assets/wgf-identity-format.js?v=hid2", after);
    }

    loadIdentity(function (HID) {
      var btn = document.querySelector(".wgf-header-identity") ||
                document.querySelector(".wgf-realm-btn");
      if (HID) {
        if (!btn) btn = HID.mountChip(document);
        HID.paint(btn, window.WGFAuth || null);
        if (!btn) return;
      } else if (!btn) {
        return;
      }

      function paint(auth) {
        if (HID) HID.paint(btn, auth);
      }

      // Shared auth snapshot. The picker reads this instead of fetching again, and
      // the session cookie is HttpOnly so there is no way to know without asking.
      // Cached per tab; /account/ and /auth/ bypass so signing in or out shows at once.
      var KEY = "wgf-auth-me";
      var TTL_MS = 60 * 1000;
      var onAuthPage = /^\/(account|auth)\//.test(location.pathname);

      function adopt(data) {
        window.WGFAuth = data || { signed_in: false };
        paint(window.WGFAuth);
      }

      if (onAuthPage) { try { sessionStorage.removeItem(KEY); } catch (e) {} }
      else {
        try {
          var hit = JSON.parse(sessionStorage.getItem(KEY) || "null");
          if (hit && (Date.now() - hit.t) < TTL_MS) { adopt(hit.d); }
        } catch (e) {}
      }
      function refreshAuth() {
        fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data) return; // fetch failed: never downgrade a painted state
            adopt(data);
            try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data })); }
            catch (e) {}
          })
          .catch(function () { /* keep the persisted identity */ });
      }
      if (!window.WGFAuth) refreshAuth();
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") refreshAuth();
      });
      // Picker close / version change / other-tab storage must not blank the chip.
      document.addEventListener("wgf:realm-picker-close", function () {
        paint(window.WGFAuth || null);
      });
      document.addEventListener("wgf:identity-change", function () {
        paint(window.WGFAuth || null);
      });
      window.addEventListener("storage", function (e) {
        if (!e) return;
        if (e.key === "wgf-ah-realm" || e.key === "wgf-ah-region" ||
            e.key === "wgf-ah-game" || e.key === "wgf-auth-account" ||
            e.key === "wgf-ah-realm-name") {
          paint(window.WGFAuth || null);
        }
      });

      var loading = false;
      btn.addEventListener("click", function () {
        if (window.WGFRealmPicker) { window.WGFRealmPicker.open(); return; }
        if (loading) return;
        loading = true;
        btn.disabled = true;
        function restore() {
          loading = false;
          btn.disabled = false;
          paint(window.WGFAuth || null);
        }
        var css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "/assets/wgf-realm-picker.css?v=rp10";
        document.head.appendChild(css);
        var s = document.createElement("script");
        s.src = "/assets/wgf-realm-picker.js?v=rp10";
        s.onload = function () {
          restore();
          if (window.WGFRealmPicker) window.WGFRealmPicker.open();
        };
        s.onerror = restore;
        document.head.appendChild(s);
      });
    });
  })();

  var topbar = document.querySelector(".wgf-shell-topbar");
  if (!topbar) return;

  var toggle = topbar.querySelector(".wgf-shell-nav-toggle");
  if (!toggle) return;

  function close() {
    topbar.classList.remove("is-open");
    document.documentElement.classList.remove("wgf-nav-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  // Orientation: when the drawer opens, pre-expand the pillar that contains the CURRENT
  // page (the active-highlight script below marks it), so "where am I / what's nearby"
  // is answered without hunting through five collapsed pillars.
  function expandActivePillar() {
    var nav = document.getElementById("wgf-primary-nav");
    if (!nav || !nav.classList.contains("is-accordion")) return;
    var active = nav.querySelector(".wgf-nav-menu a.is-active");
    var grp = active && active.closest(".wgf-nav-group");
    if (!grp) {
      var trig = nav.querySelector(".wgf-nav-trigger.is-active");
      grp = trig && trig.closest(".wgf-nav-group");
    }
    if (grp && !grp.classList.contains("is-expanded")) {
      grp.classList.add("is-expanded");
      var t = grp.querySelector(".wgf-nav-trigger");
      if (t) t.setAttribute("aria-expanded", "true");
    }
  }

  toggle.addEventListener("click", function () {
    var open = topbar.classList.toggle("is-open");
    // Scroll-lock the page behind the open drawer (the drawer scrolls internally).
    document.documentElement.classList.toggle("wgf-nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) expandActivePillar();
  });

  // Collapse the menu after a real nav link is tapped. A pillar TRIGGER (the dropdown
  // parent) toggles its accordion on mobile instead — handled below — so don't close on it.
  topbar.addEventListener("click", function (e) {
    var link = e.target.closest(".wgf-shell-nav a");
    if (topbar.classList.contains("is-open") && link &&
        !link.classList.contains("wgf-nav-trigger")) {
      close();
    }
  });

  // Tap/click anywhere OUTSIDE the header closes the open drawer (the standard mobile
  // dismissal gesture; before this the only way out was re-finding the X).
  document.addEventListener("click", function (e) {
    if (topbar.classList.contains("is-open") && !topbar.contains(e.target)) {
      close();
    }
  });

  // Collapse on Escape for keyboard users.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && topbar.classList.contains("is-open")) {
      close();
      toggle.focus();
    }
  });

  // Crossing back to desktop while the drawer is open would strand the page scroll-lock
  // (the hamburger disappears at >1260px) — release everything on the way out.
  if (window.matchMedia) {
    var deskMq = window.matchMedia("(min-width: 1261px)");
    var onCross = function () { if (deskMq.matches) close(); };
    if (deskMq.addEventListener) deskMq.addEventListener("change", onCross);
    else if (deskMq.addListener) deskMq.addListener(onCross);
  }
})();

/* Header search re-cut (2026-08-01, owner): the two-scope pill cluster + inline
   input read cramped and web-ish, and a sticky Characters scope kept eating item
   searches. The bar now carries ONE magnifier button; clicking it expands a
   full-width kit search row under the topbar (database scope only - character
   search lives on its own page + the zero-match handoff redirects there and back).
   No-JS fallback: without this script the form renders expanded, still on /search/.
   SUPERSEDED for the prime band (2026-08-06, owner: "search is the most prominent
   thing in the nav"): a form carrying --prime is the always-open command band under
   the topbar and must never collapse behind the magnifier or have its placeholder
   rewritten - it already ships the tools+data copy server-side. The collapsible
   path below survives only for any legacy page whose form lacks --prime. */
(function () {
  "use strict";

  var form = document.querySelector(".wgf-shell-search");
  if (!form) return;
  var input = form.querySelector(".wgf-shell-search__input");
  var btn = form.querySelector(".wgf-shell-search__btn");
  if (!input || !btn) return;

  // One scope forever: the database search (the pills are retired).
  form.setAttribute("action", "/search/");
  input.setAttribute("name", "q");
  try { localStorage.setItem("wgf-search-scope", "database"); } catch (e) {}

  if (form.classList.contains("wgf-shell-search--prime")) return;

  input.setAttribute("placeholder", "Search items, bosses, zones…");
  form.classList.add("wgf-search--collapsible");
  function collapse() { form.classList.remove("is-open"); }
  function expand() { form.classList.add("is-open"); input.focus(); }

  btn.addEventListener("click", function (e) {
    if (!form.classList.contains("is-open")) {
      e.preventDefault();          // first click opens the row; submit only when open
      expand();
    } else if (!input.value.trim()) {
      e.preventDefault();          // empty submit closes instead of searching ""
      collapse();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && form.classList.contains("is-open")) collapse();
  });
  document.addEventListener("click", function (e) {
    if (form.classList.contains("is-open") && !form.contains(e.target)) collapse();
  });
})();

/* Grouped-nav active-section highlight + dropdown keyboard close (added 2026-06-20;
   rewritten 2026-06-23 for pillar IA). The nav is fully server-rendered; this only marks
   the current section and lets Escape close a focus-opened dropdown (CSS :focus-within).

   Highlighting rule: pick the SINGLE best match so exactly one pillar lights — never two.
   "Best" = the longest matching path prefix among every nav target; on a tie, a top-level
   item beats a nested dropdown child. This makes the overlapping links resolve correctly,
   e.g. /wow-auction-house/deals/ lights "Deals" (longer) not "Auction House", and /item/...
   lights the top-level "Item Prices" not the same link inside the Auction House dropdown. */
(function () {
  "use strict";

  var nav = document.getElementById("wgf-primary-nav");
  if (!nav) return;

  function norm(p) {
    return p.length > 1 && p.charAt(p.length - 1) !== "/" ? p + "/" : p;
  }
  var here = norm(location.pathname);

  // Build the candidate list: every nav link, plus each trigger's data-active-prefix tokens.
  // top = 1 for a top-level item (single link OR a pillar trigger), 0 for a dropdown child —
  // used only to break length ties in favour of the bar item.
  var cands = [];
  function add(prefix, el, top) {
    if (!prefix || prefix.charAt(0) !== "/") return;
    var np = norm(prefix);
    if (np === "/") return;                       // the bare home link never wins
    if (here === np || here.indexOf(np) === 0) {  // exact or descendant
      cands.push({ len: np.length, top: top, el: el });
    }
  }

  var links = nav.querySelectorAll("a[href]");
  var i;
  for (i = 0; i < links.length; i++) {
    var el = links[i];
    var inMenu = !!el.closest(".wgf-nav-menu");
    add(el.getAttribute("href"), el, inMenu ? 0 : 1);
  }
  // Extra pillar prefixes (e.g. Leaderboards covers the whole /pve/ family).
  var trigs = nav.querySelectorAll(".wgf-nav-trigger[data-active-prefix]");
  for (i = 0; i < trigs.length; i++) {
    var toks = (trigs[i].getAttribute("data-active-prefix") || "").split(/\s+/);
    for (var t = 0; t < toks.length; t++) add(toks[t], trigs[i], 1);
  }

  // Winner: longest prefix; tie -> top-level over nested child.
  var best = null;
  for (i = 0; i < cands.length; i++) {
    var c = cands[i];
    if (!best || c.len > best.len || (c.len === best.len && c.top > best.top)) best = c;
  }
  if (best) {
    best.el.classList.add("is-active");
    var grp = best.el.closest(".wgf-nav-group");   // light the parent pillar trigger too
    if (grp) {
      var trig = grp.querySelector(".wgf-nav-trigger");
      if (trig) trig.classList.add("is-active");
    }
  }

  // Escape closes a focus-opened dropdown.
  nav.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var act = document.activeElement;
      if (act && nav.contains(act) && act.blur) act.blur();
    }
  });
})();

/* Mobile nav accordion (added 2026-06-23): below 1260px each pillar's children collapse
   behind its trigger so the open hamburger is a short list of pillars, not a wall of links.
   Progressive enhancement — adds the .is-accordion class only when the mobile breakpoint is
   active; on desktop the CSS hover dropdowns are untouched. */
(function () {
  "use strict";

  var nav = document.getElementById("wgf-primary-nav");
  if (!nav || !window.matchMedia) return;
  var mq = window.matchMedia("(max-width: 1260px)");

  function sync() {
    if (mq.matches) {
      nav.classList.add("is-accordion");
    } else {
      nav.classList.remove("is-accordion");
      var open = nav.querySelectorAll(".wgf-nav-group.is-expanded");
      for (var i = 0; i < open.length; i++) open[i].classList.remove("is-expanded");
    }
  }
  sync();
  if (mq.addEventListener) mq.addEventListener("change", sync);
  else if (mq.addListener) mq.addListener(sync);  // older Safari

  // On mobile a pillar trigger toggles its children instead of navigating. The pillar hub
  // is the menu's first child, so it stays one tap away. SINGLE-OPEN: expanding a pillar
  // collapses the others, so the drawer never degrades back into a wall of ~30 links.
  nav.addEventListener("click", function (e) {
    if (!mq.matches) return;
    var trig = e.target.closest(".wgf-nav-trigger");
    if (!trig || !nav.contains(trig)) return;
    var grp = trig.closest(".wgf-nav-group");
    if (!grp) return;
    e.preventDefault();
    var expanded = grp.classList.toggle("is-expanded");
    trig.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (expanded) {
      var open = nav.querySelectorAll(".wgf-nav-group.is-expanded");
      for (var i = 0; i < open.length; i++) {
        if (open[i] !== grp) {
          open[i].classList.remove("is-expanded");
          var t = open[i].querySelector(".wgf-nav-trigger");
          if (t) t.setAttribute("aria-expanded", "false");
        }
      }
    }
  });
})();

// Host-aware branding (dual-serve transition, docs/REBRAND_THEWOWDB.md): the same
// pages serve on both domains; on thewowdb.com the shell wears the TheWoWDB NAME
// so a visitor always sees the brand of the door they came in through.
// wowgoldfarms.com is untouched (this returns immediately there).
//
// The MARK does not change. Owner ruling 2026-08-09: the icon is the gold coin,
// nothing else - no plate, no monogram. Both brands wear the same coin
// (assets/wgf-logo.svg), so there is one home for the mark and nothing to swap.
(function () {
  var h = location.hostname;
  if (h !== "thewowdb.com" && h !== "www.thewowdb.com") return;
  var NAME = "TheWoWDB";
  var logos = document.querySelectorAll(".wgf-shell-logo, .wgf-site-footer__logo");
  for (var i = 0; i < logos.length; i++) {
    var a = logos[i];
    for (var n = a.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && /\S/.test(n.nodeValue)) n.nodeValue = " " + NAME;
    }
    var label = a.getAttribute("aria-label");
    if (label) a.setAttribute("aria-label", label.split("WoW Gold Farms").join(NAME));
  }
  if (document.title.indexOf("WoW Gold Farms") !== -1) {
    document.title = document.title.split("WoW Gold Farms").join(NAME);
  }
})();

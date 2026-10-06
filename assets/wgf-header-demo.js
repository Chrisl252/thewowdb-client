/* Preview seed: signed-in Alterrboy / Proudmoore US / Retail, plus a live snapshot.
   ?guest=1 shows the logged-out bar (region + version still visible). */
(function () {
  "use strict";
  var guest = /(?:\?|&)guest=1(?:&|$)/.test(location.search || "");
  window.WGFSnapshot = {
    live: true,
    lastUpdated: "2026-08-22T19:00:00.000Z",
    expansion: "Midnight"
  };
  try {
    if (guest) {
      localStorage.removeItem("wgf-auth-account");
    } else {
      localStorage.setItem("wgf-auth-account", "Alterrboy");
      localStorage.setItem("wgf-ah-realm", "proudmoore");
      localStorage.setItem("wgf-ah-realm-name", "Proudmoore");
      localStorage.setItem("wgf-ah-region", "us");
      localStorage.setItem("wgf-ah-game", "retail");
    }
  } catch (e) { /* private mode */ }
  window.WGFAuth = guest
    ? { signed_in: false }
    : {
        signed_in: true,
        user: { battletag: "Alterrboy#1823", name: "Alterrboy" },
        active_character: {
          realm_name: "Proudmoore",
          realm_slug: "proudmoore",
          region: "us",
          game: "retail"
        }
      };
})();

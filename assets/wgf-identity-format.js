/* Shared identity-chrome formatters.
   Used by the Enter World header chip and the character-select selected banner.
   Keep version as a readable word (Retail / Classic / Classic Era), never icon-only. */

(function (root) {
  "use strict";

  var VERSION_LABELS = {
    retail: "Retail",
    wow: "Retail",
    live: "Retail",
    classic: "Classic",
    "classic-era": "Classic Era",
    classic_era: "Classic Era",
    classicera: "Classic Era",
    era: "Classic Era",
    sod: "Season of Discovery",
    anniversary: "Classic Anniversary",
    wrath: "Wrath Classic",
    cata: "Cataclysm Classic",
    mop: "MoP Classic",
  };

  function titleCaseWords(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });
  }

  function formatRealmLabel(realmName, region) {
    var realm = String(realmName || "").trim();
    var reg = String(region || "").trim().toUpperCase();
    if (!realm) return "";
    return reg ? realm + " " + reg : realm;
  }

  function formatVersionLabel(version) {
    var raw = String(version || "").trim();
    if (!raw) return "";
    var key = raw.toLowerCase().replace(/\s+/g, "-");
    if (VERSION_LABELS[key]) return VERSION_LABELS[key];
    if (VERSION_LABELS[raw.toLowerCase()]) return VERSION_LABELS[raw.toLowerCase()];
    return titleCaseWords(raw);
  }

  function formatHeaderContext(ctx) {
    ctx = ctx || {};
    var realm = formatRealmLabel(ctx.realmName || ctx.realm, ctx.region);
    var version = formatVersionLabel(ctx.version || ctx.wowVersion);
    var parts = [];
    if (realm) parts.push(realm);
    if (version) parts.push(version);
    return parts.join(" · ");
  }

  function formatSelectedSummary(ctx) {
    var line = formatHeaderContext(ctx);
    return line ? "Selected: " + line : "";
  }

  var api = {
    VERSION_LABELS: VERSION_LABELS,
    formatRealmLabel: formatRealmLabel,
    formatVersionLabel: formatVersionLabel,
    formatHeaderContext: formatHeaderContext,
    formatSelectedSummary: formatSelectedSummary,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.WGFIdentityFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

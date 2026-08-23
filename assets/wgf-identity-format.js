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

  var RETAIL_EXPANSION = "Midnight";

  function versionKey(version) {
    return String(version || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  }

  function isRetailVersion(version) {
    var key = versionKey(version);
    return !key || key === "retail" || key === "wow" || key === "live" || key === "ptr" || key === "beta";
  }

  function formatExpansionLabel(version, expansion) {
    if (!isRetailVersion(version)) return "";
    return String(expansion || RETAIL_EXPANSION).trim();
  }

  function formatRegionLabel(region) {
    var reg = String(region || "US").trim().toUpperCase() || "US";
    return reg + " Region";
  }

  function formatGameContext(ctx) {
    ctx = ctx || {};
    var region = formatRegionLabel(ctx.region);
    var version = formatVersionLabel(ctx.version || ctx.wowVersion || "retail") || "Retail";
    var expansion = formatExpansionLabel(ctx.version || ctx.wowVersion || "retail", ctx.expansion);
    if (expansion) return region + " · " + version + " (" + expansion + ")";
    return region + " · " + version;
  }

  function formatLiveLabel(live) {
    return live === false ? "Offline · last verified" : "Live · updated hourly";
  }

  function formatCadence() {
    return "Usually refreshed hourly";
  }

  function formatLastUpdated(iso) {
    if (!iso) return "";
    var d = iso instanceof Date ? iso : new Date(iso);
    if (isNaN(d.getTime())) return "";
    return "Last updated " + d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  var api = {
    VERSION_LABELS: VERSION_LABELS,
    RETAIL_EXPANSION: RETAIL_EXPANSION,
    versionKey: versionKey,
    isRetailVersion: isRetailVersion,
    formatRealmLabel: formatRealmLabel,
    formatVersionLabel: formatVersionLabel,
    formatExpansionLabel: formatExpansionLabel,
    formatHeaderContext: formatHeaderContext,
    formatSelectedSummary: formatSelectedSummary,
    formatRegionLabel: formatRegionLabel,
    formatGameContext: formatGameContext,
    formatLiveLabel: formatLiveLabel,
    formatCadence: formatCadence,
    formatLastUpdated: formatLastUpdated,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.WGFIdentityFormat = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

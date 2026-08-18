const SECRET = /token|password|secret|cookie|authorization|refresh|otp|mfa/i;

export function redact(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 500).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET.test(k)) continue;
      out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function classifyNetwork(url, body) {
  const u = String(url || "").toLowerCase();
  if (/sellercentral\.amazon|amazon\.com\/hz|amazon\.com\/orders|inventoryplanning|reportcentral/i.test(u)) {
    if (/news|announcement|learn/i.test(u)) return { marketplace: "amazon", kind: "news" };
    if (/order/i.test(u)) return { marketplace: "amazon", kind: "orders" };
    if (/inventor/i.test(u)) return { marketplace: "amazon", kind: "inventory" };
    return { marketplace: "amazon", kind: "other" };
  }
  if (/whatnot\.com/i.test(u)) {
    if (/order/i.test(u)) return { marketplace: "whatnot", kind: "orders" };
    if (/listing|inventor|product/i.test(u)) return { marketplace: "whatnot", kind: "inventory" };
    if (/ledger|payout|financ/i.test(u)) return { marketplace: "whatnot", kind: "ledger" };
    return { marketplace: "whatnot", kind: "other" };
  }
  return { marketplace: "unknown", kind: "other" };
}

export function normalizeCapturePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("empty capture");
  const marketplace = payload.marketplace === "whatnot" ? "whatnot" : payload.marketplace === "amazon" ? "amazon" : null;
  if (!marketplace) throw new Error("marketplace must be amazon or whatnot");
  return {
    marketplace,
    capturedAt: payload.capturedAt || new Date().toISOString(),
    href: String(payload.href || ""),
    session: payload.session || {},
    news: Array.isArray(payload.news) ? payload.news.slice(0, 20) : [],
    pages: Array.isArray(payload.pages) ? payload.pages.slice(0, 12) : [],
    network: Array.isArray(payload.network) ? payload.network.slice(0, 40).map((n) => ({
      url: String(n.url || "").slice(0, 500),
      kind: n.kind || "other",
      body: redact(n.body),
    })) : [],
    tables: Array.isArray(payload.tables) ? payload.tables : [],
  };
}

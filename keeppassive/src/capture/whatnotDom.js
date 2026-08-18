import { firstTableDataset, stripTags } from "./tables.js";

export function whatnotSessionFromHtml(html, href = "") {
  const url = String(href);
  if (/\/login|\/authenticate/i.test(url) && /sign[\s-]?in|log[\s-]?in/i.test(html)) {
    return { loggedIn: false, reason: "signin-url" };
  }
  if (/type=["']password["']/i.test(html) && /log in|sign in/i.test(html) && !/Seller Hub|Inventory|Listings/i.test(html)) {
    return { loggedIn: false, reason: "signin-form" };
  }
  const hub = /Seller Hub|dashboard\/listings|dashboard\/orders|Your inventory/i.test(html)
    || /\/dashboard\//i.test(url);
  if (hub) return { loggedIn: true, reason: "seller-hub" };
  return { loggedIn: false, reason: "not-seller-hub" };
}

export function extractWhatnotPage(html, href = "") {
  const session = whatnotSessionFromHtml(html, href);
  const table = firstTableDataset(html, "whatnot");
  return {
    marketplace: "whatnot",
    href,
    session,
    table,
    heading: pageHeading(html),
  };
}

function pageHeading(html) {
  const h = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return h ? stripTags(h[1]) : "";
}

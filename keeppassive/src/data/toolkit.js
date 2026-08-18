/**
 * KeepPassive reads YOUR Seller Central and Whatnot Hub from the Chrome
 * profile that is already logged in. Developer APIs are not wired:
 * Whatnot is not accepting applicants, and Amazon's article of the day
 * lives inside Seller News behind the Seller Central session.
 */
export const AMAZON_TOOLKIT = {
  method: "logged-in Chrome only",
  why: "Seller News, manage-orders, and inventory are what this Chrome session already loaded. Capture never types a password and never calls SP-API.",
  extension: "keeppassive/extension — Load unpacked in chrome://extensions",
  pages: [
    { url: "https://sellercentral.amazon.com/home", use: "Seller News widget / today's article" },
    { url: "https://sellercentral.amazon.com/orders-v3", use: "Manage orders grid" },
    { url: "https://sellercentral.amazon.com/inventory", use: "Manage inventory" },
    { url: "https://sellercentral.amazon.com/learn", use: "Learn / Seller News list" },
  ],
  stopsIf: "A sign-in form or /ap/signin URL appears in this Chrome",
};

export const WHATNOT_TOOLKIT = {
  method: "logged-in Chrome only",
  apiStatus: "closed",
  why: "Whatnot Seller API is in developer preview and not accepting new applicants. Capture uses the Seller Hub tabs already open in this Chrome.",
  docs: "https://developers.whatnot.com/docs/getting-started/introduction",
  pages: [
    { url: "https://www.whatnot.com/dashboard", use: "Seller Hub home" },
    { url: "https://www.whatnot.com/dashboard/listings", use: "Inventory / listings" },
    { url: "https://www.whatnot.com/dashboard/orders", use: "Orders" },
    { url: "https://www.whatnot.com/dashboard/finances", use: "Ledger / payouts" },
  ],
  stopsIf: "The Whatnot login page is showing in this Chrome",
};

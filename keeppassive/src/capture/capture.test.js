import assert from "node:assert/strict";
import { test } from "node:test";
import { amazonSessionFromHtml, extractAmazonPage, extractSellerNewsFromHtml, pickTodaysArticle } from "./amazonDom.js";
import { firstTableDataset } from "./tables.js";
import { normalizeCapturePayload, redact } from "./payload.js";
import { whatnotSessionFromHtml } from "./whatnotDom.js";
import { processCapture } from "../../server/captureStore.js";

const signedInHome = `
<html><body>
  <div id="sc-navbar">Seller Central</div>
  <a href="/learn/news/reviews-growth">How to use customer reviews to grow your business</a>
  <div>Aug 18, 2026</div>
  <p>Customer reviews are market research. Learn how to turn every rating into a growth opportunity.</p>
  <table>
    <tr><th>Order ID</th><th>SKU</th><th>ASIN</th><th>Quantity</th><th>Item price</th></tr>
    <tr><td>111-1</td><td>KP-MUG</td><td>B0AAA</td><td>2</td><td>24.00</td></tr>
  </table>
</body></html>
`;

const signInPage = `
<html><head><title>Amazon Sign-In</title></head>
<body>
  <form><input id="ap_email" name="email"><input id="ap_password" type="password"></form>
</body></html>
`;

test("refuses Amazon capture on the sign-in form", () => {
  const session = amazonSessionFromHtml(signInPage, "https://sellercentral.amazon.com/ap/signin");
  assert.equal(session.loggedIn, false);
});

test("accepts a logged-in Seller Central page in this Chrome", () => {
  assert.equal(amazonSessionFromHtml(signedInHome, "https://sellercentral.amazon.com/home").loggedIn, true);
});

test("pulls today's Seller News article from the logged-in page", () => {
  const news = extractSellerNewsFromHtml(signedInHome);
  const today = pickTodaysArticle(news, new Date("2026-08-18T18:00:00Z"));
  assert.equal(today.title, "How to use customer reviews to grow your business");
  assert.match(today.url, /reviews-growth/);
});

test("maps the orders table into ingest rows", () => {
  const table = firstTableDataset(signedInHome, "amazon");
  assert.equal(table.rows[0]["amazon-order-id"], "111-1");
  assert.equal(table.rows[0].sku, "KP-MUG");
});

test("Whatnot hub is logged-in; login page is not", () => {
  assert.equal(
    whatnotSessionFromHtml("<h1>Seller Hub</h1><p>Inventory</p>", "https://www.whatnot.com/dashboard/listings").loggedIn,
    true,
  );
  assert.equal(
    whatnotSessionFromHtml('<input type="password"> Log in', "https://www.whatnot.com/login").loggedIn,
    false,
  );
});

test("redacts tokens before ingest and requires a marketplace", () => {
  assert.equal(redact({ accessToken: "nope", orders: 3 }).accessToken, undefined);
  assert.equal(redact({ accessToken: "nope", orders: 3 }).orders, 3);
  assert.throws(() => normalizeCapturePayload({ marketplace: "ebay" }));
  const n = normalizeCapturePayload({ marketplace: "amazon", news: [{ title: "x" }] });
  assert.equal(n.marketplace, "amazon");
});

test("extractAmazonPage bundles session, news, and table", () => {
  const page = extractAmazonPage(signedInHome, "https://sellercentral.amazon.com/home");
  assert.equal(page.session.loggedIn, true);
  assert.ok(page.news.length);
  assert.equal(page.table.rows.length, 1);
});

test("processCapture refuses a sign-in HTML dump", () => {
  const result = processCapture({
    marketplace: "amazon",
    pages: [{ href: "https://sellercentral.amazon.com/ap/signin", html: signInPage }],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /Not logged in/);
});

test("processCapture keeps today's Seller News article from a logged-in dump", () => {
  const result = processCapture({
    marketplace: "amazon",
    pages: [{ href: "https://sellercentral.amazon.com/home", html: signedInHome }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.article.title, "How to use customer reviews to grow your business");
  assert.equal(result.tables[0].rows[0].sku, "KP-MUG");
});

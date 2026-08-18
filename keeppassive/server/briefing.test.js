import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFeaturedArticle } from "./briefing.js";

const fixture = `
<div class="PagePromo-title">
  <a class="Link" href="https://sell.amazon.com/blog/customer-reviews-social-proof">How to use customer reviews to grow your business</a>
</div>
<div class="PagePromo-date">Aug 18, 2026</div>
<div class="PagePromo-description">
  <a class="Link" href="https://sell.amazon.com/blog/customer-reviews-social-proof">Customer reviews are market research. Learn how to turn every rating into a growth opportunity.</a>
</div>
`;

test("extracts the featured Selling Partner Blog article", () => {
  const article = extractFeaturedArticle(fixture);
  assert.equal(article.title, "How to use customer reviews to grow your business");
  assert.equal(article.url, "https://sell.amazon.com/blog/customer-reviews-social-proof");
  assert.equal(article.displayDate, "Aug 18, 2026");
  assert.match(article.dek, /market research/);
});

import { firstTableDataset, stripTags } from "./tables.js";

export function amazonSessionFromHtml(html, href = "") {
  const url = String(href);
  if (/\/ap\/signin|amazon\.com\/ap\//i.test(url)) {
    return { loggedIn: false, reason: "signin-url" };
  }
  if (/id=["']ap_email["']|name=["']email["'][\s\S]{0,200}password/i.test(html) && /sign[\s-]?in/i.test(html)) {
    return { loggedIn: false, reason: "signin-form" };
  }
  if (/id=["']ap_password["']/.test(html)) {
    return { loggedIn: false, reason: "password-form" };
  }
  const sellerChrome = /id=["']sc-navbar["']|kat-navbar|data-marketplace-id|sellercentral/i.test(html);
  const sellerCopy = /Manage Orders|Manage Inventory|Business Reports|Seller Central|Account Health/i.test(html);
  if (sellerChrome || sellerCopy) return { loggedIn: true, reason: "seller-chrome" };
  return { loggedIn: false, reason: "not-seller-central" };
}

export function extractSellerNewsFromHtml(html) {
  const articles = [];
  const seen = new Set();
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const href = match[1];
    const title = stripTags(match[2]);
    if (title.length < 18 || title.length > 180) continue;
    if (!/news|learn|announc|policy|fee|review|seller/i.test(`${href} ${title}`)) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    const window = html.slice(Math.max(0, match.index - 280), match.index + match[0].length + 280);
    const date = (window.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}/i) || [])[0]
      || (window.match(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i) || [])[0]
      || "";
    articles.push({
      title,
      url: absolutizeAmazon(href),
      displayDate: date,
      dek: nearbyDek(window, title),
      source: "seller-news",
    });
  }
  return articles.slice(0, 12);
}

export function pickTodaysArticle(articles, today = new Date()) {
  if (!articles?.length) return null;
  const stamp = today.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hit = articles.find((a) => a.displayDate && a.displayDate.replace(/\./g, "") === stamp)
    || articles.find((a) => sameCalendarDay(a.displayDate, today))
    || articles[0];
  return hit;
}

function sameCalendarDay(displayDate, today) {
  if (!displayDate) return false;
  const parsed = new Date(displayDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
}

function nearbyDek(windowHtml, title) {
  const text = stripTags(windowHtml).replace(title, "").trim();
  if (text.length < 24) return "";
  return text.slice(0, 220);
}

function absolutizeAmazon(href) {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `https://sellercentral.amazon.com${href.startsWith("/") ? "" : "/"}${href}`;
}

export function extractAmazonPage(html, href = "") {
  const session = amazonSessionFromHtml(html, href);
  const news = extractSellerNewsFromHtml(html);
  const table = firstTableDataset(html, "amazon");
  return {
    marketplace: "amazon",
    href,
    session,
    news,
    table,
  };
}

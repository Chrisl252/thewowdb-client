import { FALLBACK_AMAZON_ARTICLE } from "../src/data/briefing.js";

export function extractFeaturedArticle(html) {
  if (!html) return null;

  const blocks = html.split(/class="PagePromo-title"/i);
  for (const block of blocks.slice(1)) {
    const href = block.match(/href="(https:\/\/sell\.amazon\.com\/blog\/[^"]+)"/i);
    const title = block.match(/href="https:\/\/sell\.amazon\.com\/blog\/[^"]+"[^>]*>([^<]+)</i)
      || block.match(/>(How to [^<]+)</);
    const after = html.slice(html.indexOf(block), html.indexOf(block) + block.length + 800);
    const date = after.match(/PagePromo-date">([^<]+)/)
      || block.match(/PagePromo-date">([^<]+)/);
    const dek = after.match(/PagePromo-description[\s\S]{0,400}?>([^<]{20,220})</)
      || after.match(/PagePromo-description[\s\S]{0,400}?href="[^"]+">([^<]{20,220})</);

    if (href && title) {
      return {
        date: parseDisplayDate(date?.[1]),
        displayDate: (date?.[1] || "").trim(),
        title: decode(title[1]).trim(),
        dek: decode(dek?.[1] || "").trim(),
        url: href[1],
        source: "Amazon Selling Partner Blog",
        author: "Amazon",
        readMinutes: null,
        takeaways: [],
        live: true,
      };
    }
  }
  return null;
}

function parseDisplayDate(raw) {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchAmazonBriefing() {
  try {
    const res = await fetch("https://sell.amazon.com/blog/", {
      headers: {
        "user-agent": "KeepPassive/0.1 (Language=JavaScript/Node; +https://keeppassive.com)",
        accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`blog HTTP ${res.status}`);
    const html = await res.text();
    const live = extractFeaturedArticle(html);
    if (live?.title) {
      return {
        ok: true,
        article: {
          ...FALLBACK_AMAZON_ARTICLE,
          ...live,
          takeaways: live.takeaways?.length ? live.takeaways : FALLBACK_AMAZON_ARTICLE.takeaways,
        },
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    return {
      ok: true,
      article: FALLBACK_AMAZON_ARTICLE,
      fetchedAt: new Date().toISOString(),
      warning: err.message,
    };
  }

  return {
    ok: true,
    article: FALLBACK_AMAZON_ARTICLE,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Today's Amazon briefing for KeepPassive and Jarvis.
 * Live fetch of sell.amazon.com/blog is preferred; this is the fallback
 * so the section still renders if Amazon's public blog is unreachable.
 */
export const FALLBACK_AMAZON_ARTICLE = {
  date: "2026-08-18",
  displayDate: "Aug 18, 2026",
  title: "How to use customer reviews to grow your business",
  dek: "Customer reviews are market research. Learn how to turn every rating into a growth opportunity.",
  author: "Kat Weiner",
  readMinutes: 9,
  url: "https://sell.amazon.com/blog/customer-reviews-social-proof",
  source: "Amazon Selling Partner Blog",
  takeaways: [
    "Five reviews can lift conversion about 270% versus zero; get off zero first.",
    "4.2–4.5 stars often convert better than a perfect 5.0 because the mix looks real.",
    "Mine positive reviews for the words customers actually search, then put those in the listing.",
    "Sort negative reviews into quality, fulfillment, expectation, and wrong-audience — each needs a different fix.",
    "Read competitor 1–3 star reviews for gaps you can sell against.",
  ],
};

export const JARVIS_ALERTS = [
  {
    level: "urgent",
    title: "BSA transfer / pledge ban",
    detail: "Amazon's Business Solutions Agreement update takes effect August 24, 2026. Account transfers and pledging future Amazon disbursements as collateral are prohibited.",
    url: "https://sell.amazon.com/blog/",
  },
  {
    level: "watch",
    title: "FBA fee changes September 1",
    detail: "Inbound placement fees and a wider low-inventory-level fee hit more categories on September 1, 2026. Re-run FBA math before Q4 POs.",
    url: "https://sell.amazon.com/blog/fba-fees-guide",
  },
];

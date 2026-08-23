/* wgf-comments.js — Related-window Comments tab.
 *
 * Live item pages (wgf_related_tabs.py) currently paint an empty local feed and
 * a Wowhead CTA even when comment rows exist. This module is the one place that
 * sorts, features, and renders every available comment. Drop it next to the
 * Related window; it does not scrape Wowhead.
 */
(function (root, factory) {
  var api = factory();
  root.WGFComments = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var FEATURED_COUNT = 3;

  function score(comment) {
    var n = Number(comment && comment.upvotes);
    return Number.isFinite(n) ? n : 0;
  }

  function createdMs(comment) {
    var t = Date.parse((comment && comment.createdAt) || "");
    return Number.isFinite(t) ? t : 0;
  }

  function sortCommentsByUpvotes(comments) {
    return (comments || []).slice().sort(function (a, b) {
      var byVotes = score(b) - score(a);
      if (byVotes !== 0) return byVotes;
      return createdMs(b) - createdMs(a);
    });
  }

  function partitionFeaturedComments(sorted, count) {
    var n = count == null ? FEATURED_COUNT : count;
    var list = sorted || [];
    return {
      featured: list.slice(0, n),
      rest: list.slice(n)
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function classSlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function formatWhen(iso) {
    var ms = Date.parse(iso || "");
    if (!Number.isFinite(ms)) return "";
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function authorLine(comment) {
    var bits = [];
    if (comment.level) bits.push("Level " + comment.level);
    if (comment.race) bits.push(comment.race);
    if (comment.class) bits.push(comment.class);
    var who = bits.join(" ");
    return comment.realm ? who + " • " + comment.realm : who;
  }

  function renderComment(comment, featured) {
    var cls = "wgf-cmt" + (featured ? " wgf-cmt--featured" : "");
    var klass = classSlug(comment.class);
    var when = formatWhen(comment.createdAt);
    var votes = score(comment);
    return (
      '<article class="' + cls + '" data-comment-id="' + escapeHtml(comment.id) + '">' +
        '<div class="wgf-cmt__votes" aria-label="' + votes + ' upvotes">' +
          '<span class="wgf-cmt__vote-num">' + votes + "</span>" +
          '<span class="wgf-cmt__vote-lbl">up</span>' +
        "</div>" +
        '<div class="wgf-cmt__main">' +
          '<header class="wgf-cmt__meta">' +
            '<span class="wgf-cmt__author wgf-cmt__author--' + klass + '">' +
              escapeHtml(comment.author) +
            "</span>" +
            '<span class="wgf-cmt__who">' + escapeHtml(authorLine(comment)) + "</span>" +
            (when ? '<time class="wgf-cmt__when" datetime="' + escapeHtml(comment.createdAt) + '">' + escapeHtml(when) + "</time>" : "") +
          "</header>" +
          '<p class="wgf-cmt__body">' + escapeHtml(comment.body) + "</p>" +
        "</div>" +
      "</article>"
    );
  }

  function wowheadSecondary(payload) {
    var count = Number(payload && payload.wowheadCount) || 0;
    var url = payload && payload.wowheadUrl;
    var name = (payload && payload.itemName) || "this item";
    if (!url || count < 1) return "";
    return (
      '<aside class="wgf-whcta wgf-whcta--secondary" aria-label="Wowhead thread">' +
        '<span class="wgf-whcta__count">' + count + "</span>" +
        '<p class="wgf-whcta__copy">' +
          count + " comments on '" + escapeHtml(name) + "' also live on Wowhead. " +
          "They are listed above when we have them; use the thread if you want the original discussion." +
          ' <a class="wgf-whcta__link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Read the Wowhead thread ↗</a>' +
        "</p>" +
      "</aside>"
    );
  }

  function emptyState() {
    return (
      '<div class="wgf-cfeed__empty">' +
        "<p>No comments yet. Be the first to share your thoughts.</p>" +
      "</div>"
    );
  }

  function renderCommentsFeed(container, payload) {
    if (!container) return { featured: [], rest: [] };
    var sorted = sortCommentsByUpvotes((payload && payload.comments) || []);
    var parts = partitionFeaturedComments(sorted, FEATURED_COUNT);
    var html = "";

    if (!sorted.length) {
      html = emptyState();
    } else {
      if (parts.featured.length) {
        html +=
          '<section class="wgf-cfeed__featured" aria-label="Top comments">' +
            '<p class="wgf-cfeed__kicker">Top comments</p>' +
            parts.featured.map(function (c) { return renderComment(c, true); }).join("") +
          "</section>";
      }
      if (parts.rest.length) {
        html +=
          '<section class="wgf-cfeed__rest" aria-label="More comments">' +
            '<p class="wgf-cfeed__kicker">More comments</p>' +
            parts.rest.map(function (c) { return renderComment(c, false); }).join("") +
          "</section>";
      }
    }

    html += wowheadSecondary(payload || {});
    container.innerHTML = html;
    container.classList.add("wgf-cfeed");
    container.hidden = false;
    return parts;
  }

  function bindComposer(form, feedEl, payload) {
    if (!form || !feedEl) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var field = form.querySelector("[name=body], textarea");
      var body = field && String(field.value || "").trim();
      if (!body) return;
      if (body.length > 2000) body = body.slice(0, 2000);
      var next = {
        id: "local-new-" + Date.now(),
        author: (form.getAttribute("data-author") || "You"),
        class: form.getAttribute("data-class") || "",
        level: Number(form.getAttribute("data-level")) || undefined,
        race: form.getAttribute("data-race") || "",
        realm: form.getAttribute("data-realm") || "",
        upvotes: 0,
        createdAt: new Date().toISOString(),
        body: body
      };
      payload.comments = (payload.comments || []).concat([next]);
      renderCommentsFeed(feedEl, payload);
      field.value = "";
    });
  }

  function mount(root, payload) {
    var feed = root.querySelector("[data-comments-feed]");
    var form = root.querySelector("[data-comments-composer]");
    renderCommentsFeed(feed, payload);
    bindComposer(form, feed, payload);
  }

  return {
    FEATURED_COUNT: FEATURED_COUNT,
    sortCommentsByUpvotes: sortCommentsByUpvotes,
    partitionFeaturedComments: partitionFeaturedComments,
    renderCommentsFeed: renderCommentsFeed,
    bindComposer: bindComposer,
    mount: mount
  };
});

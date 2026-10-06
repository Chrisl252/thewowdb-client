import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { sortCommentsByUpvotes, partitionFeaturedComments, FEATURED_COUNT } =
  require("../assets/wgf-comments.js");

const fixture = JSON.parse(
  readFileSync(join(here, "../assets/comments/item-227774.json"), "utf8")
);

test("sorts comments by upvotes descending, newest on ties", () => {
  const mixed = [
    { id: "old-tie", upvotes: 10, createdAt: "2024-01-01T00:00:00Z" },
    { id: "low", upvotes: 2, createdAt: "2026-01-01T00:00:00Z" },
    { id: "high", upvotes: 40, createdAt: "2023-01-01T00:00:00Z" },
    { id: "new-tie", upvotes: 10, createdAt: "2025-06-01T00:00:00Z" }
  ];
  const ids = sortCommentsByUpvotes(mixed).map((c) => c.id);
  assert.deepEqual(ids, ["high", "new-tie", "old-tie", "low"]);
});

test("Pummel Permit fixture is fully listed, featured first", () => {
  const sorted = sortCommentsByUpvotes(fixture.comments);
  assert.equal(sorted.length, fixture.comments.length);
  assert.ok(sorted.length > FEATURED_COUNT);

  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i - 1].upvotes >= sorted[i].upvotes);
  }

  const { featured, rest } = partitionFeaturedComments(sorted);
  assert.equal(featured.length, FEATURED_COUNT);
  assert.equal(rest.length, sorted.length - FEATURED_COUNT);
  assert.deepEqual(
    featured.map((c) => c.author),
    ["Sparkwrench", "Boltfang", "Gildgear"]
  );
  assert.equal(rest[0].author, "Rivetshade");
});

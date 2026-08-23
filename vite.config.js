import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { defineConfig } from "vite";

const AUTH = {
  signed_in: true,
  user: { battletag: "Alterrboy#1823", name: "Alterrboy" },
  providers: { bnet: true },
  active_character: {
    id: 1,
    name: "Alterrboy",
    realm_name: "Proudmoore",
    realm_slug: "proudmoore",
    region: "us",
    game: "retail",
    class_name: "Hunter",
    class_color: "#abd473",
    level: 80,
  },
};

const dungeonSlugs = [
  "altar-of-fangs",
  "den-of-nalorakk",
  "kings-rest",
  "murder-row",
  "ruby-life-pools",
  "temple-of-sethraliss",
  "the-blinding-vale",
  "voidscar-arena",
];

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function json(res, body) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function mockApi() {
  return {
    name: "wgf-header-identity-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = String(req.url || "").split("?")[0];
        if (url === "/api/auth/me") return json(res, AUTH);
        if (url === "/api/realms") {
          return json(res, {
            realms: [
              {
                primary_slug: "proudmoore",
                realm_names: "Proudmoore",
                timezone: "America/Los_Angeles",
                population: "High",
                realm_count: 1,
              },
            ],
          });
        }
        if (url === "/api/account/characters") {
          return json(res, {
            active_id: 1,
            characters: [AUTH.active_character],
          });
        }
        if (url === "/api/account/characters/active") {
          return json(res, { ok: true });
        }
        next();
      });
    },
  };
}

function serveRepoAssets() {
  return {
    name: "serve-repo-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = decodeURIComponent(String((req && req.url) || "").split("?")[0]);
        if (!urlPath.startsWith("/assets/")) return next();
        const local = resolve(__dirname, urlPath.slice(1));
        if (!existsSync(local)) return next();
        try {
          if (!statSync(local).isFile()) return next();
        } catch {
          return next();
        }
        res.setHeader("Content-Type", MIME[extname(local).toLowerCase()] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(local).pipe(res);
      });
    },
  };
}

const htmlInput = {
  home: resolve(__dirname, "index.html"),
  homepage: resolve(__dirname, "home/index.html"),
  header: resolve(__dirname, "enter-world/index.html"),
  herbsListing: resolve(__dirname, "herbs/index.html"),
  item: resolve(__dirname, "item/index.html"),
  herbs: resolve(__dirname, "items/herbs/index.html"),
  comments: resolve(__dirname, "item-comments/index.html"),
  auctionHouse: resolve(__dirname, "auction-house/index.html"),
  cheapestRealm: resolve(__dirname, "cheapest-realm/index.html"),
  deals: resolve(__dirname, "wow-auction-house/deals/index.html"),
  guides: resolve(__dirname, "guides/index.html"),
  dungeons: resolve(__dirname, "pve/mythic-plus/dungeons/index.html"),
  reckful: resolve(__dirname, "pvp/reckful/index.html"),
};

for (const slug of dungeonSlugs) {
  htmlInput["dungeon-" + slug] = resolve(
    __dirname,
    "pve/mythic-plus/dungeon/" + slug + "/index.html"
  );
}

export default defineConfig({
  plugins: [mockApi(), serveRepoAssets()],
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: false,
    proxy: {
      "^/assets/(ui|icons|fonts|dungeon-tiles|loading-screens)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: htmlInput,
    },
  },
});

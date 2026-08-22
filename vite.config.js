import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { defineConfig } from "vite";

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

const dungeonInput = Object.fromEntries(
  dungeonSlugs.map((slug) => [
    "dungeon-" + slug,
    resolve(__dirname, "pve/mythic-plus/dungeon/" + slug + "/index.html"),
  ])
);

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
};

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
        } catch (err) {
          return next();
        }
        res.setHeader("Content-Type", MIME[extname(local).toLowerCase()] || "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(local).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [serveRepoAssets()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "^/assets/(ui|icons|fonts|dungeon-tiles|loading-screens)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        dungeons: resolve(__dirname, "pve/mythic-plus/dungeons/index.html"),
        ...dungeonInput,
      },
    },
  },
});

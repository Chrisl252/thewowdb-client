import { existsSync } from "node:fs";
import { resolve } from "node:path";
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

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "^/assets/(ui|icons|fonts|dungeon-tiles|loading-screens)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
        bypass(req) {
          const urlPath = String(req.url || "").split("?")[0];
          const local = resolve(__dirname, "." + urlPath);
          if (existsSync(local)) return urlPath;
        },
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

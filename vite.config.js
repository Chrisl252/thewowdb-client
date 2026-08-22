import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "^/assets/(ui|icons|fonts|dungeon-tiles)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        auctionHouse: resolve(__dirname, "auction-house/index.html"),
        cheapestRealm: resolve(__dirname, "cheapest-realm/index.html"),
      },
    },
  },
});

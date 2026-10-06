import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: false,
    proxy: {
      "^/assets/(ui|icons|fonts|dungeon-tiles)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
      },
    },
  },
});

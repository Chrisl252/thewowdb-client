import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "^/assets/(ui|icons|fonts)/": {
        target: "https://thewowdb.com",
        changeOrigin: true,
      },
    },
  },
});

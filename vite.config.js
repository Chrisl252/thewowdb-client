import { resolve } from "node:path";
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
    level: 80
  }
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
        const url = req.url.split("?")[0];
        if (url === "/api/auth/me") return json(res, AUTH);
        if (url === "/api/realms") {
          return json(res, {
            realms: [
              { primary_slug: "proudmoore", realm_names: "Proudmoore", timezone: "America/Los_Angeles", population: "High", realm_count: 1 }
            ]
          });
        }
        if (url === "/api/account/characters") {
          return json(res, {
            active_id: 1,
            characters: [AUTH.active_character]
          });
        }
        if (url === "/api/account/characters/active") {
          return json(res, { ok: true });
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [mockApi()],
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
        item: resolve(__dirname, "item/index.html"),
        herbs: resolve(__dirname, "herbs/index.html"),
        guides: resolve(__dirname, "guides/index.html"),
        enterWorld: resolve(__dirname, "enter-world/index.html"),
      },
    },
  },
});

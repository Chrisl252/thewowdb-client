import { defineConfig, loadEnv } from "vite";
import { handleKeepPassiveApi } from "./server/http.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    server: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
    plugins: [
      {
        name: "keeppassive-api",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith("/api/")) return next();
            handleKeepPassiveApi(req, res).catch((err) => {
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: false, error: err.message || "server error" }));
            });
          });
        },
      },
    ],
  };
});

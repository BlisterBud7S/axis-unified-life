import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};
  const loaded = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loaded)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    plugins: [
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      react(),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      ...(command === "build"
        ? [
            nitro({
              defaultPreset: "vercel",
            }),
          ]
        : []),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        filename: "sw.js",
        outDir: "dist/client",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null,
          globPatterns: [],
          additionalManifestEntries: [{ url: "/offline.html", revision: "2" }],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "axis-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 40 },
                plugins: [
                  {
                    handlerDidError: async () =>
                      (await caches.match("/offline.html")) ?? Response.error(),
                  },
                ],
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin &&
                (request.destination === "script" || request.destination === "style"),
              handler: "NetworkFirst",
              options: {
                cacheName: "axis-assets-v2",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 80 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin &&
                (request.destination === "image" || request.destination === "font"),
              handler: "CacheFirst",
              options: {
                cacheName: "axis-media",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith("/_server"),
              handler: "NetworkFirst",
              method: "GET",
              options: {
                cacheName: "axis-rpc",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
      }),
    ],
  };
});

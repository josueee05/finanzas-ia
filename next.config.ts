import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PGlite carga archivos .wasm en tiempo de ejecución: no debe pasar por el bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

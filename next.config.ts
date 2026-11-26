import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // PGlite carga archivos .wasm en tiempo de ejecución: no debe pasar por el bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  // Oculta el botón flotante de Next.js en desarrollo (su menú tiene un selector de
  // tema propio que confunde con el de la app). Los errores se siguen mostrando.
  devIndicators: false,
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

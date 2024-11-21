import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import path from "path";

/**
 * Vite configuration for the application.
 *
 * @remarks
 * This configuration is mostly standard Vite + React setup, with specific accommodations for:
 * - WASM decoders used by Cornerstone libraries
 * - DICOM parser which currently uses CommonJS format (planned migration to ESM)
 *
 * @description
 * Key configuration points:
 * - Uses vite-plugin-commonjs to handle the DICOM parser's CommonJS format
 * - Configures worker format as ES modules
 * - Excludes Cornerstone CODEC packages from dependency optimization to handle WASM properly
 * - Explicitly includes dicom-parser in optimization
 * - Ensures WASM files are properly handled as assets
 *
 * @example
 * To use additional WASM decoders, add them to the optimizeDeps.exclude array:
 * ```ts
 * optimizeDeps: {
 *   exclude: [
 *     "@cornerstonejs/codec-new-decoder",
 *     // ... existing codecs
 *   ]
 * }
 * ```
 */
export default defineConfig({
  plugins: [
    react(),
    // for dicom-parser
    viteCommonjs(),
  ],
  // seems like only required in dev mode
  optimizeDeps: {
    exclude: ["@cornerstonejs/dicom-image-loader"],
    include: ["dicom-parser"],
  },
  worker: {
    format: "es",
    rollupOptions: {
      external: ["@icr/polyseg-wasm"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cornerstonejs/tools": (() => {
        const result = path.resolve(
          __dirname,
          "./src/cornerstoneTools/src/index.js"
        );

        console.log(result);

        return result;
      })(),
    },
  },
  server: {
    port: 8848,
    proxy: {
      "/onlineDicomweb": {
        target: "http://38.12.43.20:8042/",
        rewrite: (path) => {
          return path.replace(/^\/onlineDicomweb/, "dicom-web");
        },
      },
      "/localDicomWeb": {
        target: "http://localhost:5985",
        rewrite: (path) => {
          return path.replace(/^\/localDicomWeb/, "");
        },
      },
      "/dicom-web": {
        target: "https://hz-jcy-1.matpool.com:26335",
        // rewrite: (path) => {
        //   return path.replace(/^\/dicomweb/, "dicom-web");
        // },
        secure: false,
      },
      "/medical": {
        target: "https://hz-jcy-1.matpool.com:26335",
        // rewrite: (path) => {
        //   return path.replace(/^\/dicomweb/, "dicom-web");
        // },
        secure: false,
      },
    },
  },
});

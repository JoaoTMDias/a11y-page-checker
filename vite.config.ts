/// <reference types="vitest/globals" />
import { resolve } from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";
import terser from "@rollup/plugin-terser";
import PackageJSON from "./package.json";

const { dependencies = {}, devDependencies = {} } = PackageJSON;
const EXTERNAL_DEPENDENCIES = Object.keys({
  ...dependencies,
  ...devDependencies,
});

type ModuleFormat =
  | "amd"
  | "cjs"
  | "es"
  | "iife"
  | "system"
  | "umd"
  | "commonjs"
  | "esm"
  | "module"
  | "systemjs";

/**
 * Gets a per-file format filename.
 *
 * @param format
 * @returns
 */
function getFilename(format: ModuleFormat, entryName: string) {
  const OUTPUT: Partial<Record<typeof format, string>> = {
    es: `${entryName}.mjs`,
    cjs: `${entryName}.cjs`,
  };

  return OUTPUT[format] ?? `${entryName}.cjs`;
}

const CONFIG: UserConfig = {
  plugins: [
    dts({
      insertTypesEntry: false,
    }),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      plugins: [terser()],
      external: EXTERNAL_DEPENDENCIES,
      output: {
        // Global variables for UMD build
        globals: {
          path: "path",
          axios: "axios",
          xml2js: "xml2js",
          "@playwright/test": "playwright",
          "@axe-core/playwright": "AxeBuilder",
          handlebars: "handlebars",
        },
      },
    },
    minify: "esbuild",
    target: "esnext",
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
      },
      name: "A11ySiteChecker",
      formats: ["es", "cjs"],
      fileName: getFilename,
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/"],
    },
    mockReset: true,
  },
};

// https://vitejs.dev/config/
export default defineConfig(CONFIG);

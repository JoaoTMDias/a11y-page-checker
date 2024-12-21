/// <reference types="vitest/globals" />
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import terser from "@rollup/plugin-terser";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";

import PackageJSON from "./package.json";

const { dependencies = {}, devDependencies = {} } = PackageJSON;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTERNAL_DEPENDENCIES = Object.keys({
  ...dependencies,
  ...devDependencies,
});

type ModuleFormat = "amd" | "cjs" | "commonjs" | "es" | "esm" | "iife" | "module" | "system" | "systemjs" | "umd";

function getFilename(format: ModuleFormat, entryName: string) {
  const OUTPUT: Partial<Record<typeof format, string>> = {
    cjs: `${entryName}.cjs`, // Changed to .js for CLI compatibility
    es: `${entryName}.mjs`,
  };

  return OUTPUT[format] ?? `${entryName}.cjs`; // Changed to .js
}

export default defineConfig({
  build: {
    lib: {
      entry: {
        "commands/hello": resolve(__dirname, "src/commands/hello/index.ts"),
        "commands/audit": resolve(__dirname, "src/commands/audit/index.ts"),
        "core/index": resolve(__dirname, "src/core/index.ts"),
      },
      fileName: getFilename,
      formats: ["es", "cjs"],
      name: "A11yPageChecker",
    },
    minify: "terser",
    rollupOptions: {
      plugins: [terser()],
      external: EXTERNAL_DEPENDENCIES,
    },
    target: "esnext",
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          dest: "templates",
          src: "src/core/report-generator/templates",
        },
      ],
    }),
  ],
  test: {
    coverage: {
      exclude: ["node_modules/", "dist/"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    mockReset: true,
  },
});

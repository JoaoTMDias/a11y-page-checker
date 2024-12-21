/// <reference types="vitest/globals" />
import { resolve } from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";
import terser from "@rollup/plugin-terser";
import { viteStaticCopy } from "vite-plugin-static-copy";
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

function getFilename(format: ModuleFormat, entryName: string) {
  const OUTPUT: Partial<Record<typeof format, string>> = {
    es: `${entryName}.mjs`,
    cjs: `${entryName}.js`, // Changed to .js for CLI compatibility
  };

  return OUTPUT[format] ?? `${entryName}.js`; // Changed to .js
}

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: "src/core/report-generator/templates",
          dest: "templates",
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      plugins: [terser()],
      external: EXTERNAL_DEPENDENCIES,
    },
    minify: "esbuild",
    target: "esnext",
    lib: {
      entry: {
        "a11y-page-checker": resolve(__dirname, "src/index.ts"),
        "cli/commands": resolve(__dirname, "src/commands/index.ts"),
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
});

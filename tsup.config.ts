import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    outDir: "dist",
    sourcemap: true,
    splitting: false,
    treeshake: true,
    noExternal: ["gbk.js"],
  },
  {
    entry: { qqwry: "src/qqwry-cli.ts" },
    format: ["cjs"],
    outDir: "dist",
    clean: false,
    treeshake: true,
    banner: { js: "#!/usr/bin/env node" },
    external: ["../package.json"],
  },
]);

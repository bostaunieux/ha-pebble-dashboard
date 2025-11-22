import commonjs from "@rollup/plugin-commonjs";
import eslint from "@rollup/plugin-eslint";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import serve from "rollup-plugin-serve";
import summary from "rollup-plugin-summary";

// NOTE: This is experimental and may change. This precompiles html template literals
// which should speed up initial rendering of templates. This can safely be removed
// without impacting functionality in the built code.
import { compileLitTemplates } from "@lit-labs/compiler";

const dev = process.env.ROLLUP_WATCH;

const serveOptions = {
  contentBase: ["./dist"],
  host: "0.0.0.0",
  port: 4000,
  allowCrossOrigin: true,
  headers: {
    "Access-Control-Allow-Origin": "*",
  },
};

const plugins = [
  nodeResolve(),
  json(),
  commonjs(),
  eslint(),
  typescript({
    transformers: {
      before: [compileLitTemplates()],
    },
  }),
  
  ...(dev ? [serve(serveOptions)] : [terser(), summary({showGzippedSize: true})]),
  
];

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/pebble-dashboard.js",
      format: "es",
      inlineDynamicImports: true,
    },
    plugins,
  },
];

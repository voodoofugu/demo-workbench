import path from "node:path";
import { builtinModules, createRequire } from "node:module";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import del from "rollup-plugin-delete";
import { dts } from "rollup-plugin-dts";

const require = createRequire(import.meta.url);
const packageJson = require("./package.json");

const dependencyNames = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});

const isBuiltin = (id) =>
  id.startsWith("node:") ||
  builtinModules.some((name) => id === name || id.startsWith(`${name}/`));

const isDependency = (id) =>
  dependencyNames.some((name) => id === name || id.startsWith(`${name}/`));

const isExternal = (id) => isBuiltin(id) || isDependency(id);

const minify = terser({
  compress: {
    passes: 2,
    unsafe: true,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_math: true,
    drop_console: true,
    pure_funcs: ["console.log"],
  },
  mangle: {
    toplevel: true,
    reserved: ["generatedWorkbenchRegistry"],
  },
  output: {
    comments: false,
  },
});

const createJsConfig = ({
  input,
  output,
  format,
  clean = false,
  node = false,
  banner,
  minifyCode = true,
}) => ({
  input,
  external: isExternal,
  output: {
    file: output,
    format,
    exports: format === "cjs" ? "named" : undefined,
    banner,
  },
  plugins: [
    clean ? del({ targets: "dist/*" }) : null,
    resolve({
      browser: !node,
      preferBuiltins: node,
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.rollup.json",
      compilerOptions: {
        outDir: path.dirname(output),
      },
    }),
    minifyCode ? minify : null,
  ].filter(Boolean),
});

const createDtsConfig = ({ input, output }) => ({
  input,
  external: isExternal,
  output: {
    file: output,
    format: "esm",
  },
  plugins: [dts()],
});

export default [
  createJsConfig({
    input: "./src/index.ts",
    output: "dist/index.js",
    format: "esm",
    clean: true,
  }),
  createJsConfig({
    input: "./src/index.ts",
    output: "dist/index.cjs",
    format: "cjs",
  }),
  createJsConfig({
    input: "./src/node/index.ts",
    output: "dist/node/index.js",
    format: "esm",
    node: true,
  }),
  createJsConfig({
    input: "./src/node/index.ts",
    output: "dist/node/index.cjs",
    format: "cjs",
    node: true,
  }),
  createJsConfig({
    input: "./src/node/cli.ts",
    output: "dist/node/cli.js",
    format: "esm",
    node: true,
    minifyCode: false,
  }),
  createDtsConfig({
    input: "./src/index.ts",
    output: "dist/index.d.ts",
  }),
  createDtsConfig({
    input: "./src/node/index.ts",
    output: "dist/node/index.d.ts",
  }),
];

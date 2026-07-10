import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publishDir = path.join(root, "publish");
const rootPackage = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

async function listFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath, baseDir);
      return [path.relative(baseDir, fullPath)];
    }),
  );
  return nested.flat();
}

test("package-prepare creates a package with valid root and node export targets", async () => {
  const pkg = JSON.parse(
    await readFile(path.join(publishDir, "package.json"), "utf8"),
  );
  const rootExport = pkg.exports["."];
  const nodeExport = pkg.exports["./node"];

  assert.ok(
    existsSync(path.join(publishDir, rootExport.types)),
    rootExport.types,
  );
  assert.ok(
    existsSync(path.join(publishDir, rootExport.import)),
    rootExport.import,
  );
  assert.ok(
    existsSync(path.join(publishDir, rootExport.require)),
    rootExport.require,
  );
  assert.ok(
    existsSync(path.join(publishDir, nodeExport.types)),
    nodeExport.types,
  );
  assert.ok(
    existsSync(path.join(publishDir, nodeExport.import)),
    nodeExport.import,
  );
  assert.ok(
    existsSync(path.join(publishDir, nodeExport.require)),
    nodeExport.require,
  );
  assert.equal(pkg.bin["demo-workbench-compile"], "dist/node/cli.js");
  assert.deepEqual(pkg.typesVersions["*"].node, ["./dist/node/index.d.ts"]);
  assert.equal(pkg.exports["./styles.css"], undefined);
  assert.equal(pkg.sideEffects, false);
  assert.equal(
    pkg.dependencies["styled-atom"],
    rootPackage.dependencies["styled-atom"],
  );

  for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
    assert.doesNotMatch(spec, /^(?:file:|\.{1,2}\/|\/)/, name);
  }
});

test("node package entry exposes only the command runner", async () => {
  const nodeApi = await import("../dist/node/index.js");
  const nodeTypes = await readFile(
    path.join(publishDir, "dist/node/index.d.ts"),
    "utf8",
  );

  assert.deepEqual(Object.keys(nodeApi).sort(), ["runWorkbenchCompile"]);
  assert.match(nodeTypes, /export \{ runWorkbenchCompile \}/);
  assert.match(
    nodeTypes,
    /export type \{[^}]*WorkbenchCompileDemoOptions[^}]*WorkbenchCompileStylesOptions[^}]*WorkbenchStyleReloadOptions[^}]*\}/s,
  );
  assert.doesNotMatch(
    nodeTypes,
    /export \{[^}]*\b(?:workbenchCompile|watchWorkbenchCompile|discoverWorkbenchFileNames)\b/,
  );
});

test("publish package contains only public package artifacts", async () => {
  const files = await listFiles(publishDir);
  const cssFiles = files.filter((file) => file.endsWith(".css"));

  assert.deepEqual(files.sort(), [
    "LICENSE",
    "README.md",
    "dist/index.cjs",
    "dist/index.d.ts",
    "dist/index.js",
    "dist/node/cli.js",
    "dist/node/index.cjs",
    "dist/node/index.d.ts",
    "dist/node/index.js",
    "package.json",
  ]);
  assert.deepEqual(cssFiles, []);
});

test("published bundles do not include an internal generated registry", async () => {
  await assert.rejects(
    readFile(path.join(root, "src/state/generatedWorkbenchRegistry.ts"), "utf8"),
    { code: "ENOENT" },
  );

  for (const bundle of ["dist/index.js", "dist/index.cjs"]) {
    const bundledCode = await readFile(path.join(publishDir, bundle), "utf8");
    assert.doesNotMatch(bundledCode, /generatedWorkbenchRegistry/);
  }
});

test("example pages declare their css through the loaded module", async () => {
  const examples = await import("../examples/index.js");

  assert.equal(examples.exampleDemoPages.length, 2);
  // A demo's scoped CSS is read from its module (export const cssFiles),
  // not from a manifest-level field on the DemoItem.
  const modules = await Promise.all(
    examples.exampleDemoPages.map((demo) => demo.load()),
  );
  assert.deepEqual(
    modules.map((module) => module.cssFiles),
    [["examples/alpha.css"], ["examples/beta.css"]],
  );
  assert.deepEqual(
    examples.exampleDemoPages.map((demo) => demo.cssFiles),
    [undefined, undefined],
  );
});

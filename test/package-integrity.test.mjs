import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publishDir = path.join(root, "publish");

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
  assert.equal(pkg.bin["demo-workbench-styles"], "./dist/node/cli.js");
  assert.deepEqual(pkg.typesVersions["*"].node, ["./dist/node/index.d.ts"]);
  assert.equal(pkg.dependencies["styled-atom"], "^3.0.0-beta.0");

  for (const [name, spec] of Object.entries(pkg.dependencies ?? {})) {
    assert.doesNotMatch(spec, /^(?:file:|\.{1,2}\/|\/)/, name);
  }
});

test("publish package contains exactly one workbench css artifact", async () => {
  const files = await listFiles(publishDir);
  const cssFiles = files.filter((file) => file.endsWith(".css"));

  assert.deepEqual(cssFiles, ["dist/styles.css"]);
});

test("example pages cover multiple pages with their own css files", async () => {
  const examples = await import("../examples/index.js");

  assert.equal(examples.exampleDemoPages.length, 2);
  assert.deepEqual(
    examples.exampleDemoPages.map((demo) => demo.cssFiles),
    [["examples/alpha.css"], ["examples/beta.css"]],
  );
});

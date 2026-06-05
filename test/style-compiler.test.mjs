import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compileWorkbenchStyles, watchWorkbenchCompile, workbenchCompile } from "../dist/node/index.js";

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "demo-workbench-styles-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("compileWorkbenchStyles compiles scss/css, rewrites body selectors, url assets, and minifies output", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(
      path.join(inputDir, "screen.scss"),
      `$brand: red;\nbody { color: $brand; }\nbody .hero { background: url("hero.png"); }\n.card.body { border: 0; }\n.card { background: url(#mask); }\n`,
    );
    await writeFile(
      path.join(inputDir, "plain.css"),
      `body.dark { margin: 0; }\n.note { background: url('/icons/note.svg'); }\n`,
    );

    const result = await compileWorkbenchStyles({
      inputDir,
      outputDir,
      bodySelectorReplacement: ".likeBody",
      assetUrlPrefix: "http://localhost:3000/img/",
    });

    assert.deepEqual(
      result.files.map((file) => file.outputFile).sort(),
      ["plain.css", "screen.css"],
    );

    const scssCss = await readFile(path.join(outputDir, "screen.css"), "utf8");
    const plainCss = await readFile(path.join(outputDir, "plain.css"), "utf8");

    assert.match(scssCss, /\.likeBody\{color:red\}/);
    assert.match(scssCss, /\.likeBody \.hero\{background:url\(http:\/\/localhost:3000\/img\/hero\.png\)\}/);
    assert.match(scssCss, /\.card\.body\{border:0\}/);
    assert.match(scssCss, /url\(#mask\)/);
    assert.doesNotMatch(scssCss, /(^|[\s>+~,])body(?=$|[.#:\[\s>+~,])/);

    assert.match(plainCss, /\.likeBody\.dark\{margin:0\}/);
    assert.match(plainCss, /url\(http:\/\/localhost:3000\/img\/icons\/note\.svg\)/);
    assert.doesNotMatch(plainCss, /\n/);
  });
});

test("workbenchCompile returns section-shaped styles, demos, and popups results", async () => {
  const registryPath = path.join(process.cwd(), "src/state/generatedWorkbenchRegistry.ts");
  const originalRegistry = await readFile(registryPath, "utf8");

  try {
    await withTempDir(async (dir) => {
      const styleInputDir = path.join(dir, "styles");
      const styleOutputDir = path.join(dir, "output");
      const demoInputDir = path.join(dir, "demos");
      const popupInputDir = path.join(dir, "popups");
      await mkdir(styleInputDir, { recursive: true });
      await mkdir(demoInputDir, { recursive: true });
      await mkdir(popupInputDir, { recursive: true });
      await writeFile(path.join(styleInputDir, "one.scss"), `.item { color: blue; }\n`);
      await writeFile(path.join(demoInputDir, "AlphaDemo.tsx"), `export default function AlphaDemo() { return null; }\n`);
      await writeFile(path.join(popupInputDir, "InfoPopup.tsx"), `export default function InfoPopup() { return null; }\n`);

      const result = await workbenchCompile({
        styles: {
          inputDir: styleInputDir,
          outputDir: styleOutputDir,
        },
        demos: { inputDir: demoInputDir },
        popups: { inputDir: popupInputDir },
      });

      assert.deepEqual(Object.keys(result).sort(), ["demos", "popups", "styles"]);
      assert.deepEqual(result.styles.files.map((file) => file.outputFile), ["one.css"]);
      assert.deepEqual(result.demos.names, ["AlphaDemo"]);
      assert.deepEqual(result.popups.names, ["InfoPopup"]);
      assert.equal("fileRegistry" in result, false);
    });
  } finally {
    await writeFile(registryPath, originalRegistry);
  }
});

function waitForBuild(builds, count) {
  if (builds.length >= count) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for build ${count}`)), 3000);
    builds.waiters.push(() => {
      if (builds.length >= count) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

test("watchWorkbenchCompile recompiles only the changed top-level style file", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "styles");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);
    await writeFile(path.join(inputDir, "two.scss"), `.two { color: red; }\n`);

    const builds = [];
    builds.waiters = [];
    const watch = await watchWorkbenchCompile({
      styles: { inputDir, outputDir },
      debounceMs: 20,
      onBuild: (result) => {
        builds.push(result);
        for (const waiter of builds.waiters.splice(0)) waiter();
      },
    });

    try {
      await new Promise((resolve) => watch.watcher.once("ready", resolve));
      assert.deepEqual(builds[0].styles.files.map((file) => file.outputFile).sort(), ["one.css", "two.css"]);

      await writeFile(path.join(inputDir, "two.scss"), `.two { color: green; }\n`);
      await waitForBuild(builds, 2);

      assert.deepEqual(builds[1].styles.files.map((file) => file.outputFile), ["two.css"]);
      assert.equal(builds[1].demos, undefined);
      assert.equal(builds[1].popups, undefined);
      assert.match(await readFile(path.join(outputDir, "two.css"), "utf8"), /green/);
    } finally {
      await watch.close();
    }
  });
});

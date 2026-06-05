import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compileWorkbenchStyles } from "../dist/node/index.js";

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

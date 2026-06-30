import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  discoverWorkbenchFileNames,
  runWorkbenchCompile,
  watchWorkbenchCompile,
  workbenchCompile,
} from "../dist/node/index.js";

const STYLE_RELOAD_MANIFEST_FILE = "demo-workbench-style-reload.json";

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "demo-workbench-styles-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function restoreFileSnapshot({ filePath, content }) {
  if (content === null) {
    await rm(filePath, { force: true });
    return;
  }

  await writeFile(filePath, content);
}

async function captureConsoleLog(fn) {
  const messages = [];
  const originalLog = console.log;

  console.log = (...args) => {
    messages.push(args.join(" "));
  };

  try {
    await fn(messages);
  } finally {
    console.log = originalLog;
  }

  return messages;
}

test("workbenchCompile scopes demo css, rewrites root selectors, url assets, and minifies output", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(
      path.join(inputDir, "screen.scss"),
      `$brand: red;\nbody { color: $brand; }\nhtml, :root { box-sizing: border-box; }\nhtml body .app { display: block; }\nbody .hero { background: url("hero.png"); }\n.card.body { border: 0; }\n.card { background: url(#mask); }\n@keyframes fade { from { opacity: 0; } to { opacity: 1; } }\n`,
    );
    await writeFile(
      path.join(inputDir, "plain.css"),
      `body.dark { margin: 0; }\n.note { background: url('/icons/note.svg'); }\n`,
    );
    await writeFile(
      path.join(inputDir, "01-all.css"),
      `.lead { display: block; }\n`,
    );

    const result = await workbenchCompile({
      styles: {
        inputDir,
        outputDir,
        assetUrlPrefix: "http://localhost:3000/img/",
      },
    });

    assert.deepEqual(
      result.styles.files.map((file) => file.outputFile).sort(),
      ["01-all.css", "plain.css", "screen.css"],
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(
          path.join(outputDir, STYLE_RELOAD_MANIFEST_FILE),
          "utf8",
        ),
      ).enabled,
      false,
    );

    const numericCss = await readFile(
      path.join(outputDir, "01-all.css"),
      "utf8",
    );
    const scssCss = await readFile(path.join(outputDir, "screen.css"), "utf8");
    const plainCss = await readFile(path.join(outputDir, "plain.css"), "utf8");

    assert.match(
      numericCss,
      /\[workbench-scope\]\.css-01-all \.lead\{display:block\}/,
    );

    assert.match(scssCss, /\[workbench-scope\]\.screen\{color:red\}/);
    assert.match(
      scssCss,
      /\[workbench-scope\]\.screen\{box-sizing:border-box\}/,
    );
    assert.match(
      scssCss,
      /\[workbench-scope\]\.screen \.app\{display:block\}/,
    );
    assert.doesNotMatch(
      scssCss,
      /\[workbench-scope\]\.screen \[workbench-scope\]\.screen/,
    );
    assert.match(
      scssCss,
      /\[workbench-scope\]\.screen \.hero\{background:url\(http:\/\/localhost:3000\/img\/hero\.png\)\}/,
    );
    assert.match(
      scssCss,
      /\[workbench-scope\]\.screen \.card\.body\{border:0\}/,
    );
    assert.match(scssCss, /url\(#mask\)/);
    assert.match(scssCss, /@keyframes fade\{/);
    assert.doesNotMatch(scssCss, /\[workbench-scope\] (from|to|0%|100%)/);
    assert.doesNotMatch(scssCss, /(^|[\s>+~,])body(?=$|[.#:\[\s>+~,])/);

    assert.match(plainCss, /\[workbench-scope\]\.plain\.dark\{margin:0\}/);
    assert.match(
      plainCss,
      /\[workbench-scope\]\.plain \.note\{background:url\(http:\/\/localhost:3000\/img\/icons\/note\.svg\)\}/,
    );
    assert.match(plainCss, /\/\*# sourceURL=plain\.css \*\/$/);
    assert.equal(plainCss.split("\n").length, 2);
  });
});

test("workbenchCompile can emit production css without workbench isolation", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(
      path.join(inputDir, "prod.css"),
      `body { margin: 0; }\n.card { color: blue; }\n`,
    );

    await workbenchCompile({
      styles: {
        inputDir,
        outputDir,
        compileForWorkbench: false,
      },
    });

    const css = await readFile(path.join(outputDir, "prod.css"), "utf8");

    assert.match(css, /body\{margin:0\}/);
    assert.match(css, /\.card\{color:#00f\}/);
    assert.doesNotMatch(css, /\[workbench-scope\]/);
    assert.doesNotMatch(css, /sourceURL=/);
  });
});

test("workbenchCompile prints build summaries only when logs is true", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);

    const quietMessages = await captureConsoleLog(async () => {
      await workbenchCompile({
        styles: { inputDir, outputDir },
      });
    });
    assert.deepEqual(quietMessages, []);

    const loggedMessages = await captureConsoleLog(async () => {
      await workbenchCompile({
        styles: { inputDir, outputDir },
        logs: true,
      });
    });
    assert.deepEqual(loggedMessages, [
      "📋 demo-workbench: styles compiled 1 file(s)",
    ]);
  });
});

test("runWorkbenchCompile reads args and logs command output by default", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);

    const messages = await captureConsoleLog(async () => {
      await runWorkbenchCompile({
        args: [],
        styles: { inputDir, outputDir },
      });
    });

    assert.deepEqual(messages, [
      "📋 demo-workbench: styles compiled 1 file(s)",
    ]);
  });
});

test("runWorkbenchCompile can disable command logs", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);

    const messages = await captureConsoleLog(async () => {
      await runWorkbenchCompile({
        args: [],
        logs: false,
        styles: { inputDir, outputDir },
      });
    });

    assert.deepEqual(messages, []);
  });
});

test("runWorkbenchCompile switches to watch mode from args", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "input");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);

    await captureConsoleLog(async (messages) => {
      const result = await runWorkbenchCompile({
        args: ["--watch"],
        debounceMs: 20,
        styleReload: { port: 0 },
        styles: { inputDir, outputDir },
      });

      assert.ok(result && "watcher" in result);
      try {
        await new Promise((resolve) => result.watcher.once("ready", resolve));
        assert.match(
          result.styleReloadUrl,
          /^http:\/\/127\.0\.0\.1:\d+\/demo-workbench-style-events$/,
        );
        assert.ok(
          messages.some((message) =>
            message.startsWith("📋 demo-workbench: watching "),
          ),
        );
      } finally {
        await result.close();
      }
    });
  });
});

test("workbenchCompile returns section-shaped styles and demos results", async () => {
  const registryFiles = [
    path.join(process.cwd(), "src/state/generatedWorkbenchRegistry.ts"),
    path.join(process.cwd(), "dist/index.js"),
    path.join(process.cwd(), "dist/index.cjs"),
  ];
  const originalRegistryFiles = await Promise.all(
    registryFiles.map(async (filePath) => ({
      filePath,
      content: await readOptionalFile(filePath),
    })),
  );

  try {
    await withTempDir(async (dir) => {
      const styleInputDir = path.join(dir, "styles");
      const styleOutputDir = path.join(dir, "output");
      const demoInputDir = path.join(dir, "demos");
      await mkdir(styleInputDir, { recursive: true });
      await mkdir(demoInputDir, { recursive: true });
      await writeFile(
        path.join(styleInputDir, "one.scss"),
        `.item { color: blue; }\n`,
      );
      await writeFile(
        path.join(demoInputDir, "AlphaDemo.tsx"),
        `export default function AlphaDemo() { return null; }\n`,
      );

      const result = await workbenchCompile({
        styles: {
          inputDir: styleInputDir,
          outputDir: styleOutputDir,
        },
        demos: { inputDir: demoInputDir },
      });

      assert.deepEqual(Object.keys(result).sort(), ["demos", "styles"]);
      assert.deepEqual(
        result.styles.files.map((file) => file.outputFile),
        ["one.css"],
      );
      assert.deepEqual(result.demos.names, ["AlphaDemo"]);
      assert.ok(
        result.demos.outputFiles.some((file) =>
          file.endsWith("src/state/generatedWorkbenchRegistry.ts"),
        ),
      );
      assert.ok(
        result.demos.outputFiles.some((file) => file.endsWith("dist/index.js")),
      );
      assert.ok(
        result.demos.outputFiles.some((file) =>
          file.endsWith("dist/index.cjs"),
        ),
      );
      assert.equal("fileRegistry" in result, false);
    });
  } finally {
    await Promise.all(originalRegistryFiles.map(restoreFileSnapshot));
  }
});

test("discoverWorkbenchFileNames returns sorted module basenames", async () => {
  await withTempDir(async (dir) => {
    await writeFile(path.join(dir, "Beta.tsx"), `export default null;\n`);
    await writeFile(path.join(dir, "Alpha.jsx"), `export default null;\n`);
    await writeFile(path.join(dir, "notes.md"), `# ignored\n`);
    await writeFile(path.join(dir, "_Private.tsx"), `export default null;\n`);
    await writeFile(path.join(dir, "a_popupList.json"), `[]\n`);
    await writeFile(path.join(dir, "Types.d.ts"), `export type T = string;\n`);

    assert.deepEqual(await discoverWorkbenchFileNames({ inputDir: dir }), [
      "Alpha",
      "Beta",
    ]);
  });
});

function waitForBuild(builds, count) {
  if (builds.length >= count) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for build ${count}`)),
      3000,
    );
    builds.waiters.push(() => {
      if (builds.length >= count) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

async function waitForNoBuild(builds, durationMs = 250) {
  const count = builds.length;
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  assert.equal(builds.length, count);
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
      assert.deepEqual(
        builds[0].styles.files.map((file) => file.outputFile).sort(),
        ["one.css", "two.css"],
      );

      await writeFile(
        path.join(inputDir, "two.scss"),
        `.two { color: green; }\n`,
      );
      await waitForBuild(builds, 2);

      assert.deepEqual(
        builds[1].styles.files.map((file) => file.outputFile),
        ["two.css"],
      );
      assert.equal(builds[1].demos, undefined);
      assert.match(
        await readFile(path.join(outputDir, "two.css"), "utf8"),
        /green/,
      );
    } finally {
      await watch.close();
    }
  });
});

test("watchWorkbenchCompile rebuilds demo registry only when demo file names change", async () => {
  const registryFiles = [
    path.join(process.cwd(), "src/state/generatedWorkbenchRegistry.ts"),
    path.join(process.cwd(), "dist/index.js"),
    path.join(process.cwd(), "dist/index.cjs"),
  ];
  const originalRegistryFiles = await Promise.all(
    registryFiles.map(async (filePath) => ({
      filePath,
      content: await readOptionalFile(filePath),
    })),
  );

  try {
    await withTempDir(async (dir) => {
      const demoInputDir = path.join(dir, "demos");
      await mkdir(demoInputDir, { recursive: true });
      await writeFile(
        path.join(demoInputDir, "AlphaDemo.tsx"),
        `export default function AlphaDemo() { return null; }\n`,
      );

      const builds = [];
      builds.waiters = [];
      const watch = await watchWorkbenchCompile({
        demos: { inputDir: demoInputDir },
        debounceMs: 20,
        onBuild: (result) => {
          builds.push(result);
          for (const waiter of builds.waiters.splice(0)) waiter();
        },
      });

      try {
        await new Promise((resolve) => watch.watcher.once("ready", resolve));
        assert.deepEqual(builds[0].demos.names, ["AlphaDemo"]);

        await writeFile(
          path.join(demoInputDir, "AlphaDemo.tsx"),
          `export default function AlphaDemo() { return "changed"; }\n`,
        );
        await waitForNoBuild(builds);

        await writeFile(
          path.join(demoInputDir, "BetaDemo.tsx"),
          `export default function BetaDemo() { return null; }\n`,
        );
        await waitForBuild(builds, 2);
        assert.deepEqual(builds[1].demos.names, ["AlphaDemo", "BetaDemo"]);

        await rm(path.join(demoInputDir, "BetaDemo.tsx"), { force: true });
        await waitForBuild(builds, 3);
        assert.deepEqual(builds[2].demos.names, ["AlphaDemo"]);
      } finally {
        await watch.close();
      }
    });
  } finally {
    await Promise.all(originalRegistryFiles.map(restoreFileSnapshot));
  }
});

test("watchWorkbenchCompile serves fresh css through the style reload endpoint", async () => {
  await withTempDir(async (dir) => {
    const inputDir = path.join(dir, "styles");
    const outputDir = path.join(dir, "output");
    await mkdir(inputDir, { recursive: true });
    await writeFile(path.join(inputDir, "one.scss"), `.one { color: blue; }\n`);

    const builds = [];
    builds.waiters = [];
    await captureConsoleLog(async (messages) => {
      const watch = await watchWorkbenchCompile({
        styles: { inputDir, outputDir },
        debounceMs: 20,
        logs: true,
        styleReload: { port: 0 },
        onBuild: (result) => {
          builds.push(result);
          for (const waiter of builds.waiters.splice(0)) waiter();
        },
      });

      try {
        await new Promise((resolve) => watch.watcher.once("ready", resolve));
        assert.match(
          watch.styleReloadUrl,
          /^http:\/\/127\.0\.0\.1:\d+\/demo-workbench-style-events$/,
        );
        assert.ok(
          messages.some((message) =>
            message.startsWith("📋 demo-workbench: watching "),
          ),
        );
        assert.ok(
          messages.includes(
            `📋 demo-workbench: style reload stream ${watch.styleReloadUrl}`,
          ),
        );
        assert.ok(
          messages.includes(
            "📋 demo-workbench: styles compiled 1 file(s)",
          ),
        );
        const enabledManifest = JSON.parse(
          await readFile(
            path.join(outputDir, STYLE_RELOAD_MANIFEST_FILE),
            "utf8",
          ),
        );
        assert.equal(enabledManifest.enabled, true);
        assert.equal(enabledManifest.styleReloadUrl, watch.styleReloadUrl);
        assert.match(enabledManifest.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

        const styleUrl = new URL(watch.styleReloadUrl);
        styleUrl.searchParams.set("style", "one");
        let response = await fetch(styleUrl);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /color:#00f/);

        await writeFile(
          path.join(inputDir, "one.scss"),
          `.one { color: green; }\n`,
        );
        await waitForBuild(builds, 2);
        assert.ok(
          messages.includes('📋 demo-workbench: style "one.css" compiled'),
        );

        styleUrl.searchParams.set("v", "2");
        response = await fetch(styleUrl);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /green/);
      } finally {
        await watch.close();
        assert.equal(
          JSON.parse(
            await readFile(
              path.join(outputDir, STYLE_RELOAD_MANIFEST_FILE),
              "utf8",
            ),
          ).enabled,
          false,
        );
      }
    });
  });
});

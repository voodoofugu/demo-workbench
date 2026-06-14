import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { createServer } from "node:http";
import type { Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { transform } from "lightningcss";
import * as sass from "sass-embedded";

import { discoverWorkbenchFileNames } from "./generateDemoManifest";
import { toWorkbenchStyleClassName } from "../utils/workbenchStyleScope";

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileStyleFile***:
 * one input style file and the CSS file generated from it.
 * @description
 * Returned for every style file touched by a full compile or an incremental watch rebuild.
 * @example
 * ```ts
 * result.styles?.files.forEach((file) => {
 *   console.log(file.inputFile, file.outputFile);
 * });
 * ```
 */
export type WorkbenchCompileStyleFile = {
  /** File name inside `WorkbenchCompileStylesOptions.inputDir`, for example `button.scss`. */
  inputFile: string;
  /** Generated CSS file name inside `WorkbenchCompileStylesOptions.outputDir`, for example `button.css`. */
  outputFile: string;
  /** Absolute path to the source style file. */
  inputPath: string;
  /** Absolute path to the generated CSS file. */
  outputPath: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileStylesOptions***:
 * options for compiling project CSS, SCSS and Sass files used by demo pages.
 * @description
 * The compiler reads top-level style files, optionally scopes selectors under the workbench preview scope, rewrites relative assets, minifies CSS and writes one `.css` file per input file.
 * @example
 * ```ts
 * const styles: WorkbenchCompileStylesOptions = {
 *   inputDir: "titans_rc/styles/scss",
 *   outputDir: "src/styles/workbench-css",
 *   assetUrlPrefix: "http://localhost:3000/img/",
 * };
 * ```
 */
export type WorkbenchCompileStylesOptions = {
  /** Directory with top-level `.css`, `.scss` and `.sass` files. Files starting with `_` are treated as Sass partials and are not emitted directly. */
  inputDir: string;
  /** Directory where minified `.css` files are written. */
  outputDir: string;
  /** Enables workbench-only CSS isolation by prefixing regular selectors with `[workbench-scope]`. Pass `false` for production CSS output. Defaults to `true`. */
  isolateStyles?: boolean;
  /** Optional prefix added to relative `url(...)` assets during compilation. Absolute/data/hash URLs are left unchanged. */
  assetUrlPrefix?: string;
  /** Remove `outputDir` before a full style compile. Ignored for incremental single-file watch rebuilds. */
  clean?: boolean;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileDemoOptions***:
 * options for discovering demo page files.
 * @description
 * File basenames become workbench demo names and are written to the generated registry when a writable registry target is available.
 * @example
 * ```ts
 * const demos: WorkbenchCompileDemoOptions = {
 *   inputDir: "src/components/pages",
 * };
 * ```
 */
export type WorkbenchCompileDemoOptions = {
  /** Directory with demo page modules. File basenames become demo names. */
  inputDir: string;
  /** File extensions to include. Defaults to `.jsx`, `.tsx`, `.js`, `.ts`. */
  extensions?: string[];
  /** Basenames to exclude from the generated list. Defaults are provided by `discoverWorkbenchFileNames`. */
  exclude?: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileOptions***:
 * top-level compile options.
 * @description
 * Pass only the sections a host project wants `demo-workbench` to manage. `styles` and `demos` can be used independently or together.
 * @example
 * ```ts
 * await workbenchCompile({
 *   styles: { inputDir: "styles/scss", outputDir: "src/workbench-css" },
 *   demos: { inputDir: "src/components/pages" },
 * });
 * ```
 */
export type WorkbenchCompileOptions = {
  /** Optional style compilation section. */
  styles?: WorkbenchCompileStylesOptions;
  /** Optional demo page registry section. */
  demos?: WorkbenchCompileDemoOptions;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileStylesResult***:
 * result of compiling one or more style files.
 * @description
 * In watch mode `files` can contain only the style file that changed. Full compiles return every emitted top-level style file.
 */
export type WorkbenchCompileStylesResult = {
  /** Absolute input directory used for this compile. */
  inputDir: string;
  /** Absolute output directory used for this compile. */
  outputDir: string;
  /** Files touched by this compile. In watch mode this can contain only the changed file. */
  files: WorkbenchCompileStyleFile[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileDemoResult***:
 * result of discovering the generated demo name list.
 * @description
 * `names` are sorted file basenames. `outputFiles` contains registry files that were updated, and can be empty when no writable target exists.
 */
export type WorkbenchCompileDemoResult = {
  /** Absolute directory that was scanned. */
  inputDir: string;
  /** Generated names sorted by filename. */
  names: string[];
  /** Registry files updated with the generated `{ demos }` data. Empty when no writable registry target exists. */
  outputFiles: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileResult***:
 * combined compile result.
 * @description
 * The shape mirrors the requested compile sections: `styles` and `demos`. Watch rebuilds may return only the section that changed, for example only `styles` when a single style file is recompiled.
 */
export type WorkbenchCompileResult = {
  /** Style compilation result, when `styles` options were compiled. */
  styles?: WorkbenchCompileStylesResult;
  /** Demo registry result, when `demos` options were compiled. */
  demos?: WorkbenchCompileDemoResult;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileWatchOptions***:
 * watch-mode compile options.
 * @description
 * Extends `WorkbenchCompileOptions` with extra watch paths, debounce, style reload and lifecycle callbacks. The first build is always a full compile.
 * @example
 * ```ts
 * await watchWorkbenchCompile({
 *   styles: { inputDir: "styles/scss", outputDir: "src/workbench-css" },
 *   demos: { inputDir: "src/components/pages" },
 *   styleReload: true,
 * });
 * ```
 */
export type WorkbenchCompileWatchOptions = WorkbenchCompileOptions & {
  /** Extra files/directories that should retrigger the full compile. */
  watchPaths?: string[];
  /** Debounce for bursty editor/Sass writes. Defaults to 80ms. */
  debounceMs?: number;
  /** Starts a small dev-only Server-Sent Events endpoint that notifies the browser when watched styles rebuild. */
  styleReload?: boolean | WorkbenchStyleReloadOptions;
  /** Called after each successful compile, including the initial one. */
  onBuild?: (result: WorkbenchCompileResult) => void | Promise<void>;
  /** Called when a rebuild fails; defaults to logging the error. */
  onError?: (error: unknown) => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchStyleReloadOptions***:
 * options for the dev-only style reload endpoint.
 * @description
 * When enabled, `watchWorkbenchCompile` starts a small Server-Sent Events endpoint. The browser can receive changed style names and fetch fresh CSS text without remounting previews.
 */
export type WorkbenchStyleReloadOptions = {
  /** Local port for the style reload event stream. Defaults to 38297. */
  port?: number;
  /** Local host for the style reload event stream. Defaults to "127.0.0.1". */
  host?: string;
  /** HTTP path for the style reload event stream. Defaults to "/demo-workbench-style-events". */
  path?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchStyleReloadManifest***:
 * small JSON manifest written next to compiled workbench CSS.
 * @description
 * `DemoWorkbench` can poll this manifest through `styleReloadManifestUrl` and connect to the reload stream only while a watch script is alive.
 */
export type WorkbenchStyleReloadManifest = {
  enabled: boolean;
  styleReloadUrl?: string;
  updatedAt: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileWatchResult***:
 * handle returned by `watchWorkbenchCompile`.
 * @description
 * Call `close()` to stop the underlying chokidar watcher, disable the style reload manifest and close the dev reload server.
 */
export type WorkbenchCompileWatchResult = {
  /** The raw chokidar watcher for advanced integrations. */
  watcher: FSWatcher;
  /** Dev style reload URL when `styleReload` is enabled. */
  styleReloadUrl?: string;
  /** Stop watching files and release resources. */
  close: () => Promise<void>;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***CompileWorkbenchStylesOptions***:
 * back-compatible helper options for style-first host scripts.
 * @description
 * Accepts the same style options as `workbenchCompile({ styles })` and can optionally include a demo input directory for registry generation.
 */
export type CompileWorkbenchStylesOptions = WorkbenchCompileStylesOptions & {
  /** Optional demo page directory to include in the generated registry. */
  demoInputDir?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***CompileWorkbenchStylesResult***:
 * style compile result plus an optional generated demo registry section.
 * @description
 * Returned by the legacy `compileWorkbenchStyles` helper.
 */
export type CompileWorkbenchStylesResult = WorkbenchCompileStylesResult & {
  /** Demo registry result, when `demoInputDir` was provided. */
  demos?: WorkbenchCompileDemoResult;
};

type StyleCompileEvent = {
  event: "add" | "change" | "unlink";
  inputPath: string;
};

const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass"]);

function isStyleFile(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return STYLE_EXTENSIONS.has(ext) && !path.basename(fileName).startsWith("_");
}

function isStyleSource(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return STYLE_EXTENSIONS.has(ext);
}

function toOutputFile(fileName: string) {
  return fileName.replace(/\.(scss|sass|css)$/i, ".css");
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function rewriteAssetUrls(css: string, assetUrlPrefix?: string) {
  if (!assetUrlPrefix) return css;
  const prefix = ensureTrailingSlash(assetUrlPrefix);

  return css.replace(
    /url\((?:"|')?([^"')]+)(?:"|')?\)/g,
    (match, rawUrl: string) => {
      const url = rawUrl.trim();
      if (
        url.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(url) ||
        url.startsWith("//") ||
        url.startsWith("data:")
      ) {
        return `url(${url})`;
      }

      return `url(${prefix}${url.replace(/^\/+/, "")})`;
    },
  );
}

const workbenchScope = "[workbench-scope]";

function splitSelectorList(selector: string) {
  const selectors: string[] = [];
  let segmentStart = 0;
  let inString: '"' | "'" | null = null;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];

    if (inString) {
      if (char === "\\") {
        index += 1;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (char === "[") {
      bracketDepth += 1;
      continue;
    }

    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (char === "," && parenDepth === 0 && bracketDepth === 0) {
      selectors.push(selector.slice(segmentStart, index));
      segmentStart = index + 1;
    }
  }

  selectors.push(selector.slice(segmentStart));
  return selectors;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssEscape(value: string) {
  const cssApi = globalThis.CSS as
    | { escape?: (input: string) => string }
    | undefined;

  if (cssApi?.escape) {
    return cssApi.escape(value);
  }

  return value.replace(/(^-?\d|[^a-zA-Z0-9_-])/g, (part) => {
    const codePoint = part.codePointAt(0)?.toString(16) ?? "";
    return `\\${codePoint} `;
  });
}

function getStyleScopeSelector(outputFile: string) {
  const styleClassName = toWorkbenchStyleClassName(outputFile);
  return `${workbenchScope}.${cssEscape(styleClassName)}`;
}

function collapseAdjacentScopeSelectors(
  selector: string,
  scopeSelector: string,
) {
  const escapedScope = escapeRegExp(scopeSelector);
  return selector.replace(
    new RegExp(`${escapedScope}(?:\\s+${escapedScope})+`, "g"),
    scopeSelector,
  );
}

function replaceRootSelectorTokens(selector: string, replacement: string) {
  let replaced = false;

  const result = selector.replace(
    /(^|[\s>+~,(])(?:body|html|:root)(?=$|[.#:\[\s>+~,)])/g,
    (_match, prefix: string) => {
      replaced = true;
      return `${prefix}${replacement}`;
    },
  );

  return {
    selector: collapseAdjacentScopeSelectors(result, replacement),
    replaced,
  };
}

function scopeSingleSelector(selector: string, scopeSelector: string) {
  const leading = selector.match(/^\s*/)?.[0] ?? "";
  const trailing = selector.match(/\s*$/)?.[0] ?? "";
  const value = selector.trim();

  if (!value) return selector;

  const rootReplaced = replaceRootSelectorTokens(value, scopeSelector);

  if (rootReplaced.replaced) {
    return `${leading}${rootReplaced.selector}${trailing}`;
  }

  if (value.startsWith(scopeSelector)) {
    return selector;
  }

  return `${leading}${scopeSelector} ${value}${trailing}`;
}

function scopeSelectorList(selector: string, scopeSelector: string) {
  return splitSelectorList(selector)
    .map((part) => scopeSingleSelector(part, scopeSelector))
    .join(",");
}

function getAtRuleName(prelude: string) {
  const match = prelude.trimStart().match(/^@([a-z-]+)/i);
  return match?.[1]?.toLowerCase();
}

function shouldSkipAtRuleChildren(atRuleName?: string) {
  return (
    atRuleName === "keyframes" ||
    atRuleName === "-webkit-keyframes" ||
    atRuleName === "font-face" ||
    atRuleName === "property" ||
    atRuleName === "counter-style" ||
    atRuleName === "page"
  );
}

function rewriteWorkbenchStyleSelectors(
  css: string,
  scopeSelector = workbenchScope,
) {
  let result = "";
  let segmentStart = 0;
  let inString: '"' | "'" | null = null;
  let inComment = false;
  let parenDepth = 0;
  const skipStack: boolean[] = [];

  const isCurrentBlockSkipped = () => skipStack.some(Boolean);

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    const next = css[index + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (char === "\\") {
        index += 1;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (parenDepth > 0) continue;

    if (char === "{") {
      const prelude = css.slice(segmentStart, index);
      const trimmed = prelude.trimStart();

      if (trimmed.startsWith("@")) {
        const atRuleName = getAtRuleName(prelude);
        const skipChildren =
          isCurrentBlockSkipped() || shouldSkipAtRuleChildren(atRuleName);

        result += prelude;
        result += char;
        skipStack.push(skipChildren);
        segmentStart = index + 1;
        continue;
      }

      result += isCurrentBlockSkipped()
        ? prelude
        : scopeSelectorList(prelude, scopeSelector);
      result += char;
      skipStack.push(isCurrentBlockSkipped());
      segmentStart = index + 1;
      continue;
    }

    if (char === "}") {
      result += css.slice(segmentStart, index + 1);
      skipStack.pop();
      segmentStart = index + 1;
      continue;
    }

    if (char === ";") {
      result += css.slice(segmentStart, index + 1);
      segmentStart = index + 1;
    }
  }

  result += css.slice(segmentStart);
  return result;
}

function rewriteWorkbenchCss(
  css: string,
  options: Pick<WorkbenchCompileStylesOptions, "isolateStyles">,
  scopeSelector = workbenchScope,
) {
  if (options.isolateStyles === false) return css;

  return rewriteWorkbenchStyleSelectors(css, scopeSelector);
}

async function compileInputFile(inputPath: string, inputDir: string) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === ".css") {
    return readFile(inputPath, "utf8");
  }

  const result = await sass.compileAsync(inputPath, {
    loadPaths: [inputDir],
    style: "expanded",
  });

  return result.css;
}

async function findStyleFiles(inputDir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(inputDir, { withFileTypes: true });
  return entries
    .filter((entry: Dirent) => entry.isFile() && isStyleFile(entry.name))
    .map((entry: Dirent) => entry.name)
    .sort((left: string, right: string) => left.localeCompare(right));
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfChanged(filePath: string, content: string) {
  try {
    if ((await readFile(filePath, "utf8")) === content) {
      return false;
    }
  } catch {
    // Missing or unreadable files are written by the caller's normal path.
  }

  await writeFile(filePath, content);
  return true;
}

function renderGeneratedRegistry(registry: { demos: string[] }) {
  return [
    'import type { WorkbenchFileRegistry } from "./nexus";',
    "",
    "export const generatedWorkbenchRegistry: WorkbenchFileRegistry = {",
    `  demos: ${JSON.stringify(registry.demos, null, 2).replace(/\n/g, "\n  ")},`,
    "};",
    "",
    "export default generatedWorkbenchRegistry;",
    "",
  ].join("\n");
}

async function writeGeneratedRegistrySource(registry: { demos: string[] }) {
  const candidates = [
    path.resolve(
      process.cwd(),
      "../demo-workbench/src/state/generatedWorkbenchRegistry.ts",
    ),
    path.resolve(
      process.cwd(),
      "node_modules/demo-workbench/src/state/generatedWorkbenchRegistry.ts",
    ),
  ];
  const outputFile = (
    await Promise.all(
      candidates.map(async (filePath) =>
        (await fileExists(filePath)) ? filePath : null,
      ),
    )
  ).find((filePath): filePath is string => Boolean(filePath));

  if (!outputFile) return null;

  await writeFileIfChanged(outputFile, renderGeneratedRegistry(registry));
  return outputFile;
}

function renderBundledRegistry(registry: { demos: string[] }) {
  return `var generatedWorkbenchRegistry = {\n  demos: ${JSON.stringify(registry.demos, null, 2).replace(/\n/g, "\n  ")}\n};`;
}

async function writeGeneratedRegistryBundle(registry: { demos: string[] }) {
  const candidates = [
    path.resolve(process.cwd(), "../demo-workbench/dist/index.js"),
    path.resolve(process.cwd(), "../demo-workbench/dist/index.cjs"),
    path.resolve(process.cwd(), "node_modules/demo-workbench/dist/index.js"),
    path.resolve(process.cwd(), "node_modules/demo-workbench/dist/index.cjs"),
  ];
  const outputFiles = (
    await Promise.all(
      candidates.map(async (filePath) =>
        (await fileExists(filePath)) ? filePath : null,
      ),
    )
  ).filter((filePath): filePath is string => Boolean(filePath));
  const registryPattern =
    /var generatedWorkbenchRegistry = \{\n  demos: [\s\S]*?(?:,\n  popups: [\s\S]*?)?\n\};/;
  const renderedRegistry = renderBundledRegistry(registry);
  const writtenFiles: string[] = [];

  for (const outputFile of outputFiles) {
    const source = await readFile(outputFile, "utf8");
    if (!registryPattern.test(source)) continue;
    await writeFileIfChanged(
      outputFile,
      source.replace(registryPattern, renderedRegistry),
    );
    writtenFiles.push(outputFile);
  }

  return writtenFiles;
}

async function writeGeneratedRegistry(registry: { demos: string[] }) {
  const [sourceFile, bundleFiles] = await Promise.all([
    writeGeneratedRegistrySource(registry),
    writeGeneratedRegistryBundle(registry),
  ]);

  return [sourceFile, ...bundleFiles].filter((filePath): filePath is string =>
    Boolean(filePath),
  );
}

async function compileGeneratedRegistry(
  options: WorkbenchCompileOptions,
): Promise<Pick<WorkbenchCompileResult, "demos">> {
  if (!options.demos) return {};

  const demoNames = await discoverWorkbenchFileNames({
    inputDir: options.demos.inputDir,
    extensions: options.demos.extensions,
    exclude: options.demos.exclude,
  });

  const outputFiles = await writeGeneratedRegistry({ demos: demoNames });

  return {
    demos: {
      inputDir: path.resolve(options.demos.inputDir),
      names: demoNames,
      outputFiles,
    },
  };
}

function getStyleFileResult(
  inputDir: string,
  outputDir: string,
  inputPath: string,
): WorkbenchCompileStyleFile {
  const inputFile = path.basename(inputPath);
  const outputFile = toOutputFile(inputFile);
  return {
    inputFile,
    outputFile,
    inputPath,
    outputPath: path.join(outputDir, outputFile),
  };
}

async function compileStyleFile(
  options: WorkbenchCompileStylesOptions,
  inputDir: string,
  outputDir: string,
  inputPath: string,
): Promise<WorkbenchCompileStyleFile> {
  const styleFile = getStyleFileResult(inputDir, outputDir, inputPath);

  let compiledCss: string;
  try {
    compiledCss = await compileInputFile(inputPath, inputDir);
  } catch (error) {
    throw new Error(
      `Failed to compile ${styleFile.inputFile}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const rewrittenCss = rewriteAssetUrls(
    rewriteWorkbenchCss(
      compiledCss,
      {
        isolateStyles: options.isolateStyles,
      },
      getStyleScopeSelector(styleFile.outputFile),
    ),
    options.assetUrlPrefix,
  );
  let minified: ReturnType<typeof transform>;
  try {
    minified = transform({
      filename: styleFile.outputFile,
      code: Buffer.from(rewrittenCss),
      minify: true,
    });
  } catch (error) {
    throw new Error(
      `Failed to minify ${styleFile.inputFile}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  await writeFile(styleFile.outputPath, minified.code);
  return styleFile;
}

function dedupeStyleEvents(events: StyleCompileEvent[]) {
  const map = new Map<string, StyleCompileEvent>();
  for (const event of events) {
    map.set(path.resolve(event.inputPath), {
      ...event,
      inputPath: path.resolve(event.inputPath),
    });
  }
  return [...map.values()].sort((left, right) =>
    left.inputPath.localeCompare(right.inputPath),
  );
}

async function compileStyles(
  options: WorkbenchCompileStylesOptions,
  events?: StyleCompileEvent[],
): Promise<WorkbenchCompileStylesResult> {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);

  if (!events?.length && options.clean) {
    await rm(outputDir, { recursive: true, force: true });
  }
  await mkdir(outputDir, { recursive: true });

  const files: WorkbenchCompileStyleFile[] = [];

  if (events?.length) {
    for (const event of dedupeStyleEvents(events)) {
      if (!isStyleFile(event.inputPath)) continue;
      const styleFile = getStyleFileResult(
        inputDir,
        outputDir,
        event.inputPath,
      );

      if (event.event === "unlink") {
        await rm(styleFile.outputPath, { force: true });
        files.push(styleFile);
        continue;
      }

      files.push(
        await compileStyleFile(options, inputDir, outputDir, event.inputPath),
      );
    }

    return { inputDir, outputDir, files };
  }

  const inputFiles = await findStyleFiles(inputDir);

  for (const inputFile of inputFiles) {
    const inputPath = path.join(inputDir, inputFile);
    files.push(await compileStyleFile(options, inputDir, outputDir, inputPath));
  }

  return { inputDir, outputDir, files };
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***workbenchCompile***:
 * compile styles and generated demo registry sections.
 * @description
 * Runs the requested sections and returns the same top-level shape: `{ styles, demos }`. Style compilation writes minified CSS files, and demo compilation writes generated registry data when a target is available.
 * @example
 * ```ts
 * const result = await workbenchCompile({
 *   styles: {
 *     inputDir: "titans_rc/styles/scss",
 *     outputDir: "src/styles/workbench-css",
 *   },
 *   demos: { inputDir: "src/components/pages" },
 * });
 * ```
 */
export async function workbenchCompile(
  options: WorkbenchCompileOptions,
): Promise<WorkbenchCompileResult> {
  const styles = options.styles
    ? await compileStyles(options.styles)
    : undefined;
  if (styles) {
    await writeStyleReloadManifest(styles.outputDir, { enabled: false });
  }
  const registry = await compileGeneratedRegistry(options);

  return { styles, ...registry };
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***getWorkbenchCompileWatchPaths***:
 * derive default watch paths from compile options.
 * @description
 * Returns the style input directory, demo input directory and any extra host paths as a compact string list. Use it when a host script wants to print or extend the watch surface.
 * @example
 * ```ts
 * const watchPaths = getWorkbenchCompileWatchPaths(options, [
 *   "src/components/popups",
 * ]);
 * ```
 */
export function getWorkbenchCompileWatchPaths(
  options: WorkbenchCompileOptions,
  extraPaths: string[] = [],
) {
  return [
    options.styles?.inputDir,
    options.demos?.inputDir,
    ...extraPaths,
  ].filter((value): value is string => Boolean(value));
}

function isPathInDirectory(filePath: string, directory: string) {
  const relative = path.relative(
    path.resolve(directory),
    path.resolve(filePath),
  );
  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

const DEFAULT_STYLE_RELOAD_PORT = 38297;
const DEFAULT_STYLE_RELOAD_HOST = "127.0.0.1";
const DEFAULT_STYLE_RELOAD_PATH = "/demo-workbench-style-events";
/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WORKBENCH_STYLE_RELOAD_MANIFEST_FILE***:
 * file name used for the generated style reload manifest.
 * @description
 * `watchWorkbenchCompile` writes this JSON file into the compiled style output directory so `DemoWorkbench` can discover the active reload server through `styleReloadManifestUrl`.
 */
export const WORKBENCH_STYLE_RELOAD_MANIFEST_FILE =
  "demo-workbench-style-reload.json";

type WorkbenchStyleReloadServer = {
  url: string;
  update: (files: WorkbenchCompileStyleFile[]) => Promise<void>;
  send: (files: WorkbenchCompileStyleFile[]) => Promise<void>;
  close: () => Promise<void>;
};

function renderStyleReloadManifest(
  manifest: Omit<WorkbenchStyleReloadManifest, "updatedAt">,
) {
  return `${JSON.stringify(
    {
      ...manifest,
      updatedAt: new Date().toISOString(),
    } satisfies WorkbenchStyleReloadManifest,
    null,
    2,
  )}\n`;
}

async function writeStyleReloadManifest(
  outputDir: string,
  manifest: Omit<WorkbenchStyleReloadManifest, "updatedAt">,
) {
  const outputFile = path.resolve(
    outputDir,
    WORKBENCH_STYLE_RELOAD_MANIFEST_FILE,
  );

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFileIfChanged(outputFile, renderStyleReloadManifest(manifest));
  return outputFile;
}

function resolveStyleReloadOptions(
  options: WorkbenchCompileWatchOptions["styleReload"],
): Required<WorkbenchStyleReloadOptions> | null {
  if (!options) return null;

  const value = options === true ? {} : options;

  return {
    port: value.port ?? DEFAULT_STYLE_RELOAD_PORT,
    host: value.host ?? DEFAULT_STYLE_RELOAD_HOST,
    path: value.path ?? DEFAULT_STYLE_RELOAD_PATH,
  };
}

async function createStyleReloadServer(
  options: WorkbenchCompileWatchOptions["styleReload"],
): Promise<WorkbenchStyleReloadServer | null> {
  const resolved = resolveStyleReloadOptions(options);
  if (!resolved) return null;

  const clients = new Set<ServerResponse>();
  const cssByFileName = new Map<string, string>();
  const getFileName = (file: WorkbenchCompileStyleFile) =>
    path.basename(file.outputFile, ".css");

  const update = async (files: WorkbenchCompileStyleFile[]) => {
    await Promise.all(
      files.map(async (file) => {
        cssByFileName.set(
          getFileName(file),
          await readFile(file.outputPath, "utf8"),
        );
      }),
    );
  };

  const server: Server = createServer((request, response) => {
    const requestUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? `${resolved.host}:${resolved.port}`}`,
    );
    const requestPath = requestUrl.pathname;

    if (requestPath !== resolved.path) {
      response.writeHead(404);
      response.end();
      return;
    }

    const styleName = requestUrl.searchParams.get("style");
    if (styleName) {
      const fileName = path.basename(styleName, ".css");
      const css = cssByFileName.get(fileName);

      if (css === undefined) {
        response.writeHead(404, {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        response.end();
        return;
      }

      response.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "text/css; charset=utf-8",
      });
      response.end(css);
      return;
    }

    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });
    response.write("event: ready\ndata: {}\n\n");
    clients.add(response);
    request.on("close", () => clients.delete(response));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(resolved.port, resolved.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo | null;
  const port = address?.port ?? resolved.port;
  const urlHost = resolved.host === "0.0.0.0" ? "localhost" : resolved.host;
  const url = `http://${urlHost}:${port}${resolved.path}`;

  return {
    url,
    update,
    send: async (files) => {
      await update(files);
      const fileNames = files.map(getFileName);
      const data = JSON.stringify({ fileNames });

      clients.forEach((client) => {
        client.write(`event: styles\ndata: ${data}\n\n`);
      });
    },
    close: () =>
      new Promise((resolve) => {
        clients.forEach((client) => client.end());
        clients.clear();
        server.close(() => resolve());
      }),
  };
}

async function compileWatchEvents(
  options: WorkbenchCompileOptions,
  events: StyleCompileEvent[],
  extraWatchPaths: string[],
): Promise<WorkbenchCompileResult> {
  if (!events.length) return workbenchCompile(options);

  const hasExtraChange = events.some((event) =>
    extraWatchPaths.some(
      (watchPath) =>
        path.resolve(event.inputPath) === path.resolve(watchPath) ||
        isPathInDirectory(event.inputPath, watchPath),
    ),
  );
  if (hasExtraChange) return workbenchCompile(options);

  const styleEvents = options.styles
    ? events.filter(
        (event) =>
          isPathInDirectory(event.inputPath, options.styles!.inputDir) &&
          isStyleFile(event.inputPath),
      )
    : [];
  const styleDependencyChanged = options.styles
    ? events.some(
        (event) =>
          isPathInDirectory(event.inputPath, options.styles!.inputDir) &&
          isStyleSource(event.inputPath) &&
          !isStyleFile(event.inputPath),
      )
    : false;
  const demoChanged = options.demos
    ? events.some(
        (event) =>
          path.resolve(event.inputPath) ===
            path.resolve(options.demos!.inputDir) ||
          isPathInDirectory(event.inputPath, options.demos!.inputDir),
      )
    : false;

  const styles = options.styles
    ? styleDependencyChanged
      ? await compileStyles(options.styles)
      : styleEvents.length
        ? await compileStyles(options.styles, styleEvents)
        : undefined
    : undefined;
  const registry = demoChanged ? await compileGeneratedRegistry(options) : {};

  if (!styles && !registry.demos) return workbenchCompile(options);
  return { styles, ...registry };
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***watchWorkbenchCompile***:
 * watch host project files and rebuild only what changed.
 * @description
 * Starts with one full compile. Direct changes to one top-level style file recompile only that file. Sass partial changes trigger a full style compile, and demo file changes regenerate only the registry section. When `styleReload` is enabled, changed CSS can be pushed into mounted workbench previews.
 * @example
 * ```ts
 * const watch = await watchWorkbenchCompile({
 *   styles: {
 *     inputDir: "titans_rc/styles/scss",
 *     outputDir: "src/styles/workbench-css",
 *   },
 *   styleReload: true,
 * });
 *
 * await watch.close();
 * ```
 */
export async function watchWorkbenchCompile(
  options: WorkbenchCompileWatchOptions,
): Promise<WorkbenchCompileWatchResult> {
  const {
    debounceMs = 80,
    onBuild,
    onError,
    styleReload,
    watchPaths: extraWatchPaths = [],
    ...compileOptions
  } = options;
  const watchPaths = getWorkbenchCompileWatchPaths(
    compileOptions,
    extraWatchPaths,
  );
  const styleReloadServer = await createStyleReloadServer(styleReload);

  const runBuild = async (events?: StyleCompileEvent[]) => {
    const result = events?.length
      ? await compileWatchEvents(compileOptions, events, extraWatchPaths)
      : await workbenchCompile(compileOptions);
    if (result.styles) {
      await styleReloadServer?.update(result.styles.files);
      if (styleReloadServer) {
        await writeStyleReloadManifest(result.styles.outputDir, {
          enabled: true,
          styleReloadUrl: styleReloadServer.url,
        });
      }
    }
    await onBuild?.(result);
    if (events?.length && result.styles) {
      await styleReloadServer?.send(result.styles.files);
    }
    return result;
  };

  await runBuild();

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 60,
      pollInterval: 20,
    },
  });

  let pending: NodeJS.Timeout | null = null;
  let pendingEvents: StyleCompileEvent[] = [];
  const scheduleBuild = (
    event: StyleCompileEvent["event"],
    inputPath: string,
  ) => {
    pendingEvents.push({ event, inputPath });
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      const events = pendingEvents;
      pendingEvents = [];
      pending = null;
      runBuild(events).catch((error: unknown) => {
        if (onError) {
          onError(error);
          return;
        }
        console.error(error instanceof Error ? error.message : error);
      });
    }, debounceMs);
  };

  watcher.on("add", (inputPath) => scheduleBuild("add", inputPath));
  watcher.on("change", (inputPath) => scheduleBuild("change", inputPath));
  watcher.on("unlink", (inputPath) => scheduleBuild("unlink", inputPath));

  return {
    watcher,
    styleReloadUrl: styleReloadServer?.url,
    close: async () => {
      if (compileOptions.styles) {
        await writeStyleReloadManifest(compileOptions.styles.outputDir, {
          enabled: false,
        });
      }
      await watcher.close();
      await styleReloadServer?.close();
    },
  };
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***compileWorkbenchStyles***:
 * style-first helper around `workbenchCompile`.
 * @description
 * Convenience wrapper for older host scripts that primarily compile styles. It returns the style result at the top level and includes an optional `demos` registry section when `demoInputDir` is provided.
 * @example
 * ```ts
 * const result = await compileWorkbenchStyles({
 *   inputDir: "titans_rc/styles/scss",
 *   outputDir: "src/styles/workbench-css",
 *   demoInputDir: "src/components/pages",
 * });
 * ```
 */
export async function compileWorkbenchStyles(
  options: CompileWorkbenchStylesOptions,
): Promise<CompileWorkbenchStylesResult> {
  const result = await workbenchCompile({
    styles: {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      isolateStyles: options.isolateStyles,
      assetUrlPrefix: options.assetUrlPrefix,
      clean: options.clean,
    },
    demos: options.demoInputDir
      ? {
          inputDir: options.demoInputDir,
        }
      : undefined,
  });

  if (!result.styles) {
    throw new Error(
      "compileWorkbenchStyles requires style input/output options",
    );
  }

  return {
    ...result.styles,
    demos: result.demos,
  };
}

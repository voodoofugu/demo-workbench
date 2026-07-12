import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import type { Dirent } from "node:fs";
import { createServer } from "node:http";
import type { Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { transform } from "lightningcss";
import * as sass from "sass-embedded";

import {
  discoverWorkbenchFileNames,
  generateDemoManifest,
} from "./generateDemoManifest";
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
  /**
   * Source style file name.
   * @description
   * File name inside `WorkbenchCompileStylesOptions.inputDir`, for example `button.scss`.
   */
  inputFile: string;
  /**
   * Generated CSS file name.
   * @description
   * File name inside `WorkbenchCompileStylesOptions.outputDir`, for example `button.css`.
   */
  outputFile: string;
  /**
   * Absolute source path.
   * @description
   * Full path to the source `.css`, `.scss` or `.sass` file that was compiled.
   */
  inputPath: string;
  /**
   * Absolute output path.
   * @description
   * Full path to the generated minified `.css` file.
   */
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
 *   inputDir: "src/styles/scss",
 *   outputDir: "src/workbench-css",
 *   assetUrlPrefix: "http://localhost:3000/img/",
 * };
 * ```
 */
export type WorkbenchCompileStylesOptions = {
  /**
   * Source style directory.
   * @description
   * Directory with top-level `.css`, `.scss` and `.sass` files. Files starting with `_` are treated as Sass partials and are not emitted directly.
   * @example
   * ```ts
   * inputDir: "src/styles/scss"
   * ```
   */
  inputDir: string;
  /**
   * Generated CSS directory.
   * @description
   * Directory where the compiler writes minified `.css` files consumed by `DemoWorkbenchProps.styleLoader`.
   * @example
   * ```ts
   * outputDir: "src/workbench-css"
   * ```
   */
  outputDir: string;
  /**
   * Workbench CSS mode. Toggles all workbench-integration behavior at once.
   * @description
   * When `true` (default) the compiler produces CSS made for the workbench:
   * selectors are scoped under the preview isolation selector, a `sourceURL`
   * comment is appended for DevTools, and the dev style-reload manifest
   * (`demo-workbench-style-reload.json`) is written next to the output. Pass
   * `false` for plain production-style CSS: no scoping, no sourceURL, and no
   * reload manifest (so a project compiling non-workbench CSS to this directory
   * doesn't ship a stray workbench artifact).
   * @default true
   */
  compileForWorkbench?: boolean;
  /**
   * Asset URL prefix.
   * @description
   * Prefix added to relative `url(...)` assets during CSS compilation. Absolute URLs, data URLs and hash URLs are left unchanged.
   * @example
   * ```ts
   * assetUrlPrefix: "http://localhost:3000/img/"
   * ```
   */
  assetUrlPrefix?: string;
  /**
   * Style compiler logging.
   * @description
   * Controls Sass/CSS compiler warnings and debug output for this `styles` section. Command progress logs from `runWorkbenchCompile` are still printed.
   * @default true
   * @example
   * ```ts
   * styles: {
   *   inputDir: "src/styles/scss",
   *   outputDir: "src/workbench-css",
   *   logs: false,
   * }
   * ```
   */
  logs?: boolean;
  /**
   * Clean generated CSS before full compile.
   * @description
   * Removes `outputDir` before a full style compile. Pass `false` only when the output directory intentionally contains files managed outside `demo-workbench`. Incremental watch rebuilds ignore this option.
   * @default true
   */
  clean?: boolean;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileDemoOptions***:
 * options for discovering demo page files.
 * @description
 * File basenames become workbench demo names and are written to a host-owned generated manifest.
 * @example
 * ```ts
 * const demos: WorkbenchCompileDemoOptions = {
 *   inputDir: "src/demos",
 *   outputFile: "src/workbench/projectDemos",
 * };
 * ```
 */
export type WorkbenchCompileDemoOptions = {
  /**
   * Demo source directory.
   * @description
   * Directory with demo page modules. File basenames become demo names and are sorted into the generated manifest.
   */
  inputDir: string;
  /**
   * Demo file extensions.
   * @description
   * Extensions included while scanning `inputDir`.
   * @default [".jsx", ".tsx", ".js", ".ts"]
   */
  extensions?: string[];
  /**
   * Demo basenames to skip.
   * @description
   * Excludes files by basename before extension, useful for helpers or temporary pages that live beside demos.
   */
  exclude?: string[];
  /**
   * Generated manifest path.
   * @description
   * Host-owned file generated for `<DemoWorkbench demos={projectDemos} />`. Use the desired path without extension; the compiler writes a `.js` file and names the exported variable from the final path segment.
   * @example
   * ```ts
   * outputFile: "src/workbench/projectDemos"
   * // writes projectDemos.js with `export const projectDemos = [...]`
   * ```
   */
  outputFile: string;
  /**
   * Manifest import prefix.
   * @description
   * Import path prefix used inside the generated manifest. Defaults to the relative path from `outputFile` to `inputDir`.
   */
  importPathPrefix?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileOptions***:
 * top-level compile sections.
 * @description
 * Pass only the sections a host project wants `demo-workbench` to manage. `styles` and `demos` can be used independently or together.
 * @example
 * ```ts
 * runWorkbenchCompile({
 *   styles: { inputDir: "src/styles/scss", outputDir: "src/workbench-css" },
 *   demos: {
 *     inputDir: "src/demos",
 *     outputFile: "src/workbench/projectDemos",
 *   },
 * });
 * ```
 */
export type WorkbenchCompileOptions = {
  /**
   * Style compilation section.
   * @description
   * Provide this when the workbench should compile host CSS/Sass into generated CSS files.
   */
  styles?: WorkbenchCompileStylesOptions;
  /**
   * Demo manifest generation section.
   * @description
   * Provide this when the workbench should discover demo modules and generate a host-owned manifest file.
   */
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
  /**
   * Absolute source style directory.
   * @description
   * Resolved `styles.inputDir` used for this compile.
   */
  inputDir: string;
  /**
   * Absolute generated CSS directory.
   * @description
   * Resolved `styles.outputDir` where generated CSS files were written.
   */
  outputDir: string;
  /**
   * Compiled style files.
   * @description
   * Files touched by this compile. In watch mode this can contain only the changed file.
   */
  files: WorkbenchCompileStyleFile[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileDemoResult***:
 * result of discovering the generated demo manifest.
 * @description
 * `names` are sorted file basenames. `outputFiles` contains the generated host manifest file.
 */
export type WorkbenchCompileDemoResult = {
  /**
   * Absolute scanned demo directory.
   * @description
   * Resolved `demos.inputDir` used for demo discovery.
   */
  inputDir: string;
  /**
   * Generated manifest export name.
   * @description
   * Named export generated from `demos.outputFile`. For `outputFile: "src/workbench/projectDemos"`, this value is `"projectDemos"`.
   */
  exportName: string;
  /**
   * Discovered demo names.
   * @description
   * Sorted file basenames written to the generated manifest.
   */
  names: string[];
  /**
   * Generated manifest files.
   * @description
   * Host-owned files written by demo manifest generation.
   */
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
  /**
   * Style compile result.
   * @description
   * Present when a `styles` section was compiled. Watch rebuilds may omit it when only demos changed.
   */
  styles?: WorkbenchCompileStylesResult;
  /**
   * Demo manifest result.
   * @description
   * Present when a `demos` section was compiled. Watch rebuilds may omit it when only styles changed.
   */
  demos?: WorkbenchCompileDemoResult;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileWatchOptions***:
 * watch-mode compile options.
 * @description
 * Extends compile sections with extra watch paths, debounce, style reload and lifecycle callbacks. The first build is always a full compile. `runWorkbenchCompile` uses these fields when launched with `--watch` or `watch`.
 * @example
 * ```ts
 * runWorkbenchCompile({
 *   styles: { inputDir: "src/styles/scss", outputDir: "src/workbench-css" },
 *   demos: {
 *     inputDir: "src/demos",
 *     outputFile: "src/workbench/projectDemos",
 *   },
 *   args: ["--watch"],
 * });
 * ```
 */
export type WorkbenchCompileWatchOptions = WorkbenchCompileOptions & {
  /**
   * Extra watch paths.
   * @description
   * Files or directories that should retrigger a full compile in addition to style and demo inputs.
   */
  watchPaths?: string[];
  /**
   * Watch rebuild debounce.
   * @description
   * Debounce in milliseconds for bursty editor or Sass writes.
   * @default 80
   */
  debounceMs?: number;
  /**
   * Dev style reload endpoint.
   * @description
   * Starts a small Server-Sent Events endpoint in watch mode so the browser can refresh changed CSS without remounting previews.
   */
  styleReload?: boolean | WorkbenchStyleReloadOptions;
  /**
   * Successful build callback.
   * @description
   * Called after each successful compile, including the initial build in watch mode.
   */
  onBuild?: (result: WorkbenchCompileResult) => void | Promise<void>;
  /**
   * Watch error callback.
   * @description
   * Called when a rebuild fails. If omitted, `runWorkbenchCompile` logs the error and keeps watching.
   */
  onError?: (error: unknown) => void;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileCommandOptions***:
 * command-style compile options.
 * @description
 * Used by `runWorkbenchCompile` for tiny host scripts. It reads CLI args, runs a single compile by default, switches to watch mode for `--watch` or `watch`, prints command logs by default, and owns error/signal handling.
 * @example
 * ```ts
 * runWorkbenchCompile({
 *   styles: { inputDir: "src/styles/scss", outputDir: "src/workbench-css" },
 *   demos: {
 *     inputDir: "src/demos",
 *     outputFile: "src/workbench/projectDemos",
 *   },
 * });
 * ```
 */
export type WorkbenchCompileCommandOptions = WorkbenchCompileWatchOptions & {
  /**
   * CLI args.
   * @description
   * Arguments inspected for `--watch` or `watch`. Defaults to `process.argv.slice(2)` so tiny host scripts can forward their command-line mode automatically.
   */
  args?: readonly string[];
  /**
   * Force watch mode.
   * @description
   * Overrides `args` detection and starts watch mode when `true`.
   */
  watch?: boolean;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchStyleReloadOptions***:
 * options for the dev-only style reload endpoint.
 * @description
 * When enabled in watch mode, `runWorkbenchCompile` starts a small Server-Sent Events endpoint. The browser can receive changed style names and fetch fresh CSS text without remounting previews.
 */
export type WorkbenchStyleReloadOptions = {
  /**
   * Style reload port.
   * @description
   * Local port for the Server-Sent Events stream. If the default is busy, the server falls back to a free port.
   * @default 38297
   */
  port?: number;
  /**
   * Style reload host.
   * @description
   * Local host for the Server-Sent Events stream.
   * @default "127.0.0.1"
   */
  host?: string;
  /**
   * Style reload path.
   * @description
   * HTTP path for the Server-Sent Events stream.
   * @default "/demo-workbench-style-events"
   */
  path?: string;
};

type WorkbenchStyleReloadManifest = {
  enabled: boolean;
  styleReloadUrl?: string;
  updatedAt: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchCompileWatchResult***:
 * watch handle returned by `runWorkbenchCompile` in watch mode.
 * @description
 * Call `close()` to stop the underlying chokidar watcher, disable the style reload manifest and close the dev reload server.
 */
export type WorkbenchCompileWatchResult = {
  /**
   * Chokidar watcher.
   * @description
   * Raw watcher instance for advanced host integrations.
   */
  watcher: FSWatcher;
  /**
   * Style reload URL.
   * @description
   * Dev Server-Sent Events URL when `styleReload` is enabled.
   */
  styleReloadUrl?: string;
  /**
   * Stop watch mode.
   * @description
   * Closes the file watcher, disables the style reload manifest and releases the dev reload server.
   */
  close: () => Promise<void>;
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
  options: Pick<WorkbenchCompileStylesOptions, "compileForWorkbench">,
  scopeSelector = workbenchScope,
) {
  if (!shouldCompileForWorkbench(options)) return css;

  return rewriteWorkbenchStyleSelectors(css, scopeSelector);
}

function shouldCompileForWorkbench(
  options: Pick<WorkbenchCompileStylesOptions, "compileForWorkbench">,
) {
  return options.compileForWorkbench !== false;
}

// The dev style-reload manifest is a workbench-only artifact, so it is written
// only when compiling for the workbench. Plain production CSS leaves no manifest
// behind.
function shouldWriteStyleReloadManifest(
  styles?: Pick<WorkbenchCompileStylesOptions, "compileForWorkbench">,
) {
  return Boolean(styles && shouldCompileForWorkbench(styles));
}

function appendStyleSourceUrl(css: Uint8Array, outputFile: string) {
  const cssText = Buffer.from(css).toString().trimEnd();
  const sourceUrl = `/*# sourceURL=${encodeURI(outputFile)} */`;
  return Buffer.from(`${cssText}\n${sourceUrl}`);
}

function shouldPrintStyleCompilerLogs(
  options: Pick<WorkbenchCompileStylesOptions, "logs">,
) {
  return options.logs !== false;
}

const WORKBENCH_LOG_TITLE = "📋 demo-workbench";
const WORKBENCH_LOG_ITEM = "✓";
const WORKBENCH_LOG_PROGRESS = "—";
const WORKBENCH_LOG_WARNING = "⚠";
const WORKBENCH_LOG_ERROR = "✕";

function printWorkbenchLogHeader() {
  console.log(WORKBENCH_LOG_TITLE);
}

function printWorkbenchLog(message: string) {
  console.log(`${WORKBENCH_LOG_ITEM} ${message}`);
}

function printWorkbenchProgress(message: string) {
  console.log(`${WORKBENCH_LOG_PROGRESS} ${message}`);
}

function printWorkbenchWarning(message: string) {
  console.warn(`${WORKBENCH_LOG_WARNING} demo-workbench: ${message}`);
}

function formatUnknownError(error: unknown) {
  return error instanceof Error ? error.message : error;
}

function printWorkbenchCompileError(error: unknown) {
  const message = formatUnknownError(error);
  console.error(`${WORKBENCH_LOG_ERROR} demo-workbench: ${message}`);
}

function isStyleUnlink(
  file: WorkbenchCompileStyleFile,
  events: StyleCompileEvent[],
) {
  return events.some(
    (event) =>
      event.event === "unlink" &&
      toOutputFile(path.basename(event.inputPath)) === file.outputFile,
  );
}

function formatDemoNames(names: readonly string[]) {
  return names.map((name) => JSON.stringify(name)).join(", ");
}

function getDemoNameChanges(
  previousNames: readonly string[],
  nextNames: readonly string[],
) {
  const previousSet = new Set(previousNames);
  const nextSet = new Set(nextNames);

  return {
    added: nextNames.filter((name) => !previousSet.has(name)),
    removed: previousNames.filter((name) => !nextSet.has(name)),
  };
}

function printDemoNameChanges(
  previousNames: readonly string[],
  nextNames: readonly string[],
) {
  const { added, removed } = getDemoNameChanges(previousNames, nextNames);

  if (added.length) {
    printWorkbenchLog(
      `pages added (${added.length}): ${formatDemoNames(added)}`,
    );
  }

  if (removed.length) {
    printWorkbenchLog(
      `pages removed (${removed.length}): ${formatDemoNames(removed)}`,
    );
  }
}

function printWorkbenchCompileResult(
  result: WorkbenchCompileResult,
  events: StyleCompileEvent[] = [],
  previousDemoNames?: readonly string[],
) {
  if (result.styles) {
    if (events.length && result.styles.files.length === 1) {
      const [file] = result.styles.files;
      const action = isStyleUnlink(file, events) ? "removed" : "compiled";
      printWorkbenchLog(`style ${action} "${file.outputFile}"`);
    } else {
      printWorkbenchLog(`styles compiled (${result.styles.files.length})`);
    }
  }

  if (result.demos) {
    if (events.length && previousDemoNames) {
      printDemoNameChanges(previousDemoNames, result.demos.names);
    } else {
      printWorkbenchLog(`demos discovered (${result.demos.names.length})`);
    }
  }
}

async function directoryExists(directoryPath: string) {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function printWorkbenchCompileWarnings(
  result: WorkbenchCompileResult,
  events: StyleCompileEvent[] = [],
) {
  if (result.styles && !events.length) {
    if (result.styles.files.length === 0) {
      printWorkbenchWarning("no style files were compiled");
    }

    if (!(await directoryExists(result.styles.outputDir))) {
      printWorkbenchWarning(
        `styles output directory was not created: ${result.styles.outputDir}`,
      );
    }
  }

  if (result.demos) {
    if (result.demos.names.length === 0) {
      printWorkbenchWarning("no demo files were discovered");
    }

    if (result.demos.outputFiles.length === 0) {
      printWorkbenchWarning("demo manifest was not updated");
    }
  }
}

async function compileInputFile(
  inputPath: string,
  inputDir: string,
  styleLogs: boolean,
) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === ".css") {
    return readFile(inputPath, "utf8");
  }

  const result = await sass.compileAsync(inputPath, {
    loadPaths: [inputDir],
    logger: styleLogs ? undefined : sass.Logger.silent,
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

async function compileGeneratedManifest(
  options: WorkbenchCompileOptions,
): Promise<Pick<WorkbenchCompileResult, "demos">> {
  if (!options.demos) return {};
  if (!options.demos.outputFile) {
    throw new Error(
      "demos.outputFile is required. Generate a host-owned manifest and pass it to <DemoWorkbench demos={demos} />.",
    );
  }

  const discoveryOptions = {
    inputDir: options.demos.inputDir,
    extensions: options.demos.extensions,
    exclude: options.demos.exclude,
  };
  const demoNames = await discoverWorkbenchFileNames(discoveryOptions);
  const manifest = await generateDemoManifest({
    ...discoveryOptions,
    outputFile: options.demos.outputFile,
    importPathPrefix: options.demos.importPathPrefix,
  });

  return {
    demos: {
      inputDir: path.resolve(options.demos.inputDir),
      exportName: manifest.exportName,
      names: demoNames,
      outputFiles: [manifest.outputFile],
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
  styleLogs: boolean,
): Promise<WorkbenchCompileStyleFile> {
  const styleFile = getStyleFileResult(inputDir, outputDir, inputPath);

  let compiledCss: string;
  try {
    compiledCss = await compileInputFile(inputPath, inputDir, styleLogs);
  } catch (error) {
    throw new Error(
      `Failed to compile ${styleFile.inputFile}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const rewrittenCss = rewriteAssetUrls(
    rewriteWorkbenchCss(
      compiledCss,
      {
        compileForWorkbench: options.compileForWorkbench,
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

  const outputCss = shouldCompileForWorkbench(options)
    ? appendStyleSourceUrl(minified.code, styleFile.outputFile)
    : minified.code;

  await writeFile(styleFile.outputPath, outputCss);
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
  styleLogs: boolean,
  events?: StyleCompileEvent[],
): Promise<WorkbenchCompileStylesResult> {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);

  if (!events?.length && options.clean !== false) {
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
        await compileStyleFile(
          options,
          inputDir,
          outputDir,
          event.inputPath,
          styleLogs,
        ),
      );
    }

    return { inputDir, outputDir, files };
  }

  const inputFiles = await findStyleFiles(inputDir);

  for (const inputFile of inputFiles) {
    const inputPath = path.join(inputDir, inputFile);
    files.push(
      await compileStyleFile(
        options,
        inputDir,
        outputDir,
        inputPath,
        styleLogs,
      ),
    );
  }

  return { inputDir, outputDir, files };
}

async function compileWorkbench(
  options: WorkbenchCompileOptions,
): Promise<WorkbenchCompileResult> {
  const styleLogs = options.styles
    ? shouldPrintStyleCompilerLogs(options.styles)
    : true;
  const styles = options.styles
    ? await compileStyles(options.styles, styleLogs)
    : undefined;
  if (styles && shouldWriteStyleReloadManifest(options.styles)) {
    await writeStyleReloadManifest(styles.outputDir, { enabled: false });
  }
  const manifest = await compileGeneratedManifest(options);

  return { styles, ...manifest };
}

async function workbenchCompile(
  options: WorkbenchCompileOptions,
): Promise<WorkbenchCompileResult> {
  printWorkbenchLogHeader();
  printWorkbenchProgress("preparing...");

  const result = await compileWorkbench(options);

  printWorkbenchCompileResult(result);
  await printWorkbenchCompileWarnings(result);

  return result;
}

function getWorkbenchCompileWatchPaths(
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

function hasCompileResult(result: WorkbenchCompileResult) {
  return Boolean(result.styles || result.demos);
}

const DEFAULT_STYLE_RELOAD_PORT = 38297;
const DEFAULT_STYLE_RELOAD_HOST = "127.0.0.1";
const DEFAULT_STYLE_RELOAD_PATH = "/demo-workbench-style-events";
const STYLE_RELOAD_MANIFEST_FILE = "demo-workbench-style-reload.json";

type WorkbenchStyleReloadServer = {
  url: string;
  update: (files: WorkbenchCompileStyleFile[]) => Promise<void>;
  send: (files: WorkbenchCompileStyleFile[]) => Promise<void>;
  close: () => Promise<void>;
};

type ResolvedStyleReloadOptions = Required<WorkbenchStyleReloadOptions> & {
  explicitPort: boolean;
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
  const outputFile = path.resolve(outputDir, STYLE_RELOAD_MANIFEST_FILE);

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFileIfChanged(outputFile, renderStyleReloadManifest(manifest));
  return outputFile;
}

function resolveStyleReloadOptions(
  options: WorkbenchCompileWatchOptions["styleReload"],
): ResolvedStyleReloadOptions | null {
  if (!options) return null;

  const value = options === true ? {} : options;

  return {
    port: value.port ?? DEFAULT_STYLE_RELOAD_PORT,
    host: value.host ?? DEFAULT_STYLE_RELOAD_HOST,
    path: value.path ?? DEFAULT_STYLE_RELOAD_PATH,
    explicitPort: value.port !== undefined,
  };
}

function listenStyleReloadServer(
  server: Server,
  options: ResolvedStyleReloadOptions,
) {
  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, options.host);
    });

  return listen(options.port).catch((error: NodeJS.ErrnoException) => {
    if (
      options.explicitPort ||
      options.port === 0 ||
      error.code !== "EADDRINUSE"
    ) {
      throw error;
    }

    return listen(0);
  });
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
        const fileName = getFileName(file);

        try {
          cssByFileName.set(fileName, await readFile(file.outputPath, "utf8"));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            cssByFileName.delete(fileName);
            return;
          }

          throw error;
        }
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

  await listenStyleReloadServer(server, resolved);

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
  if (!events.length) return compileWorkbench(options);

  const hasExtraChange = events.some((event) =>
    extraWatchPaths.some(
      (watchPath) =>
        path.resolve(event.inputPath) === path.resolve(watchPath) ||
        isPathInDirectory(event.inputPath, watchPath),
    ),
  );
  if (hasExtraChange) return compileWorkbench(options);

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
  const demoFileListChanged = options.demos
    ? events.some(
        (event) =>
          event.event !== "change" &&
          (path.resolve(event.inputPath) ===
            path.resolve(options.demos!.inputDir) ||
            isPathInDirectory(event.inputPath, options.demos!.inputDir)),
      )
    : false;

  const styles = options.styles
    ? styleDependencyChanged
      ? await compileStyles(
          options.styles,
          shouldPrintStyleCompilerLogs(options.styles),
        )
      : styleEvents.length
        ? await compileStyles(
            options.styles,
            shouldPrintStyleCompilerLogs(options.styles),
            styleEvents,
          )
        : undefined
    : undefined;
  const manifest = demoFileListChanged
    ? await compileGeneratedManifest(options)
    : {};

  if (!styles && !manifest.demos) return {};
  return { styles, ...manifest };
}

async function watchWorkbenchCompile(
  options: WorkbenchCompileWatchOptions,
): Promise<WorkbenchCompileWatchResult> {
  const { default: chokidar } = await import("chokidar");

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
  printWorkbenchLogHeader();
  printWorkbenchLog(`watching ${watchPaths.length} path(s)`);

  const styleReloadServer = await createStyleReloadServer(styleReload);
  let lastDemoNames: string[] | undefined;

  const runBuild = async (events?: StyleCompileEvent[]) => {
    const previousDemoNames = lastDemoNames;
    const result = events?.length
      ? await compileWatchEvents(compileOptions, events, extraWatchPaths)
      : await compileWorkbench(compileOptions);

    if (events?.length && !hasCompileResult(result)) {
      return result;
    }

    if (result.styles) {
      await styleReloadServer?.update(result.styles.files);

      if (
        styleReloadServer &&
        shouldWriteStyleReloadManifest(compileOptions.styles)
      ) {
        await writeStyleReloadManifest(result.styles.outputDir, {
          enabled: true,
          styleReloadUrl: styleReloadServer.url,
        });
      }
    }

    printWorkbenchCompileResult(result, events, previousDemoNames);
    await printWorkbenchCompileWarnings(result, events);

    if (result.demos) {
      lastDemoNames = result.demos.names;
    }

    await onBuild?.(result);

    if (events?.length && result.styles) {
      await styleReloadServer?.send(result.styles.files);
    }

    return result;
  };

  printWorkbenchProgress("preparing...");

  await runBuild();

  if (styleReloadServer) {
    printWorkbenchLog("style reload enabled");
  }

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
  let closed = false;

  const scheduleBuild = (
    event: StyleCompileEvent["event"],
    inputPath: string,
  ) => {
    if (closed) return;

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

        printWorkbenchCompileError(error);
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
      closed = true;
      if (pending) {
        clearTimeout(pending);
        pending = null;
        pendingEvents = [];
      }

      if (shouldWriteStyleReloadManifest(compileOptions.styles)) {
        await writeStyleReloadManifest(compileOptions.styles!.outputDir, {
          enabled: false,
        });
      }

      await watcher.close();
      await styleReloadServer?.close();
    },
  };
}

function hasWatchArg(args: readonly string[]) {
  return args.includes("--watch") || args.includes("watch");
}

function closeWatcherOnSignal(watcher: WorkbenchCompileWatchResult) {
  let isClosing = false;
  const close = watcher.close;
  const closeWatcher = async () => {
    if (isClosing) return;
    isClosing = true;
    await watcher.close();
    process.exit(0);
  };
  const handleCloseError = (error: unknown) => {
    printWorkbenchCompileError(error);
    process.exit(1);
  };
  const handleSigint = () => {
    closeWatcher().catch(handleCloseError);
  };
  const handleSigterm = () => {
    closeWatcher().catch(handleCloseError);
  };

  watcher.close = async () => {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
    await close();
  };

  process.once("SIGINT", handleSigint);
  process.once("SIGTERM", handleSigterm);
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***runWorkbenchCompile***:
 * command-style compile runner for tiny host scripts.
 * @description
 * Runs one compile by default and switches to watch mode when `process.argv` contains `--watch` or `watch`. In watch mode it enables style reload by default, owns SIGINT/SIGTERM cleanup, and catches startup errors so a host script can just call this function.
 * @example
 * ```ts
 * import { runWorkbenchCompile } from "demo-workbench/node";
 *
 * runWorkbenchCompile({
 *   styles: {
 *     inputDir: "src/styles/scss",
 *     outputDir: "src/workbench-css",
 *     logs: false,
 *   },
 *   demos: {
 *     inputDir: "src/demos",
 *     outputFile: "src/workbench/projectDemos",
 *   },
 * });
 * ```
 */
export function runWorkbenchCompile(options: WorkbenchCompileCommandOptions) {
  const {
    args = process.argv.slice(2),
    watch,
    ...compileOptions
  } = options;
  const run = async () => {
    if (!(watch ?? hasWatchArg(args))) {
      return workbenchCompile(compileOptions);
    }

    const watcher = await watchWorkbenchCompile({
      ...compileOptions,
      styleReload: compileOptions.styleReload ?? true,
    });

    closeWatcherOnSignal(watcher);
    return watcher;
  };

  return run().catch((error: unknown) => {
    printWorkbenchCompileError(error);
    process.exitCode = 1;
    return undefined;
  });
}

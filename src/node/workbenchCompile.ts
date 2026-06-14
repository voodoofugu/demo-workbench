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

/** One input style file and the CSS file generated from it. */
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

/** Options for compiling project CSS/SCSS/Sass files used by demo pages. */
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

/** Options for discovering demo page files and writing their names to the generated workbench registry. */
export type WorkbenchCompileDemoOptions = {
  /** Directory with demo page modules. File basenames become demo names. */
  inputDir: string;
  /** File extensions to include. Defaults to `.jsx`, `.tsx`, `.js`, `.ts`. */
  extensions?: string[];
  /** Basenames to exclude from the generated list. Defaults are provided by `discoverWorkbenchFileNames`. */
  exclude?: string[];
};

/** Top-level compile options. Pass only the sections a host project wants demo-workbench to manage. */
export type WorkbenchCompileOptions = {
  /** Optional style compilation section. */
  styles?: WorkbenchCompileStylesOptions;
  /** Optional demo page registry section. */
  demos?: WorkbenchCompileDemoOptions;
};

/** Result of compiling one or more style files. */
export type WorkbenchCompileStylesResult = {
  /** Absolute input directory used for this compile. */
  inputDir: string;
  /** Absolute output directory used for this compile. */
  outputDir: string;
  /** Files touched by this compile. In watch mode this can contain only the changed file. */
  files: WorkbenchCompileStyleFile[];
};

/** Result of discovering the generated demo name list. */
export type WorkbenchCompileDemoResult = {
  /** Absolute directory that was scanned. */
  inputDir: string;
  /** Generated names sorted by filename. */
  names: string[];
  /** Registry files updated with the generated `{ demos }` data. Empty when no writable registry target exists. */
  outputFiles: string[];
};

/**
 * Combined compile result.
 *
 * The shape mirrors the requested compile sections: `styles` and `demos`.
 * Watch rebuilds may return only the section that changed, for example only
 * `styles` when a single style file is recompiled.
 */
export type WorkbenchCompileResult = {
  /** Style compilation result, when `styles` options were compiled. */
  styles?: WorkbenchCompileStylesResult;
  /** Demo registry result, when `demos` options were compiled. */
  demos?: WorkbenchCompileDemoResult;
};

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

export type WorkbenchStyleReloadOptions = {
  /** Local port for the style reload event stream. Defaults to 38297. */
  port?: number;
  /** Local host for the style reload event stream. Defaults to "127.0.0.1". */
  host?: string;
  /** HTTP path for the style reload event stream. Defaults to "/demo-workbench-style-events". */
  path?: string;
};

export type WorkbenchStyleReloadManifest = {
  enabled: boolean;
  styleReloadUrl?: string;
  updatedAt: string;
};

/** Handle returned by `watchWorkbenchCompile`. Call `close()` to stop the underlying chokidar watcher. */
export type WorkbenchCompileWatchResult = {
  /** The raw chokidar watcher for advanced integrations. */
  watcher: FSWatcher;
  /** Dev style reload URL when `styleReload` is enabled. */
  styleReloadUrl?: string;
  /** Stop watching files and release resources. */
  close: () => Promise<void>;
};

/** Back-compatible helper options for projects that only call `compileWorkbenchStyles`. */
export type CompileWorkbenchStylesOptions = WorkbenchCompileStylesOptions & {
  /** Optional demo page directory to include in the generated registry. */
  demoInputDir?: string;
};

/** Style result plus an optional generated demo registry section. */
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

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { transform } from "lightningcss";
import * as sass from "sass-embedded";

import { findWorkbenchEntryNames } from "./generateDemoManifest";

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
  /** Optional selector used to replace plain `body` selectors, for example `.likeBody` for embedded previews. */
  bodySelectorReplacement?: string;
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
  /** Basenames to exclude from the generated list. Defaults are provided by `findWorkbenchEntryNames`. */
  exclude?: string[];
};

/** Options for discovering popup files and writing their names to the generated workbench registry. */
export type WorkbenchCompileNameListOptions = {
  /** Directory with popup modules. File basenames become popup names. */
  inputDir: string;
  /** File extensions to include. Defaults to `.jsx`, `.tsx`, `.js`, `.ts`. */
  extensions?: string[];
  /** Basenames to exclude from the generated list. Defaults are provided by `findWorkbenchEntryNames`. */
  exclude?: string[];
};

/** Top-level compile options. Pass only the sections a host project wants demo-workbench to manage. */
export type WorkbenchCompileOptions = {
  /** Optional style compilation section. */
  styles?: WorkbenchCompileStylesOptions;
  /** Optional demo page registry section. */
  demos?: WorkbenchCompileDemoOptions;
  /** Optional popup name registry section. */
  popups?: WorkbenchCompileNameListOptions;
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

/** Result of discovering a generated demo/popup name list. */
export type WorkbenchCompileNameListResult = {
  /** Absolute directory that was scanned. */
  inputDir: string;
  /** Generated names sorted by filename. */
  names: string[];
  /** Registry files updated with the combined `{ demos, popups }` data. Empty when no writable registry target exists. */
  outputFiles: string[];
};

/**
 * Combined compile result.
 *
 * The shape mirrors the requested compile sections: `styles`, `demos` and `popups`.
 * Watch rebuilds may return only the section that changed, for example only
 * `styles` when a single style file is recompiled.
 */
export type WorkbenchCompileResult = {
  /** Style compilation result, when `styles` options were compiled. */
  styles?: WorkbenchCompileStylesResult;
  /** Demo registry result, when `demos` options were compiled. */
  demos?: WorkbenchCompileNameListResult;
  /** Popup registry result, when `popups` options were compiled. */
  popups?: WorkbenchCompileNameListResult;
};

export type WorkbenchCompileWatchOptions = WorkbenchCompileOptions & {
  /** Extra files/directories that should retrigger the full compile. */
  watchPaths?: string[];
  /** Debounce for bursty editor/Sass writes. Defaults to 80ms. */
  debounceMs?: number;
  /** Called after each successful compile, including the initial one. */
  onBuild?: (result: WorkbenchCompileResult) => void | Promise<void>;
  /** Called when a rebuild fails; defaults to logging the error. */
  onError?: (error: unknown) => void;
};

/** Handle returned by `watchWorkbenchCompile`. Call `close()` to stop the underlying chokidar watcher. */
export type WorkbenchCompileWatchResult = {
  /** The raw chokidar watcher for advanced integrations. */
  watcher: FSWatcher;
  /** Stop watching files and release resources. */
  close: () => Promise<void>;
};

/** Back-compatible helper options for projects that only call `compileWorkbenchStyles`. */
export type CompileWorkbenchStylesOptions = WorkbenchCompileStylesOptions & {
  /** Optional demo page directory to include in the generated registry. */
  demoInputDir?: string;
  /** Optional popup directory to include in the generated registry. */
  popupInputDir?: string;
};

/** Back-compatible helper result: style result plus optional generated demo/popup registry sections. */
export type CompileWorkbenchStylesResult = WorkbenchCompileStylesResult & {
  /** Demo registry result, when `demoInputDir` was provided. */
  demos?: WorkbenchCompileNameListResult;
  /** Popup registry result, when `popupInputDir` was provided. */
  popups?: WorkbenchCompileNameListResult;
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

  return css.replace(/url\((?:"|')?([^"')]+)(?:"|')?\)/g, (match, rawUrl: string) => {
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
  });
}

function replaceBodyInSelector(selector: string, replacement: string) {
  return selector.replace(/(^|[\s>+~,])body(?=$|[.#:\[\s>+~,])/g, (_match, prefix: string) => {
    return `${prefix}${replacement}`;
  });
}

function rewriteBodySelectors(css: string, replacement?: string) {
  if (!replacement) return css;

  let result = "";
  let segmentStart = 0;
  let inString: "\"" | "'" | null = null;
  let inComment = false;
  let parenDepth = 0;

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

    if (char === "\"" || char === "'") {
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
      const selector = css.slice(segmentStart, index);
      const trimmed = selector.trimStart();
      result += trimmed.startsWith("@")
        ? selector
        : replaceBodyInSelector(selector, replacement);
      result += char;
      segmentStart = index + 1;
      continue;
    }

    if (char === "}" || char === ";") {
      result += css.slice(segmentStart, index + 1);
      segmentStart = index + 1;
    }
  }

  result += css.slice(segmentStart);
  return result;
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

function renderGeneratedRegistry(registry: { demos: string[]; popups: string[] }) {
  return [
    'import type { WorkbenchFileRegistry } from "./workbenchNexus";',
    "",
    "export const generatedWorkbenchRegistry: WorkbenchFileRegistry = {",
    `  demos: ${JSON.stringify(registry.demos, null, 2).replace(/\n/g, "\n  ")},`,
    `  popups: ${JSON.stringify(registry.popups, null, 2).replace(/\n/g, "\n  ")},`,
    "};",
    "",
    "export default generatedWorkbenchRegistry;",
    "",
  ].join("\n");
}

async function writeGeneratedRegistrySource(registry: { demos: string[]; popups: string[] }) {
  const candidates = [
    path.resolve(process.cwd(), "../demo-workbench/src/state/generatedWorkbenchRegistry.ts"),
    path.resolve(process.cwd(), "node_modules/demo-workbench/src/state/generatedWorkbenchRegistry.ts"),
  ];
  const outputFile = (await Promise.all(candidates.map(async (filePath) => ((await fileExists(filePath)) ? filePath : null))))
    .find((filePath): filePath is string => Boolean(filePath));

  if (!outputFile) return null;

  await writeFile(outputFile, renderGeneratedRegistry(registry));
  return outputFile;
}

function renderBundledRegistry(registry: { demos: string[]; popups: string[] }) {
  return `var generatedWorkbenchRegistry = {\n  demos: ${JSON.stringify(registry.demos, null, 2).replace(/\n/g, "\n  ")},\n  popups: ${JSON.stringify(registry.popups, null, 2).replace(/\n/g, "\n  ")}\n};`;
}

async function writeGeneratedRegistryBundle(registry: { demos: string[]; popups: string[] }) {
  const candidates = [
    path.resolve(process.cwd(), "../demo-workbench/dist/index.js"),
    path.resolve(process.cwd(), "../demo-workbench/dist/index.cjs"),
    path.resolve(process.cwd(), "node_modules/demo-workbench/dist/index.js"),
    path.resolve(process.cwd(), "node_modules/demo-workbench/dist/index.cjs"),
  ];
  const outputFiles = (await Promise.all(candidates.map(async (filePath) => ((await fileExists(filePath)) ? filePath : null))))
    .filter((filePath): filePath is string => Boolean(filePath));
  const registryPattern = /var generatedWorkbenchRegistry = \{\n  demos: [\s\S]*?\n  popups: [\s\S]*?\n\};/;
  const renderedRegistry = renderBundledRegistry(registry);
  const writtenFiles: string[] = [];

  for (const outputFile of outputFiles) {
    const source = await readFile(outputFile, "utf8");
    if (!registryPattern.test(source)) continue;
    await writeFile(outputFile, source.replace(registryPattern, renderedRegistry));
    writtenFiles.push(outputFile);
  }

  return writtenFiles;
}

async function writeGeneratedRegistry(registry: { demos: string[]; popups: string[] }) {
  const [sourceFile, bundleFiles] = await Promise.all([
    writeGeneratedRegistrySource(registry),
    writeGeneratedRegistryBundle(registry),
  ]);

  return [sourceFile, ...bundleFiles].filter((filePath): filePath is string => Boolean(filePath));
}

async function compileGeneratedRegistry(options: WorkbenchCompileOptions): Promise<Pick<WorkbenchCompileResult, "demos" | "popups">> {
  if (!options.demos && !options.popups) return {};

  const [demoNames, popupNames] = await Promise.all([
    options.demos
      ? findWorkbenchEntryNames({
          inputDir: options.demos.inputDir,
          extensions: options.demos.extensions,
          exclude: options.demos.exclude,
        })
      : Promise.resolve<string[]>([]),
    options.popups
      ? findWorkbenchEntryNames({
          inputDir: options.popups.inputDir,
          extensions: options.popups.extensions,
          exclude: options.popups.exclude,
        })
      : Promise.resolve<string[]>([]),
  ]);

  const outputFiles = await writeGeneratedRegistry({ demos: demoNames, popups: popupNames });

  return {
    demos: options.demos
      ? {
          inputDir: path.resolve(options.demos.inputDir),
          names: demoNames,
          outputFiles,
        }
      : undefined,
    popups: options.popups
      ? {
          inputDir: path.resolve(options.popups.inputDir),
          names: popupNames,
          outputFiles,
        }
      : undefined,
  };
}

function getStyleFileResult(inputDir: string, outputDir: string, inputPath: string): WorkbenchCompileStyleFile {
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
    throw new Error(`Failed to compile ${styleFile.inputFile}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const rewrittenCss = rewriteAssetUrls(
    rewriteBodySelectors(compiledCss, options.bodySelectorReplacement),
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
    throw new Error(`Failed to minify ${styleFile.inputFile}: ${error instanceof Error ? error.message : String(error)}`);
  }

  await writeFile(styleFile.outputPath, minified.code);
  return styleFile;
}

function dedupeStyleEvents(events: StyleCompileEvent[]) {
  const map = new Map<string, StyleCompileEvent>();
  for (const event of events) {
    map.set(path.resolve(event.inputPath), { ...event, inputPath: path.resolve(event.inputPath) });
  }
  return [...map.values()].sort((left, right) => left.inputPath.localeCompare(right.inputPath));
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
      const styleFile = getStyleFileResult(inputDir, outputDir, event.inputPath);

      if (event.event === "unlink") {
        await rm(styleFile.outputPath, { force: true });
        files.push(styleFile);
        continue;
      }

      files.push(await compileStyleFile(options, inputDir, outputDir, event.inputPath));
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

export async function workbenchCompile(options: WorkbenchCompileOptions): Promise<WorkbenchCompileResult> {
  const styles = options.styles ? await compileStyles(options.styles) : undefined;
  const registry = await compileGeneratedRegistry(options);

  return { styles, ...registry };
}

export function getWorkbenchCompileWatchPaths(options: WorkbenchCompileOptions, extraPaths: string[] = []) {
  return [
    options.styles?.inputDir,
    options.demos?.inputDir,
    options.popups?.inputDir,
    ...extraPaths,
  ].filter((value): value is string => Boolean(value));
}

function isPathInDirectory(filePath: string, directory: string) {
  const relative = path.relative(path.resolve(directory), path.resolve(filePath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function compileWatchEvents(
  options: WorkbenchCompileOptions,
  events: StyleCompileEvent[],
  extraWatchPaths: string[],
): Promise<WorkbenchCompileResult> {
  if (!events.length) return workbenchCompile(options);

  const hasExtraChange = events.some((event) =>
    extraWatchPaths.some((watchPath) => path.resolve(event.inputPath) === path.resolve(watchPath) || isPathInDirectory(event.inputPath, watchPath)),
  );
  if (hasExtraChange) return workbenchCompile(options);

  const styleEvents = options.styles
    ? events.filter((event) => isPathInDirectory(event.inputPath, options.styles!.inputDir) && isStyleFile(event.inputPath))
    : [];
  const styleDependencyChanged = options.styles
    ? events.some((event) => isPathInDirectory(event.inputPath, options.styles!.inputDir) && isStyleSource(event.inputPath) && !isStyleFile(event.inputPath))
    : false;
  const demoChanged = options.demos
    ? events.some((event) => path.resolve(event.inputPath) === path.resolve(options.demos!.inputDir) || isPathInDirectory(event.inputPath, options.demos!.inputDir))
    : false;
  const popupChanged = options.popups
    ? events.some((event) => path.resolve(event.inputPath) === path.resolve(options.popups!.inputDir) || isPathInDirectory(event.inputPath, options.popups!.inputDir))
    : false;

  const styles = options.styles
    ? styleDependencyChanged
      ? await compileStyles(options.styles)
      : styleEvents.length
        ? await compileStyles(options.styles, styleEvents)
        : undefined
    : undefined;
  const registry = demoChanged || popupChanged ? await compileGeneratedRegistry(options) : {};

  if (!styles && !registry.demos && !registry.popups) return workbenchCompile(options);
  return { styles, ...registry };
}

export async function watchWorkbenchCompile(
  options: WorkbenchCompileWatchOptions,
): Promise<WorkbenchCompileWatchResult> {
  const { debounceMs = 80, onBuild, onError, watchPaths: extraWatchPaths = [], ...compileOptions } = options;
  const watchPaths = getWorkbenchCompileWatchPaths(compileOptions, extraWatchPaths);

  const runBuild = async (events?: StyleCompileEvent[]) => {
    const result = events?.length
      ? await compileWatchEvents(compileOptions, events, extraWatchPaths)
      : await workbenchCompile(compileOptions);
    await onBuild?.(result);
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
  const scheduleBuild = (event: StyleCompileEvent["event"], inputPath: string) => {
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
    close: () => watcher.close(),
  };
}

export async function compileWorkbenchStyles(
  options: CompileWorkbenchStylesOptions,
): Promise<CompileWorkbenchStylesResult> {
  const result = await workbenchCompile({
    styles: {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      bodySelectorReplacement: options.bodySelectorReplacement,
      assetUrlPrefix: options.assetUrlPrefix,
      clean: options.clean,
    },
    demos:
      options.demoInputDir
        ? {
            inputDir: options.demoInputDir,
          }
        : undefined,
    popups:
      options.popupInputDir
        ? {
            inputDir: options.popupInputDir,
          }
        : undefined,
  });

  if (!result.styles) {
    throw new Error("compileWorkbenchStyles requires style input/output options");
  }

  return {
    ...result.styles,
    demos: result.demos,
    popups: result.popups,
  };
}

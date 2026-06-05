import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import path from "node:path";
import { transform } from "lightningcss";
import * as sass from "sass-embedded";

import { findWorkbenchEntryNames } from "./generateDemoManifest";

type WorkbenchCompileStyleFile = {
  inputFile: string;
  outputFile: string;
  inputPath: string;
  outputPath: string;
};

export type WorkbenchCompileStylesOptions = {
  inputDir: string;
  outputDir: string;
  bodySelectorReplacement?: string;
  assetUrlPrefix?: string;
  clean?: boolean;
};

export type WorkbenchCompileDemoOptions = {
  inputDir: string;
  extensions?: string[];
  exclude?: string[];
};

export type WorkbenchCompileNameListOptions = {
  inputDir: string;
  extensions?: string[];
  exclude?: string[];
};

export type WorkbenchCompileOptions = {
  styles?: WorkbenchCompileStylesOptions;
  demos?: WorkbenchCompileDemoOptions;
  popups?: WorkbenchCompileNameListOptions;
};

export type WorkbenchCompileStylesResult = {
  inputDir: string;
  outputDir: string;
  files: WorkbenchCompileStyleFile[];
};

export type WorkbenchCompileFileRegistryResult = {
  outputFiles: string[];
  demos: string[];
  popups: string[];
};

export type WorkbenchCompileResult = {
  styles?: WorkbenchCompileStylesResult;
  fileRegistry?: WorkbenchCompileFileRegistryResult;
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

export type WorkbenchCompileWatchResult = {
  watcher: FSWatcher;
  close: () => Promise<void>;
};

export type CompileWorkbenchStylesOptions = WorkbenchCompileStylesOptions & {
  demoInputDir?: string;
  popupInputDir?: string;
};

export type CompileWorkbenchStylesResult = WorkbenchCompileStylesResult & {
  fileRegistry?: WorkbenchCompileFileRegistryResult;
};

const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass"]);

function isStyleFile(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return STYLE_EXTENSIONS.has(ext) && !path.basename(fileName).startsWith("_");
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

async function compileGeneratedRegistry(options: WorkbenchCompileOptions) {
  const demos = options.demos
    ? await findWorkbenchEntryNames({
        inputDir: options.demos.inputDir,
        extensions: options.demos.extensions,
        exclude: options.demos.exclude,
      })
    : [];
  const popups = options.popups
    ? await findWorkbenchEntryNames({
        inputDir: options.popups.inputDir,
        extensions: options.popups.extensions,
        exclude: options.popups.exclude,
      })
    : [];

  if (!options.demos && !options.popups) return undefined;

  const outputFiles = await writeGeneratedRegistry({ demos, popups });
  return { outputFiles, demos, popups };
}

async function compileStyles(options: WorkbenchCompileStylesOptions): Promise<WorkbenchCompileStylesResult> {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir);

  if (options.clean) {
    await rm(outputDir, { recursive: true, force: true });
  }
  await mkdir(outputDir, { recursive: true });

  const inputFiles = await findStyleFiles(inputDir);
  const files: WorkbenchCompileStyleFile[] = [];

  for (const inputFile of inputFiles) {
    const inputPath = path.join(inputDir, inputFile);
    const outputFile = toOutputFile(inputFile);
    const outputPath = path.join(outputDir, outputFile);

    let compiledCss: string;
    try {
      compiledCss = await compileInputFile(inputPath, inputDir);
    } catch (error) {
      throw new Error(`Failed to compile ${inputFile}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const rewrittenCss = rewriteAssetUrls(
      rewriteBodySelectors(compiledCss, options.bodySelectorReplacement),
      options.assetUrlPrefix,
    );
    let minified: ReturnType<typeof transform>;
    try {
      minified = transform({
        filename: outputFile,
        code: Buffer.from(rewrittenCss),
        minify: true,
      });
    } catch (error) {
      throw new Error(`Failed to minify ${inputFile}: ${error instanceof Error ? error.message : String(error)}`);
    }

    await writeFile(outputPath, minified.code);
    files.push({ inputFile, outputFile, inputPath, outputPath });
  }

  return { inputDir, outputDir, files };
}

export async function workbenchCompile(options: WorkbenchCompileOptions): Promise<WorkbenchCompileResult> {
  const styles = options.styles ? await compileStyles(options.styles) : undefined;
  const fileRegistry = await compileGeneratedRegistry(options);

  return { styles, fileRegistry };
}

export function getWorkbenchCompileWatchPaths(options: WorkbenchCompileOptions, extraPaths: string[] = []) {
  return [
    options.styles?.inputDir,
    options.demos?.inputDir,
    options.popups?.inputDir,
    ...extraPaths,
  ].filter((value): value is string => Boolean(value));
}

export async function watchWorkbenchCompile(
  options: WorkbenchCompileWatchOptions,
): Promise<WorkbenchCompileWatchResult> {
  const { debounceMs = 80, onBuild, onError, watchPaths: extraWatchPaths = [], ...compileOptions } = options;
  const watchPaths = getWorkbenchCompileWatchPaths(compileOptions, extraWatchPaths);

  const runBuild = async () => {
    const result = await workbenchCompile(compileOptions);
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
  const scheduleBuild = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      runBuild().catch((error: unknown) => {
        if (onError) {
          onError(error);
          return;
        }
        console.error(error instanceof Error ? error.message : error);
      });
    }, debounceMs);
  };

  watcher.on("add", scheduleBuild);
  watcher.on("change", scheduleBuild);
  watcher.on("unlink", scheduleBuild);

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
    fileRegistry: result.fileRegistry,
  };
}

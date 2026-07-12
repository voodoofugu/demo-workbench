import { mkdir, readdir, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***WorkbenchFileNameDiscoveryOptions***:
 * options for reading sorted workbench file basenames from a directory.
 * @description
 * Used by `discoverWorkbenchFileNames`, manifest generation and host scripts that need the same file filtering rules as `demo-workbench`.
 * @example
 * ```ts
 * const options: WorkbenchFileNameDiscoveryOptions = {
 *   inputDir: "src/demos",
 *   exclude: ["Template"],
 * };
 * ```
 */
export type WorkbenchFileNameDiscoveryOptions = {
  inputDir: string;
  extensions?: string[];
  exclude?: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***GenerateNameListOptions***:
 * options for writing discovered names to a JS or JSON file.
 * @description
 * Extends file discovery options with an output file and optional export name for generated JavaScript modules.
 */
export type GenerateNameListOptions = WorkbenchFileNameDiscoveryOptions & {
  outputFile: string;
  exportName?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***GenerateNameListResult***:
 * result returned after a generated name list is written.
 */
export type GenerateNameListResult = {
  inputDir: string;
  outputFile: string;
  names: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***GenerateDemoManifestOptions***:
 * options for writing a lazy demo manifest module.
 * @description
 * The generated manifest contains `{ name, load }` entries where `load` imports from `importPathPrefix`.
 */
export type GenerateDemoManifestOptions = WorkbenchFileNameDiscoveryOptions & {
  outputFile: string;
  importPathPrefix?: string;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***GenerateDemoManifestResult***:
 * result returned after a lazy demo manifest is written.
 */
export type GenerateDemoManifestResult = {
  inputDir: string;
  outputFile: string;
  exportName: string;
  demos: string[];
};

type WorkbenchDiscoveredFile = {
  name: string;
  fileName: string;
};

const DEFAULT_EXTENSIONS = [".jsx", ".tsx", ".js", ".ts"];
const DEFAULT_EXCLUDE = ["Template"];
const MODULE_OUTPUT_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

function normalizeExtensions(extensions?: string[]) {
  const source = extensions?.length ? extensions : DEFAULT_EXTENSIONS;
  return new Set(
    source.map((extension) =>
      extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`,
    ),
  );
}

function toImportPath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith(".") || normalized.startsWith("/")) return normalized;
  return `./${normalized}`;
}

function isWorkbenchEntryFile(entry: Dirent, extensions: Set<string>, exclude: Set<string>) {
  if (!entry.isFile()) return false;
  if (entry.name.startsWith(".")) return false;
  if (entry.name.endsWith(".d.ts")) return false;

  const extension = path.extname(entry.name).toLowerCase();
  if (!extensions.has(extension)) return false;

  const name = path.basename(entry.name, extension);
  if (name.startsWith("_")) return false;
  if (name.startsWith("a_")) return false;
  return !exclude.has(name);
}

async function discoverWorkbenchFiles(
  options: WorkbenchFileNameDiscoveryOptions,
): Promise<WorkbenchDiscoveredFile[]> {
  const inputDir = path.resolve(options.inputDir);
  const extensions = normalizeExtensions(options.extensions);
  const exclude = new Set(options.exclude ?? DEFAULT_EXCLUDE);

  const entries: Dirent[] = await readdir(inputDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => isWorkbenchEntryFile(entry, extensions, exclude))
    .map((entry) => {
      const extension = path.extname(entry.name);
      return {
        name: path.basename(entry.name, extension),
        fileName: entry.name,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const seen = new Set<string>();
  for (const file of files) {
    if (!seen.has(file.name)) {
      seen.add(file.name);
      continue;
    }

    throw new Error(
      `Duplicate demo basename "${file.name}". Keep only one matching demo file with that basename.`,
    );
  }

  return files;
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***discoverWorkbenchFileNames***:
 * read sorted workbench file basenames from one directory.
 * @description
 * Includes `.jsx`, `.tsx`, `.js` and `.ts` by default, while ignoring dotfiles, `.d.ts`, `_` files, `a_` files and explicitly excluded basenames.
 * @example
 * ```ts
 * const names = await discoverWorkbenchFileNames({
 *   inputDir: "src/demos",
 * });
 * ```
 */
export async function discoverWorkbenchFileNames(options: WorkbenchFileNameDiscoveryOptions) {
  const files = await discoverWorkbenchFiles(options);
  return files.map((file) => file.name);
}

function toIdentifierName(value: string, fallback = "demos") {
  const words = value.match(/[A-Za-z0-9_$]+/g) ?? [];
  const identifier = words
    .map((word, index) => {
      if (index === 0) return word;
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join("")
    .replace(/^[^A-Za-z_$]+/, "");

  return identifier || fallback;
}

function toDemoManifestExportName(outputFile: string) {
  const parsed = path.parse(outputFile);
  return toIdentifierName(parsed.name);
}

function renderDemoManifest(
  demos: WorkbenchDiscoveredFile[],
  importPathPrefix: string,
  exportName: string,
) {
  const prefix = toImportPath(importPathPrefix).replace(/\/$/, "");
  const lines = demos.map((demo) => {
    const encodedName = JSON.stringify(demo.name);
    const importPath = JSON.stringify(`${prefix}/${demo.fileName}`);
    return `  { name: ${encodedName}, load: () => import(${importPath}) },`;
  });

  return [
    "// This file is generated by demo-workbench. Do not edit manually.",
    `export const ${exportName} = [`,
    ...lines,
    "];",
    "",
    `export default ${exportName};`,
    "",
  ].join("\n");
}

function assertDemoManifestOutputFile(value: string) {
  if (typeof value !== "string") {
    throw new Error("demos.outputFile must be a non-empty file path.");
  }

  if (!value.trim()) {
    throw new Error("demos.outputFile must be a non-empty file path.");
  }

  if (/[\\/]$/.test(value)) {
    throw new Error(
      `demos.outputFile must include a file name, received: ${value}`,
    );
  }
}

function toDemoManifestOutputFile(outputFile: string) {
  const parsed = path.parse(outputFile);
  if (!parsed.name || parsed.base === "." || parsed.base === "..") {
    throw new Error(
      `demos.outputFile must include a file name, received: ${outputFile}`,
    );
  }

  if (parsed.ext.toLowerCase() === ".js") return outputFile;
  if (MODULE_OUTPUT_EXTENSIONS.has(parsed.ext.toLowerCase())) {
    return path.join(parsed.dir, `${parsed.name}.js`);
  }

  return `${outputFile}.js`;
}

function renderNameList(names: string[], outputFile: string, exportName = "names") {
  if (path.extname(outputFile).toLowerCase() === ".json") {
    return `${JSON.stringify(names, null, 2)}\n`;
  }

  return [
    "// This file is generated by demo-workbench. Do not edit manually.",
    `export const ${exportName} = ${JSON.stringify(names, null, 2)};`,
    "",
    `export default ${exportName};`,
    "",
  ].join("\n");
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***generateNameList***:
 * discover file basenames and write them to a JS or JSON file.
 * @description
 * Internal helper used by demo manifest generation and useful for scripts that need a plain generated name list.
 */
export async function generateNameList(
  options: GenerateNameListOptions,
): Promise<GenerateNameListResult> {
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);
  const outputDir = path.dirname(outputFile);
  const names = await discoverWorkbenchFileNames(options);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, renderNameList(names, outputFile, options.exportName));

  return { inputDir, outputFile, names };
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***generateDemoManifest***:
 * discover demo files and write a lazy manifest module.
 * @description
 * Generated entries keep a stable name and a lazy `load` function for each discovered demo file.
 */
export async function generateDemoManifest(
  options: GenerateDemoManifestOptions,
): Promise<GenerateDemoManifestResult> {
  assertDemoManifestOutputFile(options.outputFile);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = toDemoManifestOutputFile(path.resolve(options.outputFile));
  const outputDir = path.dirname(outputFile);
  const importPathPrefix = options.importPathPrefix ?? (path.relative(outputDir, inputDir) || ".");
  const exportName = toDemoManifestExportName(outputFile);
  const demoFiles = await discoverWorkbenchFiles(options);

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputFile,
    renderDemoManifest(demoFiles, importPathPrefix, exportName),
  );

  return {
    inputDir,
    outputFile,
    exportName,
    demos: demoFiles.map((file) => file.name),
  };
}

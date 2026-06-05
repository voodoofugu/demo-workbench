#!/usr/bin/env node
import {
  compileWorkbenchStyles,
  getWorkbenchCompileWatchPaths,
  watchWorkbenchCompile,
} from "./workbenchCompile";
import type { CompileWorkbenchStylesOptions, WorkbenchCompileResult } from "./workbenchCompile";

type CliOptions = CompileWorkbenchStylesOptions & {
  watch?: boolean;
};

function readFlag(args: string[], names: string[]) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) return args[index + 1];
  }
  return undefined;
}

function hasFlag(args: string[], names: string[]) {
  return names.some((name) => args.includes(name));
}

function parseArgs(args: string[]): CliOptions {
  const inputDir = readFlag(args, ["--input", "--input-dir", "--inputStyles", "--style-input-folder"]);
  const outputDir = readFlag(args, ["--output", "--output-dir", "--cssOutputFolder", "--style-output-folder"]);

  if (!inputDir || !outputDir) {
    throw new Error(
      "Usage: demo-workbench-styles build --input <stylesDir> --output <cssOutputDir> [--body-selector .likeBody] [--asset-url-prefix http://localhost:3000/img/] [--pages-input <pagesDir>] [--popups-input <popupsDir>] [--clean]",
    );
  }

  return {
    inputDir,
    outputDir,
    bodySelectorReplacement: readFlag(args, ["--body-selector", "--bodySelectorReplacement", "--body-replace"]),
    assetUrlPrefix: readFlag(args, ["--asset-url-prefix", "--assetUrlPrefix"]),
    clean: hasFlag(args, ["--clean"]),
    watch: args[0] === "watch" || hasFlag(args, ["--watch"]),
    demoInputDir: readFlag(args, ["--pages-input", "--demos-input", "--demo-input"]),
    popupInputDir: readFlag(args, ["--popups-input", "--popup-input"]),
  };
}

function printRegistryResult(result: Pick<WorkbenchCompileResult, "demos" | "popups">) {
  if (!result.demos && !result.popups) return;

  const outputFiles = result.demos?.outputFiles ?? result.popups?.outputFiles ?? [];
  const target = outputFiles.length ? outputFiles.join(", ") : "internal registry";
  console.log(
    `demo-workbench registry: stored ${result.demos?.names.length ?? 0} demo(s), ${result.popups?.names.length ?? 0} popup name(s): ${target}`,
  );
}

function printResult(result: WorkbenchCompileResult) {
  if (result.styles) {
    const files = result.styles.files.map((file) => file.outputFile).join(", ");
    console.log(`demo-workbench styles: compiled ${result.styles.files.length} file(s)${files ? `: ${files}` : ""}`);
  }

  printRegistryResult(result);
}

async function build(options: CompileWorkbenchStylesOptions) {
  const result = await compileWorkbenchStyles(options);
  const files = result.files.map((file) => file.outputFile).join(", ");
  console.log(`demo-workbench styles: compiled ${result.files.length} file(s)${files ? `: ${files}` : ""}`);
  printRegistryResult(result);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.watch) {
    await build(options);
    return;
  }

  const watchPaths = getWorkbenchCompileWatchPaths({
    styles: options,
    demos: options.demoInputDir ? { inputDir: options.demoInputDir } : undefined,
    popups: options.popupInputDir ? { inputDir: options.popupInputDir } : undefined,
  });
  console.log(`demo-workbench styles: watching ${watchPaths.join(", ")}`);
  await watchWorkbenchCompile({
    styles: options,
    demos: options.demoInputDir ? { inputDir: options.demoInputDir } : undefined,
    popups: options.popupInputDir ? { inputDir: options.popupInputDir } : undefined,
    debounceMs: 50,
    onBuild: printResult,
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

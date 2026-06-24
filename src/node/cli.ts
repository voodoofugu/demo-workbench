#!/usr/bin/env node
import {
  compileWorkbenchStyles,
  getWorkbenchCompileWatchPaths,
  watchWorkbenchCompile,
} from "./workbenchCompile";
import type {
  CompileWorkbenchStylesOptions,
  WorkbenchStyleReloadOptions,
  WorkbenchCompileResult,
} from "./workbenchCompile";

type CliOptions = CompileWorkbenchStylesOptions & {
  watch?: boolean;
  styleReload?: boolean | WorkbenchStyleReloadOptions;
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
  const inputDir = readFlag(args, [
    "--input",
    "--input-dir",
    "--inputStyles",
    "--style-input-folder",
  ]);
  const outputDir = readFlag(args, [
    "--output",
    "--output-dir",
    "--cssOutputFolder",
    "--style-output-folder",
  ]);

  if (!inputDir || !outputDir) {
    throw new Error(
      [
        "Usage:",
        "demo-workbench-styles build --input <stylesDir> --output <cssOutputDir>",
        "[--production-css]",
        "[--asset-url-prefix http://localhost:3000/img/]",
        "[--pages-input <pagesDir>]",
        "[--clean]",
        "[--style-reload]",
        "[--style-reload-port 38297]",
      ].join(" "),
    );
  }

  const styleReloadPort = readFlag(args, ["--style-reload-port"]);
  const styleReload =
    hasFlag(args, ["--style-reload"]) || styleReloadPort
      ? {
          port:
            styleReloadPort !== undefined ? Number(styleReloadPort) : undefined,
        }
      : undefined;

  return {
    inputDir,
    outputDir,
    compileForWorkbench: hasFlag(args, ["--production-css", "--prod-css"])
      ? false
      : undefined,
    assetUrlPrefix: readFlag(args, ["--asset-url-prefix", "--assetUrlPrefix"]),
    clean: hasFlag(args, ["--clean"]),
    watch: args[0] === "watch" || hasFlag(args, ["--watch"]),
    styleReload,
    demoInputDir: readFlag(args, [
      "--pages-input",
      "--demos-input",
      "--demo-input",
    ]),
  };
}

function printRegistryResult(result: Pick<WorkbenchCompileResult, "demos">) {
  if (!result.demos) return;

  const outputFiles = result.demos.outputFiles;
  const target = outputFiles.length
    ? outputFiles.join(", ")
    : "internal registry";

  console.log(
    `demo-workbench registry: stored ${result.demos.names.length} demo(s): ${target}`,
  );
}

function printResult(result: WorkbenchCompileResult) {
  if (result.styles) {
    const files = result.styles.files.map((file) => file.outputFile).join(", ");

    console.log(
      `demo-workbench styles: compiled ${result.styles.files.length} file(s)${
        files ? `: ${files}` : ""
      }`,
    );
  }

  printRegistryResult(result);
}

async function build(options: CompileWorkbenchStylesOptions) {
  const result = await compileWorkbenchStyles(options);
  const files = result.files.map((file) => file.outputFile).join(", ");

  console.log(
    `demo-workbench styles: compiled ${result.files.length} file(s)${
      files ? `: ${files}` : ""
    }`,
  );

  printRegistryResult(result);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.watch) {
    await build(options);
    return;
  }

  const demos = options.demoInputDir
    ? { inputDir: options.demoInputDir }
    : undefined;

  const watchPaths = getWorkbenchCompileWatchPaths({
    styles: options,
    demos,
  });

  console.log(`demo-workbench styles: watching ${watchPaths.join(", ")}`);

  await watchWorkbenchCompile({
    styles: options,
    demos,
    debounceMs: 50,
    styleReload: options.styleReload,
    onBuild: printResult,
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

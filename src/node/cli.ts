#!/usr/bin/env node
import { runWorkbenchCompile } from "./workbenchCompile";
import type {
  WorkbenchCompileOptions,
  WorkbenchCompileStylesOptions,
  WorkbenchStyleReloadOptions,
} from "./workbenchCompile";

type CliOptions = WorkbenchCompileStylesOptions & {
  watch?: boolean;
  styleReload?: boolean | WorkbenchStyleReloadOptions;
  styleLogs?: boolean;
  demoInputDir?: string;
  demoOutputFile?: string;
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
        "demo-workbench-compile build --input <stylesDir> --output <cssOutputDir>",
        "[--production-css]",
        "[--asset-url-prefix http://localhost:3000/img/]",
        "[--pages-input <pagesDir>]",
        "[--pages-output <manifestFile>]",
        "[--no-clean]",
        "[--no-style-logs]",
        "[--style-reload]",
        "[--style-reload-port 38297]",
      ].join(" "),
    );
  }

  const demoInputDir = readFlag(args, [
    "--pages-input",
    "--demos-input",
    "--demo-input",
  ]);
  const demoOutputFile = readFlag(args, [
    "--pages-output",
    "--demos-output",
    "--demo-output",
  ]);

  if (demoInputDir && !demoOutputFile) {
    throw new Error("--pages-output <manifestFile> is required when --pages-input is provided.");
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
    clean: hasFlag(args, ["--no-clean"]) ? false : undefined,
    styleLogs: hasFlag(args, ["--no-style-logs", "--silent-styles"])
      ? false
      : undefined,
    watch: args[0] === "watch" || hasFlag(args, ["--watch"]),
    styleReload,
    demoInputDir,
    demoOutputFile,
  };
}

function toCompileOptions(options: CliOptions): WorkbenchCompileOptions {
  const demos =
    options.demoInputDir && options.demoOutputFile
      ? {
          inputDir: options.demoInputDir,
          outputFile: options.demoOutputFile,
        }
      : undefined;

  return {
    styles: {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      compileForWorkbench: options.compileForWorkbench,
      assetUrlPrefix: options.assetUrlPrefix,
      clean: options.clean,
    },
    demos,
    styleLogs: options.styleLogs,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const compileOptions = toCompileOptions(options);

  await runWorkbenchCompile({
    ...compileOptions,
    debounceMs: 50,
    styleReload: options.styleReload,
    watch: options.watch,
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publishDir = path.join(root, "publish");

const rootPackage = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

const distFiles = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/node/index.js",
  "dist/node/index.cjs",
  "dist/node/index.d.ts",
  "dist/node/cli.js",
];

const isLocalDependencySpec = (spec) =>
  spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("file:");

const readLocalDependencyVersion = async (spec) => {
  const localPath = spec.startsWith("file:")
    ? spec.slice("file:".length)
    : spec;
  const packagePath = path.resolve(root, localPath, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  return packageJson.version;
};

const normalizePublishDependencies = async (dependencies = {}) => {
  const entries = await Promise.all(
    Object.entries(dependencies).map(async ([name, spec]) => {
      if (typeof spec !== "string" || !isLocalDependencySpec(spec)) {
        return [name, spec];
      }

      const version = await readLocalDependencyVersion(spec);
      return [name, `^${version}`];
    }),
  );

  return Object.fromEntries(entries);
};

const publishDependencies = await normalizePublishDependencies(
  rootPackage.dependencies,
);

const publishPackage = {
  name: rootPackage.name,
  version: rootPackage.version,
  description: rootPackage.description,
  author: rootPackage.author,
  license: rootPackage.license,
  type: rootPackage.type,
  main: rootPackage.main,
  module: rootPackage.module,
  types: rootPackage.types,
  typesVersions: rootPackage.typesVersions,
  exports: rootPackage.exports,
  bin: rootPackage.bin,
  repository: rootPackage.repository,
  bugs: rootPackage.bugs,
  homepage: rootPackage.homepage,
  keywords: rootPackage.keywords,
  sideEffects: rootPackage.sideEffects,
  dependencies: publishDependencies,
  peerDependencies: rootPackage.peerDependencies,
  files: rootPackage.files,
};

await rm(publishDir, { recursive: true, force: true });
await mkdir(publishDir, { recursive: true });

for (const file of distFiles) {
  const source = path.join(root, file);
  const target = path.join(publishDir, file);

  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
}

await cp(path.join(root, "README.md"), path.join(publishDir, "README.md"));
await cp(path.join(root, "LICENSE"), path.join(publishDir, "LICENSE"));

await writeFile(
  path.join(publishDir, "package.json"),
  `${JSON.stringify(publishPackage, null, 2)}\n`,
);

console.log(`Prepared publish package: ${publishDir}`);

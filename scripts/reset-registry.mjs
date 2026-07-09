// Host projects patch src/state/generatedWorkbenchRegistry.ts in place while
// developing against a linked demo-workbench checkout. Reset it before every
// build so host demo names never leak into the published bundles.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const registryFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/state/generatedWorkbenchRegistry.ts",
);

const emptyRegistry = `import type { WorkbenchFileRegistry } from "./nexus";

export const generatedWorkbenchRegistry: WorkbenchFileRegistry = {
  demos: [],
};

export default generatedWorkbenchRegistry;
`;

if ((await readFile(registryFile, "utf8")) !== emptyRegistry) {
  await writeFile(registryFile, emptyRegistry);
  console.log("reset generatedWorkbenchRegistry to an empty demo list");
}

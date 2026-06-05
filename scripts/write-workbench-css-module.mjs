import { readFile, writeFile } from "node:fs/promises";

const css = await readFile(new URL("../src/styles/workbench.css", import.meta.url), "utf8");

await writeFile(
  new URL("../src/styles/workbenchCss.ts", import.meta.url),
  `const workbenchCss = ${JSON.stringify(css)};\n\nexport default workbenchCss;\n`,
);

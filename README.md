# demo-workbench

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [Common patterns](#common-patterns)
- [Development](#development)
- [CI](#ci)
- [License](#license)

<h2></h2>

### About

`demo-workbench` is a small React package for browsing, searching and opening project demos/screens during UI development.

It is designed for component libraries, visual experiments, scroll demos, style systems and project-specific UI sandboxes: places where you want a reusable demo shell without rebuilding the same grid, search, theme toggle, preview state and storage logic every time.

It is not a full documentation system. It does not generate docs, parse MDX, run tests in the browser or replace Storybook. It only gives a clean workbench shell that a project can feed with its own demo manifest and styles.

The core idea is simple - the package owns the workbench UI, while the project owns the demos.

<h2></h2>

### Installation

```bash
npm install demo-workbench
```

```tsx
import DemoWorkbench from "demo-workbench";
```

Workbench shell styles are injected by the package automatically when `DemoWorkbench` is imported.

For local sibling-project development:

```json
{
  "dependencies": {
    "demo-workbench": "file:../demo-workbench"
  }
}
```

> **✦ Note:**
>
> - Supports both **ESM** (`import`) and **CommonJS** (`require`) builds.
> - Written with React and ships TypeScript declaration files.
> - The package injects reusable shell styles automatically from its main JS bundle.
> - Project/demo CSS is still loaded by the consuming project through `styleLoader`.
> - React and React DOM are peer dependencies, so the host app keeps one React instance.

<h2></h2>

### API

<ul><div>

###### **— COMPONENT —**

<details><summary><b><code>DemoWorkbench</code></b>: <em>render the reusable demo shell</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import DemoWorkbench from "demo-workbench";

import demos from "./demoManifest";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={demos}
      styleLoader={(name) => import(`../css/${name}.css`)}
    />
  );
}
```

<b>Description:</b><em><br />
Renders the full workbench shell: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted workbench values.<br />
The consuming project passes demo entries and optional render hooks, while the package keeps the reusable layout and shell styling in one place.
</em><br />

<b>Signature:</b><br />

```ts
function DemoWorkbench(props: DemoWorkbenchProps): JSX.Element;
```

<b>Props:</b><br />

- `title?: string` - shell title shown in the workbench header and document title.
- `demos?: DemoItem[]` - searchable demo manifest. If omitted, generated registry names are loaded through `demoLoader`.
- `demoLoader?: (name: string) => Promise<DemoModule>` - async loader for generated demo names.
- `styleLoader?: (name: string) => Promise<unknown>` - dynamic style loader used by `styled-atom`.
- `cssFiles?: string[]` - host-level CSS atoms loaded by the shell and added to every demo preview.
- `baseCssFiles?: string[]` - deprecated compatibility alias for `cssFiles`.
- `storageData?: DemoWorkbenchStorageEntry[]` - fields that should persist between reloads.
- `viewport?: { width: number; height: number }` - base preview viewport used for modal scaling.
- `initialState?: DemoWorkbenchInitialState` - state applied before storage restoration.
- `renderDemoContent?: (pageName: string) => ReactNode` - optional host content rendered inside opened demos.
- `bodyBg?: string` - inline background value for the opened demo body.
- `bodySelectorReplacement?: string` - replacement selector for embedded body-like roots.
- `notFoundComponent?: ComponentType` - fallback component for unknown demo pages.

<b>Return:</b><br />
Returns a React element containing the complete reusable workbench shell.

Project-level SVG filters/defs should be rendered by the host app as normal siblings near `DemoWorkbench`, not through a workbench prop.

</div></ul></details>

<h2></h2>

###### **— DATA —**

<details><summary><b><code>DemoItem</code></b>: <em>describe one demo entry</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import type { DemoItem } from "demo-workbench";

const demos: DemoItem[] = [
  {
    name: "Button",
    load: () => import("./demos/ButtonDemo"),
  },
  {
    name: "Card",
    title: "Card states",
    load: () => import("./demos/CardDemo"),
    cssFiles: ["card-demo"],
  },
];

export default demos;
```

<b>Description:</b><em><br />
A demo entry is intentionally small: a stable name, an async module loader and optional CSS atom names.<br />
Each loaded module should export a React component as <code>default</code>. The component receives <code>pageName</code> and may render children supplied by the workbench.
</em><br />

<b>Shape:</b><br />

```ts
type DemoItem = {
  name: string;
  title?: string;
  load: () => Promise<DemoModule>;
  css?: string[];
  cssFiles?: string[];
};
```

<b>Return behavior:</b><br />
`load()` resolves to a `DemoModule`. `cssFiles` is the preferred field for style atom names; `css` is kept for older manifests.

</div></ul></details>

<h2></h2>

<details><summary><b><code>DemoModule</code></b>: <em>module returned by a demo loader</em></summary><br /><ul><div>

<b>Shape:</b><br />

```ts
type DemoModule = {
  default: ComponentType<{ pageName?: string; children?: ReactNode }>;
  css?: string[];
  cssFiles?: string[];
};
```

<b>Description:</b><em><br />
`default` is the React component rendered by the workbench. Optional style arrays are loaded before rendering the preview.
</em><br />

</div></ul></details>

<h2></h2>

###### **— NODE —**

<details><summary><b><code>workbenchCompile</code></b>: <em>compile styles and generated demo/popup registry</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { workbenchCompile } from "demo-workbench/node";

const result = await workbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/css",
    bodySelectorReplacement: ".likeBody",
    assetUrlPrefix: "http://localhost:3000/img/",
  },
  demos: { inputDir: "src/components/pages" },
  popups: { inputDir: "src/components/popups" },
});

console.log(result.styles?.files.length);
console.log(result.demos?.names);
console.log(result.popups?.names);
```

<b>Description:</b><em><br />
Runs the requested compile sections and returns the same top-level shape: <code>{ styles, demos, popups }</code>.<br />
Styles are compiled from top-level <code>.css</code>, <code>.scss</code> and <code>.sass</code> files, minified, optionally rewritten, and written as <code>.css</code> files. Demo and popup names are discovered from file basenames and written to the generated workbench registry when a target is available.
</em><br />

<b>Signature:</b><br />

```ts
function workbenchCompile(options: WorkbenchCompileOptions): Promise<WorkbenchCompileResult>;
```

<b>Return:</b><br />

```ts
type WorkbenchCompileResult = {
  styles?: {
    inputDir: string;
    outputDir: string;
    files: Array<{
      inputFile: string;
      outputFile: string;
      inputPath: string;
      outputPath: string;
    }>;
  };
  demos?: {
    inputDir: string;
    names: string[];
    outputFiles: string[];
  };
  popups?: {
    inputDir: string;
    names: string[];
    outputFiles: string[];
  };
};
```

</div></ul></details>

<h2></h2>

<details><summary><b><code>watchWorkbenchCompile</code></b>: <em>watch host project files and rebuild only what changed</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { watchWorkbenchCompile } from "demo-workbench/node";

await watchWorkbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/css",
    bodySelectorReplacement: ".likeBody",
  },
  demos: { inputDir: "src/components/pages" },
  popups: { inputDir: "src/components/popups" },
  onBuild: (result) => {
    if (result.styles) {
      console.log(result.styles.files.map((file) => file.outputFile));
    }
  },
});
```

<b>Description:</b><em><br />
Starts with one full compile. After that, direct changes to one top-level style file recompile only that file. Changes to Sass partials such as <code>_mixins.scss</code> trigger a full style compile because dependency ownership is ambiguous. Demo/popup changes regenerate only the registry sections.
</em><br />

<b>Return:</b><br />
Returns a watcher handle with `close()` for cleanup.

```ts
const watch = await watchWorkbenchCompile(options);
await watch.close();
```

</div></ul></details>

<h2></h2>

<details><summary><b><code>compileWorkbenchStyles</code></b>: <em>back-compatible style-first helper</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { compileWorkbenchStyles } from "demo-workbench/node";

const result = await compileWorkbenchStyles({
  inputDir: "titans_rc/styles/scss",
  outputDir: "src/styles/css",
  demoInputDir: "src/components/pages",
  popupInputDir: "src/components/popups",
});
```

<b>Description:</b><em><br />
Convenience wrapper around <code>workbenchCompile</code> for older scripts that primarily compile styles. It returns the style result at the top level and optional <code>demos</code>/<code>popups</code> registry sections.
</em><br />

</div></ul></details>

<h2></h2>

</div></ul>

<h2></h2>

### Common patterns

<details><summary><b>Local package development</b>: <em>use the workbench from a sibling project</em></summary><br />

```json
{
  "dependencies": {
    "demo-workbench": "file:../demo-workbench"
  }
}
```

Run the package build after changing `demo-workbench`, then reinstall or refresh the host project if needed.

```bash
cd ../demo-workbench
npm run build
```

</details>

<details><summary><b>Project CSS loading</b>: <em>keep host styles controlled by the host app</em></summary><br />

```tsx
<DemoWorkbench
  demos={demos}
  styleLoader={(name) => import(`../styles/${name}.css`)}
  cssFiles={["output", "theme"]}
/>
```

</details>

<details><summary><b>SCSS/style compilation from a host project</b>: <em>keep watch orchestration inside demo-workbench</em></summary><br />

```ts
import { watchWorkbenchCompile, workbenchCompile } from "demo-workbench/node";

const options = {
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/css",
    bodySelectorReplacement: ".likeBody",
  },
  demos: { inputDir: "src/components/pages" },
  popups: { inputDir: "src/components/popups" },
};

await workbenchCompile(options);
await watchWorkbenchCompile({
  ...options,
  onBuild: (result) => {
    if (result.styles) console.log("styles", result.styles.files.length);
    if (result.demos) console.log("demos", result.demos.names.length);
    if (result.popups) console.log("popups", result.popups.names.length);
  },
});
```

Host projects should pass their paths/options only; file watching, debouncing and rebuild calls are owned by `demo-workbench/node`.

</details>

<details><summary><b>Custom opened-demo content</b>: <em>inject project-specific overlays or helper layers</em></summary><br />

```tsx
<DemoWorkbench
  demos={demos}
  renderDemoContent={(pageName) => (
    <div data-demo-page={pageName} className="project-demo-layer" />
  )}
/>
```

</details>

<h2></h2>

### Development

To run the local example workbench in the browser:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173/`. The dev app lives in `dev/main.tsx` and renders the example manifest from `examples/index.js`, so it is a quick place to adjust shell/components/styles and immediately see how the demo pages render.

```bash
npm run typecheck
npm run build
npm run pack:dry
```

For release preparation:

```bash
npm run package-prepare
npm run publish:dry
npm run publish
```

`package-prepare` builds the library and creates a clean `publish/` directory with only the files needed for npm publication.

<h2></h2>

### CI

CI is useful here because the package is meant to be reused by other projects. It catches broken imports, missing type declarations, failed builds and invalid npm package contents before a change becomes the version that another project installs.

The intended CI flow is small:

```bash
npm ci
npm run typecheck
npm run build
npm run pack:dry
```

This is enough for the current package: it verifies TypeScript, creates ESM/CJS/declaration output, copies the workbench CSS and checks the npm tarball contents.

<h2></h2>

### License

- [MIT](./LICENSE)

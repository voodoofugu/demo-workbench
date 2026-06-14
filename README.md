![logo](https://raw.githubusercontent.com/voodoofugu/demo-workbench/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [Common patterns](#common-patterns)
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
- `styleReloadUrl?: string | false` - optional dev-only SSE URL used to reload mounted style atoms after watch rebuilds.
- `styleReloadManifestUrl?: string | false` - optional generated manifest URL that auto-enables style reload while the watch script is running.
- `baseCssFiles?: string[]` - host-level CSS atoms loaded by the shell.
- `baseCssLayer?: string` - cascade layer for host CSS.
- `baseCss?: string` - raw host CSS injected once before `baseCssFiles` in the same layer.
- `storageData?: DemoWorkbenchStorageEntry[]` - fields that should persist between reloads.
- `viewport?: { width: number; height: number }` - base preview viewport used for modal scaling.
- `initialState?: DemoWorkbenchInitialState` - state applied before storage restoration.
- `renderDemoContent?: (pageName: string) => ReactNode` - optional host content rendered inside opened demos.
- `bodyBg?: string` - inline background value for the opened demo body.
- `notFoundComponent?: ComponentType` - fallback component for unknown demo pages.

<b>Return:</b><br />
Returns a React element containing the complete reusable workbench shell.

Project-level SVG filters/defs should be rendered by the host app as normal siblings near `DemoWorkbench`, not through a workbench prop.

</div></ul></details>

<h2></h2>

###### **— NODE —**

<details><summary><b><code>workbenchCompile</code></b>: <em>compile styles and generated demo registry</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { workbenchCompile } from "demo-workbench/node";

const result = await workbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/css",
    assetUrlPrefix: "http://localhost:3000/img/",
  },
  demos: { inputDir: "src/components/pages" },
});

console.log(result.styles?.files.length);
console.log(result.demos?.names);
```

<b>Description:</b><em><br />
Runs the requested compile sections and returns the same top-level shape: <code>{ styles, demos }</code>.<br />
Styles are compiled from top-level <code>.css</code>, <code>.scss</code> and <code>.sass</code> files, isolated under <code>[workbench-scope]</code> plus a generated CSS file class by default, minified, and written as <code>.css</code> files. For example, <code>screen.scss</code> selectors are scoped under <code>[workbench-scope].screen</code>, while <code>01-all.scss</code> uses the safe class <code>[workbench-scope].css-01-all</code>. Pass <code>isolateStyles: false</code> when compiling production CSS that should keep its original selectors. Demo names are discovered from file basenames and written to the generated workbench registry when a target is available.
</em><br />

<b>Signature:</b><br />

```ts
function workbenchCompile(
  options: WorkbenchCompileOptions,
): Promise<WorkbenchCompileResult>;
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
};
```

</div></ul></details>

<h2></h2>

<details><summary><b><code>discoverWorkbenchFileNames</code></b>: <em>read sorted file basenames from a folder</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { discoverWorkbenchFileNames } from "demo-workbench/node";

const popupNames = await discoverWorkbenchFileNames({
  inputDir: "src/components/popups",
});
```

<b>Description:</b><em><br />
Scans one directory and returns sorted file basenames. By default it includes <code>.jsx</code>, <code>.tsx</code>, <code>.js</code> and <code>.ts</code> files, while ignoring dotfiles, <code>.d.ts</code>, <code>_\*</code>, <code>a_\*</code> and explicitly excluded basenames.
</em><br />

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
  },
  demos: { inputDir: "src/components/pages" },
  styleReload: true,
  onBuild: (result) => {
    if (result.styles) {
      console.log(result.styles.files.map((file) => file.outputFile));
    }
  },
});
```

<b>Description:</b><em><br />
Starts with one full compile. After that, direct changes to one top-level style file recompile only that file. Changes to Sass partials such as <code>\_mixins.scss</code> trigger a full style compile because dependency ownership is ambiguous. Demo changes regenerate only the registry section.
</em><br />

<b>Return:</b><br />
Returns a watcher handle with `styleReloadUrl` when dev reload is enabled and `close()` for cleanup.

```ts
const watch = await watchWorkbenchCompile(options);
console.log(watch.styleReloadUrl);
await watch.close();
```

</div></ul></details>

<h2></h2>

<details><summary><b><code>getWorkbenchCompileWatchPaths</code></b>: <em>derive default watch paths from compile options</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { getWorkbenchCompileWatchPaths } from "demo-workbench/node";

const watchPaths = getWorkbenchCompileWatchPaths(options, [
  "src/components/popups",
]);
```

<b>Description:</b><em><br />
Returns the style input directory, demo input directory and any extra host paths as a compact string list. Use it when a host script wants to print or extend the same watch surface that <code>watchWorkbenchCompile</code> uses internally.
</em><br />

</div></ul></details>

<h2></h2>

<details><summary><b><code>compileWorkbenchStyles</code></b>: <em>style-first helper</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { compileWorkbenchStyles } from "demo-workbench/node";

const result = await compileWorkbenchStyles({
  inputDir: "titans_rc/styles/scss",
  outputDir: "src/styles/css",
  demoInputDir: "src/components/pages",
});
```

<b>Description:</b><em><br />
Convenience wrapper around <code>workbenchCompile</code> for scripts that primarily compile styles. It returns the style result at the top level and an optional <code>demos</code> registry section.
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
  styleReloadManifestUrl="/workbench-css/demo-workbench-style-reload.json"
  baseCssFiles={["output", "theme"]}
  baseCss={`
    [workbench-scope] {
      min-height: 100%;
    }
  `}
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
  },
  demos: { inputDir: "src/components/pages" },
};

await workbenchCompile(options);
const watch = await watchWorkbenchCompile({
  ...options,
  styleReload: true,
  onBuild: (result) => {
    if (result.styles) console.log("styles", result.styles.files.length);
    if (result.demos) console.log("demos", result.demos.names.length);
  },
});

console.log(watch.styleReloadUrl);
```

Host projects should pass their paths/options only; file watching, debouncing and rebuild calls are owned by `demo-workbench/node`.

</details>

<details><summary><b>Style reload manifest</b>: <em>let the browser discover the active watch server</em></summary><br />

```ts
await watchWorkbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/workbench-css",
  },
  styleReload: true,
});
```

```tsx
<DemoWorkbench
  demos={demos}
  styleLoader={(name) => import(`./workbench-css/${name}.css`)}
  styleReloadManifestUrl="/workbench-css/demo-workbench-style-reload.json"
/>
```

`watchWorkbenchCompile` writes `demo-workbench-style-reload.json` into the style output directory. The browser polls that file and only connects to the reload stream while the watch script is alive.

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

### License

- [MIT](./LICENSE)

![logo](https://raw.githubusercontent.com/voodoofugu/demo-workbench/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [API](#api)
- [License](#license)

<h2></h2>

### About

`demo-workbench` is a small React package for browsing, searching and opening project demos/screens during UI development.

It is designed for component libraries, visual experiments, scroll demos, style systems and project-specific UI sandboxes: places where you want a reusable demo shell without rebuilding the same grid, search, theme toggle, preview state and storage logic every time.

It is not a full documentation system. It does not generate docs, parse MDX, run tests in the browser or replace Storybook. It gives a clean workbench shell plus a small compile step that discovers demo files and prepares the generated registry used by the shell.

The core idea is simple - the package owns the workbench UI and generated registry, while the project owns the demo files and the import function that loads them.

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

<details><summary><b><code>DemoWorkbench</code></b>: <em>render the reusable demo shell</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import DemoWorkbench from "demo-workbench";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demoLoader={(name) => import(`./pages/${name}`)}
      styleLoader={(name) => import(`../css/${name}.css`)}
      styleReloadManifestUrl="/workbench-css/demo-workbench-style-reload.json"
      baseCssFiles={["output", "theme"]}
    />
  );
}
```

<b>Description:</b><em><br />
Renders the full workbench shell: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted workbench values.<br />
The consuming project runs <code>runWorkbenchCompile</code> to generate demo names, then passes <code>demoLoader</code> so the shell can import each generated name on demand.
</em><br />

<b>Signature:</b><br />

```ts
function DemoWorkbench(props: DemoWorkbenchProps): JSX.Element;
```

<b>Props:</b><br />

- `title?: string` - shell title shown in the workbench header and document title.
- `demoLoader: (name: string) => Promise<DemoModule>` - async loader for generated demo names.
- `styleLoader?: (name: string) => Promise<unknown>` - dynamic style loader used by `styled-atom`.
- `styleReloadUrl?: string | false` - optional dev-only SSE URL used to reload mounted style atoms after watch rebuilds.
- `styleReloadManifestUrl?: string | false` - optional generated manifest URL that auto-enables style reload while the watch script is running.
- `baseCssFiles?: string[]` - host-level CSS atoms loaded by the shell.
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

<details><summary><b><code>runWorkbenchCompile</code></b>: <em>run a tiny host compile script</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { runWorkbenchCompile } from "demo-workbench/node";

runWorkbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/workbench-css",
    assetUrlPrefix: "http://localhost:3000/img/",
    clean: true,
  },
  demos: { inputDir: "src/components/pages" },
});
```

Run it as a command:

```bash
ts-node src/scripts/workbenchCompile.ts
```

Run the same file with `--watch` to start watch mode:

```bash
ts-node src/scripts/workbenchCompile.ts --watch
```

Pass `logs: false` when the host script should stay quiet, including Sass warnings:

```ts
runWorkbenchCompile({
  styles: {
    inputDir: "titans_rc/styles/scss",
    outputDir: "src/styles/workbench-css",
  },
  demos: { inputDir: "src/components/pages" },
  logs: false,
});
```

<b>Description:</b><em><br />
Reads <code>process.argv</code>, runs one compile by default, and switches to watch mode for <code>--watch</code> or <code>watch</code>. Watch mode enables style reload by default, handles <code>SIGINT</code>/<code>SIGTERM</code> cleanup, and logs command-style output. Full builds log compact counts; single style rebuilds log the changed CSS file name.
</em><br />

<b>Signature:</b><br />

```ts
function runWorkbenchCompile(
  options: WorkbenchCompileCommandOptions,
): Promise<WorkbenchCompileResult | WorkbenchCompileWatchResult | undefined>;
```

</div></ul></details>

<h2></h2>

</div></ul>

### License

- [MIT](./LICENSE)

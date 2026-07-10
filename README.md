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

It is not a full documentation system. It does not generate docs, parse MDX, run tests in the browser or replace Storybook. It gives a clean workbench shell plus a small compile step that discovers demo files and prepares the generated manifest used by the shell.

The core idea is simple - the package owns the workbench UI and generated manifest format, while the project owns the demo files and generated manifest file.

<h2></h2>

### Installation

```bash
npm install demo-workbench
```

```tsx
import DemoWorkbench from "demo-workbench";
```

Workbench shell styles are injected by the package automatically when `DemoWorkbench` is imported.

> **✦ Note:**
>
> - Supports both **ESM** (`import`) and **CommonJS** (`require`) builds.
> - Written with React and ships TypeScript declaration files.
> - The package injects reusable shell styles automatically from its main JS bundle.
> - Project/demo CSS is still loaded by the consuming project through `styleLoader`.
> - React and React DOM are peer dependencies, so the host app keeps one React instance.
> - Ships a flat light/dark UI with `grey`, `blue` and `brown` color presets. Users
>   switch the mode from the header toggle and the color from the title dropdown; both
>   choices persist in `localStorage`. No configuration is required.

> **✦ Package manager support:**
>
> Generate a host-owned demo manifest with `demos.outputFile` and pass it to `<DemoWorkbench demos={demos} />`. This does not mutate `node_modules` and works with normal package-manager installs.

<h2></h2>

### API

<ul><div>

###### **— REACT —**

<details><summary><b><code>DemoWorkbench</code></b>: <em>render the reusable demo shell</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import DemoWorkbench from "demo-workbench";
import demos from "./myDemos.js";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={demos}
      styleLoader={(name) => import(`../css/${name}.css`)}
      baseStyles={["output", "theme"]}
    />
  );
}
```

<b>Description:</b><em><br />
Renders the full workbench shell: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted workbench values.<br />
The consuming project runs <code>runWorkbenchCompile</code> to generate a small demo manifest, then passes it through <code>demos</code> so the shell can import each demo on demand. In local development, serve the compiled style output directory as <code>/workbench-css/</code>; the workbench uses that path to load generated CSS and enable style reload while watch mode is running.
</em><br />

<b>Signature:</b><br />

```ts
function DemoWorkbench(props: DemoWorkbenchProps): JSX.Element;
```

<b>Props:</b><br />

- `title?: string` - shell title shown in the workbench header and document title.
- `demos: DemoItem[]` - generated host-owned demo manifest.
- `styleLoader?: (name: string) => Promise<unknown>` - dynamic style loader used by `styled-atom`.
- `baseStyles?: string[]` - host-level CSS atoms loaded by the shell.
- `baseCssFiles?: string[]` - deprecated alias for `baseStyles`.
- `autoScale?: false | { width?: number | null; height?: number | null }` - optional opened-demo auto scale reference. Omit it to keep workbench auto scaling disabled.
- `renderDemoContent?: (pageName: string) => ReactNode` - project layer rendered inside opened demos.
- `bodyBg?: string` - background value for the opened demo body.

The workbench renders its own built-in placeholder when no demos are registered yet and when a search matches nothing — the host app no longer supplies a fallback component.

<br />

Use `autoScale` only when demos are designed for a known canvas or game/screen size. It does not force the browser window or preview card viewport to that size; it tells the workbench what opened-demo workspace size should be treated as `1x` before calculating scale. Omit `autoScale` to test the demo's own responsive behavior without workbench scaling. Pass `height: null` to scale only by width, or `width: null` to scale only by height.

<br />

<b>Return:</b><br />
Returns a React element containing the complete reusable workbench shell.

Project-level SVG filters/defs should be rendered by the host app as normal siblings near `DemoWorkbench`, not through a workbench prop.

</div></ul></details>

<h2></h2>

###### **— NODE —**

<details><summary><b><code>runWorkbenchCompile</code></b>: <em>run a tiny host compile script</em></summary><br /><ul><div>

<b>Usage:</b><br />

```ts
import { runWorkbenchCompile } from "demo-workbench/node";

runWorkbenchCompile({
  styles: {
    inputDir: "src/styles/scss",
    outputDir: "src/styles/workbench-css",
    assetUrlPrefix: "http://localhost:3000/img/",
  },
  demos: {
    inputDir: "src/components/pages",
    outputFile: "src/components/templateComponents/myDemos",
  },
});
```

`demos.outputFile` is the project-owned manifest path without an extension. The last path segment is treated as the file name and the compiler writes a `.js` module next to it. For example `src/components/templateComponents/myDemos` becomes `src/components/templateComponents/myDemos.js`:

```tsx
import demos from "./myDemos.js";
```

Full style compiles clean `styles.outputDir` by default so removed source styles do not leave stale CSS behind. Pass `clean: false` only when that output directory intentionally contains files managed outside `demo-workbench`.

Run it as a command:

###### **— one launch —**

```bash
ts-node src/scripts/workbenchCompile.ts
```

###### **— watch mode —**

```bash
ts-node src/scripts/workbenchCompile.ts --watch
```

The host builder/dev-server must expose `styles.outputDir` at `/workbench-css/`:

```ts
// webpack-dev-server example
static: [
  {
    directory: path.join("src", "styles", "workbench-css"),
    publicPath: "/workbench-css/",
    watch: false,
  },
];
```

The command always prints compact CLI progress. Sass/CSS compiler warnings and debug output are visible by default; pass `styleLogs: false` only when you want to hide that compiler output:

```ts
runWorkbenchCompile({
  styles: {...},
  demos: {...},
  styleLogs: false,
});
```

<b>Description:</b><em><br />
This is the main Node entry point for host projects. It reads <code>process.argv</code>, runs one compile by default, and switches to watch mode for <code>--watch</code> or <code>watch</code>. It generates the demo manifest, compiles project CSS, starts watch mode, enables style reload, handles <code>SIGINT</code>/<code>SIGTERM</code> cleanup, and prints compact CLI-style logs.
</em><br />

```text
📋 demo-workbench
— preparing...
✓ styles compiled (12)
✓ demos discovered (54)
✓ style reload enabled
```

<b>Signature:</b><br />

```ts
function runWorkbenchCompile(
  options: WorkbenchCompileCommandOptions,
): Promise<WorkbenchCompileResult | WorkbenchCompileWatchResult | undefined>;
```

</div></ul></details>

<h2></h2>

###### **— PATTERNS —**

<details><summary><b>Opened-demo auto scale</b></summary><br /><ul><div>

```tsx
// Default behavior: no workbench auto scale.
<DemoWorkbench demos={demos} />

// Fixed game/screen workspace.
<DemoWorkbench demos={demos} autoScale={{ width: 1200, height: 640 }} />

// Scale by width only; the demo owns its height responsiveness.
<DemoWorkbench demos={demos} autoScale={{ width: 1200, height: null }} />

// Explicit no-op, useful when autoScale is toggled from config.
<DemoWorkbench demos={demos} autoScale={false} />
```

</div></ul></details>

<details><summary><b>Style compiler logs</b></summary><br /><ul><div>

```ts
// Default: compact CLI progress plus Sass/CSS compiler output.
runWorkbenchCompile({ styles, demos });

// Keep CLI progress, hide Sass/CSS compiler warnings.
runWorkbenchCompile({ styles, demos, styleLogs: false });
```

</div></ul></details>

<h2></h2>

</div></ul>

### License

- [MIT](./LICENSE)

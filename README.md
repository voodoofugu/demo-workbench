![logo](https://raw.githubusercontent.com/voodoofugu/demo-workbench/refs/heads/main/src/assets/banner-logo.png)

<h2></h2>

### Table of contents

- [About](#about)
- [Installation](#installation)
- [Quick start](#quick-start)
- [API](#api)
- [License](#license)

<h2></h2>

### About

`demo-workbench` is a small React shell for browsing and opening project demos/screens.

Use it for component libraries, visual experiments, scroll demos, style systems and project UI sandboxes.
It is not a docs system or Storybook replacement. It gives you a reusable grid/search/theme/opened-demo shell plus a small compile step.
The package owns the shell. Your project owns the demos, styles and generated manifest file.

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
> - Project CSS is loaded through `styleLoader`; demos only declare CSS names via `export const cssFiles`.
> - React and React DOM are peer dependencies, so the host app keeps one React instance.
> - Ships a flat light/dark UI with `grey`, `blue` and `brown` color presets. Users
>   switch the mode from the header toggle and the color from the title dropdown; both
>   choices persist in `localStorage`. No configuration is required.

<h2></h2>

### Quick start

**1. Compile** — generate the demo manifest and compile your CSS into scoped, workbench-ready files:

```js
// scripts/workbenchCompile.js
import { runWorkbenchCompile } from "demo-workbench/node";

runWorkbenchCompile({
  styles: { inputDir: "src/styles/scss", outputDir: "src/styles/workbench-css" },
  demos: { inputDir: "src/screens", outputFile: "src/screens/demos" },
});
```

Run `node scripts/workbenchCompile.js` (add `--watch` for hot style reload) and serve `styles.outputDir` at `/workbench-css/`.

**2. Render** the shell with the generated manifest:

```tsx
import DemoWorkbench from "demo-workbench";
import demos from "./screens/demos.js";

export default function App() {
  return (
    <DemoWorkbench
      demos={demos}
      styleLoader="/workbench-css/"
      baseStyles={["reset", "ui-elements"]}
    />
  );
}
```

Each demo is a normal React component that declares its scoped CSS with `export const cssFiles = [...]`. See the [API](#api) for every prop, both `styleLoader` forms, demo component props and all compile options.

<h2></h2>

### API

<ul><div>

###### **— REACT —**

<details><summary><b><code>DemoWorkbench</code></b>: <em>render the reusable demo shell</em></summary><br /><ul><div>

<b>Usage:</b><br />

```tsx
import DemoWorkbench from "demo-workbench";
import projectDemos from "./workbench/projectDemos.js";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={projectDemos}
      styleLoader="/workbench-css/"
      baseStyles={["output", "theme"]}
    />
  );
}
```

<b>Description:</b><em><br />
Renders the header, search, theme controls, demo grid, opened-demo modal and persisted workbench state.<br />
Pass the generated manifest and an optional <code>styleLoader</code>.
</em><br />

<b>Props:</b><br />

- `title?: string` - shell title shown in the workbench header and document title.
- `demos: DemoItem[]` - generated host-owned demo manifest.
- `styleLoader?: string | ((name: string) => unknown | Promise<unknown>)` - URL prefix for static CSS files, or a custom CSS text loader.
- `baseStyles?: string[]` - host-level CSS atoms loaded by the shell.
- `autoScale?: false | { width?: number | null; height?: number | null }` - optional opened-demo auto scale reference.
- `renderDemoContent?: (pageName: string) => ReactNode` - project layer rendered inside opened demos.
- `bodyBg?: string` - background value for the opened demo body.

The workbench renders its own empty/search placeholders.

<br />

Use `styleLoader="/workbench-css/"` when `styles.outputDir` is served as static files. Use a function only for custom loading or CSS-as-text bundler imports.

<br />

Use `autoScale` only for demos designed around a known canvas or screen size. Omit it to test native responsive behavior.

<br />

<b>Return:</b><br />
Returns a React element containing the complete reusable workbench shell.

<br />

<details><summary><b><code>styleLoader</code></b> forms</summary><br /><ul><div>

**URL prefix (recommended).** Serve `styles.outputDir` as static files and pass its public URL prefix; `"/workbench-css/"` loads `reset` from `/workbench-css/reset.css`. It is a public URL prefix, not a filesystem path:

```tsx
<DemoWorkbench demos={demos} styleLoader="/workbench-css/" />
```

**Custom function (advanced).** For a CDN, auth, or a bundler that imports CSS as text:

```tsx
<DemoWorkbench
  demos={demos}
  styleLoader={(name) => import(`./workbench-css/${name}.css?raw`)}
/>
```

</div></ul></details>

<details id="demo-css"><summary><b>Demo CSS</b></summary><br /><ul><div>

A demo declares its scoped CSS by exporting `cssFiles` next to the component. Values are compiled file names from `styles.outputDir`, without `.css`:

```tsx
// src/screens/ProfileCardDemo.tsx
export const cssFiles = ["profile-card", "shared-layout"];

export default function ProfileCardDemo() {
  return /* ... */;
}
```

Use `baseStyles` for shell-wide CSS such as reset, tokens or keyframes. Omit `cssFiles` when a demo needs no scoped CSS.

</div></ul></details>

<details id="demo-component"><summary><b>Demo component props</b> (<code>DemoComponentProps</code>)</summary><br /><ul><div>

A demo's default export is a normal React component. The workbench renders it in grid and opened modes, and passes:

- `pageName?: string` — the demo's stable name (its `DemoItem.name`).
- `isActive?: boolean` — `true` only while opened. Gate expensive work on it.
- `children?: ReactNode` — the host overlay from `renderDemoContent`, provided only when opened. Render it wherever the demo wants the project layer.

```tsx
export default function ProfileCardDemo({ isActive, children }) {
  return (
    <div className="screen">
      {isActive ? <HeavyAnimation /> : <StaticPreview />}
      {children}
    </div>
  );
}
```

</div></ul></details>

</div></ul></details>

<h2></h2>

###### **— NODE —**

<details><summary><b><code>runWorkbenchCompile</code></b>: <em>run a tiny host compile script</em></summary><br /><ul><div>

<b>Usage:</b><br />

```js
import { runWorkbenchCompile } from "demo-workbench/node";

runWorkbenchCompile({
  styles: {
    inputDir: "src/styles/scss",
    outputDir: "src/styles/workbench-css",
    assetUrlPrefix: "http://localhost:3000/img/",
  },
  demos: {
    inputDir: "src/demos",
    outputFile: "src/workbench/projectDemos",
  },
});
```

Both sections are optional and can be used independently.

<b>`styles` options</b> — compile `.css`/`.scss`/`.sass` into workbench CSS:

- `inputDir` - source dir of top-level style files (`_name` files are Sass partials).
- `outputDir` - where minified `.css` is written; serve it at `/workbench-css/`.
- `compileForWorkbench?: boolean` (default `true`) - scope selectors, add a DevTools `sourceURL` and write the reload manifest. `false` = plain production CSS: none of those.
- `assetUrlPrefix?: string` - prefix prepended to relative `url(...)` assets.
- `clean?: boolean` (default `true`) - wipe `outputDir` before a full compile. `false` if it holds files managed elsewhere.
- `logs?: boolean` (default `true`) - Sass/CSS compiler warnings/output. CLI progress is always printed.

<b>`demos` options</b> — discover demos and write the manifest:

- `inputDir` - dir of demo modules; file basenames become demo names.
- `outputFile` - manifest path without extension (writes a `.js` file, exporting a variable named after the final path segment). Entries are `{ name, load }` only; demo CSS lives in `export const cssFiles`.
- `extensions?: string[]` (default `[".jsx", ".tsx", ".js", ".ts"]`) - scanned file extensions.
- `exclude?: string[]` - demo basenames to skip.
- `importPathPrefix?: string` - import prefix used inside the manifest (defaults to the relative path from `outputFile` to `inputDir`).

Import the generated manifest:

```tsx
import projectDemos from "./workbench/projectDemos.js";
```

Run it as a command:

###### **— one launch —**

```bash
node src/scripts/workbenchCompile.js
```

###### **— watch mode —**

```bash
node src/scripts/workbenchCompile.js --watch
```

The host builder/dev-server must expose `styles.outputDir` at `/workbench-css/`:

```js
// webpack-dev-server example
static: [
  {
    directory: path.join("src", "styles", "workbench-css"),
    publicPath: "/workbench-css/",
    watch: false,
  },
];
```

<b>Description:</b><em><br />
Main Node entry for host scripts. It runs one compile by default and switches to watch mode for <code>--watch</code> or <code>watch</code>.
</em><br />

```text
📋 demo-workbench
— preparing...
✓ styles compiled (12)
✓ demos discovered (54)
✓ style reload enabled
```

</div></ul></details>

<h2></h2>

</div></ul>

### License

- [MIT](./LICENSE)

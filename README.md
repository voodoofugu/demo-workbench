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
> - Project CSS is loaded by the consuming project through `styleLoader`; demos only declare the compiled CSS names they need via `export const cssFiles`.
> - React and React DOM are peer dependencies, so the host app keeps one React instance.
> - Ships a flat light/dark UI with `grey`, `blue` and `brown` color presets. Users
>   switch the mode from the header toggle and the color from the title dropdown; both
>   choices persist in `localStorage`. No configuration is required.

> **✦ Package manager support:**
>
> Generate a host-owned demo manifest with `demos.outputFile` and pass it to `<DemoWorkbench demos={demos} />`. This does not mutate `node_modules` and works with normal package-manager installs.

<h2></h2>

### Quick start

**1. Write a compile script.** It generates the demo manifest and compiles your project CSS into scoped, workbench-ready files:

```ts
// scripts/workbenchCompile.ts
import { runWorkbenchCompile } from "demo-workbench/node";

runWorkbenchCompile({
  styles: { inputDir: "src/styles/scss", outputDir: "src/styles/workbench-css" },
  demos: { inputDir: "src/screens", outputFile: "src/screens/demos" },
});
```

Run it once with `ts-node scripts/workbenchCompile.ts`, or add `--watch` during development. Serve `styles.outputDir` at `/workbench-css/` so the shell can load the compiled CSS (and hot-reload it in watch mode).

**2. Render the shell** with the generated manifest and a `styleLoader`:

```tsx
import DemoWorkbench from "demo-workbench";
import demos from "./screens/demos.js";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={demos}
      styleLoader={(name) => import(`./styles/workbench-css/${name}.css`)}
      baseStyles={["reset", "ui-elements", "keyframes-animations"]}
    />
  );
}
```

That's it: the package owns the shell (grid, search, theme, opened-demo modal, persisted state), while your project owns the screens and their styles.

<details id="demo-css"><summary><b>✦ Demo CSS</b></summary><br /><ul><div>

A preview loads only the scoped CSS you point it at. A demo declares that itself by exporting `cssFiles` — compiled file names (without extension) from `styles.outputDir` — right next to the component:

```tsx
// src/screens/GuardianChestsWindow.tsx
export const cssFiles = ["guardian-chests-window", "screen-superhero"];

export default function GuardianChestsWindow() {
  return /* ... */;
}
```

The list lives with the demo, so there is one obvious place for a screen's styles. Shell-wide styles that apply to every preview (reset, tokens, keyframes) go through the `baseStyles` prop instead. Omit `cssFiles` if a demo needs no scoped CSS.

</div></ul></details>

<details id="demo-component"><summary><b>✦ Demo component props</b></summary><br /><ul><div>

A demo's default export is a normal React component. The workbench renders it both as a small grid preview and as the opened full-screen view, and passes these optional props (typed as `DemoComponentProps`):

- `pageName?: string` — the demo's stable name (its `DemoItem.name`).
- `isActive?: boolean` — `true` only while the demo is opened full-screen, `false` in the grid preview. Gate expensive work (timers, canvases, data fetching) on it so it runs for the opened demo, not for every card in the pool.
- `children?: ReactNode` — the host overlay from `renderDemoContent`, provided only when opened. Render it wherever the demo wants the project layer.

```tsx
export default function GuardianChestsWindow({ isActive, children }) {
  return (
    <div className="screen">
      {isActive ? <HeavyAnimation /> : <StaticPreview />}
      {children}
    </div>
  );
}
```

</div></ul></details>

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
- `autoScale?: false | { width?: number | null; height?: number | null }` - optional opened-demo auto scale reference. Omit it to keep workbench auto scaling disabled.
- `renderDemoContent?: (pageName: string) => ReactNode` - project layer rendered inside opened demos.
- `bodyBg?: string` - background value for the opened demo body.

The workbench renders its own built-in placeholder when no demos are registered yet and when a search matches nothing — the host app no longer supplies a fallback component.

<br />

Use `autoScale` only when demos are designed for a known canvas or game/screen size. It does not force the browser window or preview card viewport to that size; it tells the workbench what opened-demo workspace size should be treated as `1x` before calculating scale. Omit `autoScale` to test the demo's own responsive behavior without workbench scaling. Pass `height: null` to scale only by width, or `width: null` to scale only by height.

<br />

<b>Return:</b><br />
Returns a React element containing the complete reusable workbench shell.

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

The generated manifest holds `{ name, load }` entries only; each demo declares its own scoped CSS via `export const cssFiles` (see [Demo CSS](#demo-css)).

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

</div></ul>

### License

- [MIT](./LICENSE)

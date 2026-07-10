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

> **✦ Package manager support:**
>
> Generate a host-owned demo manifest with `demos.outputFile`.
> Pass it to `<DemoWorkbench demos={demos} />`; the package never mutates `node_modules`.

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

Run it once with `ts-node scripts/workbenchCompile.ts`, or add `--watch` in development. Serve `styles.outputDir` at `/workbench-css/`.

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

That's it: the package owns the shell; your project owns the screens and styles.

<details id="demo-css"><summary><b>✦ Demo CSS</b></summary><br /><ul><div>

A demo declares its scoped CSS by exporting `cssFiles` next to the component. Values are compiled file names from `styles.outputDir`, without `.css`:

```tsx
// src/screens/GuardianChestsWindow.tsx
export const cssFiles = ["guardian-chests-window", "screen-superhero"];

export default function GuardianChestsWindow() {
  return /* ... */;
}
```

Use `baseStyles` for shell-wide CSS such as reset, tokens or keyframes. Omit `cssFiles` when a demo needs no scoped CSS.

</div></ul></details>

<details id="demo-component"><summary><b>✦ Demo component props</b></summary><br /><ul><div>

A demo's default export is a normal React component. The workbench renders it in grid and opened modes, and passes `DemoComponentProps`:

- `pageName?: string` — the demo's stable name (its `DemoItem.name`).
- `isActive?: boolean` — `true` only while opened. Gate expensive work on it.
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
Renders the header, search, theme controls, demo grid, opened-demo modal and persisted workbench state.<br />
Pass the generated <code>demos</code> manifest and an optional <code>styleLoader</code>.
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
- `autoScale?: false | { width?: number | null; height?: number | null }` - optional opened-demo auto scale reference.
- `renderDemoContent?: (pageName: string) => ReactNode` - project layer rendered inside opened demos.
- `bodyBg?: string` - background value for the opened demo body.

The workbench renders its own empty/search placeholders.

<br />

Use `autoScale` only for demos designed around a known canvas or screen size. Omit it to test native responsive behavior.

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

`demos.outputFile` is a project-owned manifest path without extension. The compiler writes a `.js` file:

```tsx
import demos from "./myDemos.js";
```

The manifest holds `{ name, load }` entries only. Demo CSS lives in `export const cssFiles`.

Full style compiles clean `styles.outputDir` by default. Pass `clean: false` only when the directory contains files managed elsewhere.

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

CLI progress is always printed. Pass `styleLogs: false` to hide Sass/CSS compiler output:

```ts
runWorkbenchCompile({
  styles: {...},
  demos: {...},
  styleLogs: false,
});
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

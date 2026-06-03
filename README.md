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

```jsx
import DemoWorkbench from "demo-workbench";
import "demo-workbench/styles.css";
```

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
> - The package owns the reusable shell styles through `demo-workbench/styles.css`.
> - Project/demo CSS is still loaded by the consuming project through `cssLoader`.
> - React and React DOM are peer dependencies, so the host app keeps one React instance.

<h2></h2>

### API

<ul><div>

###### **— COMPONENT —**

<details><summary><b><code>DemoWorkbench</code></b>: <em>render the reusable demo shell</em></summary><br /><ul><div>

<b>Usage:</b><br />

```jsx
import DemoWorkbench from "demo-workbench";
import "demo-workbench/styles.css";

import demos from "./demoManifest";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={demos}
      cssLoader={(name) => import(`../css/${name}.css`)}
    />
  );
}
```

<b>Description:</b><em><br />
Renders the full workbench shell: header, search, theme toggle, scrollable demo grid, loading state, demo preview/open state and persisted workbench values.<br />
The consuming project passes demo entries and optional render hooks, while the package keeps the reusable layout and shell styling in one place.
</em><br />

<b>Signature:</b><br />

```ts
function DemoWorkbench(props: DemoWorkbenchProps): JSX.Element;
```

<b>Props:</b><br />

- `title?: string` - workbench title and default document title.
- `demos?: DemoItem[]` - searchable demo manifest.
- `cssLoader?: (name: string) => Promise<unknown>` - async project CSS loader used by `styled-atom`.
- `baseCssFiles?: string[]` - project base CSS atoms, defaults to `["output"]`.
- `shellCssFiles?: string[]` - optional extra shell CSS atoms from the host project.
- `storageData?: DemoWorkbenchStorageEntry[]` - persisted state keys and storage type.
- `viewport?: { width: number; height: number }` - base preview viewport used for scale calculations.
- `initialState?: DemoWorkbenchInitialState` - initial workbench state applied before storage restore.
- `renderDemoContent?: (pageName: string) => ReactNode` - optional content rendered inside opened demos.
- `notFoundComponent?: ComponentType` - fallback component for unknown demo pages.

<b>Returns:</b><br />
A React element containing the complete reusable workbench shell.

Project-level SVG filters/defs should be rendered by the host app as normal siblings near `DemoWorkbench`, not through a workbench prop.

</div></ul></details>

<h2></h2>

###### **— DATA —**

<details><summary><b><code>DemoItem</code></b>: <em>describe one demo entry</em></summary><br /><ul><div>

<b>Usage:</b><br />

```js
export default [
  {
    name: "Button",
    load: () => import("./demos/ButtonDemo"),
  },
  {
    name: "Card",
    load: () => import("./demos/CardDemo"),
    css: ["card-demo"],
  },
];
```

<b>Description:</b><em><br />
A demo entry is intentionally small: a display name, an async module loader and optional CSS atom names.<br />
Each loaded module should export a React component as <code>default</code>. The component receives <code>pageName</code> and may render children supplied by the workbench.
</em><br />

<b>Shape:</b><br />

```ts
type DemoItem = {
  name: string;
  load: () => Promise<DemoModule>;
  css?: string[];
  cssFiles?: string[];
};
```

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

```jsx
<DemoWorkbench
  demos={demos}
  cssLoader={(name) => import(`../styles/${name}.css`)}
  baseCssFiles={["output", "theme"]}
/>
```

</details>

<details><summary><b>Custom opened-demo content</b>: <em>inject project-specific overlays or helper layers</em></summary><br />

```jsx
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

# demo-workbench

React demo workbench for browsing and opening project demos/screens during component and UI development.

It provides the reusable demo shell: layout, search, theme toggle, demo grid, preview/open state, persisted workbench state, and package-owned styles. A consuming project only supplies its demo manifest, project CSS loader, and optional render hooks.

## Install

```bash
npm install demo-workbench
```

For local development from a sibling project:

```json
{
  "dependencies": {
    "demo-workbench": "file:../demo-workbench"
  }
}
```

## Usage

```jsx
import DemoWorkbench from "demo-workbench";
import "demo-workbench/styles.css";

import demoManifest from "./demoManifest";

export default function App() {
  return (
    <DemoWorkbench
      title="My Project Demos"
      demos={demoManifest}
      cssLoader={(name) => import(`../css/${name}.css`)}
    />
  );
}
```

## Demo manifest

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

Each demo module should export a React component as `default`.

## API

`DemoWorkbench` props:

- `title?: string` — workbench title.
- `demos?: DemoItem[]` — list of demos to display.
- `cssLoader?: (name: string) => Promise<unknown>` — project CSS loader used by `styled-atom`.
- `baseCssFiles?: string[]` — project base CSS atoms, defaults to `["output"]`.
- `shellCssFiles?: string[]` — optional extra shell CSS atoms.
- `storageData?: Array<[string, "local" | "session" | undefined]>` — persisted state keys.
- `viewport?: { width: number; height: number }` — default preview viewport.
- `initialState?: DemoWorkbenchInitialState` — initial workbench state.
- `renderDemoContent?: (pageName: string) => React.ReactNode` — custom content renderer.
- `renderSvgDefs?: () => React.ReactNode` — optional SVG defs/filters.
- `notFoundComponent?: React.ComponentType` — fallback for unknown demo pages.

## Scripts

```bash
npm run typecheck
npm run build
npm run pack:dry
```

## License

MIT

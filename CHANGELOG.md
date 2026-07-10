# Changelog

All notable changes to `demo-workbench` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it leaves
beta.

## [Unreleased]

This entry collects the shape of the first beta while the API is still settling.

### Added

- **Themes.** Flat, low-shadow UI inspired by the Claude app, with `grey`, `blue`
  and `brown` color presets. Light/dark from the header toggle, color from the
  title dropdown; both persist. Palettes are derived from a hue + two saturations
  per theme (HSL), so a new theme is three numbers.
- **`isActive` demo prop.** A demo component receives `isActive` (`true` only when
  opened full-screen) so heavy logic can be gated to the opened demo instead of
  running for every card in the grid pool. Props are typed as the exported
  `DemoComponentProps` (`pageName`, `isActive`, `children`).
- **Built-in placeholders** for the empty-registry and no-search-results states.

### Changed

- **Demo source is host-owned.** `runWorkbenchCompile`'s `demos` section writes a
  host-owned manifest file (`demos.outputFile`) that you import and pass as
  `<DemoWorkbench demos={demos} />`. Replaces the previous `demoLoader` prop and
  the internal generated registry.
- **No more `node_modules` mutation.** The old approach patched a generated
  registry inside the installed package; the compiler now writes only into the
  host project, so it is pnpm-safe and needs no reset step.
- **Storage** is handled by `nexus-state` v4 `persist` under one namespaced
  `localStorage` key, replacing the bespoke storage layer and avoiding collisions
  with the host app's own keys.
- **Demo CSS** is declared by `export const cssFiles` in the demo module (one
  co-located place); shell-wide styles go through the `baseStyles` prop.

### Removed

- `demoLoader` prop (use `demos`).
- `baseCssFiles` prop (use `baseStyles`).
- `notFoundComponent` prop (built-in placeholders cover it).
- `DemoItem.cssFiles` (declare CSS via the demo module's `export const cssFiles`).

### Dev / internal

- Behavioral React tests via Vitest + `@testing-library/react` + happy-dom,
  alongside the Node `--test` compiler/package suites.
- Style-reload orchestration extracted into `useWorkbenchStyleReload`.
- Shared `WORKBENCH_TRANSITION_MS` couples the opened-demo collapse animation with
  the JS cleanup timing.

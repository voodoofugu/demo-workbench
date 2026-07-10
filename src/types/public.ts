import type { ComponentType, ReactNode } from "react";

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoModule***:
 * module shape returned by a demo loader.
 * @description
 * A demo module must expose a default React component. Optional `cssFiles` are loaded through `styled-atom` before the preview is rendered.
 * @example
 * ```ts
 * const module: DemoModule = await import("./demos/ButtonDemo");
 * ```
 */
export type DemoModule = {
  /** Demo component rendered inside the workbench cell and opened-demo modal. */
  default: ComponentType<{ pageName?: string; children?: ReactNode }>;
  /** Styled-atom CSS file names used by the demo. */
  cssFiles?: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoItem***:
 * one searchable item in the workbench grid.
 * @description
 * `name` is used for labels, search, hash state, storage keys and the `pageName` prop passed to the loaded component. Keep it stable between sessions.
 * @example
 * ```ts
 * const demos: DemoItem[] = [
 *   {
 *     name: "Button",
 *     load: () => import("./demos/ButtonDemo"),
 *     cssFiles: ["button-demo"],
 *   },
 * ];
 * ```
 */
export type DemoItem = {
  /** Stable visible name of the demo. */
  name: string;
  /** Optional visible title used in tabs and labels. */
  title?: string;
  /** Lazy loader for the demo module. Usually `() => import("./MyDemo")`. */
  load: () => Promise<DemoModule>;
  /** Styled-atom CSS file names loaded for this demo preview. */
  cssFiles?: string[];
};

export type DemoWorkbenchAutoScaleDimension = number | null;

export type DemoWorkbenchAutoScaleOptions = {
  /** Reference workspace width in CSS pixels. Pass `null` to disable width-based scaling. */
  width?: DemoWorkbenchAutoScaleDimension;
  /** Reference workspace height in CSS pixels. Pass `null` to disable height-based scaling. */
  height?: DemoWorkbenchAutoScaleDimension;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchAutoScale***:
 * reference workspace size used by opened-demo auto scaling.
 * @description
 * The opened demo is scaled down only for enabled axes when the available workbench area becomes smaller than this reference size. Omit the prop to keep auto scaling disabled, or pass `null` for one axis to let the demo handle that axis by itself.
 * @example
 * ```ts
 * const autoScale: DemoWorkbenchAutoScale = { width: 1200, height: null };
 * ```
 */
export type DemoWorkbenchAutoScale = DemoWorkbenchAutoScaleOptions | false;

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchProps***:
 * props for the reusable React workbench shell.
 * @description
 * Minimal setup is a title, generated `demos` and optional style loading. The host project keeps ownership of demo components, CSS imports, project overlays and optional opened-demo content.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   title="Project demos"
 *   demos={demos}
 *   styleLoader={(name) => import(`./workbench-css/${name}.css`)}
 *   baseStyles={["output", "theme"]}
 * />
 * ```
 */
export type DemoWorkbenchProps = {
  /** Shell title shown in the workbench header and document title. */
  title?: string;
  /** Generated demo manifest owned by the host project. */
  demos: DemoItem[];
  /** Dynamic style loader used by `styled-atom`, e.g. `(name) => import(...)`. */
  styleLoader?: (name: string) => Promise<unknown>;
  /** Host-level styled-atom CSS files loaded by the workbench shell. */
  baseStyles?: string[];
  /** @deprecated Use `baseStyles` instead. */
  baseCssFiles?: string[];
  /** Reference opened-demo workspace size used to scale down previews when the browser area is smaller. Omit to disable auto scaling. */
  autoScale?: DemoWorkbenchAutoScale;
  /** Optional host content rendered as children of an opened demo component. */
  renderDemoContent?: (pageName: string) => ReactNode;
  /** Optional inline background value for the opened demo body. Defaults to `#fff`. */
  bodyBg?: string;
};

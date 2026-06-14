import type { ComponentType, ReactNode } from "react";

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoModule***:
 * module shape returned by a demo loader.
 * @description
 * A demo module must expose a default React component. Optional `cssFiles` are loaded through `styled-atom` before the preview is rendered. `css` is kept as a legacy alias for older manifests.
 * @example
 * ```ts
 * const module: DemoModule = await import("./demos/ButtonDemo");
 * ```
 */
export type DemoModule = {
  /** Demo component rendered inside the workbench cell and opened-demo modal. */
  default: ComponentType<{ pageName?: string; children?: ReactNode }>;
  /**
   * Legacy styled-atom CSS file names used by the demo.
   * @deprecated Use `cssFiles`.
   */
  css?: string[];
  /** Preferred styled-atom CSS file names used by the demo. */
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
  /**
   * Legacy styled-atom CSS file names loaded for this demo preview.
   * @deprecated Use `cssFiles`.
   */
  css?: string[];
  /** Preferred styled-atom CSS file names loaded for this demo preview. */
  cssFiles?: string[];
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchDemoLoader***:
 * lazy loader used for names from the generated workbench registry.
 * @param name generated demo basename.
 * @description
 * Use this when the app lets `demo-workbench` discover names through its generated registry instead of passing a complete `demos` array.
 * @example
 * ```ts
 * const demoLoader: DemoWorkbenchDemoLoader = (name) =>
 *   import(`./pages/${name}`);
 * ```
 */
export type DemoWorkbenchDemoLoader = (name: string) => Promise<DemoModule>;

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchViewport***:
 * base viewport used to scale an opened demo.
 * @description
 * The workbench compares this design-time size with the available modal space and derives a scale for opened demo content.
 * @example
 * ```tsx
 * <DemoWorkbench viewport={{ width: 1200, height: 640 }} />
 * ```
 */
export type DemoWorkbenchViewport = {
  /** Design-time width of the demo surface. */
  width: number;
  /** Design-time height of the demo surface. */
  height: number;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchInitialState***:
 * initial workbench state applied before storage restoration.
 * @description
 * Pass this when the host app wants to seed or override shell state before browser storage is read. Storage can still replace fields that are configured in `storageData`.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   initialState={{
 *     darkTheme: true,
 *     activePage: "Button",
 *   }}
 * />
 * ```
 */
export type DemoWorkbenchInitialState = {
  /** Whether the shell starts in dark theme mode. */
  darkTheme?: boolean;
  /** Initial search input value. */
  searchText?: string;
  /** Initial filtered demo names, or `null` to show all demos. */
  searchData?: string[] | null;
  /** Name of the initially opened demo page. */
  activePage?: string;
  /** Saved modal/scroll position data. */
  pageData?: {
    scrollTop?: number | string;
    top?: number | string;
    left?: number | string;
  } | null;
  /** Saved grid scroll position. */
  scrollTop?: number | false;
  /** Initial resize scale for opened demo content. */
  windowScale?: number;
};

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchStorageKind***:
 * browser storage target for a persisted workbench field.
 * @description
 * `local` persists between browser sessions. `session` and `undefined` use session storage.
 */
export type DemoWorkbenchStorageKind = "local" | "session" | undefined;

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchStorageEntry***:
 * storage entry consumed by the workbench storage bridge.
 * @description
 * The first tuple item is the state field name. The optional second item chooses `localStorage`; omitted or `undefined` uses `sessionStorage`.
 * @example
 * ```ts
 * const storageData: DemoWorkbenchStorageEntry[] = [
 *   ["activePage"],
 *   ["darkTheme", "local"],
 * ];
 * ```
 */
export type DemoWorkbenchStorageEntry = [string, DemoWorkbenchStorageKind?];

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbenchProps***:
 * props for the reusable React workbench shell.
 * @description
 * Minimal setup is a title and either a lazy demo manifest or a generated registry loader. The host project keeps ownership of demo components, CSS imports, project overlays and optional opened-demo content.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   title="Project demos"
 *   demos={demos}
 *   styleLoader={(name) => import(`./workbench-css/${name}.css`)}
 * />
 * ```
 */
export type DemoWorkbenchProps = {
  /** Shell title shown in the workbench header and document title. */
  title?: string;
  /** Demo manifest rendered as searchable cards. If omitted, generated registry + `demoLoader` are used. */
  demos?: DemoItem[];
  /** Loader for generated demo names stored in the internal workbench registry. */
  demoLoader?: DemoWorkbenchDemoLoader;
  /** Dynamic style loader used by `styled-atom`, e.g. `(name) => import(...)`. */
  styleLoader?: (name: string) => Promise<unknown>;
  /** Optional dev-only Server-Sent Events URL used to fetch and replace mounted CSS after watch rebuilds. */
  styleReloadUrl?: string | false;
  /** Optional generated manifest URL; lets the workbench auto-enable style reload only while watch is running. */
  styleReloadManifestUrl?: string | false;
  /** Host-level styled-atom CSS files loaded by the workbench shell. */
  baseCssFiles?: string[];
  /** Optional cascade layer for host CSS files. No layer is used when omitted. */
  baseCssLayer?: string;
  /** Inline CSS to apply to the workbench shell. */
  baseCss?: string;
  /** Storage fields that should be persisted between reloads. */
  storageData?: DemoWorkbenchStorageEntry[];
  /** Base viewport used for modal scaling. */
  viewport?: DemoWorkbenchViewport;
  /** State applied before storage restoration. */
  initialState?: DemoWorkbenchInitialState;
  /** Optional host content rendered as children of an opened demo component. */
  renderDemoContent?: (pageName: string) => ReactNode;
  /** Optional inline background value for the opened demo body. Defaults to Tailwind `bg-white`. */
  bodyBg?: string;
  /** Component rendered when search/hash points to a missing demo. */
  notFoundComponent?: ComponentType;
};

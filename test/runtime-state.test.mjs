import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const removedWorkbenchFacadeHook = new RegExp("useWorkbench" + "Store");
const removedWorkbenchFacadeFile = ["Workbench", "State.tsx"].join("");

test("DemoGrid reads active page/search/scroll from nexus, not storage side-effect hook", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.doesNotMatch(demoGrid, /useStorageItems/);
  assert.doesNotMatch(demoGrid, removedWorkbenchFacadeHook);
  assert.doesNotMatch(demoGrid, /nexus\.use\(\)/);
  assert.match(demoGrid, /nexus\.use\("activePage"\)/);
  assert.match(demoGrid, /nexus\.use\("scrollTop"\)/);
  assert.match(demoGrid, /nexus\.set\(\{/);

  // Search results are derived from searchText, not stored as separate state.
  assert.doesNotMatch(demoGrid, /searchData/);
  assert.match(demoGrid, /useDeferredValue\(searchText\)/);
});

test("workbench state has defaults for restored template state", async () => {
  const state = await readFile(path.join(root, "src/state/nexus.ts"), "utf8");

  assert.match(state, /activePage:\s*""/);
  assert.match(state, /pageData:\s*null/);
  assert.match(state, /scrollTop:\s*0/);
  assert.doesNotMatch(state, /searchData/);
});

test("DemoCell card markup matches workbench cell shell", async () => {
  const demoCell = await readFile(
    path.join(root, "src/components/DemoCell.tsx"),
    "utf8",
  );

  assert.doesNotMatch(demoCell, /<article\b/);
  assert.doesNotMatch(demoCell, /<button\b[\s\S]*data-cell/);
  assert.match(demoCell, /<div\s+data-cell=\{pageName\}/);
  assert.match(demoCell, /className="demo-workbench-card"/);
  assert.match(demoCell, /data-open=\{isOpen \? "true" : "false"\}/);
  assert.match(demoCell, /<a\s+[\s\S]*href=\{cardHref\}/);
  assert.match(demoCell, /className="demo-workbench-preview-frame"/);
});

test("workbench scope is internal and applied to every demo preview wrapper", async () => {
  const [publicTypes, demoWorkbench, demoCell, state] = await Promise.all([
    readFile(path.join(root, "src/types/public.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    readFile(path.join(root, "src/state/nexus.ts"), "utf8"),
  ]);

  assert.doesNotMatch(publicTypes, /RootSelectorReplacement/);
  assert.doesNotMatch(publicTypes, /rootSelectorReplacement/);
  assert.doesNotMatch(demoWorkbench, /rootSelectorReplacement/);
  assert.match(state, /workbenchScope:\s*"\[workbench-scope\]"/);
  assert.match(demoCell, /getWorkbenchScopeAttributeName/);
  assert.match(demoCell, /getScopeClassName/);
  assert.match(demoCell, /attribute:\s*\{\s*\[scopeAttributeName\]: ""\s*\}/);
  assert.match(demoCell, /className:\s*scopeClassName \|\| undefined/);
  assert.match(demoCell, /encap=\{\{[\s\S]*attribute:[\s\S]*className:/);
  assert.doesNotMatch(demoCell, /state\.rootSelectorReplacement/);
  assert.doesNotMatch(demoCell, /selector:/);
});

test("buttons use safe click semantics and nexus functional updates", async () => {
  const [pageCloseBtn, toggleButton, demoGrid, stateTypes, toTopButton] =
    await Promise.all([
      readFile(
        path.join(root, "src/components/buttons/PageCloseBtn.tsx"),
        "utf8",
      ),
      readFile(
        path.join(root, "src/components/buttons/ToggleButton.tsx"),
        "utf8",
      ),
      readFile(path.join(root, "src/components/DemoGrid.tsx"), "utf8"),
      readFile(path.join(root, "src/state/nexus.ts"), "utf8"),
      readFile(
        path.join(root, "src/components/buttons/ToTopButton.tsx"),
        "utf8",
      ),
    ]);

  assert.doesNotMatch(pageCloseBtn, /<a\b/);
  assert.doesNotMatch(pageCloseBtn, /href="#"/);
  assert.match(pageCloseBtn, /type="button"/);
  assert.match(pageCloseBtn, /className="demo-workbench-page-close"/);
  assert.match(toTopButton, /className="demo-workbench-to-top"/);

  assert.match(
    stateTypes,
    /WorkbenchStateUpdate[\s\S]*\(state: WorkbenchState\)/,
  );
  // ToggleButton's dark-theme flip is verified behaviorally in
  // components.dom.test.tsx; here we only assert it writes through nexus.
  assert.match(toggleButton, /nexus\.set/);
  assert.match(
    demoGrid,
    /nexus\.set\(\{[\s\S]*pageData:[\s\S]*activePage:/,
  );
  assert.match(demoGrid, /nexus\.set\(\{ scrollTop:/);
});

test("nexus persists through nexus-state and overlays hash navigation on hydrated state", async () => {
  const [nexusState, demoWorkbench] = await Promise.all([
    readFile(path.join(root, "src/state/nexus.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
  ]);

  assert.match(nexusState, /import \{ persist \} from "nexus-state"/);
  assert.match(nexusState, /createReactNexus \} from "nexus-state\/react"/);
  assert.match(nexusState, /persist\(nexus, \{/);
  assert.match(nexusState, /include: PERSISTED_KEYS/);
  assert.match(nexusState, /getHashWorkbenchState\(\)/);
  assert.match(nexusState, /activePage: hashState\.activePage/);
  assert.match(nexusState, /scrollTop: hashState\.scrollTop/);
  // The card position parsed from the hash must survive into pageData so
  // closing a demo opened in a new tab shrinks it back onto its card.
  assert.match(nexusState, /top: hashState\.top/);
  assert.match(nexusState, /left: hashState\.left/);

  // The bespoke storage layer is gone; DemoWorkbench no longer wires it up.
  assert.doesNotMatch(demoWorkbench, /WorkbenchStorage/);
  assert.doesNotMatch(demoWorkbench, /defaultStorageData/);

  // The removed storage-layer modules must not come back.
  for (const gone of [
    "src/hooks/useStorageItems.js",
    "src/state/WorkbenchStorage.tsx",
    "src/utils/workbenchStorageState.ts",
    "src/utils/storage.js",
    "src/types/internal.ts",
    path.join("src/state", removedWorkbenchFacadeFile),
  ]) {
    await assert.rejects(readFile(path.join(root, gone), "utf8"), {
      code: "ENOENT",
    });
  }
});

test("baseStyles flows through the global nexus store, not a context provider", async () => {
  const [nexusState, demoWorkbench, demoCell] = await Promise.all([
    readFile(path.join(root, "src/state/nexus.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
  ]);

  // Host base styles live in nexus state — the bespoke context provider is gone.
  assert.match(nexusState, /baseStyles: string\[\]/);
  assert.match(demoWorkbench, /nexus\.set\(\{ baseStyles: hostCssFiles \}\)/);
  // Written from an effect, never during render, to avoid a mid-render update.
  assert.match(demoWorkbench, /useEffect\(\(\) => \{\s*nexus\.set\(\{ baseStyles: hostCssFiles \}\)/);
  assert.match(demoCell, /nexus\.use\("baseStyles"\)/);
  assert.match(demoCell, /\.\.\.baseStyles, \.\.\.stableCssFiles/);
  assert.doesNotMatch(demoCell, /useWorkbenchHostCssFiles/);
  // The old deprecated alias is fully removed.
  assert.doesNotMatch(demoWorkbench, /baseCssFiles/);

  await assert.rejects(
    readFile(
      path.join(root, "src/state/WorkbenchHostCssFilesContext.tsx"),
      "utf8",
    ),
    { code: "ENOENT" },
  );
});

test("DemoWorkbench keeps stable baseStyles and owns shell styles inline", async () => {
  const [
    publicTypes,
    demoWorkbench,
    workbenchShell,
    demoCell,
    styledAtomBridge,
    workbenchStyles,
    loading,
    styleReloadHook,
    styleLoaderUtil,
  ] = await Promise.all([
    readFile(path.join(root, "src/types/public.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/shell/WorkbenchShell.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    readFile(path.join(root, "src/styles/styledAtom.ts"), "utf8"),
    readFile(path.join(root, "src/styles/workbenchStyles.ts"), "utf8"),
    readFile(path.join(root, "src/components/feedback/Loading.tsx"), "utf8"),
    readFile(path.join(root, "src/hooks/useWorkbenchStyleReload.ts"), "utf8"),
    readFile(path.join(root, "src/utils/styleLoader.ts"), "utf8"),
  ]);

  assert.match(publicTypes, /baseStyles\?:\s*string\[\]/);
  // Single name for host base styles — the deprecated alias is gone everywhere.
  assert.doesNotMatch(publicTypes, /baseCssFiles/);
  assert.match(publicTypes, /cssFiles\?:\s*string\[\]/);
  assert.match(publicTypes, /demos:\s*DemoItem\[\]/);
  assert.match(
    publicTypes,
    /export type DemoWorkbenchStyleLoader =[\s\S]*\|\s*string[\s\S]*\|\s*\(\(name: string\) => unknown \| Promise<unknown>\);/,
  );
  assert.match(publicTypes, /styleLoader\?:\s*DemoWorkbenchStyleLoader/);
  assert.doesNotMatch(publicTypes, /demoLoader/);
  assert.doesNotMatch(publicTypes, /DemoWorkbenchDemoLoader/);
  assert.match(demoWorkbench, /\bdemos,/);
  assert.doesNotMatch(demoWorkbench, /demoLoader/);
  assert.doesNotMatch(demoWorkbench, /resolvedDemos/);
  assert.doesNotMatch(publicTypes, /css\?:\s*string/);
  assert.doesNotMatch(publicTypes, /baseCss\?:\s*string/);
  assert.doesNotMatch(publicTypes, /baseCssLayer\?:\s*string/);
  assert.doesNotMatch(publicTypes, /shellCssFiles/);
  assert.doesNotMatch(publicTypes, /baseCssVars/);
  assert.match(
    demoWorkbench,
    /rawHostCssFiles = baseStyles \?\? \["output"\]/,
  );
  assert.match(
    demoWorkbench,
    /hostCssFiles = useStableStringList\(rawHostCssFiles\)/,
  );
  // Style-reload orchestration lives in its own hook now; DemoWorkbench just calls it.
  assert.match(demoWorkbench, /useWorkbenchStyleReload\(styleLoader\)/);
  assert.match(styleReloadHook, /workbenchStyleAtoms\.configure\(loadStyle\)/);
  // The two-form styleLoader resolution lives in its own util.
  assert.match(styleReloadHook, /toStyleLoader\(styleLoader\)/);
  assert.match(styleLoaderUtil, /export function toStyleLoader/);
  assert.match(styleLoaderUtil, /loadStyleFromUrlPrefix/);
  assert.match(styleLoaderUtil, /getStyleLoaderCssUrl/);
  assert.doesNotMatch(demoWorkbench, /layer="workbench"/);
  assert.doesNotMatch(demoWorkbench, /layer=\{baseCssLayer\}/);
  assert.doesNotMatch(demoWorkbench, /css=\{baseCss\}/);
  assert.doesNotMatch(demoCell, /css=\{/);
  assert.doesNotMatch(demoWorkbench, /baseCssLayer =/);
  assert.doesNotMatch(
    demoWorkbench,
    /\.\.\.nextInitialState,[\s\S]*baseCssLayer,/,
  );
  assert.doesNotMatch(demoWorkbench, /vars=\{baseCssVars\}/);
  assert.doesNotMatch(demoWorkbench, /orderedCssFiles/);
  assert.match(demoWorkbench, /import StyledAtom from "styled-atom"/);
  assert.match(
    demoWorkbench,
    /StyledAtom as WorkbenchStyledAtom/,
  );
  assert.match(loading, /import StyledAtom, \{ type StyledAtomStyles \}/);
  assert.match(
    demoWorkbench,
    /name="demo-workbench" encap styles=\{workbenchStyles\}/,
  );
  assert.doesNotMatch(demoWorkbench, /workbenchCss/);
  assert.doesNotMatch(demoWorkbench, /WORKBENCH_STYLE_ATOM/);
  assert.match(workbenchStyles, /demo-workbench-shell/);
  assert.match(workbenchStyles, /data-demo-workbench-theme="dark"/);
  assert.doesNotMatch(publicTypes, /styleReloadUrl\?:/);
  assert.doesNotMatch(publicTypes, /styleReloadManifestUrl\?:/);
  assert.doesNotMatch(publicTypes, /storageData\?:/);
  assert.doesNotMatch(publicTypes, /initialState\?:/);
  assert.match(publicTypes, /DemoWorkbenchAutoScaleOptions \| false/);
  assert.match(publicTypes, /width\?:\s*DemoWorkbenchAutoScaleDimension/);
  assert.match(publicTypes, /height\?:\s*DemoWorkbenchAutoScaleDimension/);
  assert.match(publicTypes, /export type DemoWorkbenchAutoScale/);
  assert.match(publicTypes, /autoScale\?:\s*DemoWorkbenchAutoScale/);
  assert.doesNotMatch(publicTypes, /DemoWorkbenchViewport/);
  assert.doesNotMatch(publicTypes, /viewport\?:/);
  assert.doesNotMatch(demoWorkbench, /defaultViewport/);
  assert.match(demoWorkbench, /autoScale=\{autoScale\}/);
  assert.match(workbenchShell, /getAutoScaleOptions\(autoScale\)/);
  assert.match(workbenchShell, /autoScale === false \? undefined : autoScale/);
  assert.match(workbenchShell, /autoScaleOptions\?\.width \?\? null/);
  assert.match(workbenchShell, /autoScaleOptions\?\.height \?\? null/);
  assert.match(workbenchShell, /nexus\.set\(\{ windowScale: 0 \}\)/);
  assert.match(workbenchShell, /getScaleForAxis\(width, autoScaleWidth\)/);
  assert.match(workbenchShell, /getScaleForAxis\(height, autoScaleHeight\)/);
  assert.doesNotMatch(workbenchStyles, /normalizeStyledAtomStyles/);
  assert.doesNotMatch(loading, /normalizeStyledAtomStyles/);
  assert.doesNotMatch(workbenchStyles, /content:\s*'""'/);
  assert.doesNotMatch(loading, /content:\s*'""'/);
  assert.match(styleReloadHook, /readStyleReloadManifest/);
  assert.match(styleReloadHook, /DEFAULT_STYLE_RELOAD_MANIFEST_URL/);
  assert.match(styleReloadHook, /STYLE_RELOAD_MANIFEST_POLL_MS/);
  assert.match(
    styleReloadHook,
    /new window\.EventSource\(resolvedStyleReloadUrl\)/,
  );
  assert.match(
    styleReloadHook,
    /loadStyleReplacements\(resolvedStyleReloadUrl, fileNames\)/,
  );
  assert.match(styleReloadHook, /workbenchStyleAtoms\.replace\(styles\)/);
  assert.doesNotMatch(styledAtomBridge, /\bStyledAtomStore\b/);
  assert.doesNotMatch(styledAtomBridge, /StyledAtomStoreOptionsT/);
  assert.match(styleReloadHook, /styleLoaderRef/);
  assert.match(demoCell, /stableCssFiles = useStableStringList\(cssFiles\)/);
  assert.match(demoCell, /\.\.\.baseStyles, \.\.\.stableCssFiles/);
  assert.match(demoCell, /className:\s*scopeClassName \|\| undefined/);
  assert.match(demoCell, /toWorkbenchStyleClassName/);
  assert.match(styledAtomBridge, /createStyledAtomStore/);
  assert.match(
    styledAtomBridge,
    /export const workbenchStyleAtoms = createdStyleAtoms/,
  );
  assert.doesNotMatch(
    styledAtomBridge,
    /import nexus from "\.\.\/state\/nexus"/,
  );
  assert.match(styledAtomBridge, /createdStyleAtoms\.StyledAtom/);
  assert.doesNotMatch(demoWorkbench, /shellCssFiles/);
});

test("persisted keys cover navigation and theme, and exclude derived state", async () => {
  const nexusState = await readFile(
    path.join(root, "src/state/nexus.ts"),
    "utf8",
  );

  // One namespaced localStorage entry instead of generic top-level keys.
  assert.match(nexusState, /PERSIST_KEY = "demo-workbench"/);
  assert.match(nexusState, /key: PERSIST_KEY/);
  assert.match(nexusState, /PERSISTED_KEYS/);
  for (const key of [
    "activePage",
    "darkTheme",
    "themeColor",
    "searchText",
    "pageData",
    "scrollTop",
  ]) {
    assert.match(nexusState, new RegExp(`"${key}"`));
  }
  // Derived/recomputed values are never persisted.
  assert.doesNotMatch(nexusState, /"searchData"/);
  assert.doesNotMatch(nexusState, /"windowScale"/);
});

test("development warnings cover common host integration mistakes", async () => {
  const [demoWorkbench, demoGrid, dynamicModuleHook, devWarnings, styleReloadHook] =
    await Promise.all([
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoGrid.tsx"), "utf8"),
    readFile(path.join(root, "src/hooks/useDynamicModule.tsx"), "utf8"),
    readFile(path.join(root, "src/utils/devWarnings.ts"), "utf8"),
    readFile(path.join(root, "src/hooks/useWorkbenchStyleReload.ts"), "utf8"),
  ]);

  assert.match(devWarnings, /NODE_ENV !== "production"/);
  assert.match(devWarnings, /shownWarnings/);
  assert.match(demoWorkbench, /warnMissingStyleLoader/);
  assert.match(styleReloadHook, /warnFailedStyleLoad/);
  assert.match(demoWorkbench, /warnInvalidDemoModule/);
  assert.match(demoWorkbench, /warnFailedDemoLoad/);
  assert.match(demoGrid, /missing-demo:/);
  assert.match(dynamicModuleHook, /warnDevelopment/);
  assert.doesNotMatch(dynamicModuleHook, /Record<string, any>/);
  assert.doesNotMatch(dynamicModuleHook, /console\.error/);
});

test("DemoGrid tracks rendered demos during virtual scrolling", async () => {
  const [demoGrid, demoCell] = await Promise.all([
    readFile(path.join(root, "src/components/DemoGrid.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
  ]);

  assert.match(demoGrid, /renderedDemoNames/);
  assert.match(demoGrid, /handleRenderedKeysChange/);
  assert.match(
    demoGrid,
    /isDemoLoaded=\{!isScrolling && renderedDemoNames\.has\(demoName\)\}/,
  );
  assert.match(demoGrid, /onRenderedKeysChange=\{handleRenderedKeysChange\}/);
  assert.match(demoCell, /shouldLoadDynamicModule/);
  assert.match(demoCell, /mode === "page" \|\| isDemoLoaded \|\| !isScrolling/);
  assert.match(demoCell, /enabled: shouldLoadDynamicModule/);
  assert.match(demoCell, /onLoad\?\.\(pageName\)/);
  assert.match(
    demoCell,
    /hasLoadedObject\s*=\s*isDemoLoaded \|\| Boolean\(DynamicComponent\)/,
  );
  assert.doesNotMatch(demoCell, /document\.getElementById\(pageName\)/);
  assert.match(demoCell, /shouldRenderFallback\s*=\s*Boolean/);
  assert.match(demoCell, /isScrolling && !hasLoadedObject/);
  assert.match(demoCell, /nexus\.use\("activePage"\)/);
  assert.doesNotMatch(demoCell, /\{!isScrolling && content\}/);
  // The Tooltip component and its portal layer were removed from the shell.
  assert.doesNotMatch(demoCell, /tooltip-layer/);
  assert.doesNotMatch(demoCell, /<Tooltip/);
});

test("DemoGrid derives MorphScroll theme and spacing from workbench state without internal ms-* CSS selectors", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.match(demoGrid, /const darkTheme = Boolean\(nexus\.use\("darkTheme"\)\)/);
  // Edge gradient follows the active theme palette via the shared bg lookup.
  assert.match(
    demoGrid,
    /edgeGradient=\{\{ color: getWorkbenchBg\(darkTheme, themeColor\) \}\}/,
  );
  assert.match(demoGrid, /wrapperMargin=\{\[50, 20, 50, 20\]\}/);
  assert.doesNotMatch(demoGrid, /\[&_\.ms-objects-wrapper\]/);
  assert.doesNotMatch(demoGrid, /ms-objects-wrapper/);
});

test("DemoGrid scroll persistence is rAF throttled and does not continuously feed storage back into scrollPosition", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.match(demoGrid, /lastStoredScrollTopRef/);
  assert.match(demoGrid, /scrollFrameRef/);
  assert.match(demoGrid, /requestAnimationFrame/);
  assert.match(demoGrid, /cancelAnimationFrame/);
  assert.doesNotMatch(
    demoGrid,
    /useEffect\(\(\) => \{\s*if \(hashState\) return;\s*setScrollPosition\(\(prev\) => \(\{ \.\.\.prev, value: savedScrollTop \}\)\);\s*\}, \[hashState, savedScrollTop\]\);/,
  );
});

test("DemoGrid seeds MorphScroll's scrollPosition from nexus directly instead of a post-mount restore effect", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.doesNotMatch(demoGrid, /restoredScrollPositionRef/);
  assert.doesNotMatch(demoGrid, /latestSavedScrollTopRef/);
  assert.match(
    demoGrid,
    /useState<\{[\s\S]*?\}>\(\(\) => \(\{ value: savedScrollTop, updater: false \}\)\)/,
  );
});

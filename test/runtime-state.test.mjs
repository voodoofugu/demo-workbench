import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("DemoGrid reads active page/search/scroll from workbench state, not storage side-effect hook", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.doesNotMatch(demoGrid, /useStorageItems/);
  assert.match(demoGrid, /useWorkbenchStore/);
  assert.match(demoGrid, /setWorkbenchState\(/);
  assert.match(demoGrid, /activePage/);
  assert.match(demoGrid, /searchData/);
  assert.match(demoGrid, /scrollTop/);
});

test("workbench state has defaults for restored template state", async () => {
  const state = await readFile(path.join(root, "src/state/nexus.ts"), "utf8");

  assert.match(state, /activePage:\s*""/);
  assert.match(state, /pageData:\s*null/);
  assert.match(state, /searchData:\s*null/);
  assert.match(state, /scrollTop:\s*0/);
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
  assert.match(
    toggleButton,
    /nexus\.set\(\(prev: \{ darkTheme: boolean \}\) => \(\{[\s\S]*darkTheme: !prev\.darkTheme/,
  );
  assert.doesNotMatch(toggleButton, /darkTheme:\s*\([^)]*\)\s*=>/);
  assert.match(
    demoGrid,
    /setWorkbenchState\(\{[\s\S]*pageData:[\s\S]*activePage:/,
  );
  assert.match(demoGrid, /setWorkbenchState\(\{ scrollTop:/);
});

test("storage hydrates nexus once and subscribes to later state changes", async () => {
  const storageHook = await readFile(
    path.join(root, "src/hooks/useStorageItems.js"),
    "utf8",
  );
  const workbenchStorage = await readFile(
    path.join(root, "src/state/WorkbenchStorage.tsx"),
    "utf8",
  );

  assert.doesNotMatch(storageHook, /useState/);
  assert.doesNotMatch(storageHook, /setTimeout/);
  assert.doesNotMatch(storageHook, /readyToWrite|hydratedRef/);
  assert.match(storageHook, /getBrowserStorage/);
  assert.match(storageHook, /hydratedStorageKeys = new WeakMap\(\)/);
  assert.match(storageHook, /!hydratedKeys\.has\(entriesKey\)/);
  assert.match(storageHook, /hydratedKeys\.add\(entriesKey\)/);
  assert.match(storageHook, /restoredState\[item\.name\] = value/);
  assert.match(storageHook, /store\.set\(restoredState\)/);
  assert.match(storageHook, /store\.subscribe\(writeState/);
  assert.match(storageHook, /state\[item\.name\]/);
  assert.match(
    workbenchStorage,
    /useStorageItems\(storageData, nexus, false\)/,
  );
  assert.doesNotMatch(workbenchStorage, /useWorkbenchStore/);
});

test("DemoWorkbench restores state before rendering children without setting nexus during render", async () => {
  const [demoWorkbench, workbenchState, storageState] = await Promise.all([
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/state/WorkbenchState.tsx"), "utf8"),
    readFile(path.join(root, "src/utils/workbenchStorageState.ts"), "utf8"),
  ]);

  assert.match(demoWorkbench, /readStoredWorkbenchState\(storageData\)/);
  assert.match(demoWorkbench, /activePage: hashState\.activePage/);
  assert.match(demoWorkbench, /scrollTop: hashState\.scrollTop/);
  assert.match(demoWorkbench, /top:\s*0/);
  assert.match(demoWorkbench, /left:\s*0/);
  assert.match(workbenchState, /useLayoutEffect/);
  assert.match(workbenchState, /nexus\.set\(resolvedInitialState\)/);
  assert.match(
    workbenchState,
    /if \(appliedInitialStateKey !== resolvedInitialStateKey\) return null/,
  );
  assert.doesNotMatch(demoWorkbench, /nexus\.set/);

  assert.match(storageState, /normalizeStorageEntries/);
  assert.match(storageState, /getBrowserStorage\(item\.type\)/);
  assert.match(storageState, /parseStoredValue/);
  assert.match(storageState, /restoredState/);
});

test("DemoWorkbench keeps one stable baseCssFiles list and owns shell styles inline", async () => {
  const [
    publicTypes,
    demoWorkbench,
    demoCell,
    styledAtomBridge,
    workbenchStyles,
  ] = await Promise.all([
    readFile(path.join(root, "src/types/public.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    readFile(path.join(root, "src/styles/styledAtom.ts"), "utf8"),
    readFile(path.join(root, "src/styles/workbenchStyles.ts"), "utf8"),
  ]);

  assert.match(publicTypes, /baseCssFiles\?:\s*string\[\]/);
  assert.match(publicTypes, /cssFiles\?:\s*string\[\]/);
  assert.match(publicTypes, /demoLoader:\s*DemoWorkbenchDemoLoader/);
  assert.doesNotMatch(publicTypes, /demos\?:\s*DemoItem\[\]/);
  assert.doesNotMatch(demoWorkbench, /\bdemos,/);
  assert.doesNotMatch(demoWorkbench, /resolvedDemos/);
  assert.doesNotMatch(publicTypes, /css\?:\s*string/);
  assert.doesNotMatch(publicTypes, /baseCss\?:\s*string/);
  assert.doesNotMatch(publicTypes, /baseCssLayer\?:\s*string/);
  assert.doesNotMatch(publicTypes, /shellCssFiles/);
  assert.doesNotMatch(publicTypes, /baseCssVars/);
  assert.match(
    demoWorkbench,
    /rawHostCssFiles = baseCssFiles \?\? \["output"\]/,
  );
  assert.match(
    demoWorkbench,
    /hostCssFiles = useStableStringList\(rawHostCssFiles\)/,
  );
  assert.match(demoWorkbench, /workbenchStyleAtoms\.configure\(loadStyle\)/);
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
  assert.match(demoWorkbench, /StyledAtom as InlineStyledAtom/);
  assert.match(
    demoWorkbench,
    /name="demo-workbench" encap styles=\{workbenchStyles\}/,
  );
  assert.doesNotMatch(demoWorkbench, /workbenchCss/);
  assert.doesNotMatch(demoWorkbench, /WORKBENCH_STYLE_ATOM/);
  assert.match(workbenchStyles, /demo-workbench-shell/);
  assert.match(workbenchStyles, /data-demo-workbench-theme="dark"/);
  assert.match(publicTypes, /styleReloadUrl\?:\s*string \| false/);
  assert.match(publicTypes, /styleReloadManifestUrl\?:\s*string \| false/);
  assert.match(demoWorkbench, /loadStyleReloadUrlFromManifest/);
  assert.match(demoWorkbench, /STYLE_RELOAD_MANIFEST_POLL_MS/);
  assert.match(
    demoWorkbench,
    /new window\.EventSource\(resolvedStyleReloadUrl\)/,
  );
  assert.match(
    demoWorkbench,
    /loadStyleReplacements\(resolvedStyleReloadUrl, fileNames\)/,
  );
  assert.match(demoWorkbench, /workbenchStyleAtoms\.replace\(styles\)/);
  assert.doesNotMatch(styledAtomBridge, /\bStyledAtomStore\b/);
  assert.doesNotMatch(styledAtomBridge, /StyledAtomStoreOptionsT/);
  assert.match(demoWorkbench, /styleLoaderRef/);
  assert.match(demoCell, /stableCssFiles = useStableStringList\(cssFiles\)/);
  assert.match(demoCell, /\.\.\.state\.baseCssFiles, \.\.\.stableCssFiles/);
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
  assert.doesNotMatch(demoCell, /\.\.\.baseCssFiles/);
  assert.doesNotMatch(demoWorkbench, /shellCssFiles/);
});

test("default storage persists opened page as well as scroll/page data", async () => {
  const demoWorkbench = await readFile(
    path.join(root, "src/shell/DemoWorkbench.tsx"),
    "utf8",
  );

  assert.match(demoWorkbench, /\["activePage"\]/);
  assert.match(demoWorkbench, /\["searchData"\]/);
  assert.match(demoWorkbench, /\["pageData"\]/);
  assert.match(demoWorkbench, /\["scrollTop"\]/);
  assert.match(demoWorkbench, /\["windowScale"\]/);
});

test("DemoGrid tracks rendered demos during virtual scrolling and DemoCell restores Tooltip on info badge", async () => {
  const [demoGrid, demoCell, tooltip, fileIcon] = await Promise.all([
    readFile(path.join(root, "src/components/DemoGrid.tsx"), "utf8"),
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    readFile(path.join(root, "src/components/Tooltip.tsx"), "utf8"),
    readFile(path.join(root, "src/components/icons/FileIcn.tsx"), "utf8"),
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
  assert.match(demoCell, /state\.activePage/);
  assert.doesNotMatch(demoCell, /\{!isScrolling && content\}/);
  assert.match(demoCell, /<Tooltip text=\{pageName\} position="top">/);
  assert.match(tooltip, /createPortal/);
  assert.match(tooltip, /#templateBody > main/);
  assert.match(tooltip, /<FileIcn/);
  assert.match(fileIcon, /viewBox="0 0 56 64"/);
});

test("DemoGrid derives MorphScroll theme and spacing from workbench state without internal ms-* CSS selectors", async () => {
  const demoGrid = await readFile(
    path.join(root, "src/components/DemoGrid.tsx"),
    "utf8",
  );

  assert.match(demoGrid, /const darkTheme = Boolean\(state\.darkTheme\)/);
  assert.match(
    demoGrid,
    /edgeGradient=\{\{ color: darkTheme \? "#1e1b4b" : "#c7d2fe" \}\}/,
  );
  assert.match(demoGrid, /wrapperMargin=\{\[30, 20, 60, 20\]\}/);
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
  assert.match(demoGrid, /restoredScrollPositionRef/);
  assert.doesNotMatch(
    demoGrid,
    /useEffect\(\(\) => \{\s*if \(hashState\) return;\s*setScrollPosition\(\(prev\) => \(\{ \.\.\.prev, value: savedScrollTop \}\)\);\s*\}, \[hashState, savedScrollTop\]\);/,
  );
});

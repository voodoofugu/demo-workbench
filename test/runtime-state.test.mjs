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
  assert.match(demoGrid, /activePage/);
  assert.match(demoGrid, /searchData/);
  assert.match(demoGrid, /scrollTop/);
});

test("workbench state has defaults for restored template state", async () => {
  const state = await readFile(
    path.join(root, "src/state/workbenchNexus.ts"),
    "utf8",
  );

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
  assert.match(
    demoCell,
    /className=\{`animate-ident relative flex h-156 w-238/,
  );
  assert.match(demoCell, /<a\s+[\s\S]*href=\{cardHref\}/);
  assert.match(demoCell, /scale-\[0\.180134\]/);
});

test("bodySelectorReplacement is exposed and forwarded into DemoBody selector props", async () => {
  const [publicTypes, demoWorkbench, workbenchShell, demoGrid, demoCell] =
    await Promise.all([
      readFile(path.join(root, "src/types/public.ts"), "utf8"),
      readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
      readFile(path.join(root, "src/shell/WorkbenchShell.tsx"), "utf8"),
      readFile(path.join(root, "src/components/DemoGrid.tsx"), "utf8"),
      readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    ]);

  assert.match(publicTypes, /bodySelectorReplacement\?:\s*string/);
  assert.match(demoWorkbench, /bodySelectorReplacement/);
  assert.match(workbenchShell, /bodySelectorReplacement/);
  assert.match(demoGrid, /bodySelectorReplacement/);
  assert.match(demoCell, /parseBodySelectorReplacement/);
  assert.match(demoCell, /bodySelectorProps/);
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
      readFile(path.join(root, "src/state/workbenchNexus.ts"), "utf8"),
      readFile(
        path.join(root, "src/components/buttons/ToTopButton.tsx"),
        "utf8",
      ),
    ]);

  assert.doesNotMatch(pageCloseBtn, /<a\b/);
  assert.doesNotMatch(pageCloseBtn, /href="#"/);
  assert.match(pageCloseBtn, /type="button"/);
  assert.match(pageCloseBtn, /z-40/);
  assert.match(toTopButton, /z-20/);

  assert.match(
    stateTypes,
    /WorkbenchStateUpdate[\s\S]*\(state: WorkbenchState\)/,
  );
  assert.match(
    toggleButton,
    /setWorkbenchState\(\(prev\) => \(\{ darkTheme: !prev\.darkTheme \}\)\)/,
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
    /useStorageItems\(storageData, workbenchNexus, false\)/,
  );
  assert.doesNotMatch(workbenchStorage, /useWorkbenchStore/);
});

test("DemoWorkbench synchronously restores activePage/pageData/scrollTop before first render", async () => {
  const [demoWorkbench, storageState] = await Promise.all([
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
    readFile(path.join(root, "src/utils/workbenchStorageState.ts"), "utf8"),
  ]);

  assert.match(demoWorkbench, /readStoredWorkbenchState\(storageData\)/);
  assert.match(
    demoWorkbench,
    /<WorkbenchStateProvider initialState=\{restoredInitialState\}>/,
  );
  assert.match(demoWorkbench, /activePage: hashState\.activePage/);
  assert.match(demoWorkbench, /scrollTop: hashState\.scrollTop/);
  assert.match(demoWorkbench, /top:\s*0/);
  assert.match(demoWorkbench, /left:\s*0/);

  assert.match(storageState, /normalizeStorageEntries/);
  assert.match(storageState, /getBrowserStorage\(item\.type\)/);
  assert.match(storageState, /parseStoredValue/);
  assert.match(storageState, /restoredState/);
});

test("DemoWorkbench exposes one host cssFiles list and keeps cssFiles as compatibility alias", async () => {
  const [publicTypes, demoWorkbench] = await Promise.all([
    readFile(path.join(root, "src/types/public.ts"), "utf8"),
    readFile(path.join(root, "src/shell/DemoWorkbench.tsx"), "utf8"),
  ]);

  assert.match(publicTypes, /cssFiles\?:\s*string\[\]/);
  assert.match(
    publicTypes,
    /@deprecated Use `cssFiles`[\s\S]*cssFiles\?:\s*string\[\]/,
  );
  assert.doesNotMatch(publicTypes, /shellCssFiles/);
  assert.match(
    demoWorkbench,
    /hostCssFiles = cssFiles \?\? cssFiles \?\? \["output"\]/,
  );
  assert.match(
    demoWorkbench,
    /orderedCssFiles = \[WORKBENCH_STYLE_ATOM, \.\.\.hostCssFiles\]/,
  );
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

test("DemoCell keeps already loaded objects during virtual scrolling and restores Tooltip on info badge", async () => {
  const [demoCell, tooltip, fileIcon] = await Promise.all([
    readFile(path.join(root, "src/components/DemoCell.tsx"), "utf8"),
    readFile(path.join(root, "src/components/Tooltip.tsx"), "utf8"),
    readFile(path.join(root, "src/components/icons/FileIcn.tsx"), "utf8"),
  ]);

  assert.match(demoCell, /hasLoadedObject\s*=\s*Boolean\(DynamicComponent\)/);
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

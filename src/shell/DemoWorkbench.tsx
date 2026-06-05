import type { ComponentType } from "react";
import { useMemo } from "react";
import { StyleCore, StyledAtom } from "styled-atom";

import workbenchCss from "../styles/workbenchCss";
import RawWorkbenchStorage from "../state/WorkbenchStorage";
import generatedWorkbenchRegistry from "../state/generatedWorkbenchRegistry";
import { WorkbenchStateProvider } from "../state/WorkbenchState";
import { getHashWorkbenchState } from "../utils/workbenchPosition";
import { readStoredWorkbenchState } from "../utils/workbenchStorageState";
import RawWorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";
import workbenchNexus from "../state/workbenchNexus";

import type {
  DemoWorkbenchInitialState,
  DemoWorkbenchProps,
  DemoWorkbenchStorageEntry,
  DemoWorkbenchViewport,
} from "../types/public";

const WORKBENCH_STYLE_ATOM = "workbench";

const TypedStyleCore = StyleCore as ComponentType<{
  path: (fileName: string) => Promise<unknown>;
}>;

const TypedWorkbenchStorage = RawWorkbenchStorage as ComponentType<{
  storageData: DemoWorkbenchStorageEntry[];
}>;

const TypedWorkbenchShell = RawWorkbenchShell as ComponentType<{
  title: string;
  demos: DemoWorkbenchProps["demos"];
  viewport: DemoWorkbenchViewport;
  renderDemoContent: DemoWorkbenchProps["renderDemoContent"];
  bodyBg: DemoWorkbenchProps["bodyBg"];
  bodySelectorReplacement: DemoWorkbenchProps["bodySelectorReplacement"];
  notFoundComponent: DemoWorkbenchProps["notFoundComponent"];
}>;

const defaultStorageData: DemoWorkbenchStorageEntry[] = [
  ["activePage"],
  ["darkTheme", "local"],
  ["searchData"],
  ["searchText"],
  ["pageData"],
  ["popupState"],
  ["scrollTop"],
  ["windowScale"],
];

const defaultViewport: DemoWorkbenchViewport = { width: 1200, height: 640 };
const emptyCssLoader = () => Promise.resolve();

/**
 * Searchable React shell for local component/demo development.
 *
 * DemoWorkbench owns the browser-like grid, search, persistence and modal shell.
 * The host project only supplies a lazy demo manifest and optional rendering hooks.
 */
export default function DemoWorkbench({
  title = "Demo Workbench",
  demos,
  demoLoader,
  styleLoader,
  baseCssFiles,
  storageData = defaultStorageData,
  viewport = defaultViewport,
  initialState,
  renderDemoContent,
  bodyBg,
  bodySelectorReplacement,
  notFoundComponent,
}: DemoWorkbenchProps) {
  const resolvedStyleLoader: (name: string) => Promise<unknown> =
    styleLoader ?? emptyCssLoader;

  const loadStyle = (fileName: string) => {
    if (fileName === WORKBENCH_STYLE_ATOM) {
      return Promise.resolve({ default: workbenchCss });
    }

    return resolvedStyleLoader(fileName);
  };

  // Host-level base CSS is merged into every demo preview by DemoCell.
  workbenchNexus.set({ baseCssFiles: baseCssFiles ?? [] });

  const registryDemos = useMemo(
    () =>
      demoLoader
        ? generatedWorkbenchRegistry.demos.map((name) => ({
            name,
            load: () => demoLoader(name),
          }))
        : [],
    [demoLoader],
  );
  const resolvedDemos = demos ?? registryDemos;
  const restoredInitialState = useMemo<DemoWorkbenchInitialState>(() => {
    const hashState = getHashWorkbenchState();
    const storedState = (
      hashState ? {} : readStoredWorkbenchState(storageData)
    ) as Partial<DemoWorkbenchInitialState>;
    const nextInitialState: DemoWorkbenchInitialState = {
      ...storedState,
      ...(hashState
        ? {
            activePage: hashState.activePage,
            pageData: {
              scrollTop: hashState.scrollTop,
              top: 0,
              left: 0,
            },
            searchText: hashState.searchText,
            scrollTop: hashState.scrollTop,
          }
        : {}),
      ...initialState,
    };

    if (nextInitialState.windowScale == null) {
      delete nextInitialState.windowScale;
    }

    return nextInitialState;
  }, [initialState, storageData]);

  return (
    <WorkbenchStateProvider initialState={restoredInitialState}>
      <TypedStyleCore path={loadStyle} />
      <StyledAtom fileNames={[WORKBENCH_STYLE_ATOM]} />
      <WorkbenchTitle title={title} />
      <TypedWorkbenchStorage storageData={storageData} />
      <TypedWorkbenchShell
        title={title}
        demos={resolvedDemos}
        viewport={viewport}
        renderDemoContent={renderDemoContent}
        bodyBg={bodyBg}
        bodySelectorReplacement={bodySelectorReplacement}
        notFoundComponent={notFoundComponent}
      />
    </WorkbenchStateProvider>
  );
}

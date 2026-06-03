import type { ComponentType } from "react";
import { StyleCore, StyledAtom } from "styled-atom";

import type { DemoWorkbenchProps, DemoWorkbenchStorageEntry, DemoWorkbenchViewport } from "../types/public";
import RawWorkbenchStorage from "../state/WorkbenchStorage";
import { WorkbenchStateProvider } from "../state/WorkbenchState";
import RawWorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";

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
  notFoundComponent: DemoWorkbenchProps["notFoundComponent"];
}>;

const defaultStorageData: DemoWorkbenchStorageEntry[] = [
  ["darkTheme", "local"],
  ["searchText"],
  ["pageData"],
  ["popupState"],
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
  demos = [],
  cssLoader = emptyCssLoader,
  baseCssFiles = ["output"],
  shellCssFiles,
  storageData = defaultStorageData,
  viewport = defaultViewport,
  initialState,
  renderDemoContent,
  notFoundComponent,
}: DemoWorkbenchProps) {
  return (
    <WorkbenchStateProvider initialState={initialState}>
      <TypedStyleCore path={cssLoader} />
      {baseCssFiles.length > 0 && <StyledAtom fileNames={baseCssFiles} />}
      {shellCssFiles?.length ? <StyledAtom fileNames={shellCssFiles} /> : null}
      <TypedWorkbenchStorage storageData={storageData} />
      <WorkbenchTitle title={title} />
      <TypedWorkbenchShell
        title={title}
        demos={demos}
        viewport={viewport}
        renderDemoContent={renderDemoContent}
        notFoundComponent={notFoundComponent}
      />
    </WorkbenchStateProvider>
  );
}

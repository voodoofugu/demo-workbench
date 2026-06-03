import { StyleCore, StyledAtom } from "styled-atom";

import WorkbenchStorage from "../state/WorkbenchStorage";
import { WorkbenchStateProvider } from "../state/WorkbenchState";
import WorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";

const defaultStorageData = [
  ["darkTheme", "local"],
  ["searchText"],
  ["pageData"],
  ["popupState"],
];

const defaultViewport = { width: 1200, height: 640 };
const emptyCssLoader = () => Promise.resolve();

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
  renderSvgDefs,
  notFoundComponent,
}) {
  return (
    <WorkbenchStateProvider initialState={initialState}>
      {renderSvgDefs?.()}
      <StyleCore path={cssLoader} />
      {baseCssFiles?.length > 0 && <StyledAtom fileNames={baseCssFiles} />}
      {shellCssFiles?.length > 0 && <StyledAtom fileNames={shellCssFiles} />}
      <WorkbenchStorage storageData={storageData} />
      <WorkbenchTitle title={title} />
      <WorkbenchShell
        title={title}
        demos={demos}
        viewport={viewport}
        renderDemoContent={renderDemoContent}
        notFoundComponent={notFoundComponent}
      />
    </WorkbenchStateProvider>
  );
}

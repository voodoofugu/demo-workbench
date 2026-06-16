import { createReactNexus } from "nexus-state";

export type WorkbenchPageData = {
  scrollTop?: number | string;
  top?: number | string;
  left?: number | string;
} | null;

export type WorkbenchOpenedDemo = {
  name?: string;
  title?: string;
  [key: string]: unknown;
};

export type WorkbenchFileRegistry = {
  demos: string[];
};

export type WorkbenchState = {
  activePage: string;
  darkTheme: boolean;
  fileRegistry: WorkbenchFileRegistry;
  pageData: WorkbenchPageData;
  searchData: string[] | null;
  searchText: string;
  scrollTop: number | false;
  windowScale: number | null;
  baseCssFiles: string[];
  workbenchScope: string;
};

export type WorkbenchStateUpdate =
  | Partial<WorkbenchState>
  | ((state: WorkbenchState) => Partial<WorkbenchState>);

const nexus = createReactNexus<WorkbenchState, object>({
  state: {
    activePage: "",
    darkTheme: false,
    fileRegistry: {
      demos: [],
    },
    pageData: null,
    searchData: null,
    searchText: "",
    scrollTop: 0,
    windowScale: null,
    baseCssFiles: [],
    workbenchScope: "[workbench-scope]",
  },
});

export default nexus;

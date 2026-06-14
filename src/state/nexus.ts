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

type nexus = {
  get(): WorkbenchState;
  get<Key extends keyof WorkbenchState>(key: Key): WorkbenchState[Key];
  use(): WorkbenchState;
  use<Key extends keyof WorkbenchState>(key: Key): WorkbenchState[Key];
  set(state: WorkbenchStateUpdate): void;
  subscribe(
    callback: (state: WorkbenchState) => void,
    keys: (keyof WorkbenchState | "*")[],
  ): () => void;
};

const nexus: nexus = createReactNexus<WorkbenchState>({
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

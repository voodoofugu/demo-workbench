import { createReactNexus } from "nexus-state";

export type WorkbenchPageData = {
  scrollTop?: number | string;
  top?: number | string;
  left?: number | string;
} | null;

export type WorkbenchState = {
  activePage: string;
  darkTheme: boolean;
  pageData: WorkbenchPageData;
  searchData: string[] | null;
  searchText: string;
  windowScale: number | null;
};

type WorkbenchNexus = {
  use(): WorkbenchState;
  use<Key extends keyof WorkbenchState>(key: Key): WorkbenchState[Key];
  set(state: Partial<WorkbenchState>): void;
};

const workbenchNexus: WorkbenchNexus = createReactNexus<WorkbenchState>({
  state: {
    activePage: "",
    darkTheme: false,
    pageData: null,
    searchData: null,
    searchText: "",
    windowScale: null,
  },
});

export default workbenchNexus;

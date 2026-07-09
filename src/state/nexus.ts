import { createReactNexus } from "nexus-state";

import { getHashWorkbenchState } from "../utils/workbenchPosition";
import { readStoredWorkbenchState } from "../utils/workbenchStorageState";
import type { DemoWorkbenchStorageEntry } from "../types/internal";

export type WorkbenchPageData = {
  scrollTop?: number | string;
  top?: number | string;
  left?: number | string;
} | null;

export type WorkbenchFileRegistry = {
  demos: string[];
};

export type WorkbenchThemeColor = "grey" | "blue" | "brown";

export const WORKBENCH_THEME_COLORS: WorkbenchThemeColor[] = [
  "grey",
  "blue",
  "brown",
];

export type WorkbenchState = {
  activePage: string;
  darkTheme: boolean;
  themeColor: WorkbenchThemeColor;
  pageData: WorkbenchPageData;
  searchText: string;
  scrollTop: number | false;
  windowScale: number | null;
  workbenchScope: string;
};

export type WorkbenchStateUpdate =
  | Partial<WorkbenchState>
  | ((state: WorkbenchState) => Partial<WorkbenchState>);

// Keys persisted across reloads, all in localStorage so the choice survives a
// browser restart and there is only one storage to reason about. Read once
// below to seed nexus before any component renders — no default-state flash.
export const defaultStorageData: DemoWorkbenchStorageEntry[] = [
  ["activePage", "local"],
  ["darkTheme", "local"],
  ["themeColor", "local"],
  ["searchText", "local"],
  ["pageData", "local"],
  ["scrollTop", "local"],
];

function getInitialWorkbenchState(): Partial<WorkbenchState> {
  const stored = readStoredWorkbenchState(defaultStorageData);
  const hashState = getHashWorkbenchState();
  if (!hashState) return stored;

  // A hash link only carries navigation; keep the stored theme preferences and
  // overlay the opened-demo position from the hash on top of them. The card
  // position is preserved so closing the demo in this tab shrinks the overlay
  // back onto the card instead of the viewport corner.
  return {
    ...stored,
    activePage: hashState.activePage,
    pageData: {
      scrollTop: hashState.scrollTop,
      top: hashState.top,
      left: hashState.left,
    },
    searchText: hashState.searchText,
    scrollTop: hashState.scrollTop,
  };
}

const nexus = createReactNexus<WorkbenchState, object>({
  state: {
    activePage: "",
    darkTheme: false,
    themeColor: "grey",
    pageData: null,
    searchText: "",
    scrollTop: 0,
    windowScale: null,
    workbenchScope: "[workbench-scope]",
    ...getInitialWorkbenchState(),
  },
});

export default nexus;

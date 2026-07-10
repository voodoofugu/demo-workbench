import { persist } from "nexus-state";
import { createReactNexus } from "nexus-state/react";

import { getHashWorkbenchState } from "../utils/workbenchPosition";

export type WorkbenchPageData = {
  scrollTop?: number | string;
  top?: number | string;
  left?: number | string;
} | null;

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

// Navigation + preference keys persisted across reloads. `persist` stores them
// as one namespaced localStorage entry, so generic names like "scrollTop" never
// collide with the host app's own keys. windowScale/workbenchScope stay out:
// the former is recomputed by a ResizeObserver, the latter is a constant.
const PERSIST_KEY = "demo-workbench";
const PERSISTED_KEYS: (keyof WorkbenchState)[] = [
  "activePage",
  "darkTheme",
  "themeColor",
  "searchText",
  "pageData",
  "scrollTop",
];

const nexus = createReactNexus<WorkbenchState>({
  state: {
    activePage: "",
    darkTheme: false,
    themeColor: "grey",
    pageData: null,
    searchText: "",
    scrollTop: 0,
    windowScale: null,
    workbenchScope: "[workbench-scope]",
  },
});

// Hydrates synchronously from localStorage before the first render (no
// default-state flash), then debounces write-back. localStorage keeps the
// choice across a browser restart; on the server it is a no-op.
persist(nexus, {
  key: PERSIST_KEY,
  include: PERSISTED_KEYS,
  debounce: 150,
});

// A hash link only carries navigation; overlay it on top of the hydrated
// preferences. The card position from the hash is kept so closing a demo opened
// in a new tab shrinks the overlay back onto its card, not the viewport corner.
const hashState = getHashWorkbenchState();
if (hashState) {
  nexus.set({
    activePage: hashState.activePage,
    pageData: {
      scrollTop: hashState.scrollTop,
      top: hashState.top,
      left: hashState.left,
    },
    searchText: hashState.searchText,
    scrollTop: hashState.scrollTop,
  });
}

export default nexus;

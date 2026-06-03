import type { ComponentType, ReactNode } from "react";

export type DemoModule = {
  default: ComponentType<{ pageName?: string; children?: ReactNode }>;
  css?: string[];
  cssFiles?: string[];
};

export type DemoItem = {
  name: string;
  load: () => Promise<DemoModule>;
  css?: string[];
  cssFiles?: string[];
};

export type DemoWorkbenchViewport = {
  width: number;
  height: number;
};

export type DemoWorkbenchInitialState = {
  darkTheme?: boolean;
  searchText?: string;
  searchData?: string[] | null;
  activePage?: string;
  pageData?: {
    scrollTop?: number | string;
    top?: number | string;
    left?: number | string;
  } | null;
  popupState?: unknown;
  windowScale?: number;
};

export type DemoWorkbenchProps = {
  title?: string;
  demos?: DemoItem[];
  cssLoader?: (name: string) => Promise<unknown>;
  baseCssFiles?: string[];
  shellCssFiles?: string[];
  storageData?: Array<[string, "local" | "session" | undefined]>;
  viewport?: DemoWorkbenchViewport;
  initialState?: DemoWorkbenchInitialState;
  renderDemoContent?: (pageName: string) => ReactNode;
  renderSvgDefs?: () => ReactNode;
  notFoundComponent?: ComponentType;
};

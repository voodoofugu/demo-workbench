import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyledAtom as InlineStyledAtom } from "styled-atom";
import type {
  ImportStyleResult,
  ImportStyle,
  StyleAtomCssReplacement,
} from "styled-atom";

import { StyledAtom, workbenchStyleAtoms } from "../styles/styledAtom";
import workbenchStyles from "../styles/workbenchStyles";
import RawWorkbenchStorage from "../state/WorkbenchStorage";
import generatedWorkbenchRegistry from "../state/generatedWorkbenchRegistry";
import { WorkbenchStateProvider } from "../state/WorkbenchState";
import { useStableStringList } from "../utils/useStableStringList";
import { getHashWorkbenchState } from "../utils/workbenchPosition";
import { readStoredWorkbenchState } from "../utils/workbenchStorageState";
import RawWorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";

import type {
  DemoItem,
  DemoWorkbenchInitialState,
  DemoWorkbenchProps,
  DemoWorkbenchStorageEntry,
  DemoWorkbenchViewport,
} from "../types/public";

const TypedWorkbenchStorage = RawWorkbenchStorage as ComponentType<{
  storageData: DemoWorkbenchStorageEntry[];
}>;

const TypedWorkbenchShell = RawWorkbenchShell as ComponentType<{
  title: string;
  demos: DemoItem[];
  viewport: DemoWorkbenchViewport;
  renderDemoContent: DemoWorkbenchProps["renderDemoContent"];
  bodyBg: DemoWorkbenchProps["bodyBg"];
  notFoundComponent: DemoWorkbenchProps["notFoundComponent"];
}>;

const defaultStorageData: DemoWorkbenchStorageEntry[] = [
  ["activePage"],
  ["darkTheme", "local"],
  ["searchData"],
  ["searchText"],
  ["pageData"],
  ["scrollTop"],
  ["windowScale"],
];

const defaultViewport: DemoWorkbenchViewport = { width: 1200, height: 640 };
const emptyCssLoader = () => Promise.resolve();
const STYLE_RELOAD_MANIFEST_POLL_MS = 2000;

function readStyleReloadFileNames(event: MessageEvent) {
  try {
    const data = JSON.parse(String(event.data)) as { fileNames?: unknown };
    return Array.isArray(data.fileNames)
      ? data.fileNames.filter(
          (fileName): fileName is string => typeof fileName === "string",
        )
      : undefined;
  } catch {
    return undefined;
  }
}

function getStyleReloadCssUrl(styleReloadUrl: string, fileName: string) {
  const url = new URL(styleReloadUrl, window.location.href);
  url.searchParams.set("style", fileName);
  url.searchParams.set("v", String(Date.now()));
  return url.toString();
}

async function loadStyleFromReloadServer(
  styleReloadUrl: string,
  fileName: string,
) {
  const response = await fetch(getStyleReloadCssUrl(styleReloadUrl, fileName), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load workbench style "${fileName}"`);
  }

  return response.text();
}

async function loadStyleReplacements(
  styleReloadUrl: string,
  fileNames: readonly string[],
): Promise<StyleAtomCssReplacement[]> {
  return Promise.all(
    fileNames.map(async (fileName) => ({
      file: fileName,
      css: await loadStyleFromReloadServer(styleReloadUrl, fileName),
    })),
  );
}

async function loadStyleReloadUrlFromManifest(manifestUrl: string) {
  const response = await fetch(manifestUrl, { cache: "no-store" });

  if (!response.ok) return undefined;

  const manifest = (await response.json()) as {
    enabled?: unknown;
    styleReloadUrl?: unknown;
  };

  return manifest.enabled === true &&
    typeof manifest.styleReloadUrl === "string"
    ? manifest.styleReloadUrl
    : undefined;
}

function WorkbenchGlobalStyles({ hostFileNames }: { hostFileNames: string[] }) {
  return hostFileNames.length ? <StyledAtom files={hostFileNames} /> : null;
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbench***:
 * searchable React shell for local component and screen demos.
 * @description
 * Renders the full reusable workbench UI: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted shell state. `workbenchCompile` supplies the generated demo registry; the host project supplies a `demoLoader`, style loading and optional render hooks while `demo-workbench` owns the repeated shell behavior.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   title="Project demos"
 *   demoLoader={(name) => import(`./pages/${name}`)}
 *   styleLoader={(name) => import(`./workbench-css/${name}.css`)}
 * />
 * ```
 */
export default function DemoWorkbench({
  title = "Demo Workbench",
  demoLoader,
  styleLoader,
  styleReloadUrl,
  styleReloadManifestUrl,
  baseCssFiles,
  storageData = defaultStorageData,
  viewport = defaultViewport,
  initialState,
  renderDemoContent,
  bodyBg,
  notFoundComponent,
}: DemoWorkbenchProps) {
  const resolvedStyleLoader: (name: string) => Promise<unknown> =
    styleLoader ?? emptyCssLoader;
  const [manifestStyleReloadUrl, setManifestStyleReloadUrl] = useState<
    string | undefined
  >();
  const directStyleReloadUrl =
    styleReloadUrl === false ? undefined : styleReloadUrl;
  const resolvedStyleReloadUrl =
    styleReloadUrl === undefined
      ? manifestStyleReloadUrl
      : directStyleReloadUrl;
  const styleLoaderRef = useRef(resolvedStyleLoader);
  const styleReloadUrlRef = useRef(resolvedStyleReloadUrl);

  useEffect(() => {
    styleLoaderRef.current = resolvedStyleLoader;
  }, [resolvedStyleLoader]);

  useEffect(() => {
    styleReloadUrlRef.current = resolvedStyleReloadUrl;
  }, [resolvedStyleReloadUrl]);

  useEffect(() => {
    if (
      styleReloadUrl !== undefined ||
      !styleReloadManifestUrl ||
      typeof window === "undefined"
    ) {
      setManifestStyleReloadUrl(undefined);
      return;
    }

    let isActive = true;
    const resolvedManifestUrl = new URL(
      styleReloadManifestUrl,
      window.location.href,
    ).toString();

    const readManifest = () => {
      loadStyleReloadUrlFromManifest(resolvedManifestUrl)
        .then((nextUrl) => {
          if (!isActive) return;
          setManifestStyleReloadUrl((currentUrl) =>
            currentUrl === nextUrl ? currentUrl : nextUrl,
          );
        })
        .catch(() => {
          if (isActive) {
            setManifestStyleReloadUrl(undefined);
          }
        });
    };

    readManifest();
    const interval = window.setInterval(
      readManifest,
      STYLE_RELOAD_MANIFEST_POLL_MS,
    );

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [styleReloadManifestUrl, styleReloadUrl]);

  const loadStyle = useCallback<ImportStyle>(async (fileName: string) => {
    const reloadUrl = styleReloadUrlRef.current;
    if (reloadUrl) {
      try {
        return await loadStyleFromReloadServer(reloadUrl, fileName);
      } catch {
        // Fall back to the host loader when the dev reload server is not alive.
      }
    }

    return (await styleLoaderRef.current(fileName)) as ImportStyleResult;
  }, []);

  useEffect(() => {
    workbenchStyleAtoms.configure(loadStyle);
  }, [loadStyle]);

  useEffect(() => {
    if (
      !resolvedStyleReloadUrl ||
      typeof window === "undefined" ||
      typeof window.EventSource === "undefined"
    ) {
      return;
    }

    const source = new window.EventSource(resolvedStyleReloadUrl);
    let isActive = true;
    const reloadStyles = (event: MessageEvent) => {
      const fileNames = readStyleReloadFileNames(event);

      if (!fileNames?.length) return;

      loadStyleReplacements(resolvedStyleReloadUrl, fileNames)
        .then((styles) => {
          if (isActive) {
            workbenchStyleAtoms.replace(styles);
          }
        })
        .catch(() => {
          if (isActive) {
            workbenchStyleAtoms.reload(fileNames);
          }
        });
    };

    source.addEventListener("styles", reloadStyles as EventListener);

    return () => {
      isActive = false;
      source.removeEventListener("styles", reloadStyles as EventListener);
      source.close();
    };
  }, [resolvedStyleReloadUrl]);

  const rawHostCssFiles = baseCssFiles ?? ["output"];
  const hostCssFiles = useStableStringList(rawHostCssFiles);

  const registryDemos = useMemo(
    () =>
      generatedWorkbenchRegistry.demos.map((name) => ({
        name,
        load: () => demoLoader(name),
      })),
    [demoLoader],
  );
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

    return {
      ...nextInitialState,
      baseCssFiles: hostCssFiles,
    } as DemoWorkbenchInitialState;
  }, [hostCssFiles, initialState, storageData]);

  return (
    <InlineStyledAtom name="demo-workbench" encap styles={workbenchStyles}>
      <WorkbenchStateProvider initialState={restoredInitialState}>
        <WorkbenchGlobalStyles hostFileNames={hostCssFiles} />
        <WorkbenchTitle title={title} />
        <TypedWorkbenchStorage storageData={storageData} />
        <TypedWorkbenchShell
          title={title}
          demos={registryDemos}
          viewport={viewport}
          renderDemoContent={renderDemoContent}
          bodyBg={bodyBg}
          notFoundComponent={notFoundComponent}
        />
      </WorkbenchStateProvider>
    </InlineStyledAtom>
  );
}

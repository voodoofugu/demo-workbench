import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StyledAtom from "styled-atom";
import type {
  ImportStyleResult,
  ImportStyle,
  StyleAtomCssReplacement,
} from "styled-atom";

import {
  StyledAtom as WorkbenchStyledAtom,
  workbenchStyleAtoms,
} from "../styles/styledAtom";
import workbenchStyles from "../styles/workbenchStyles";
import { WorkbenchHostCssFilesProvider } from "../state/WorkbenchHostCssFilesContext";
import { warnDevelopment } from "../utils/devWarnings";
import { useStableStringList } from "../hooks/useStableStringList";
import WorkbenchShell from "./WorkbenchShell";
import WorkbenchTitle from "./WorkbenchTitle";

import type { DemoItem, DemoWorkbenchProps } from "../types/public";

const emptyCssLoader = () => Promise.resolve();
const DEFAULT_STYLE_RELOAD_MANIFEST_URL =
  "/workbench-css/demo-workbench-style-reload.json";
const STYLE_RELOAD_MANIFEST_POLL_MS = 2000;

function isLocalWorkbenchHost() {
  if (typeof window === "undefined") return false;

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0" ||
    window.location.hostname === "::1"
  );
}

function getDefaultStyleReloadManifestUrl() {
  return isLocalWorkbenchHost() ? DEFAULT_STYLE_RELOAD_MANIFEST_URL : undefined;
}

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
  return hostFileNames.length ? (
    <WorkbenchStyledAtom files={hostFileNames} />
  ) : null;
}

function warnMissingStyleLoader(fileNames: readonly string[]) {
  if (!fileNames.length) return;

  warnDevelopment(
    "missing-style-loader",
    `styleLoader is missing, but styles are requested (${fileNames.join(", ")}). Pass styleLoader or remove baseStyles/cssFiles.`,
  );
}

function warnInvalidDemoModule(name: string) {
  warnDevelopment(
    `invalid-demo-module:${name}`,
    `demo "${name}" loaded a module without a default React component.`,
  );
}

function warnFailedDemoLoad(name: string, error: unknown) {
  warnDevelopment(
    `failed-demo-load:${name}`,
    `demo "${name}" failed to load.`,
    error,
  );
}

function warnFailedStyleLoad(fileName: string, error: unknown) {
  warnDevelopment(
    `failed-style-load:${fileName}`,
    `style "${fileName}" failed to load.`,
    error,
  );
}

/**---
 * ## ![logo](https://github.com/voodoofugu/demo-workbench/raw/main/src/assets/demo-workbench-logo.png)
 * ### ***DemoWorkbench***:
 * searchable React shell for local component and screen demos.
 * @description
 * Renders the full reusable workbench UI: header, search, theme toggle, scrollable demo grid, loading state, opened-demo modal and persisted shell state. `runWorkbenchCompile` can generate a host-owned demo manifest; the host project supplies demos, style loading and optional render hooks while `demo-workbench` owns the repeated shell behavior. For local style reload, serve the compiled style output directory as `/workbench-css/`.
 * @example
 * ```tsx
 * <DemoWorkbench
 *   title="Project demos"
 *   demos={demos}
 *   styleLoader={(name) => import(`./workbench-css/${name}.css`)}
 *   baseStyles={["output", "theme"]}
 * />
 * ```
 */
export default function DemoWorkbench({
  title = "Demo Workbench",
  demos,
  styleLoader,
  baseStyles,
  baseCssFiles,
  autoScale,
  renderDemoContent,
  bodyBg,
}: DemoWorkbenchProps) {
  const resolvedStyleLoader: (name: string) => Promise<unknown> =
    styleLoader ?? emptyCssLoader;
  const [manifestStyleReloadUrl, setManifestStyleReloadUrl] = useState<
    string | undefined
  >();
  const resolvedStyleReloadUrl = manifestStyleReloadUrl;
  const resolvedStyleReloadManifestUrl = getDefaultStyleReloadManifestUrl();
  const styleLoaderRef = useRef(resolvedStyleLoader);
  const styleReloadUrlRef = useRef(resolvedStyleReloadUrl);

  useEffect(() => {
    styleLoaderRef.current = resolvedStyleLoader;
  }, [resolvedStyleLoader]);

  useEffect(() => {
    styleReloadUrlRef.current = resolvedStyleReloadUrl;
  }, [resolvedStyleReloadUrl]);

  useEffect(() => {
    if (!resolvedStyleReloadManifestUrl || typeof window === "undefined") {
      setManifestStyleReloadUrl(undefined);
      return;
    }

    let isActive = true;
    const resolvedManifestUrl = new URL(
      resolvedStyleReloadManifestUrl,
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
  }, [resolvedStyleReloadManifestUrl]);

  const loadStyle = useCallback<ImportStyle>(async (fileName: string) => {
    const reloadUrl = styleReloadUrlRef.current;
    if (reloadUrl) {
      try {
        return await loadStyleFromReloadServer(reloadUrl, fileName);
      } catch {
        // Fall back to the host loader when the dev reload server is not alive.
      }
    }

    try {
      return (await styleLoaderRef.current(fileName)) as ImportStyleResult;
    } catch (error) {
      warnFailedStyleLoad(fileName, error);
      throw error;
    }
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

  const rawHostCssFiles = baseStyles ?? baseCssFiles ?? ["output"];
  const hostCssFiles = useStableStringList(rawHostCssFiles);

  useEffect(() => {
    if (!styleLoader) {
      warnMissingStyleLoader(hostCssFiles);
    }
  }, [hostCssFiles, styleLoader]);

  const manifestDemos = useMemo<DemoItem[]>(() => {
    return demos.map((demo) => ({
      ...demo,
      load: async () => {
        try {
          const module = await demo.load();

          if (!module?.default) {
            warnInvalidDemoModule(demo.name);
          }

          return module;
        } catch (error) {
          warnFailedDemoLoad(demo.name, error);
          throw error;
        }
      },
    }));
  }, [demos]);

  return (
    <StyledAtom name="demo-workbench" encap styles={workbenchStyles}>
      <WorkbenchHostCssFilesProvider files={hostCssFiles}>
        <WorkbenchGlobalStyles hostFileNames={hostCssFiles} />
        <WorkbenchTitle title={title} />
        <WorkbenchShell
          title={title}
          demos={manifestDemos}
          autoScale={autoScale}
          renderDemoContent={renderDemoContent}
          bodyBg={bodyBg}
        />
      </WorkbenchHostCssFilesProvider>
    </StyledAtom>
  );
}

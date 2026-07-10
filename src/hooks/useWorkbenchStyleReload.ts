import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ImportStyle,
  ImportStyleResult,
  StyleAtomCssReplacement,
} from "styled-atom";

import { workbenchStyleAtoms } from "../styles/styledAtom";
import { warnDevelopment } from "../utils/devWarnings";

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

function warnFailedStyleLoad(fileName: string, error: unknown) {
  warnDevelopment(
    `failed-style-load:${fileName}`,
    `style "${fileName}" failed to load.`,
    error,
  );
}

/**
 * Wires styled-atom to the host `styleLoader` and, on a local dev host, layers
 * the compiler's style-reload dev server on top: it polls the reload manifest,
 * fetches fresh CSS from the reload endpoint (falling back to the host loader),
 * and hot-swaps changed styles over Server-Sent Events without remounting
 * previews. A no-op on non-local hosts and on the server.
 */
export function useWorkbenchStyleReload(
  styleLoader?: (name: string) => Promise<unknown>,
) {
  const resolvedStyleLoader = styleLoader ?? emptyCssLoader;
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
}

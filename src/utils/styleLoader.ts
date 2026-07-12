import type { ImportStyle, ImportStyleResult } from "styled-atom";

import type { DemoWorkbenchStyleLoader } from "../types/public";

const emptyCssLoader: ImportStyle = () => Promise.resolve();

function encodeStylePath(fileName: string) {
  const cssFileName = fileName.endsWith(".css") ? fileName : `${fileName}.css`;
  return cssFileName.split("/").map(encodeURIComponent).join("/");
}

/**
 * Builds the fetch URL for a style name under a public URL prefix. Handles a
 * trailing slash on the prefix, appends `.css` when missing, and percent-encodes
 * each path segment. `("/workbench-css/", "reset")` → `/workbench-css/reset.css`.
 */
export function getStyleLoaderCssUrl(urlPrefix: string, fileName: string) {
  const separator = urlPrefix.endsWith("/") ? "" : "/";
  return `${urlPrefix}${separator}${encodeStylePath(fileName)}`;
}

async function loadStyleFromUrlPrefix(urlPrefix: string, fileName: string) {
  // `no-store` so a one-shot recompile is picked up even without the dev reload
  // server; styled-atom caches the result in memory, so this fetches once.
  const response = await fetch(getStyleLoaderCssUrl(urlPrefix, fileName), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load workbench style "${fileName}"`);
  }

  return response.text();
}

/**
 * Normalizes the two `styleLoader` forms into a single loader function:
 * a URL-prefix string (fetch `${prefix}/${name}.css`) or a custom loader
 * function. Missing loader resolves to a no-op.
 */
export function toStyleLoader(styleLoader?: DemoWorkbenchStyleLoader): ImportStyle {
  if (!styleLoader) return emptyCssLoader;
  if (typeof styleLoader === "string") {
    return (fileName) => loadStyleFromUrlPrefix(styleLoader, fileName);
  }

  return async (fileName) =>
    (await styleLoader(fileName)) as ImportStyleResult;
}

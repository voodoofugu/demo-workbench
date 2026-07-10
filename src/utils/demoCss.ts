import type { DemoModule } from "../types/public";

// A demo declares its scoped CSS by exporting `cssFiles` from its module, so the
// names are read straight off the loaded module — there is no separate manifest
// field to reconcile.
export function normalizeModuleCssFiles(module: DemoModule | null): string[] {
  const moduleCssFiles = module?.cssFiles ?? [];
  return Array.isArray(moduleCssFiles)
    ? moduleCssFiles.filter(
        (file): file is string => typeof file === "string" && file.length > 0,
      )
    : [];
}

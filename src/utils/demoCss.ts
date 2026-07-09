import type { DemoItem, DemoModule } from "../types/public";
import { normalizeDemoCssFiles } from "./normalizeDemoCssFiles";

export function normalizeModuleCssFiles(
  demo: DemoItem,
  module: DemoModule | null,
): string[] {
  const demoCssFiles = normalizeDemoCssFiles(demo);

  if (demoCssFiles.length) return demoCssFiles;

  const moduleCssFiles = module?.cssFiles ?? [];
  return Array.isArray(moduleCssFiles) ? moduleCssFiles.filter(Boolean) : [];
}

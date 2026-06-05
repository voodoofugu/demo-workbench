import type { DemoItem } from "../types/public";

export function normalizeDemoCssFiles(demo: DemoItem): string[] {
  const cssFiles = demo.cssFiles ?? demo.css ?? [];

  return Array.isArray(cssFiles) ? cssFiles.filter(Boolean) : [];
}

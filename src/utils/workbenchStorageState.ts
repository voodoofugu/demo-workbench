import type { DemoWorkbenchStorageEntry } from "../types/public";
import type { WorkbenchState } from "../state/nexus";
import { getBrowserStorage, parseStoredValue } from "./storage.js";

export function normalizeStorageEntries(
  storageData: DemoWorkbenchStorageEntry[] = [],
): { name: string; type: "local" | "session" }[] {
  return storageData
    .map((item) => ({
      name: item[0],
      type: item[1] ?? "session",
    }))
    .filter((item): item is { name: string; type: "local" | "session" } =>
      Boolean(item.name),
    );
}

export function readStoredWorkbenchState(
  storageData: DemoWorkbenchStorageEntry[] = [],
): Partial<WorkbenchState> {
  const restoredState: Partial<WorkbenchState> = {};

  normalizeStorageEntries(storageData).forEach((item) => {
    const storage = getBrowserStorage(item.type);
    const value = parseStoredValue(storage?.getItem(item.name) ?? null);

    if (value !== undefined) {
      (restoredState as Record<string, unknown>)[item.name] = value;
    }
  });

  return restoredState;
}

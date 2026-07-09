import type { DemoWorkbenchStorageEntry } from "../types/internal";
import type { WorkbenchState } from "../state/nexus";
import { readStoredEntries } from "./storage.js";

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
  return readStoredEntries(normalizeStorageEntries(storageData)) as Partial<WorkbenchState>;
}

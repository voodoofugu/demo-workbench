import { useLayoutEffect, useMemo } from "react";

import { getBrowserStorage, shouldRemoveStoredValue, stringifyStoredValue } from "../utils/storage.js";

export default function useStorageItems(storageData = [], store) {
  const entries = useMemo(
    () =>
      storageData.map((item) => ({
        name: item[0] ?? item.name,
        type: item[1] ?? item.type ?? "session",
      })),
    [storageData],
  );
  const entriesKey = JSON.stringify(entries);

  useLayoutEffect(() => {
    if (!store) return;
    const storageItems = entries.filter((item) => item.name);
    if (!storageItems.length) return;

    const writeState = (state) => {
      storageItems.forEach((item) => {
        const type = item.type || "session";
        const storage = getBrowserStorage(type);
        if (!storage) return;

        const value = state[item.name];
        if (shouldRemoveStoredValue(value)) {
          storage.removeItem(item.name);
          return;
        }

        storage.setItem(item.name, stringifyStoredValue(value));
      });
    };

    return store.subscribe(writeState, storageItems.map((item) => item.name));
  }, [entriesKey, store]);
}

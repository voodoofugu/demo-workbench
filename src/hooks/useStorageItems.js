import { useLayoutEffect, useMemo } from "react";

import {
  getBrowserStorage,
  parseStoredValue,
  shouldRemoveStoredValue,
  stringifyStoredValue,
} from "../utils/storage.js";

const hydratedStorageKeys = new WeakMap();

export default function useStorageItems(storageData = [], store, hydrateInitial = true) {
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

    let hydratedKeys = hydratedStorageKeys.get(store);
    if (!hydratedKeys) {
      hydratedKeys = new Set();
      hydratedStorageKeys.set(store, hydratedKeys);
    }

    if (hydrateInitial && !hydratedKeys.has(entriesKey)) {
      const restoredState = {};

      storageItems.forEach((item) => {
        const type = item.type || "session";
        const storage = getBrowserStorage(type);
        const value = parseStoredValue(storage?.getItem(item.name) ?? null);

        if (value !== undefined) {
          restoredState[item.name] = value;
        }
      });

      hydratedKeys.add(entriesKey);

      if (Object.keys(restoredState).length) {
        store.set(restoredState);
      }
    }

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
  }, [entriesKey, store, hydrateInitial]);
}

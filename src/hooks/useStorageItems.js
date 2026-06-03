import { useEffect, useRef } from "react";

function getStorage(type) {
  return type === "local" ? localStorage : sessionStorage;
}

function parseValue(value) {
  if (value == null) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringifyValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default function useStorageItems(items = []) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    items.forEach((item) => {
      const type = item.type || "session";
      const value = parseValue(getStorage(type).getItem(item.name));

      if (value !== undefined && item.onLoad) {
        item.onLoad(value);
      }
    });
  }, []);

  useEffect(() => {
    items.forEach((item) => {
      const type = item.type || "session";

      if (item.value === undefined || item.value === null || item.value === false) {
        getStorage(type).removeItem(item.name);
        return;
      }

      getStorage(type).setItem(item.name, stringifyValue(item.value));
    });
  }, [items]);
}

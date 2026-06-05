export function getBrowserStorage(type) {
  if (typeof window === "undefined") return null;
  return type === "local" ? window.localStorage : window.sessionStorage;
}

export function parseStoredValue(value) {
  if (value == null) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function stringifyStoredValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function shouldRemoveStoredValue(value) {
  return value === undefined || value === null || value === false;
}

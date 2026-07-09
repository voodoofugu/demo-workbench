export function getBrowserStorage(type) {
  if (typeof window === "undefined") return null;
  return type === "local" ? window.localStorage : window.sessionStorage;
}

// безопасная версия парсера
const JSON_NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export function parseStoredValue(value) {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return value;

  const first = trimmedValue[0];
  const last = trimmedValue[trimmedValue.length - 1];

  const looksLikeJson =
    (first === "{" && last === "}") ||
    (first === "[" && last === "]") ||
    (first === '"' && last === '"') ||
    trimmedValue === "true" ||
    trimmedValue === "false" ||
    trimmedValue === "null" ||
    JSON_NUMBER_RE.test(trimmedValue);

  if (!looksLikeJson) return value;

  try {
    return JSON.parse(trimmedValue);
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

export function readStoredEntries(entries = []) {
  const restoredState = {};

  entries.forEach((item) => {
    const storage = getBrowserStorage(item.type);
    const value = parseStoredValue(storage?.getItem(item.name) ?? null);

    if (value !== undefined) {
      restoredState[item.name] = value;
    }
  });

  return restoredState;
}

const shownWarnings = new Set<string>();

function isDevelopmentRuntime() {
  const processEnv = globalThis.process as
    | { env?: { NODE_ENV?: string } }
    | undefined;

  return processEnv?.env?.NODE_ENV !== "production";
}

export function warnDevelopment(key: string, message: string, error?: unknown) {
  if (!isDevelopmentRuntime() || shownWarnings.has(key)) return;

  shownWarnings.add(key);

  if (error !== undefined) {
    console.warn(`demo-workbench: ${message}`, error);
    return;
  }

  console.warn(`demo-workbench: ${message}`);
}

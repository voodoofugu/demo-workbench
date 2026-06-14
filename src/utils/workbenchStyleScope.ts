export function toWorkbenchStyleClassName(fileName: string) {
  const baseName = fileName.replace(/\.(css|scss|sass)$/i, "").trim();
  const normalized =
    baseName
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "style";

  return /^-?\d/.test(normalized) ? `css-${normalized}` : normalized;
}

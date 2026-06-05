import type { HTMLAttributes } from "react";

export type DemoBodySelectorProps = Pick<
  HTMLAttributes<HTMLDivElement>,
  "className" | "id"
> &
  Record<`data-${string}`, string | boolean>;

export function parseBodySelectorReplacement(
  selector?: string,
): DemoBodySelectorProps {
  const normalizedSelector = selector?.trim();
  if (!normalizedSelector) return {};

  const classMatch = normalizedSelector.match(/^\.([A-Za-z_-][\w-]*)$/);
  if (classMatch) return { className: classMatch[1] };

  const idMatch = normalizedSelector.match(/^#([A-Za-z_-][\w-]*)$/);
  if (idMatch) return { id: idMatch[1] };

  const attrMatch = normalizedSelector.match(
    /^\[(data-[\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]$/,
  );
  if (!attrMatch) return {};

  const [, name, doubleQuotedValue, singleQuotedValue, unquotedValue] =
    attrMatch;
  const rawValue = doubleQuotedValue ?? singleQuotedValue ?? unquotedValue;
  return { [name]: rawValue?.trim() ?? true };
}

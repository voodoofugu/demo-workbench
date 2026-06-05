import { useMemo, useRef } from "react";

function areStringListsEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Keeps array identity stable while the string contents stay the same.
 *
 * `styled-atom` treats the `fileNames` array as an effect dependency. Host apps
 * often pass inline arrays/functions from render, so preserving the previous
 * array reference prevents redundant style-store updates during scroll and other
 * unrelated React re-renders.
 */
export function useStableStringList(values: readonly string[]) {
  const ref = useRef<readonly string[]>(values);

  if (!areStringListsEqual(ref.current, values)) {
    ref.current = values;
  }

  return useMemo(() => [...ref.current], [ref.current]);
}

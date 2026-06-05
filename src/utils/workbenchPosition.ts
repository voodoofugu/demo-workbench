export type PositionData = {
  scrollTop: number;
  top: number;
  left: number;
};

export type HashWorkbenchState = PositionData & {
  activePage: string;
  searchText: string;
};

export function getHashWorkbenchState(): HashWorkbenchState | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (hash.length <= 2 || hash[2] !== "&") return null;

  const [
    rawPageName = "",
    rawScrollTop = "0",
    rawTop = "0",
    rawLeft = "0",
    rawSearchText = "",
  ] = hash.substring(3).split("/");

  return {
    activePage: decodeURIComponent(rawPageName),
    scrollTop: Number(rawScrollTop) || 0,
    top: Number(rawTop) || 0,
    left: Number(rawLeft) || 0,
    searchText: decodeURIComponent(rawSearchText),
  };
}

export function getElementPositionData(
  element: HTMLElement,
  scrollTop: number,
): PositionData {
  const rect = element.getBoundingClientRect();

  return {
    scrollTop: Math.round(scrollTop) || 0,
    top: Math.round(rect.top - 233),
    left: Math.round(rect.left - 482),
  };
}

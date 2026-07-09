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

// Offsets that align the collapsed page overlay (a fixed 1200x640 element
// scaled down from its center, see `.demo-workbench-page-overlay` in
// workbenchStyles) with the card's preview frame. Empirically tuned for the
// 1200x640 frame at scale 0.180134 — retune when those style values change.
const COLLAPSED_OVERLAY_OFFSET_TOP = 233;
const COLLAPSED_OVERLAY_OFFSET_LEFT = 482;

export function getElementPositionData(
  element: HTMLElement,
  scrollTop: number,
): PositionData {
  const rect = element.getBoundingClientRect();

  return {
    scrollTop: Math.round(scrollTop) || 0,
    top: Math.round(rect.top - COLLAPSED_OVERLAY_OFFSET_TOP),
    left: Math.round(rect.left - COLLAPSED_OVERLAY_OFFSET_LEFT),
  };
}

import { memo, useCallback, useMemo, useState } from "react";
import { StyledAtom } from "styled-atom";

import useDynamicModule from "../hooks/useDynamicModule";
import { useWorkbenchStore } from "../state/WorkbenchState";
import { parseBodySelectorReplacement } from "../utils/bodySelector";
import { normalizeModuleCssFiles } from "../utils/demoCss";
import { getElementPositionData } from "../utils/workbenchPosition";
import PageCloseBtn from "./buttons/PageCloseBtn";
import Loading from "./feedback/Loading";
import Tooltip from "./Tooltip";
import workbenchNexus from "../state/workbenchNexus";

import type { ComponentType, MouseEvent, ReactNode } from "react";
import type { DemoItem, DemoModule } from "../types/public";

type DemoCellMode = "card" | "page";

type DemoCellProps = {
  demo: DemoItem & {
    Component?: ComponentType<{ pageName?: string; children?: ReactNode }>;
  };
  mode?: DemoCellMode;
  isOpen?: boolean;
  showContent?: boolean;
  onOpen?: (demoName: string, event: MouseEvent<HTMLElement>) => void;
  onClose?: (demoName?: string) => void;
  renderDemoContent?: (pageName: string) => ReactNode;
  bodySelectorReplacement?: string;
  isScrolling?: boolean;
  scrollTop?: number;
  searchText?: string;
};

const loadFill = (
  <div className="relative h-full min-h-[120px] w-full overflow-hidden rounded-2xl bg-indigo-100/70 dark:bg-slate-900/70">
    <Loading noBG />
  </div>
);

function InfoBadge({ pageName }: { pageName: string }) {
  return (
    <Tooltip text={pageName} position="top">
      <div className="absolute left-214 top-6 flex h-16 w-16 cursor-help items-center justify-center rounded-3xl bg-indigo-200 text-base font-bold text-indigo-500 text-shadow-tS1 shadow-shadowColorDark7 transition-all1 hover:bg-blue-200 dark:bg-indigo-500 dark:text-indigo-900 dark:text-shadow-tS1Black dark:shadow-darkThemeSearchInput dark:hover:bg-emerald-500">
        i
      </div>
    </Tooltip>
  );
}

function DemoBody({
  pageName,
  Component,
  mode,
  showContent,
  renderDemoContent,
  bodySelectorReplacement,
  windowScale,
}: {
  pageName: string;
  Component?: ComponentType<{ pageName?: string; children?: ReactNode }>;
  mode: DemoCellMode;
  showContent?: boolean;
  renderDemoContent?: (pageName: string) => ReactNode;
  bodySelectorReplacement?: string;
  windowScale?: number | null;
}) {
  if (!Component) return loadFill;

  const shouldRenderContent = mode === "page" && showContent !== false;
  const bodySelectorProps = parseBodySelectorReplacement(
    bodySelectorReplacement,
  );
  const bodyClassName = [
    mode === "page"
      ? "likeBody relative min-h-full"
      : "likeBody relative h-full",
    bodySelectorProps.className,
  ]
    .filter(Boolean)
    .join(" ");
  const scaledStyle =
    mode === "page" && windowScale
      ? {
          transform: `scale(${windowScale}) translateX(-50%)`,
          transformOrigin: "left top",
          position: "absolute" as const,
          left: "50%",
        }
      : undefined;

  return (
    <div id="resize" style={scaledStyle}>
      <div
        {...bodySelectorProps}
        id={bodySelectorProps.id ?? pageName}
        className={bodyClassName}
      >
        <Component pageName={pageName}>
          {shouldRenderContent ? (
            <>
              {renderDemoContent?.(pageName)}
              <div className="tooltip-layer" />
            </>
          ) : null}
        </Component>
      </div>
    </div>
  );
}

const DemoCell = memo(function DemoCell({
  demo,
  mode = "card",
  isOpen = false,
  showContent,
  onOpen,
  onClose,
  renderDemoContent,
  bodySelectorReplacement,
  isScrolling,
  scrollTop = 0,
  searchText = "",
}: DemoCellProps) {
  const { state } = useWorkbenchStore();

  const pageName = demo.name ?? demo.title ?? "Untitled demo";
  const loadedModule = useDynamicModule(
    pageName,
    demo.load,
  ) as DemoModule | null;
  const DynamicComponent = demo.Component ?? loadedModule?.default;

  const baseCssFiles = workbenchNexus.get("baseCssFiles");
  const cssFiles = useMemo(
    () => normalizeModuleCssFiles(demo, loadedModule),
    [demo, loadedModule],
  );
  const [newTabPosition, setNewTabPosition] = useState({
    scrollTop: 0,
    top: 0,
    left: 0,
  });
  const hasLoadedObject = Boolean(DynamicComponent);

  const computePositionData = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      return getElementPositionData(event.currentTarget, scrollTop);
    },
    [scrollTop],
  );

  const handleOpen = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button === 1
      ) {
        return;
      }

      event.preventDefault();
      if (!DynamicComponent) return;
      onOpen?.(pageName, event);
    },
    [DynamicComponent, onOpen, pageName],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      setNewTabPosition(computePositionData(event));
    },
    [computePositionData],
  );

  const handleClose = useCallback(() => {
    onClose?.(pageName);
  }, [onClose, pageName]);

  const body = (
    <DemoBody
      pageName={pageName}
      Component={DynamicComponent}
      mode={mode}
      showContent={showContent}
      renderDemoContent={renderDemoContent}
      bodySelectorReplacement={bodySelectorReplacement}
      windowScale={(demo as { windowScale?: number | null }).windowScale}
    />
  );

  const content = cssFiles.length ? (
    <StyledAtom
      fileNames={[...cssFiles, ...baseCssFiles]}
      fallback={<Loading />}
      encap
    >
      {body}
    </StyledAtom>
  ) : (
    body
  );

  if (mode === "page") {
    return (
      <div className="relative min-h-full overflow-hidden dark:bg-slate-950">
        {content}
        <PageCloseBtn onClick={handleClose} />
      </div>
    );
  }

  // Compute the href for the demo card link
  const cardHref = `#/&${encodeURIComponent(pageName)}/${newTabPosition.scrollTop}/${newTabPosition.top}/${newTabPosition.left}/${encodeURIComponent(searchText)}`;
  const shouldRenderFallback = Boolean(
    (isScrolling && !hasLoadedObject) || state.activePage,
  );

  return (
    <div
      data-cell={pageName}
      className={`animate-ident relative flex h-156 w-238 items-center justify-center overflow-hidden rounded-18 bg-indigo-100 text-indigo-500 shadow-shadow4 transition-all1 hover:bg-indigo-50 hover:shadow-shadow8 active:scale-95 dark:bg-indigo-900 dark:text-indigo-400 dark:shadow-shadow5 dark:hover:bg-indigo-800 dark:hover:shadow-shadow6 ${
        isOpen
          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-indigo-100 dark:ring-offset-slate-950"
          : ""
      }`}
    >
      <div className="pointer-events-none absolute h-640 w-1200 translate-y-10 scale-[0.180134] overflow-hidden rounded-50 bg-white shadow-shadow3 dark:shadow-shadow7">
        {shouldRenderFallback ? (
          <div className="h-full w-full bg-indigo-100/70 dark:bg-slate-900/70" />
        ) : (
          content
        )}
      </div>
      <a
        className="absolute left-0 top-0 h-full w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap px-25 text-center text-xs font-bold leading-7 dark:text-shadow-tS1Black"
        href={cardHref}
        aria-disabled={!DynamicComponent}
        onClick={handleOpen}
        onMouseUp={handleMouseUp}
      >
        {demo.title ?? pageName}
      </a>
      <InfoBadge pageName={pageName} />
    </div>
  );
});

export default DemoCell;

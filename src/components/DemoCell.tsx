import { memo, useCallback, useEffect, useMemo, useState } from "react";

import useDynamicModule from "../hooks/useDynamicModule";
import nexus from "../state/nexus";
import { StyledAtom } from "../styles/styledAtom";
import { normalizeModuleCssFiles } from "../utils/demoCss";
import { useStableStringList } from "../hooks/useStableStringList";
import { toWorkbenchStyleClassName } from "../utils/workbenchStyleScope";
import { getElementPositionData } from "../utils/workbenchPosition";
import PageCloseBtn from "./buttons/PageCloseBtn";
import Loading from "./feedback/Loading";

import type { ComponentType, MouseEvent, ReactNode } from "react";
import type { DemoComponentProps, DemoItem, DemoModule } from "../types/public";

type DemoCellMode = "card" | "page";

type DemoCellProps = {
  demo: DemoItem & {
    Component?: ComponentType<DemoComponentProps>;
  };
  mode?: DemoCellMode;
  isOpen?: boolean;
  onOpen?: (demoName: string, event: MouseEvent<HTMLElement>) => void;
  onClose?: (demoName?: string) => void;
  onLoad?: (demoName: string) => void;
  renderDemoContent?: (pageName: string) => ReactNode;
  isDemoLoaded?: boolean;
  isScrolling?: boolean;
  scrollTop?: number;
  searchText?: string;
  windowScale?: number;
};

const loadFill = (
  <div className="demo-workbench-load-fill">
    <Loading noBG />
  </div>
);

function getWorkbenchScopeAttributeName(scopeSelector: string) {
  const match = scopeSelector.match(/^\[([^\]=\s]+)(?:=[^\]]*)?\]$/);
  return match?.[1] ?? "workbench-scope";
}

function getScopeClassName(classNames: readonly string[]) {
  return Array.from(
    new Set(
      classNames
        .filter(
          (className): className is string => typeof className === "string",
        )
        .map(toWorkbenchStyleClassName)
        .map((className) => className.trim())
        .filter(Boolean),
    ),
  ).join(" ");
}

function DemoBody({
  pageName,
  Component,
  mode,
  renderDemoContent,
  windowScale,
}: {
  pageName: string;
  Component?: ComponentType<DemoComponentProps>;
  mode: DemoCellMode;
  renderDemoContent?: (pageName: string) => ReactNode;
  windowScale?: number;
}) {
  if (!Component) return loadFill;

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
    <div className="demo-workbench-demo-scale" style={scaledStyle}>
      <div id={pageName} className="demo-workbench-demo-body" data-mode={mode}>
        <Component pageName={pageName} isActive={mode === "page"}>
          {mode === "page" ? renderDemoContent?.(pageName) : null}
        </Component>
      </div>
    </div>
  );
}

const DemoCell = memo(function DemoCell({
  demo,
  mode = "card",
  isOpen = false,
  onOpen,
  onClose,
  onLoad,
  renderDemoContent,
  isDemoLoaded = false,
  isScrolling,
  scrollTop = 0,
  searchText = "",
  windowScale,
}: DemoCellProps) {
  const activePage = nexus.use("activePage");
  const workbenchScope = nexus.use("workbenchScope");
  const baseStyles = nexus.use("baseStyles");

  const pageName = demo.name ?? demo.title ?? "Untitled demo";
  const shouldLoadDynamicModule =
    !demo.Component && (mode === "page" || isDemoLoaded || !isScrolling);
  const loadedModule = useDynamicModule<DemoModule>(pageName, demo.load, {
    enabled: shouldLoadDynamicModule,
  });
  const DynamicComponent = demo.Component ?? loadedModule?.default;

  const cssFiles = useMemo(
    () => normalizeModuleCssFiles(loadedModule),
    [loadedModule],
  );

  const stableCssFiles = useStableStringList(cssFiles);
  const [newTabPosition, setNewTabPosition] = useState({
    scrollTop: 0,
    top: 0,
    left: 0,
  });
  const hasLoadedObject = isDemoLoaded || Boolean(DynamicComponent);

  useEffect(() => {
    if (DynamicComponent) {
      onLoad?.(pageName);
    }
  }, [DynamicComponent, onLoad, pageName]);

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

  // Runs before the browser follows the link (middle click / cmd+click), so
  // the href always carries the card's current position for the new tab.
  const handleCardMouseDown = useCallback(
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
      renderDemoContent={renderDemoContent}
      windowScale={windowScale}
    />
  );

  const scopeClassName = useMemo(
    () => getScopeClassName([...baseStyles, ...stableCssFiles]),
    [baseStyles, stableCssFiles],
  );
  const scopeAttributeName = useMemo(
    () => getWorkbenchScopeAttributeName(workbenchScope),
    [workbenchScope],
  );

  const content = stableCssFiles.length ? (
    <StyledAtom
      files={stableCssFiles}
      fallback={<Loading />}
      encap={{
        attribute: { [scopeAttributeName]: "" },
        className: scopeClassName || undefined,
      }}
    >
      {body}
    </StyledAtom>
  ) : (
    body
  );

  if (mode === "page") {
    return (
      <div className="demo-workbench-page-cell">
        {content}
        <PageCloseBtn onClick={handleClose} />
      </div>
    );
  }

  // Compute the href for the demo card link
  const cardHref = `#/&${encodeURIComponent(pageName)}/${newTabPosition.scrollTop}/${newTabPosition.top}/${newTabPosition.left}/${encodeURIComponent(searchText)}`;

  const shouldRenderFallback = Boolean(
    (isScrolling && !hasLoadedObject) || activePage,
  );

  return (
    <div
      data-cell={pageName}
      className="demo-workbench-card"
      data-open={isOpen ? "true" : "false"}
    >
      <div className="demo-workbench-preview-frame">
        {shouldRenderFallback ? (
          <div className="demo-workbench-card-fallback" />
        ) : (
          content
        )}
      </div>
      <a
        className="demo-workbench-card-link"
        href={cardHref}
        aria-disabled={!DynamicComponent}
        onClick={handleOpen}
        onMouseDown={handleCardMouseDown}
      >
        {demo.title ?? pageName}
      </a>
    </div>
  );
});

export default DemoCell;

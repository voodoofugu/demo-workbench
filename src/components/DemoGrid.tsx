import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { MorphScroll } from "morphing-scroll";

import DemoCell from "./DemoCell";
import ToTopButton from "./buttons/ToTopButton";
import { useWorkbenchStore } from "../state/WorkbenchState";
import { normalizeDemoCssFiles } from "../utils/normalizeDemoCssFiles";
import { matchesCssFilter } from "../utils/demoCss";
import {
  getElementPositionData,
  getHashWorkbenchState,
  type PositionData,
} from "../utils/workbenchPosition";

import type { DemoItem } from "../types/public";

type DemoGridProps = {
  demos: DemoItem[];
  query?: string;
  selectedCSS?: string;
  showContent?: boolean;
  pageClassName?: string;
  bodyBg?: string;
  renderDemoContent?: (pageName: string) => ReactNode;
  notFoundComponent?: ComponentType | undefined;
};

const DemoGrid = memo(function DemoGrid({
  demos,
  query = "",
  selectedCSS,
  showContent,
  pageClassName,
  bodyBg,
  renderDemoContent,
  notFoundComponent: NotFoundComponent,
}: DemoGridProps) {
  const { state, setWorkbenchState } = useWorkbenchStore();

  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [renderedDemoNames, setRenderedDemoNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [pagePosition, setPagePosition] = useState<PositionData>({
    scrollTop: 0,
    top: 0,
    left: 0,
  });
  const [pageExpanded, setPageExpanded] = useState<boolean>(false);
  const [scrollPosition, setScrollPosition] = useState<{
    value: number;
    updater: boolean;
    duration?: number;
  }>({
    value: 0,
    updater: false,
  });

  const activePage = state.activePage || "";
  const searchText = state.searchText || "";
  const darkTheme = Boolean(state.darkTheme);
  const savedScrollTop = Number(state.scrollTop) || 0;
  const lastStoredScrollTopRef = useRef(savedScrollTop);
  const latestSavedScrollTopRef = useRef(savedScrollTop);
  const pendingRenderedKeysRef = useRef<string[] | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const restoredScrollPositionRef = useRef(false);
  latestSavedScrollTopRef.current = savedScrollTop;

  const hashState = useMemo(() => getHashWorkbenchState(), []);

  const filteredDemos = useMemo(() => {
    const lowerQuery = (query || "").trim().toLowerCase();

    return demos.filter((demo) => {
      const title = demo.title ?? demo.name ?? "";
      const cssFiles = normalizeDemoCssFiles(demo);
      const searchMatch =
        !lowerQuery || title.toLowerCase().includes(lowerQuery);
      const cssMatch = matchesCssFilter(cssFiles, selectedCSS);
      return searchMatch && cssMatch;
    });
  }, [demos, query, selectedCSS]);

  const usedDemos = useMemo(() => {
    const searchData = state.searchData;
    const sourceDemos = filteredDemos;

    if (!searchData) return sourceDemos;
    if (searchData[0] === "not found") return [];

    return searchData
      .map((pageName) =>
        sourceDemos.find((demo) => (demo.name ?? demo.title) === pageName),
      )
      .filter((demo): demo is DemoItem => Boolean(demo));
  }, [filteredDemos, state.searchData]);

  const activeDemo = useMemo(
    () =>
      demos.find((demo) => (demo.name ?? demo.title) === activePage) ?? null,
    [activePage, demos],
  );

  useLayoutEffect(() => {
    if (!hashState) return;

    setWorkbenchState({
      activePage: hashState.activePage,
      pageData: {
        scrollTop: hashState.scrollTop,
        top: hashState.top,
        left: hashState.left,
      },
      searchText: hashState.searchText,
      scrollTop: hashState.scrollTop,
    });
    setPagePosition({
      scrollTop: hashState.scrollTop,
      top: 0,
      left: 0,
    });
    setPageExpanded(true);
    setScrollPosition((prev) => ({
      ...prev,
      value: hashState.scrollTop,
      updater: !prev.updater,
    }));
  }, [hashState, setWorkbenchState]);

  useLayoutEffect(() => {
    if (hashState || !activePage) return;

    const statePageData = state.pageData;
    if (statePageData) {
      setPagePosition({
        scrollTop: Number(statePageData.scrollTop) || 0,
        top: 0,
        left: 0,
      });
    }

    setPageExpanded(true);
  }, [activePage, hashState, state.pageData]);

  useEffect(() => {
    if (hashState || restoredScrollPositionRef.current) return;

    const restoredScrollTop = latestSavedScrollTopRef.current;
    if (!restoredScrollTop) return;

    restoredScrollPositionRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      setScrollPosition((prev) => ({
        ...prev,
        value: restoredScrollTop,
        updater: !prev.updater,
      }));
      lastStoredScrollTopRef.current = restoredScrollTop;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hashState, savedScrollTop]);

  const openDemo = useCallback(
    (demoName: string, event: MouseEvent<HTMLElement>) => {
      if (activePage) return;

      const positionData = getElementPositionData(
        event.currentTarget,
        savedScrollTop,
      );
      setPagePosition(positionData);
      setWorkbenchState({
        pageData: positionData,
        activePage: demoName,
      });

      requestAnimationFrame(() => {
        setPageExpanded(true);
        setPagePosition({ scrollTop: positionData.scrollTop, top: 0, left: 0 });
      });
    },
    [activePage, savedScrollTop, setWorkbenchState],
  );

  const closeDemo = useCallback(() => {
    const statePageData = state.pageData || { top: 0, left: 0, scrollTop: 0 };
    setPagePosition({
      scrollTop: Number(statePageData.scrollTop) || 0,
      top: Number(statePageData.top) || 0,
      left: Number(statePageData.left) || 0,
    });
    setPageExpanded(false);

    window.setTimeout(() => {
      setWorkbenchState({
        activePage: "",
        pageData: null,
      });
      if (typeof window !== "undefined") {
        window.location.hash = "";
      }
    }, 200);
  }, [setWorkbenchState, state.pageData]);

  const handleScrollValue = useCallback(
    (_left: number, top: number) => {
      const nextScrollTop = Math.round(top) || 0;
      if (nextScrollTop === lastStoredScrollTopRef.current) return;

      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        if (nextScrollTop === lastStoredScrollTopRef.current) return;

        lastStoredScrollTopRef.current = nextScrollTop;
        setWorkbenchState({ scrollTop: nextScrollTop || false });
      });
    },
    [setWorkbenchState],
  );

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  const applyRenderedKeys = useCallback((keys: string[]) => {
    setRenderedDemoNames(new Set(keys));
  }, []);

  const handleRenderedKeysChange = useCallback(
    (keys: string[]) => {
      pendingRenderedKeysRef.current = keys;

      if (!isScrolling) {
        applyRenderedKeys(keys);
      }
    },
    [applyRenderedKeys, isScrolling],
  );

  useEffect(() => {
    if (isScrolling || !pendingRenderedKeysRef.current) return;

    applyRenderedKeys(pendingRenderedKeysRef.current);
  }, [applyRenderedKeys, isScrolling]);

  const handleDemoLoad = useCallback(() => undefined, []);

  const handleToTopClick = useCallback(() => {
    setScrollPosition((prev) => ({
      value: 0,
      updater: !prev.updater,
      duration: 320,
    }));
  }, []);

  const components = usedDemos.map((demo, index) => {
    const demoName = demo.name ?? demo.title ?? String(index);

    return (
      <DemoCell
        key={demoName}
        demo={demo}
        isOpen={activePage === demoName}
        onOpen={openDemo}
        onLoad={handleDemoLoad}
        renderDemoContent={renderDemoContent}
        isDemoLoaded={!isScrolling && renderedDemoNames.has(demoName)}
        isScrolling={isScrolling}
        scrollTop={savedScrollTop}
        searchText={searchText}
      />
    );
  });

  const pageOverlay =
    activeDemo && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`demo-workbench-page-overlay ${pageClassName ?? ""}`}
            data-expanded={pageExpanded ? "true" : "false"}
            style={{
              top: `${pagePosition.top}px`,
              left: `${pagePosition.left}px`,
              background: pageExpanded ? bodyBg || "#fff" : bodyBg || "#fff",
            }}
          >
            <DemoCell
              demo={
                { ...activeDemo, windowScale: state.windowScale } as DemoItem
              }
              mode="page"
              isOpen
              showContent={showContent}
              onClose={closeDemo}
              onOpen={openDemo}
              onLoad={handleDemoLoad}
              isDemoLoaded
              renderDemoContent={renderDemoContent}
            />
          </div>,
          document.querySelector("#templateBody") ?? document.body,
        )
      : null;

  return (
    <div className="demo-workbench-grid-shell">
      <MorphScroll
        className="demo-workbench-scroll"
        size="auto"
        objectsSize={[238, 156]}
        gap={60}
        progressTrigger={{
          wheel: true,
          progressElement: (
            <div className="demo-workbench-scroll-progress" />
          ),
        }}
        edgeGradient={{ color: darkTheme ? "#1e1b4b" : "#c7d2fe" }}
        wrapperAlign={["center", "start"]}
        wrapperMargin={[30, 20, 60, 20]}
        render={{ type: "virtual", trackVisibility: true }}
        scrollPosition={scrollPosition}
        onScrollValue={handleScrollValue}
        crossCount={3}
        isScrolling={(v) => setIsScrolling(v)}
        scrollBarEdge={30}
        scrollBarOnHover
        onRenderedKeysChange={handleRenderedKeysChange}
      >
        {components}
      </MorphScroll>

      {usedDemos.length === 0 ? (
        NotFoundComponent ? (
          <div className="demo-workbench-not-found-card">
            <div className="demo-workbench-preview-frame">
              <NotFoundComponent />
            </div>
            <div className="demo-workbench-not-found-label">not found</div>
          </div>
        ) : (
          <div className="demo-workbench-empty">
            <span className="demo-workbench-empty-title">No demos</span>
            <span className="demo-workbench-empty-body">
              Nothing matches the current filters
            </span>
          </div>
        )
      ) : null}

      {pageOverlay}

      <ToTopButton
        visible={savedScrollTop > 500}
        isScrolling={isScrolling}
        onClick={handleToTopClick}
      />
    </div>
  );
});

export default DemoGrid;

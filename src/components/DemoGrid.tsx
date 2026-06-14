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
  const [loadedDemoNames, setLoadedDemoNames] = useState<Set<string>>(
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

  useEffect(() => {
    const demoNames = new Set(
      demos.map((demo) => demo.name ?? demo.title).filter(Boolean),
    );

    setLoadedDemoNames((prev) => {
      const next = new Set(
        Array.from(prev).filter((demoName) => demoNames.has(demoName)),
      );

      return next.size === prev.size ? prev : next;
    });
  }, [demos]);

  const markDemoLoaded = useCallback((demoName: string) => {
    setLoadedDemoNames((prev) => {
      if (prev.has(demoName)) return prev;

      const next = new Set(prev);
      next.add(demoName);
      return next;
    });
  }, []);

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
        onLoad={markDemoLoaded}
        renderDemoContent={renderDemoContent}
        isDemoLoaded={loadedDemoNames.has(demoName)}
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
            className={`fixed overflow-hidden transition-all1 ${
              pageExpanded
                ? "h-full w-full scale-100"
                : "h-640 w-1200 scale-[0.180134] rounded-50 bg-white shadow-shadow3 dark:shadow-shadow7"
            } ${pageClassName ?? ""}`}
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
              onLoad={markDemoLoaded}
              isDemoLoaded={loadedDemoNames.has(activePage)}
              renderDemoContent={renderDemoContent}
            />
          </div>,
          document.querySelector("#templateBody") ?? document.body,
        )
      : null;

  return (
    <div className="h-calcScreenH-112 m-auto w-full">
      <MorphScroll
        className="templateScroll relative h-full w-full overflow-hidden"
        size="auto"
        objectsSize={[238, 156]}
        gap={60}
        progressTrigger={{
          wheel: true,
          progressElement: (
            <div className="animate-ident relative flex h-full w-[12px] items-center justify-center overflow-hidden rounded-18 bg-indigo-100 text-indigo-500 shadow-shadow4 transition-all1 hover:bg-indigo-50 hover:shadow-shadow8 active:scale-95 dark:bg-indigo-900 dark:text-indigo-400 dark:shadow-shadow5 dark:hover:bg-indigo-800 dark:hover:shadow-shadow6 " />
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
      >
        {components}
      </MorphScroll>

      {usedDemos.length === 0 ? (
        NotFoundComponent ? (
          <div className="animate-ident absolute left-calc50%-119 top-calc50%-77 flex h-156 w-238 rotate-6 items-center justify-center overflow-hidden rounded-18 bg-indigo-100 text-indigo-500 shadow-shadow4 transition-none hover:bg-indigo-50 hover:shadow-shadow8 active:scale-95 dark:bg-indigo-900 dark:text-indigo-400 dark:shadow-shadow5 dark:hover:bg-indigo-800 dark:hover:shadow-shadow6">
            <div className="pointer-events-none absolute h-640 w-1200 translate-y-10 scale-[0.180134] overflow-hidden rounded-50 bg-white shadow-shadow3 dark:shadow-shadow7">
              <NotFoundComponent />
            </div>
            <div className="absolute left-0 top-0 h-full w-full overflow-hidden text-ellipsis whitespace-nowrap px-25 text-center text-xs font-bold leading-7 dark:text-shadow-darkTS1">
              not found
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl bg-white/90 px-8 py-7 text-center text-zinc-500 shadow-shadow4 backdrop-blur dark:bg-slate-950/80 dark:text-zinc-300">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
              No demos
            </span>
            <span className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
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

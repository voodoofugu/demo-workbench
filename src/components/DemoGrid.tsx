import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { MorphScroll } from "morphing-scroll";

import DemoCell from "./DemoCell";
import ToTopButton from "./buttons/ToTopButton";
import DemoFallback from "./DemoFallback";

import nexus from "../state/nexus";
import { getWorkbenchBg, WORKBENCH_TRANSITION_MS } from "../styles/workbenchStyles";
import { warnDevelopment } from "../utils/devWarnings";
import {
  getElementPositionData,
  getHashWorkbenchState,
  type PositionData,
} from "../utils/workbenchPosition";

import type { DemoItem } from "../types/public";

type DemoGridProps = {
  demos: DemoItem[];
  bodyBg?: string;
  renderDemoContent?: (pageName: string) => ReactNode;
};

const DemoGrid = memo(function DemoGrid({
  demos,
  bodyBg,
  renderDemoContent,
}: DemoGridProps) {
  const activePage = nexus.use("activePage") || "";
  const darkTheme = Boolean(nexus.use("darkTheme"));
  const themeColor = nexus.use("themeColor") as string;
  const pageData = nexus.use("pageData");
  const searchText = nexus.use("searchText") || "";
  const scrollTop = nexus.use("scrollTop");
  const windowScale = nexus.use("windowScale");
  // Deferred so a fast-typing user gets instant input feedback while the
  // (virtualized, potentially heavy) grid catches up in a lower-priority render.
  const deferredSearchText = useDeferredValue(searchText);
  const hashState = useMemo(() => getHashWorkbenchState(), []);
  const savedScrollTop = Number(scrollTop) || 0;

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
  // Seeded from nexus (already restored from hash/storage before this
  // component ever mounts) so MorphScroll's own first-render effect scrolls
  // there instantly — no separate post-mount restore effect needed here.
  const [scrollPosition, setScrollPosition] = useState<{
    value: number;
    updater: boolean;
    duration?: number;
  }>(() => ({ value: savedScrollTop, updater: false }));

  const lastStoredScrollTopRef = useRef(savedScrollTop);
  const pendingRenderedKeysRef = useRef<string[] | null>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const stableDemos = demos
    .map((demo) => demo.name ?? demo.title ?? "")
    .join("|");

  const usedDemos = useMemo(() => {
    const lowerQuery = deferredSearchText.trim().toLowerCase();
    if (!lowerQuery) return demos;

    return demos.filter((demo) =>
      (demo.title ?? demo.name ?? "").toLowerCase().includes(lowerQuery),
    );
  }, [stableDemos, deferredSearchText]);

  const activeDemo = useMemo(
    () =>
      demos.find((demo) => (demo.name ?? demo.title) === activePage) ?? null,
    [activePage, stableDemos],
  );

  useEffect(() => {
    if (!activePage || activeDemo) return;

    warnDevelopment(
      `missing-demo:${activePage}`,
      `demo "${activePage}" was not found in the generated manifest.`,
    );
  }, [activeDemo, activePage]);

  useLayoutEffect(() => {
    if (!hashState) return;

    setPagePosition({
      scrollTop: hashState.scrollTop,
      top: 0,
      left: 0,
    });
    setPageExpanded(true);
  }, [hashState]);

  useLayoutEffect(() => {
    if (hashState || !activePage) return;

    if (pageData) {
      setPagePosition({
        scrollTop: Number(pageData.scrollTop) || 0,
        top: 0,
        left: 0,
      });
    }

    setPageExpanded(true);
  }, [activePage, hashState, pageData]);

  const openDemo = useCallback(
    (demoName: string, event: MouseEvent<HTMLElement>) => {
      if (activePage) return;

      const positionData = getElementPositionData(
        event.currentTarget,
        savedScrollTop,
      );
      setPagePosition(positionData);
      nexus.set({
        pageData: positionData,
        activePage: demoName,
      });

      requestAnimationFrame(() => {
        setPageExpanded(true);
        setPagePosition({ scrollTop: positionData.scrollTop, top: 0, left: 0 });
      });
    },
    [activePage, savedScrollTop],
  );

  const closeDemo = useCallback(() => {
    const statePageData = pageData || { top: 0, left: 0, scrollTop: 0 };
    setPagePosition({
      scrollTop: Number(statePageData.scrollTop) || 0,
      top: Number(statePageData.top) || 0,
      left: Number(statePageData.left) || 0,
    });
    setPageExpanded(false);

    // Clear state (which unmounts the overlay) only after the collapse
    // transition has finished, so the animation isn't cut short.
    window.setTimeout(() => {
      nexus.set({
        activePage: "",
        pageData: null,
      });
      if (window.location.hash) {
        // Unlike `location.hash = ""`, this also removes the trailing "#".
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }, WORKBENCH_TRANSITION_MS);
  }, [pageData]);

  const handleScrollValue = useCallback((_left: number, top: number) => {
    const nextScrollTop = Math.round(top) || 0;
    if (nextScrollTop === lastStoredScrollTopRef.current) return;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (nextScrollTop === lastStoredScrollTopRef.current) return;

      lastStoredScrollTopRef.current = nextScrollTop;
      nexus.set({ scrollTop: nextScrollTop || false });
    });
  }, []);

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
            className="demo-workbench-page-overlay"
            data-expanded={pageExpanded ? "true" : "false"}
            style={{
              top: `${pagePosition.top}px`,
              left: `${pagePosition.left}px`,
              background: bodyBg || "#fff",
            }}
          >
            <DemoCell
              demo={activeDemo}
              mode="page"
              isOpen
              onClose={closeDemo}
              onOpen={openDemo}
              onLoad={handleDemoLoad}
              isDemoLoaded
              renderDemoContent={renderDemoContent}
              windowScale={windowScale}
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
          progressElement: <div className="demo-workbench-scroll-progress" />,
        }}
        edgeGradient={{ color: getWorkbenchBg(darkTheme, themeColor) }}
        wrapperAlign={["center", usedDemos.length > 0 ? "start" : "center"]}
        wrapperMargin={[50, 20, 50, 20]}
        render={{ type: "virtual", trackVisibility: true }}
        scrollPosition={scrollPosition}
        onScrollValue={handleScrollValue}
        crossCount={3}
        isScrolling={(v) => setIsScrolling(v)}
        scrollBarEdge={40}
        scrollBarOnHover
        onRenderedKeysChange={handleRenderedKeysChange}
      >
        {!stableDemos ? (
          <DemoFallback className="empty" title="✦ Your Demos will be here ✦" />
        ) : usedDemos.length > 0 ? (
          components
        ) : (
          <DemoFallback className="not-found" title="✦ Not Found ✦" />
        )}
      </MorphScroll>

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

import { memo, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { StyledAtom } from "styled-atom";

import useDynamicModule from "../hooks/useDynamicModule";
import { useWorkbenchActions, useWorkbenchValue } from "../state/WorkbenchState";

import PageCloseBtn from "./buttons/PageCloseBtn";
import Loading from "./feedback/Loading";

const loadFill = <div className="dw-loading-fill" />;

function InfoBadge({ pageName }) {
  return (
    <div title={pageName} className="dw-info-badge">
      i
    </div>
  );
}

function DemoCellContent({ demo, renderDemoContent }) {
  const pageName = demo.name;
  const activePage = useWorkbenchValue("activePage");
  const searchText = useWorkbenchValue("searchText") || "";
  const windowScale = useWorkbenchValue("windowScale");
  const setWorkbenchState = useWorkbenchActions();

  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [style, setStyle] = useState(false);

  const [newTabPosition, setNewTabPosition] = useState({
    scrollTop: 0,
    top: 0,
    left: 0,
  });

  const module = useDynamicModule(`${activePage || pageName || ""}`, demo.load);
  const DynamicComponent = module?.default;
  const cssFiles = demo.cssFiles || demo.css || module?.cssFiles;

  const getDynamicComponent = (content) => {
    if (!DynamicComponent) return null;
    const dynamicStyle =
      activePage && windowScale
        ? {
            transform: `scale(${windowScale}) translateX(-50%)`,
            transformOrigin: "left top",
            position: "absolute",
            left: "50%",
          }
        : {};

    return (
      <div id="resize" style={dynamicStyle}>
        <DynamicComponent pageName={pageName} key={pageName}>
          {content && (
            <>
              {renderDemoContent?.(pageName)}
              <div className="tooltip-layer" />
            </>
          )}
        </DynamicComponent>
      </div>
    );
  };

  const computePositionData = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const top = Math.round(rect.top - 233);
    const left = Math.round(rect.left - 482);
    const scrollTop = Number(sessionStorage.getItem("scrollTop")) || 0;

    return { scrollTop, top, left };
  };

  const pageOpen = (event) => {
    if (!activePage) {
      const positionData = computePositionData(event);

      setPosition(positionData);
      setWorkbenchState({
        pageData: positionData,
        activePage: pageName,
      });

      requestAnimationFrame(() => {
        setStyle(true);
        setPosition({ top: 0, left: 0 });
      });
    }
  };

  const pageOpenNewTab = (event) => {
    const positionData = computePositionData(event);
    setNewTabPosition(positionData);
  };

  const pageClose = () => {
    const storedPageData = sessionStorage.getItem("pageData");
    const { top, left } = storedPageData
      ? JSON.parse(storedPageData)
      : { top: 0, left: 0 };

    setPosition({ top, left });
    setStyle(false);

    setTimeout(() => {
      setWorkbenchState({
        activePage: "",
        pageData: null,
      });
      window.location = "#";
    }, 200);
  };

  useEffect(() => {
    if (window.location.hash.length > 2) {
      const sectionChar = window.location.hash[2];
      if (sectionChar === "&") {
        const statesNewTab = window.location.hash.substring(3);
        const hashParts = statesNewTab.split("/");

        setWorkbenchState({
          pageData: {
            scrollTop: hashParts[1],
            top: hashParts[2],
            left: hashParts[3],
          },
          activePage: hashParts[0],
          searchText: hashParts[4],
        });

        setStyle(true);
      }
    }
  }, [setWorkbenchState]);

  const preview = (
    <div className="dw-demo-preview">
      {cssFiles ? (
        <StyledAtom fileNames={cssFiles} fallback={<Loading />} encap>
          <div className="likeBody" id={pageName}>
            {getDynamicComponent() || loadFill}
          </div>
        </StyledAtom>
      ) : (
        getDynamicComponent() || loadFill
      )}
    </div>
  );

  return (
    <>
      {activePage ? (
        activePage === pageName ? (
          createPortal(
            <div
              className={`dw-demo-modal${style ? " is-open" : ""}`}
              style={{
                top: position.top + "px",
                left: position.left + "px",
              }}
            >
              {cssFiles ? (
                <StyledAtom fileNames={cssFiles} fallback={<Loading />} encap>
                  <div className="likeBody" id={pageName}>
                    {getDynamicComponent(true)}
                    <PageCloseBtn onClick={pageClose} />
                  </div>
                </StyledAtom>
              ) : (
                <div className="likeBody" id={pageName}>
                  {getDynamicComponent(true)}
                  <PageCloseBtn onClick={pageClose} />
                </div>
              )}
            </div>,
            document.querySelector("#templateBody"),
          )
        ) : (
          <div className="dw-demo-preview">{loadFill}</div>
        )
      ) : (
        preview
      )}
      <a
        className="dw-demo-label"
        href={`#/&${pageName}/${newTabPosition.scrollTop}/${newTabPosition.top}/${newTabPosition.left}/${searchText}`}
        onClick={pageOpen}
        onMouseUp={pageOpenNewTab}
      >
        {pageName}
      </a>
      <InfoBadge pageName={pageName} />
    </>
  );
}

const MemoDemoCellContent = memo(DemoCellContent);

export default memo(function DemoCell({
  demo,
  isScrolling,
  renderDemoContent,
}) {
  const loadedObjects = useRef(false);
  const pageName = demo.name;

  useEffect(() => {
    const element = document.querySelector(`[data-cell="${pageName}"]`);
    if (element) {
      loadedObjects.current = true;
    }

    return () => {
      loadedObjects.current = false;
    };
  }, [isScrolling, pageName]);

  return isScrolling && !loadedObjects.current ? (
    <div className="dw-demo-card">
      <div className="dw-demo-preview">{loadFill}</div>
      <a className="dw-demo-label">{pageName}</a>
      <div className="dw-info-badge is-disabled">i</div>
    </div>
  ) : (
    <div data-cell={pageName} className="dw-demo-card">
      <MemoDemoCellContent demo={demo} renderDemoContent={renderDemoContent} />
    </div>
  );
});

import { useMemo, useState, useLayoutEffect } from "react";
import { MorphScroll } from "morphing-scroll";

import DemoCell from "./DemoCell";
import ToTopButton from "./buttons/ToTopButton";
import useStorageItems from "../hooks/useStorageItems";
import { useWorkbenchValue } from "../state/WorkbenchState";

function DefaultNotFoundComponent() {
  return <div className="dw-not-found-content">404</div>;
}

export default function DemoGrid({
  demos,
  viewport,
  renderDemoContent,
  notFoundComponent: NotFoundComponent = DefaultNotFoundComponent,
}) {
  const searchData = useWorkbenchValue("searchData");

  const [isScrolling, setIsScrolling] = useState();
  const [scrollTopValue, setScrollTopValue] = useState(0);
  const [scrollNew, setScrollNew] = useState({
    value: 0,
    updater: false,
  });

  const demoByName = useMemo(() => {
    return new Map(demos.map((demo) => [demo.name, demo]));
  }, [demos]);

  const usedDemos = useMemo(() => {
    if (!searchData) return demos;
    if (searchData[0] === "not found") return [{ name: "not found", notFound: true }];
    return searchData.map((name) => demoByName.get(name)).filter(Boolean);
  }, [demos, demoByName, searchData]);

  const components = useMemo(
    () =>
      usedDemos.map((demo, index) => (
        <DemoCell
          key={`${demo.name}-${index}`}
          demo={demo}
          isScrolling={isScrolling}
          viewport={viewport}
          renderDemoContent={renderDemoContent}
        />
      )),
    [usedDemos, isScrolling, viewport, renderDemoContent],
  );

  const neededHash = useMemo(() => {
    const hash = window?.location.hash;
    if (hash.length > 2 && hash[2] === "&") return hash;

    return null;
  }, []);

  useStorageItems([
    {
      name: "scrollTop",
      value: Math.round(scrollTopValue) || false,
      onLoad: (value) => {
        if (neededHash) return;
        setScrollNew((prev) => ({ ...prev, value }));
      },
    },
  ]);

  useLayoutEffect(() => {
    if (!neededHash) return;

    const hashParts = neededHash.substring(3).split("/");
    setScrollTopValue(Number(hashParts[1]));
    setScrollNew((prev) => ({
      ...prev,
      value: Number(hashParts[1]),
    }));
  }, []);

  const onClickHandler = () => {
    setScrollNew((prev) => ({ ...prev, value: 0, updater: !prev.updater }));
  };

  return usedDemos[0]?.name !== "not found" ? (
    <div className="dw-grid-frame">
      <MorphScroll
        className="templateScroll dw-scroll"
        size="auto"
        objectsSize={[238, 156]}
        gap={60}
        progressTrigger={{
          wheel: true,
          progressElement: true,
        }}
        edgeGradient={{ color: "rgb(199, 210, 254)" }}
        wrapperAlign={["center", "start"]}
        wrapperMargin={[14, 0, 38, 0]}
        render={{ type: "virtual" }}
        scrollPosition={scrollNew}
        onScrollValue={(_, t) => setScrollTopValue(t)}
        isScrolling={(v) => setIsScrolling(v)}
        crossCount={3}
      >
        {components}
      </MorphScroll>
      <ToTopButton
        scrollTopValue={scrollTopValue}
        isScrolling={isScrolling}
        onClick={onClickHandler}
      />
    </div>
  ) : (
    <div className="dw-demo-card dw-demo-card--not-found">
      <div className="dw-demo-preview">
        <NotFoundComponent />
      </div>
      <div className="dw-demo-label">not found</div>
    </div>
  );
}

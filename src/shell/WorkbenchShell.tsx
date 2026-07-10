import { memo, useEffect, useRef } from "react";

import WorkbenchLayout from "./WorkbenchLayout";
import DemoGrid from "../components/DemoGrid";

import nexus from "../state/nexus";

import type {
  DemoItem,
  DemoWorkbenchAutoScale,
  DemoWorkbenchProps,
} from "../types/public";

type WorkbenchShellProps = {
  title?: string;
  demos?: DemoItem[];
  autoScale?: DemoWorkbenchAutoScale;
  renderDemoContent?: DemoWorkbenchProps["renderDemoContent"];
  bodyBg?: DemoWorkbenchProps["bodyBg"];
};

function getScaleForAxis(availableSize: number, referenceSize?: number | null) {
  if (!referenceSize || referenceSize <= 0) return 0;
  return availableSize < referenceSize
    ? Number((availableSize / referenceSize).toFixed(4))
    : 0;
}

function getAutoScaleOptions(autoScale?: DemoWorkbenchAutoScale) {
  return autoScale === false ? undefined : autoScale;
}

export default memo(function WorkbenchShell({
  title,
  demos = [],
  autoScale,
  renderDemoContent,
  bodyBg,
}: WorkbenchShellProps) {
  const theme = nexus.use("darkTheme") as boolean;
  const themeColor = nexus.use("themeColor") as string;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const autoScaleOptions = getAutoScaleOptions(autoScale);
  const autoScaleWidth = autoScaleOptions?.width ?? null;
  const autoScaleHeight = autoScaleOptions?.height ?? null;

  useEffect(() => {
    if (!autoScaleWidth && !autoScaleHeight) {
      nexus.set({ windowScale: 0 });
      return;
    }

    if (!rootRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const widthScale = getScaleForAxis(width, autoScaleWidth);
      const heightScale = getScaleForAxis(height, autoScaleHeight);
      const scales = [widthScale, heightScale].filter((value) => value > 0);

      nexus.set({
        windowScale: scales.length > 0 ? Math.min(...scales) : 0,
      });
    });

    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [autoScaleHeight, autoScaleWidth]);

  return (
    <div
      ref={rootRef}
      id="templateBody"
      className="demo-workbench-shell"
      data-demo-workbench-theme={theme ? "dark" : "light"}
      data-demo-workbench-color={themeColor}
    >
      <WorkbenchLayout title={title}>
        <DemoGrid
          demos={demos}
          renderDemoContent={renderDemoContent}
          bodyBg={bodyBg}
        />
      </WorkbenchLayout>
    </div>
  );
});

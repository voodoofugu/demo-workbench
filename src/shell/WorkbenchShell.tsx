import { memo, useEffect, useRef } from "react";
import type { ComponentType } from "react";

import WorkbenchLayout from "./WorkbenchLayout";
import DemoGrid from "../components/DemoGrid";

import nexus from "../state/nexus";

import type {
  DemoItem,
  DemoWorkbenchProps,
  DemoWorkbenchViewport,
} from "../types/public";

type WorkbenchShellProps = {
  title?: string;
  demos?: DemoItem[];
  viewport: DemoWorkbenchViewport;
  renderDemoContent?: DemoWorkbenchProps["renderDemoContent"];
  bodyBg?: DemoWorkbenchProps["bodyBg"];
  notFoundComponent?: ComponentType | undefined;
};

export default memo(function WorkbenchShell({
  title,
  demos = [],
  viewport,
  renderDemoContent,
  bodyBg,
  notFoundComponent,
}: WorkbenchShellProps) {
  const theme = nexus.use("darkTheme") as boolean;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const widthScale =
        width < viewport.width
          ? Number((width / viewport.width).toFixed(4))
          : 0;
      const heightScale =
        height < viewport.height
          ? Number((height / viewport.height).toFixed(4))
          : 0;
      const scales = [widthScale, heightScale].filter((value) => value > 0);

      nexus.set({
        windowScale: scales.length > 0 ? Math.min(...scales) : 0,
      });
    });

    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [viewport.height, viewport.width]);

  return (
    <div
      ref={rootRef}
      id="templateBody"
      className="demo-workbench-shell"
      data-demo-workbench-theme={theme ? "dark" : "light"}
    >
      <WorkbenchLayout title={title} demos={demos}>
        <DemoGrid
          demos={demos}
          renderDemoContent={renderDemoContent as any}
          bodyBg={bodyBg}
          notFoundComponent={notFoundComponent}
        />
      </WorkbenchLayout>
    </div>
  );
});

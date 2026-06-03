import { memo } from "react";
import { ResizeTracker } from "morphing-scroll";

import WorkbenchLayout from "./WorkbenchLayout";
import DemoGrid from "./DemoGrid";
import { useWorkbenchActions } from "./WorkbenchState";

const defaultViewport = { width: 1200, height: 640 };

export default memo(function WorkbenchShell({
  title,
  demos,
  viewport = defaultViewport,
  renderDemoContent,
  notFoundComponent,
}) {
  const setWorkbenchState = useWorkbenchActions();

  const onResize = ({ width, height }) => {
    const widthScale = width / viewport.width;
    const heightScale = height / viewport.height;
    const scales = [widthScale, heightScale].filter((n) => n > 0);

    setWorkbenchState({
      windowScale: scales.length > 0 ? Math.min(...scales) : 0,
    });
  };

  return (
    <div id="templateBody" className="dw-root">
      <div className="dw-viewport">
        <ResizeTracker
          elementSelector="#templateBody"
          onResize={onResize}
          style={{ position: "absolute" }}
        />
        <WorkbenchLayout title={title} demos={demos}>
          <DemoGrid
            demos={demos}
            viewport={viewport}
            renderDemoContent={renderDemoContent}
            notFoundComponent={notFoundComponent}
          />
        </WorkbenchLayout>
      </div>
    </div>
  );
});

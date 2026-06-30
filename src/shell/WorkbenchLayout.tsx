import { memo } from "react";
import type { ReactNode } from "react";

import SearchControl from "../components/SearchControl";
import ToggleButton from "../components/buttons/ToggleButton";
import type { DemoItem } from "../types/public";

export default memo(function WorkbenchLayout({
  title,
  demos,
  children,
}: {
  title?: string;
  demos?: DemoItem[];
  children?: ReactNode;
}) {
  return (
    <main className="demo-workbench-layout">
      <div className="demo-workbench-header">
        <SearchControl demos={demos} />
        <div className="demo-workbench-title">{title}</div>
        <ToggleButton />
      </div>
      {children}
    </main>
  );
});

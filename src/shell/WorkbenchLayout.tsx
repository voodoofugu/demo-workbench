import { memo } from "react";
import type { ReactNode } from "react";

import SearchControl from "../components/SearchControl";
import ThemeMenu from "../components/ThemeMenu";
import ToggleButton from "../components/buttons/ToggleButton";

export default memo(function WorkbenchLayout({
  title,
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <main className="demo-workbench-layout">
      <div className="demo-workbench-header">
        <SearchControl />
        <ThemeMenu title={title} />
        <ToggleButton />
      </div>
      {children}
    </main>
  );
});

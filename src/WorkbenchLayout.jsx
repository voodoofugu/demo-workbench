import { memo } from "react";

import SearchControl from "./SearchControl";
import ToggleButton from "./components/ToggleButton";

export default memo(function WorkbenchLayout({ title, demos, children }) {
  return (
    <main className="dw-main">
      <div className="dw-header">
        <SearchControl demos={demos} />
        <div className="dw-title-text">{title}</div>
        <ToggleButton />
      </div>
      {children}
    </main>
  );
});

import { memo } from "react";

import SearchControl from "../components/SearchControl";
import ToggleButton from "../components/buttons/ToggleButton";

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

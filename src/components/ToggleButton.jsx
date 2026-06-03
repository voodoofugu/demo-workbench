import { useEffect, useRef } from "react";

import { useWorkbenchActions, useWorkbenchValue } from "../WorkbenchState";

export default function ToggleButton() {
  const theme = useWorkbenchValue("darkTheme");
  const setWorkbenchState = useWorkbenchActions();
  const templateMainRef = useRef(null);

  const handleClick = () => {
    setWorkbenchState({ darkTheme: (prev) => !prev });
  };

  useEffect(() => {
    templateMainRef.current = document.querySelector("#templateBody");

    if (theme) {
      templateMainRef.current?.classList.add("dark");
    } else {
      templateMainRef.current?.classList.remove("dark");
    }
  }, [theme]);

  return (
    <button
      className={`dw-theme-toggle${theme ? " is-dark" : ""}`}
      type="button"
      aria-label="Toggle dark theme"
      onClick={handleClick}
    >
      <span />
    </button>
  );
}

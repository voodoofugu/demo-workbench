import { useEffect, useRef } from "react";

import {
  useWorkbenchActions,
  useWorkbenchValue,
} from "../../state/WorkbenchState";

export default function ToggleButton() {
  const theme = useWorkbenchValue("darkTheme") as boolean;
  const setWorkbenchState = useWorkbenchActions();
  const templateMainRef = useRef<HTMLElement | null>(null);

  const handleClick = () => {
    setWorkbenchState((prev) => ({ darkTheme: !prev.darkTheme }));
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
      className="absolute right-10 top-1/2 h-32 w-62 -translate-y-1/2 cursor-pointer rounded-3xl border-none bg-indigo-300 p-0 shadow-shadowColorDark7 dark:bg-indigo-500 dark:shadow-darkThemeSearchInput"
      type="button"
      aria-label="Toggle dark theme"
      onClick={handleClick}
    >
      <span
        className={`absolute top-3 h-26 w-26 cursor-pointer rounded-3xl bg-indigo-200 shadow-shadowColor8 transition-all1 hover:brightness-105 active:scale-90 dark:bg-indigo-900 dark:shadow-darkThemeClearBtn${
          theme ? " left-32" : " left-3"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 flex h-24 w-24 scale-90 items-center justify-center rounded-3xl border-transparent drop-shadow-dS1 transition-all1 dark:drop-shadow-darkDS1${
            theme ? " border-4 shadow-shadow2" : " border-6 shadow-shadow1"
          }`}
        >
          <span
            className={`absolute flex h-2 w-24 flex-col items-center justify-center border-x-4 border-indigo-400 transition-all1 before:h-2 before:w-24 before:rotate-45 before:border-x-4 before:border-indigo-400${
              theme ? " opacity-0" : ""
            }`}
          />
          <span
            className={`absolute flex h-2 w-24 rotate-90 flex-col items-center justify-center border-x-4 border-indigo-400 transition-all1 before:h-2 before:w-24 before:rotate-45 before:border-x-4 before:border-indigo-400${
              theme ? " opacity-0" : ""
            }`}
          />
        </span>
      </span>
    </button>
  );
}

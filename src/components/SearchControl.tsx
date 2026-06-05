import {
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
  useDeferredValue,
} from "react";

import {
  useWorkbenchActions,
  useWorkbenchValue,
} from "../state/WorkbenchState";
import type { DemoItem } from "../types/public";

export default function SearchControl({ demos = [] }: { demos?: DemoItem[] }) {
  const searchText = (useWorkbenchValue("searchText") as string) || "";
  const setWorkbenchState = useWorkbenchActions();
  const [focus, setFocus] = useState(false);

  const clearBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const prevSearchTextRef = useRef("");
  const prevFilteredValueRef = useRef<string[]>([]);

  const deferredSearchText = useDeferredValue(searchText);

  const handleSearch = useCallback(
    (text: string) => {
      const searchInput = text.trim().toLowerCase();
      const demoNames = (demos || []).map((demo) => demo.name);
      let filteredData: string[];

      if (searchInput === "" || demoNames.length === 0) {
        filteredData = [];
      } else {
        filteredData = demoNames.filter((name) =>
          name.toLowerCase().includes(searchInput),
        );

        if (filteredData.length === 0) {
          filteredData.push("not found");
        }
      }

      if (
        filteredData.length !== prevFilteredValueRef.current.length ||
        !filteredData.every(
          (value, index) => value === prevFilteredValueRef.current[index],
        )
      ) {
        setWorkbenchState({
          searchData: filteredData.length > 0 ? filteredData : null,
        });
        prevFilteredValueRef.current = filteredData;
      }
    },
    [demos, setWorkbenchState],
  );

  const handleFocus = () => {
    setFocus(true);
  };

  const inputFocus = () => {
    searchInputRef.current?.focus();
  };

  const handleClear = () => {
    setWorkbenchState({ searchText: "" });
    inputFocus();
  };

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (
      searchInputRef.current &&
      !searchInputRef.current.contains(event.target as Node) &&
      clearBtnRef.current &&
      !clearBtnRef.current.contains(event.target as Node)
    ) {
      setFocus(false);
    }
  }, []);

  useEffect(() => {
    prevSearchTextRef.current = searchText;

    if (prevSearchTextRef.current === searchText) {
      handleSearch(searchText);
    }
  }, [searchText, handleSearch]);

  useEffect(() => {
    if (focus) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [focus, handleOutsideClick]);

  return (
    <div
      onFocus={handleFocus}
      onClick={inputFocus}
      className="absolute left-2.5 top-1/2 h-fit w-fit -translate-y-1/2"
    >
      <input
        type="text"
        ref={searchInputRef}
        className={`h-0 rounded-3xl border-none bg-indigo-300 p-16 text-sm font-medium text-indigo-800 text-shadow-tS1 shadow-shadowColorDark7 outline-none transition-width placeholder:text-indigo-500 dark:bg-indigo-500 dark:text-indigo-950 dark:text-shadow-darkTS1 dark:placeholder:text-indigo-700 dark:shadow-darkThemeSearchInput${
          focus
            ? " w-184 pr-34 pointer-events-auto"
            : " w-0 pointer-events-none"
        }`}
        placeholder="Search"
        value={deferredSearchText}
        onChange={(event) =>
          startTransition(() =>
            setWorkbenchState({ searchText: event.target.value }),
          )
        }
        autoComplete="off"
      />
      <button
        ref={clearBtnRef}
        className="absolute right-3 top-3 h-26 w-26 cursor-pointer rounded-3xl bg-indigo-200 shadow-shadowColor8 transition-all1 hover:brightness-105 active:scale-90 dark:bg-indigo-900 dark:shadow-darkThemeClearBtn"
        type="button"
        aria-label={focus && deferredSearchText ? "Clear search" : "Search"}
        onMouseUp={focus ? handleClear : undefined}
      >
        <span
          className={`absolute left-0 top-0 h-full w-full drop-shadow-dS1 before:absolute before:rounded-30 before:transition-all1 after:absolute after:-rotate-45 after:rounded-30 after:transition-all1 dark:drop-shadow-darkDS1 ${
            focus && deferredSearchText
              ? "before:left-1/2 before:top-5 before:h-15 before:w-3 before:-translate-x-1/2 before:rotate-45 before:border-none before:bg-red-500 after:left-1/2 after:top-5 after:h-15 after:w-3 after:-translate-x-1/2 after:bg-red-500"
              : focus
                ? "before:left-1/2 before:top-5 before:h-15 before:w-3 before:-translate-x-1/2 before:rotate-45 before:border-none before:bg-indigo-400 after:left-1/2 after:top-5 after:h-15 after:w-3 after:-translate-x-1/2 after:bg-indigo-400"
                : "before:left-3 before:top-3 before:h-13 before:w-13 before:border-2 before:border-indigo-400 after:left-15 after:top-12 after:h-10 after:w-3 after:bg-indigo-400"
          }`}
        />
      </button>
    </div>
  );
}

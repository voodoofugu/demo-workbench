import {
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
  useDeferredValue,
} from "react";

import nexus from "../state/nexus";
import type { DemoItem } from "../types/public";

export default function SearchControl({ demos = [] }: { demos?: DemoItem[] }) {
  const searchText = nexus.use("searchText") as string;
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
        nexus.set({
          searchData: filteredData.length > 0 ? filteredData : null,
        });
        prevFilteredValueRef.current = filteredData;
      }
    },
    [demos],
  );

  const handleFocus = () => {
    setFocus(true);
  };

  const inputFocus = () => {
    searchInputRef.current?.focus();
  };

  const handleClear = () => {
    nexus.set({ searchText: "" });
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
      className="demo-workbench-search"
      data-focus={focus ? "true" : "false"}
    >
      <input
        type="text"
        ref={searchInputRef}
        className="demo-workbench-search-input"
        placeholder="Search"
        value={deferredSearchText}
        onChange={(event) =>
          startTransition(() => nexus.set({ searchText: event.target.value }))
        }
        autoComplete="off"
      />
      <button
        ref={clearBtnRef}
        className="demo-workbench-search-button"
        type="button"
        aria-label={focus && deferredSearchText ? "Clear search" : "Search"}
        onMouseUp={focus ? handleClear : undefined}
      >
        <span
          className="demo-workbench-search-icon"
          data-state={
            focus && deferredSearchText ? "clear" : focus ? "focus" : "search"
          }
        />
      </button>
    </div>
  );
}

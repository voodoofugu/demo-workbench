import {
  useEffect,
  useState,
  useCallback,
  useRef,
  startTransition,
  useDeferredValue,
} from "react";

import { useWorkbenchActions, useWorkbenchValue } from "./WorkbenchState";

export default function SearchControl({ demos = [] }) {
  const searchText = useWorkbenchValue("searchText") || "";
  const setWorkbenchState = useWorkbenchActions();
  const [focus, setFocus] = useState(false);

  const clearBtnRef = useRef(null);
  const searchInputRef = useRef(null);

  const prevSearchTextRef = useRef("");
  const prevFilteredValueRef = useRef([]);

  const deferredSearchText = useDeferredValue(searchText);

  const handleSearch = useCallback(
    (text) => {
      const searchInput = text.trim().toLowerCase();
      const demoNames = demos.map((demo) => demo.name);
      let filteredData;

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

  const handleOutsideClick = useCallback((event) => {
    if (
      searchInputRef.current &&
      !searchInputRef.current.contains(event.target) &&
      clearBtnRef.current &&
      !clearBtnRef.current.contains(event.target)
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
      className="dw-search"
    >
      <input
        type="text"
        ref={searchInputRef}
        className={`dw-search-input${focus ? " is-open" : ""}`}
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
        className={`dw-icon-button dw-search-button${focus ? " is-open" : ""}${
          deferredSearchText ? " has-value" : ""
        }`}
        type="button"
        aria-label={focus && deferredSearchText ? "Clear search" : "Search"}
        onMouseUp={focus ? handleClear : null}
      >
        <span />
      </button>
    </div>
  );
}

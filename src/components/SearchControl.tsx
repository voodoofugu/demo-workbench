import { useEffect, useState, useCallback, useRef } from "react";

import nexus from "../state/nexus";

export default function SearchControl() {
  const searchText = nexus.use("searchText") as string;
  const [focus, setFocus] = useState(false);

  const clearBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
        id="searchInput"
        className="demo-workbench-search-input"
        placeholder="Search"
        value={searchText}
        onChange={(event) => nexus.set({ searchText: event.target.value })}
        autoComplete="off"
      />
      <button
        ref={clearBtnRef}
        className="demo-workbench-search-button"
        type="button"
        aria-label={focus && searchText ? "Clear search" : "Search"}
        onMouseUp={focus ? handleClear : undefined}
      >
        <span
          className="demo-workbench-search-icon"
          data-state={
            focus && searchText ? "clear" : focus ? "focus" : "search"
          }
        />
      </button>
    </div>
  );
}

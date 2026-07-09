import { useCallback, useEffect, useRef, useState } from "react";

import nexus, {
  WORKBENCH_THEME_COLORS,
  type WorkbenchThemeColor,
} from "../state/nexus";
import { themeColorSwatches } from "../styles/workbenchStyles";

export default function ThemeMenu({ title }: { title?: string }) {
  const themeColor = nexus.use("themeColor") as WorkbenchThemeColor;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selectColor = useCallback((color: WorkbenchThemeColor) => {
    nexus.set({ themeColor: color });
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="demo-workbench-title-wrap">
      <button
        type="button"
        className="demo-workbench-title"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="demo-workbench-title-text">{title}</span>
        <span className="demo-workbench-title-caret" />
      </button>

      {open ? (
        <div className="demo-workbench-theme-menu" role="menu">
          {WORKBENCH_THEME_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="menuitemradio"
              aria-checked={color === themeColor}
              data-active={color === themeColor ? "true" : "false"}
              className="demo-workbench-theme-option"
              onClick={() => selectColor(color)}
            >
              <span
                className="demo-workbench-theme-swatch"
                style={{ background: themeColorSwatches[color] }}
              />
              <span className="demo-workbench-theme-option-label">{color}</span>
              {color === themeColor ? (
                <span className="demo-workbench-theme-check" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

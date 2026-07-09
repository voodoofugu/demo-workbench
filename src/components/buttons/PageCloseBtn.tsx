import { useState, useEffect } from "react";
import type { MouseEvent } from "react";

const HIDE_DELAY_MS = 2000;

export default function PageCloseBtn({
  onClick,
}: {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let hideTimeout: number | undefined;

    const handleMouseMove = () => {
      setVisible(true);
      window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <button
      className="demo-workbench-page-close"
      onClick={onClick}
      type="button"
      aria-label="Close demo"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
      }}
    >
      <span className="demo-workbench-page-close-icon" />
    </button>
  );
}

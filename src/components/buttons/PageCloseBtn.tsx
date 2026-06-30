import type { MouseEvent } from "react";

export default function PageCloseBtn({
  onClick,
}: {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="demo-workbench-page-close"
      onClick={onClick}
      type="button"
      aria-label="Close demo"
    >
      <span className="demo-workbench-page-close-icon" />
    </button>
  );
}

import type { MouseEvent } from "react";

export default function PageCloseBtn({
  onClick,
}: {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="absolute bottom-30 left-1/2 z-40 h-40 w-40 -translate-x-1/2 cursor-pointer rounded-3xl border-none bg-indigo-200 p-0 shadow-toTopBtn brightness-105 transition-all1 hover:brightness-110 active:scale-90 dark:bg-indigo-900 dark:shadow-darkThemeClearBtn"
      onClick={onClick}
      type="button"
      aria-label="Close demo"
    >
      <span className="absolute left-0 top-0 h-full w-full drop-shadow-dS1 before:absolute before:left-1/2 before:top-1/2 before:h-24 before:w-3 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:rounded-30 before:bg-indigo-400 before:transition-all1 hover:before:bg-red-500 after:absolute after:left-1/2 after:top-1/2 after:h-24 after:w-3 after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:rounded-30 after:bg-indigo-400 after:transition-all1 hover:after:bg-red-500 dark:drop-shadow-darkDS1" />
    </button>
  );
}

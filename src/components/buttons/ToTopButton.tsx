import { memo, useMemo, useCallback } from "react";

export default memo(function ToTopButton({
  visible,
  isScrolling,
  onClick,
}: {
  visible?: boolean;
  isScrolling?: boolean;
  onClick: () => void;
}) {
  const scrollTrigger = useMemo(() => !!visible, [visible]);

  const scrollToTop = useCallback(() => {
    if (isScrolling) return;
    onClick();
  }, [isScrolling, onClick]);

  if (!visible) return null;

  return (
    <button
      className={`absolute bottom-30 right-30 z-20 h-40 w-40 cursor-pointer rounded-3xl border-none bg-indigo-200 p-0 shadow-toTopBtn brightness-105 transition-all1 hover:brightness-110 active:scale-90 dark:bg-indigo-900 dark:shadow-darkThemeClearBtn ${
        scrollTrigger
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-90 opacity-0"
      }`}
      type="button"
      aria-label="Scroll to top"
      onClick={scrollToTop}
    >
      <span className="absolute left-1/2 top-1/2 h-26 w-26 -translate-x-1/2 -translate-y-1/2 drop-shadow-dS1 before:absolute before:left-0 before:top-10 before:h-3 before:w-16 before:-rotate-45 before:rounded-l-2 before:bg-indigo-400 after:absolute after:right-0 after:top-10 after:h-3 after:w-16 after:rotate-45 after:rounded-r-2 after:bg-indigo-400" />
    </button>
  );
});

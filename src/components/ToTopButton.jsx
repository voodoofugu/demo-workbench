import { memo, useMemo, useCallback } from "react";

export default memo(function ToTopButton({
  scrollTopValue,
  isScrolling,
  onClick,
}) {
  const scrollTrigger = useMemo(() => scrollTopValue > 400, [scrollTopValue]);

  const scrollToTop = useCallback(() => {
    if (isScrolling) return;
    onClick();
  }, [isScrolling, onClick]);

  if (scrollTopValue <= 300) return null;

  return (
    <button
      className={`dw-icon-button dw-to-top${scrollTrigger ? " is-visible" : ""}`}
      type="button"
      aria-label="Scroll to top"
      onClick={scrollToTop}
    >
      <span />
    </button>
  );
});

import { memo, useCallback } from "react";

export default memo(function ToTopButton({
  visible,
  isScrolling,
  onClick,
}: {
  visible?: boolean;
  isScrolling?: boolean;
  onClick: () => void;
}) {
  const scrollToTop = useCallback(() => {
    if (isScrolling) return;
    onClick();
  }, [isScrolling, onClick]);

  return (
    <button
      className="demo-workbench-to-top"
      data-visible={visible ? "true" : "false"}
      type="button"
      aria-label="Scroll to top"
      onClick={scrollToTop}
    >
      <span className="demo-workbench-to-top-icon" />
    </button>
  );
});

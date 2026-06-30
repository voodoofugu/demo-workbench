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
      className="demo-workbench-to-top"
      data-visible={scrollTrigger ? "true" : "false"}
      type="button"
      aria-label="Scroll to top"
      onClick={scrollToTop}
    >
      <span className="demo-workbench-to-top-icon" />
    </button>
  );
});

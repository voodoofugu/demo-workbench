import nexus from "../../state/nexus";

export default function ToggleButton() {
  const theme = nexus.use("darkTheme") as boolean;

  const handleClick = () => {
    nexus.set((prev: { darkTheme: boolean }) => ({
      darkTheme: !prev.darkTheme,
    }));
  };

  return (
    <button
      className="demo-workbench-theme-toggle"
      data-active={theme ? "true" : "false"}
      type="button"
      aria-label="Toggle dark theme"
      onClick={handleClick}
    >
      <span className="demo-workbench-theme-toggle-knob">
        <span className="demo-workbench-theme-toggle-icon">
          <span className="demo-workbench-theme-toggle-line" />
          <span className="demo-workbench-theme-toggle-line demo-workbench-theme-toggle-line-y" />
        </span>
      </span>
    </button>
  );
}

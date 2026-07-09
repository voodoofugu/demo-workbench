const DemoFallback = ({
  className,
  title,
}: {
  className: string;
  title: string;
}) => {
  return (
    <div
      className={`demo-workbench-card fallback-card ${className ? ` ${className}` : ""}`}
    >
      <div className="demo-workbench-preview-frame">
        <div className="content">
          <div className="emoji"></div>
        </div>
      </div>
      <div className="demo-workbench-card-link">{title}</div>
    </div>
  );
};

export default DemoFallback;

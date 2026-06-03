export default function PageCloseBtn({ onClick }) {
  return (
    <a
      className="dw-icon-button dw-close-button"
      onClick={onClick}
      href="#"
      aria-label="Close demo"
    >
      <span />
    </a>
  );
}

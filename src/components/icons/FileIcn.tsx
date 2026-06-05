import type { CSSProperties } from "react";

export default function FileIcn({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties | null;
}) {
  return (
    <svg id="file" viewBox="0 0 56 64" className={className} style={style ?? undefined}>
      <path d="m37.66,0H8.11C3.63,0,0,3.63,0,8.11v47.78c0,4.48,3.63,8.11,8.11,8.11h37.78c4.48,0,8.11-3.63,8.11-8.11V16.34c0-.82-.33-1.62-.91-2.2L39.86.91c-.58-.58-1.37-.91-2.2-.91ZM10.4,13.9h15v7h-15v-7Zm33.6,35.1H10v-7h34v7Zm0-14H10v-7h34v7Zm-8.53-22.05V4.53l14,14h-8.42c-3.08,0-5.58-2.5-5.58-5.58Z" />
    </svg>
  );
}

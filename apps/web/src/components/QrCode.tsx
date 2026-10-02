import { qrPath } from "@/lib/qr";

/** A QR code for `value`. Always dark on white, whatever the theme, so cameras can read it. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = qrPath(value);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="aspect-square w-full max-w-[240px] rounded-2xl"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

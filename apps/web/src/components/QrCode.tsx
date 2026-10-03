import { qrPath } from "@/lib/qr";

/**
 * A QR code for `value`. Always dark on white, whatever the scheme, so cameras
 * can read it — the only place in the app that ignores the palette. It is drawn
 * square and unrounded; whatever frames it supplies the shape.
 */
export function QrCode({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const { size, path } = qrPath(value);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`block aspect-square w-full ${className}`}
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

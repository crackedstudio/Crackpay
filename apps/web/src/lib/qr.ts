import QRCode from "qrcode";

/** Blank modules around the code. Scanners need at least four. */
export const QUIET_ZONE = 4;

/**
 * Encodes `value` as a QR code and returns it as one SVG path, in module
 * units, already offset by the quiet zone. `size` is the full side length
 * including the quiet zone on both sides.
 */
export function qrPath(value: string): { size: number; path: string } {
  // "M" recovers from about 15% damage, enough for a screen or a printout.
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const count = modules.size;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      if (!modules.data[row * count + column]) continue;
      // Merge each horizontal run of dark modules into one rectangle.
      let run = 1;
      while (column + run < count && modules.data[row * count + column + run]) run++;
      path += `M${column + QUIET_ZONE} ${row + QUIET_ZONE}h${run}v1h-${run}z`;
      column += run - 1;
    }
  }
  return { size: count + QUIET_ZONE * 2, path };
}

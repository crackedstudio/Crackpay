import { describe, expect, it } from "vitest";
import { QUIET_ZONE, qrPath } from "./qr";

/** Rebuilds the module grid from the path, so the test reads what a scanner would see. */
function grid(value: string): { size: number; dark: (row: number, column: number) => boolean } {
  const { size, path } = qrPath(value);
  const cells = new Set<string>();
  for (const [, x, y, run] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(run); i++) cells.add(`${Number(y)},${Number(x) + i}`);
  }
  return { size, dark: (row, column) => cells.has(`${row},${column}`) };
}

/** A finder pattern: 7×7 dark ring, light ring inside it, 3×3 dark centre. */
function isFinder(dark: (row: number, column: number) => boolean, top: number, left: number): boolean {
  for (let row = 0; row < 7; row++) {
    for (let column = 0; column < 7; column++) {
      const ring = Math.max(Math.abs(row - 3), Math.abs(column - 3));
      if (dark(top + row, left + column) !== (ring !== 2)) return false;
    }
  }
  return true;
}

describe("qrPath", () => {
  const link = "https://crackpay.vercel.app/pay?to=sam";

  it("has finder patterns in three corners and none in the fourth", () => {
    const { size, dark } = grid(link);
    const far = size - QUIET_ZONE - 7;
    expect(isFinder(dark, QUIET_ZONE, QUIET_ZONE)).toBe(true);
    expect(isFinder(dark, QUIET_ZONE, far)).toBe(true);
    expect(isFinder(dark, far, QUIET_ZONE)).toBe(true);
    expect(isFinder(dark, far, far)).toBe(false);
  });

  it("leaves the quiet zone empty on every side", () => {
    const { size, dark } = grid(link);
    for (let i = 0; i < size; i++) {
      for (let edge = 0; edge < QUIET_ZONE; edge++) {
        expect(dark(edge, i) || dark(size - 1 - edge, i) || dark(i, edge) || dark(i, size - 1 - edge)).toBe(false);
      }
    }
  });

  it("uses a valid QR size that grows with the content", () => {
    const short = qrPath("a").size - QUIET_ZONE * 2;
    const long = qrPath("https://crackpay.vercel.app/pay?to=a_rather_long_handle&amount=1234.56").size - QUIET_ZONE * 2;
    // Every QR version is 17 + 4n modules wide.
    expect((short - 17) % 4).toBe(0);
    expect((long - 17) % 4).toBe(0);
    expect(long).toBeGreaterThan(short);
  });

  it("is deterministic and differs between values", () => {
    expect(qrPath(link).path).toBe(qrPath(link).path);
    expect(qrPath(link).path).not.toBe(qrPath(`${link}x`).path);
  });
});

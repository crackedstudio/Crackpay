import { useVideoConfig } from "remotion";

/**
 * The film is cut at two shapes from one set of scenes: 1080×1920 for a feed and
 * 1920×1080 for a site hero or a demo screen. Rather than branch on pixels in
 * every scene, each scene asks for the numbers it needs and gets the set that
 * belongs to the shape being rendered.
 *
 * The vertical cut is the one the product is designed at — a phone column — so it
 * is the primary and the landscape numbers are the adaptation.
 */
export type Format = {
  /** True for 9:16. Scenes stack their text and visual; landscape sets them side by side. */
  vertical: boolean;
  /** Side gutter. Nothing in the frame comes closer than this to an edge. */
  gutter: number;
  /** The display voice: the one-line claims. */
  headline: number;
  /** Second line under a headline. */
  subhead: number;
  /** Body copy, used sparingly — a feed reads type, not paragraphs. */
  body: number;
  /** The mono section label. */
  kicker: number;
  /** Text never sets wider than this, whatever the frame does. */
  columnMax: number;
  /** Width of the phone, which is drawn rather than screenshotted. */
  phone: number;
  /** Gap between a scene's text block and its visual. */
  gap: number;
};

const VERTICAL: Format = {
  vertical: true,
  gutter: 88,
  headline: 104,
  subhead: 42,
  body: 34,
  kicker: 24,
  columnMax: 904,
  phone: 660,
  gap: 72,
};

const LANDSCAPE: Format = {
  vertical: false,
  gutter: 120,
  headline: 92,
  subhead: 36,
  body: 30,
  kicker: 22,
  columnMax: 820,
  phone: 452,
  gap: 112,
};

export function useFormat(): Format {
  const { width, height } = useVideoConfig();
  return height > width ? VERTICAL : LANDSCAPE;
}

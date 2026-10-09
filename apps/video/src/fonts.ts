import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Archivo and JetBrains Mono, vendored as their variable files rather than
 * pulled from Google at render time: a render has to produce the same frames
 * offline, and the brand's `.display` class sets `font-stretch: 125%`, which
 * needs Archivo's width axis. A static weight would quietly render the whole
 * film in the wrong, narrower face.
 *
 * Source: fonts.gstatic.com, Archivo v25 and JetBrains Mono v24, latin subset,
 * downloaded 6 October 2026. Both are SIL Open Font License 1.1.
 */
export const ARCHIVO = "Archivo Variable";
export const JETBRAINS = "JetBrains Mono Variable";

/** Remotion blocks the render until these resolve, so frame 0 is never unstyled. */
export const fontsReady = Promise.all([
  loadFont({
    family: ARCHIVO,
    url: staticFile("fonts/Archivo-Variable.woff2"),
    format: "woff2",
    weight: "100 900",
    display: "block",
  }),
  loadFont({
    family: JETBRAINS,
    url: staticFile("fonts/JetBrainsMono-Variable.woff2"),
    format: "woff2",
    weight: "100 800",
    display: "block",
  }),
]);

/**
 * The token sheet reads both families through these two custom properties, the
 * same ones `next/font` sets in the app and on the site. Setting them on the
 * film's root is the whole of the wiring.
 */
export const fontVariables: React.CSSProperties = {
  "--font-archivo": `"${ARCHIVO}"`,
  "--font-jetbrains": `"${JETBRAINS}"`,
} as React.CSSProperties;

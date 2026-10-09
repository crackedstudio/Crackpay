import "./index.css";
import { Composition, Sequence, Still } from "remotion";
import { Film, TOTAL_SECONDS, type VideoProps } from "./Video.tsx";
import { Hook } from "./scenes/Hook.tsx";
import { fontVariables } from "./fonts.ts";
import { AbsoluteFill } from "remotion";

const FPS = 30;

/**
 * One film, two shapes. The scenes are the same components in both; only
 * `layout.ts` differs, so a copy change lands in both cuts at once.
 */
const defaultProps: VideoProps = {
  url: "crackpay.xyz",
};

export function RemotionRoot() {
  return (
    <>
      {/* The primary. The product is designed at a phone column, and so is this. */}
      <Composition
        id="Vertical"
        component={Film}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />

      {/* For a site hero, a demo screen or YouTube. */}
      <Composition
        id="Landscape"
        component={Film}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />

      {/*
       * The poster frame. A still renders frame 0, where the mark has not landed
       * yet, so the hook is pulled two seconds back into its own settled state.
       */}
      <Still
        id="Poster"
        component={() => (
          <AbsoluteFill className="bg-paper" style={fontVariables}>
            <Sequence from={-2 * FPS}>
              <Hook />
            </Sequence>
          </AbsoluteFill>
        )}
        width={1080}
        height={1920}
      />
    </>
  );
}

import type { ReactNode } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { CUES, MUSIC_VOLUME } from "./audio.ts";
import { Cta } from "./scenes/Cta.tsx";
import { Hook } from "./scenes/Hook.tsx";
import { MiniApps } from "./scenes/MiniApps.tsx";
import { Safety } from "./scenes/Safety.tsx";
import { Send } from "./scenes/Send.tsx";
import { WhatItIs } from "./scenes/WhatItIs.tsx";
import { fontVariables } from "./fonts.ts";

export type VideoProps = {
  /**
   * The address on the end card. Passkeys bind to the domain for good, so this is
   * a prop rather than a constant buried in a scene: it is set once, in `Root`,
   * and both cuts take it from there.
   */
  url: string;
};

type Beat = {
  id: string;
  /** Length on screen. The seven add up to the thirty. */
  seconds: number;
  render: (props: VideoProps) => ReactNode;
};

/**
 * The cut.
 *
 * Mini Apps take eleven of the thirty — more than every other beat put together
 * bar one, and more than twice what sending gets — because they are the argument
 * that CrackPay is a place other people build on rather than one more wallet.
 * Everything before them is the setup for that: an account exists, money moves,
 * nobody else can touch it.
 */
export const BEATS: readonly Beat[] = [
  { id: "hook", seconds: 3, render: () => <Hook /> },
  { id: "what-it-is", seconds: 4, render: () => <WhatItIs /> },
  { id: "send", seconds: 5, render: () => <Send /> },
  { id: "safety", seconds: 3, render: () => <Safety /> },
  { id: "mini-apps", seconds: 11, render: () => <MiniApps /> },
  { id: "cta", seconds: 4, render: ({ url }) => <Cta url={url} /> },
];

export const TOTAL_SECONDS = BEATS.reduce((total, beat) => total + beat.seconds, 0);

/**
 * Cuts are hard. There is not a crossfade in the film, because the design system
 * has no blur and nothing floating, and a dissolve is both of those at once.
 */
export function Film(props: VideoProps) {
  const { fps } = useVideoConfig();
  let from = 0;

  return (
    <AbsoluteFill className="bg-paper" style={fontVariables}>
      {/* The score runs the length of the film and is mixed in the file itself:
          it thins out under the self-custody beat and lifts for Mini Apps. */}
      <Audio src={staticFile("audio/music.wav")} volume={MUSIC_VOLUME} />
      {CUES.map((cue) => (
        <Sequence
          key={`${cue.sound}-${cue.at}`}
          name={`sfx ${cue.sound}`}
          from={Math.round(cue.at * fps)}
          layout="none"
        >
          <Audio src={staticFile(`audio/${cue.sound}.wav`)} volume={cue.volume} />
        </Sequence>
      ))}

      {BEATS.map((beat) => {
        const sequence = (
          <Sequence
            key={beat.id}
            name={beat.id}
            from={from}
            durationInFrames={beat.seconds * fps}
            premountFor={fps}
          >
            {beat.render(props)}
          </Sequence>
        );
        from += beat.seconds * fps;
        return sequence;
      })}
    </AbsoluteFill>
  );
}

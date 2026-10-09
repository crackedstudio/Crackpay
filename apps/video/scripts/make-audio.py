"""
Synthesises the film's score and sound effects.

Everything the film plays is generated here, from oscillators and noise, so the
soundtrack carries no licence and no attribution and can be regenerated from
source like everything else in the repo:

    python3 scripts/make-audio.py

Output lands in `public/audio/`, which `src/audio.ts` then places on the timeline.
The tune is a I–V–vi–IV in C major at 120bpm — a bar is exactly two seconds, so
musical bars and the film's beats line up without drift.
"""

import math
import os
import struct
import wave

import numpy as np

SR = 44100
BPM = 120.0
BEAT = 60.0 / BPM          # 0.5s
BAR = 4 * BEAT             # 2.0s
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")

A4 = 440.0
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def hz(note: str) -> float:
    """"A4" -> 440.0. Octave 4 holds middle C."""
    name, octave = note[:-1], int(note[-1])
    semitones = NAMES.index(name) + 12 * (octave - 4) - 9
    return A4 * (2 ** (semitones / 12))


def buf(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * SR), dtype=np.float64)


def add(track: np.ndarray, at: float, sound: np.ndarray, gain: float = 1.0) -> None:
    """Mix `sound` into `track` at `at` seconds, clipping at the end."""
    start = int(at * SR)
    if start >= len(track):
        return
    end = min(start + len(sound), len(track))
    track[start:end] += sound[: end - start] * gain


def env(n: int, attack: float, decay: float, sustain: float = 0.0, release: float = 0.0) -> np.ndarray:
    """A simple ADSR in seconds, stretched or truncated to `n` samples."""
    a, d, r = int(attack * SR), int(decay * SR), int(release * SR)
    a, d = max(a, 1), max(d, 1)
    s = max(n - a - d - r, 0)
    out = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sustain, d),
        np.full(s, sustain),
        np.linspace(sustain, 0, r) if r else np.zeros(0),
    ])
    return np.pad(out[:n], (0, max(0, n - len(out))))


def pluck(freq: float, dur: float, gain: float = 1.0, bright: float = 1.0) -> np.ndarray:
    """
    A marimba-ish pluck: a fundamental plus two partials, each decaying faster
    than the one below it. This is the film's jolly voice.
    """
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * math.pi * freq * t) * np.exp(-t * 7)
    tone += 0.45 * bright * np.sin(2 * math.pi * freq * 2 * t) * np.exp(-t * 13)
    tone += 0.18 * bright * np.sin(2 * math.pi * freq * 3.01 * t) * np.exp(-t * 20)
    # A touch of noise on the attack reads as a mallet hitting a bar.
    click = np.random.default_rng(int(freq)).normal(0, 1, n) * np.exp(-t * 320) * 0.12
    return (tone + click) * env(n, 0.004, dur * 0.9, 0.0) * gain


def bass(freq: float, dur: float, gain: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * math.pi * freq * t) + 0.3 * np.sin(2 * math.pi * freq * 2 * t)
    return tone * env(n, 0.006, dur * 0.55, 0.25, dur * 0.3) * gain


def kick(gain: float = 1.0) -> np.ndarray:
    dur = 0.17
    n = int(dur * SR)
    t = np.arange(n) / SR
    sweep = 118 * np.exp(-t * 34) + 46
    tone = np.sin(2 * math.pi * np.cumsum(sweep) / SR)
    return tone * np.exp(-t * 19) * gain


def hat(gain: float = 1.0, dur: float = 0.035) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = np.random.default_rng(7).normal(0, 1, n)
    # Crude one-pole highpass: the difference of successive samples.
    noise = np.diff(noise, prepend=0.0)
    return noise * np.exp(-t * 150) * gain


def clap(gain: float = 1.0) -> np.ndarray:
    dur = 0.2
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(21)
    body = rng.normal(0, 1, n) * np.exp(-t * 26)
    # Three quick repeats before the tail is what makes a clap sound like hands.
    for offset, level in ((0.009, 0.8), (0.018, 0.6), (0.027, 0.45)):
        k = int(offset * SR)
        body[k:] += rng.normal(0, 1, n - k) * np.exp(-t[: n - k] * 42) * level
    body = np.diff(body, prepend=0.0)
    return body * gain


# --------------------------------------------------------------------- score

# I–V–vi–IV, one bar each: the progression that reads as "cheerful" to almost
# everyone, which for thirty seconds of marketing is exactly the job.
PROGRESSION = ["C", "G", "Am", "F"]
ROOTS = {"C": "C2", "G": "G2", "Am": "A2", "F": "F2"}

# Eight eighth-notes per bar, arpeggiated up and back down.
MELODY = {
    "C":  ["E4", "G4", "C5", "G4", "E4", "G4", "A4", "G4"],
    "G":  ["D4", "G4", "B4", "G4", "D4", "G4", "A4", "B4"],
    "Am": ["C4", "E4", "A4", "E4", "C4", "E4", "G4", "E4"],
    "F":  ["C4", "F4", "A4", "F4", "C4", "F4", "G4", "A4"],
}
CHORDS = {
    "C": ["C4", "E4", "G4"],
    "G": ["B3", "D4", "G4"],
    "Am": ["A3", "C4", "E4"],
    "F": ["A3", "C4", "F4"],
}

TOTAL = 30.0
BARS = int(TOTAL / BAR)  # 15


def section(bar: int) -> str:
    """
    Which part of the film a bar lands in. The arrangement thins out under the
    self-custody beat — that one is read, not watched — and lifts for Mini Apps.
    """
    t = bar * BAR
    if t < 3:
        return "intro"      # hook
    if t < 12:
        return "theme"      # what it is, sending
    if t < 15:
        return "quiet"      # who can move it
    if t < 26:
        return "lift"       # mini apps
    return "outro"


def build_music() -> np.ndarray:
    track = buf(TOTAL + 1.5)
    rng = np.random.default_rng(3)

    for bar in range(BARS):
        t0 = bar * BAR
        chord = PROGRESSION[bar % 4]
        sec = section(bar)

        drums = sec in ("theme", "lift", "outro")
        lead = sec in ("theme", "lift")
        sparkle = sec == "lift"

        # Bass on 1 and 3, the backbone of the bounce.
        if sec != "intro":
            level = 0.30 if sec != "quiet" else 0.17
            for beat in (0, 2):
                add(track, t0 + beat * BEAT, bass(hz(ROOTS[chord]), BEAT * 1.6), level)

        # Chord stabs on the offbeats: this is what makes it skip rather than march.
        stab_level = {"intro": 0.10, "theme": 0.13, "quiet": 0.07, "lift": 0.15, "outro": 0.13}[sec]
        for eighth in (1, 3, 5, 7):
            for note in CHORDS[chord]:
                add(track, t0 + eighth * BEAT / 2, pluck(hz(note), 0.26, bright=0.5), stab_level)

        # The tune.
        if lead:
            for i, note in enumerate(MELODY[chord]):
                swing = 0.012 if i % 2 else 0.0   # a little behind the beat on offbeats
                add(track, t0 + i * BEAT / 2 + swing, pluck(hz(note), 0.42), 0.26)

        # An octave-up counter-line, only while Mini Apps are on screen.
        if sparkle:
            for i, note in enumerate(MELODY[chord][::2]):
                up = note[:-1] + str(int(note[-1]) + 1)
                add(track, t0 + i * BEAT, pluck(hz(up), 0.3, bright=1.4), 0.085)

        if drums:
            for beat in (0, 2):
                add(track, t0 + beat * BEAT, kick(), 0.52 if sec != "quiet" else 0.3)
            for beat in (1, 3):
                add(track, t0 + beat * BEAT, clap(), 0.17)
            for eighth in range(8):
                jitter = rng.normal(0, 0.0015)
                add(track, t0 + eighth * BEAT / 2 + jitter, hat(), 0.085 if eighth % 2 else 0.12)

    # Land on the tonic under the end card rather than stopping mid-phrase.
    for note in ["C4", "E4", "G4", "C5"]:
        add(track, 28.0, pluck(hz(note), 1.9, bright=0.8), 0.17)
    add(track, 28.0, bass(hz("C2"), 1.8), 0.26)
    add(track, 28.0, kick(), 0.5)

    track = track[: int(TOTAL * SR)]

    # Fade in off silence and out to it, so neither cut starts or ends on a click.
    fade_in = int(0.25 * SR)
    fade_out = int(1.6 * SR)
    track[:fade_in] *= np.linspace(0, 1, fade_in)
    track[-fade_out:] *= np.linspace(1, 0, fade_out)
    return track


# ------------------------------------------------------------ sound effects

def sfx_pop() -> np.ndarray:
    """A tile or a chip arriving."""
    dur = 0.11
    n = int(dur * SR)
    t = np.arange(n) / SR
    sweep = 520 + 900 * (t / dur)
    tone = np.sin(2 * math.pi * np.cumsum(sweep) / SR)
    return tone * np.exp(-t * 34) * 0.55


def sfx_stamp() -> np.ndarray:
    """The mark landing. Low thump plus the click of the die hitting paper."""
    dur = 0.3
    n = int(dur * SR)
    t = np.arange(n) / SR
    sweep = 190 * np.exp(-t * 40) + 58
    body = np.sin(2 * math.pi * np.cumsum(sweep) / SR) * np.exp(-t * 17)
    click = np.random.default_rng(11).normal(0, 1, n) * np.exp(-t * 240) * 0.5
    click = np.diff(click, prepend=0.0)
    return (body * 0.85 + click) * 0.7


def sfx_ding() -> np.ndarray:
    """Money landing: a bright two-note bell, major third, nothing cash-register."""
    dur = 0.95
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for freq, delay, level in ((hz("C6"), 0.0, 1.0), (hz("E6"), 0.075, 0.85), (hz("G6"), 0.15, 0.5)):
        k = int(delay * SR)
        tt = t[: n - k]
        partial = (
            np.sin(2 * math.pi * freq * tt) * np.exp(-tt * 5.5)
            + 0.3 * np.sin(2 * math.pi * freq * 2.76 * tt) * np.exp(-tt * 11)
        )
        out[k:] += partial * level
    return out * 0.4


def sfx_whoosh() -> np.ndarray:
    """A sheet rising."""
    dur = 0.36
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = np.random.default_rng(5).normal(0, 1, n)
    # Sweeping the amount of differencing moves the brightness up over time.
    out = np.zeros(n)
    hp = np.diff(noise, prepend=0.0)
    shape = np.sin(math.pi * t / dur) ** 1.6
    out = (noise * (1 - t / dur) * 0.4 + hp * (t / dur)) * shape
    return out * 0.5


def sfx_tap() -> np.ndarray:
    """A control pressing down into its own shadow."""
    dur = 0.09
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * math.pi * 330 * t) * np.exp(-t * 60)
    click = np.diff(np.random.default_rng(13).normal(0, 1, n), prepend=0.0) * np.exp(-t * 300)
    return (tone * 0.6 + click * 0.5) * 0.5


def sfx_tick() -> np.ndarray:
    """One character typed."""
    dur = 0.045
    n = int(dur * SR)
    t = np.arange(n) / SR
    click = np.diff(np.random.default_rng(17).normal(0, 1, n), prepend=0.0)
    return click * np.exp(-t * 420) * 0.32


def write(name: str, data: np.ndarray) -> None:
    peak = float(np.max(np.abs(data)))
    if peak > 0.98:
        data = data / peak * 0.98
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    print(f"{name:16} {len(pcm) / SR:5.2f}s  peak {peak:.3f}")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    write("music.wav", build_music())
    for name, fn in (
        ("pop", sfx_pop),
        ("stamp", sfx_stamp),
        ("ding", sfx_ding),
        ("whoosh", sfx_whoosh),
        ("tap", sfx_tap),
        ("tick", sfx_tick),
    ):
        write(f"{name}.wav", fn())


if __name__ == "__main__":
    main()

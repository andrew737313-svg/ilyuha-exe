/**
 * Musical data for the in-game chiptune loop ("Сохрани меня, детство").
 *
 * 12 bars of 4/4 at 100 BPM = 28.8 s per lap — inside the 20–40 s target.
 * Everything is original: melodies are written here as note names, no samples.
 */

export const BPM = 100;
export const STEPS_PER_BAR = 16;
export const BARS = 12;
export const STEPS_PER_LOOP = STEPS_PER_BAR * BARS;
export const STEP_SECONDS = 60 / BPM / 4;
export const LOOP_SECONDS = STEPS_PER_LOOP * STEP_SECONDS;

const NOTE_OFFSETS: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

export function midi(note: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`bad note: ${note}`);
  const [, name, octave] = match;
  return NOTE_OFFSETS[name] + (Number(octave) + 1) * 12;
}

/** Convert a bar of 8 eighth-notes ("-" = rest) into scheduled note events. */
function eighths(bar: string, barIndex: number, length = 2) {
  return bar
    .trim()
    .split(/\s+/)
    .flatMap((token, i) =>
      token === "-"
        ? []
        : [{ step: barIndex * STEPS_PER_BAR + i * 2, midi: midi(token), len: length }],
    );
}

const MELODY_BARS = [
  "A4 A4 C5 E5  E5 D5 C5 A4",
  "F5 F5 E5 D5  C5 D5 C5 A4",
  "G4 C5 E5 G5  E5 D5 C5 G4",
  "B4 D5 G5 F5  E5 D5 B4 G4",
  "E5 A5 G5 E5  C5 D5 E5 A5",
  "F5 A5 G5 F5  E5 C5 D5 E5",
  "E5 G5 C6 B5  G5 E5 D5 C5",
  "B4 E5 G#5 B5 A5 G#5 E5 B4",
  "C5 E5 A5 G5  E5 D5 C5 E5",
  "F5 E5 D5 C5  A4 C5 F5 A5",
  "G5 F5 D5 B4  G4 B4 D5 G5",
  "A5 E5 C5 A4  E4 A4 C5 E5",
];

const BASS_BARS = [
  "A2 - A2 -  E3 - A2 -",
  "F2 - F2 -  C3 - F2 -",
  "C3 - C3 -  G2 - C3 -",
  "G2 - G2 -  D3 - G2 -",
  "A2 - A2 -  E3 - A2 -",
  "F2 - F2 -  C3 - F2 -",
  "C3 - C3 -  G2 - C3 -",
  "E2 - E2 -  B2 - E2 -",
  "A2 - A2 -  E3 - A2 -",
  "F2 - F2 -  C3 - F2 -",
  "G2 - G2 -  D3 - G2 -",
  "A2 E3 A2 E3  A2 - - -",
];

const ARP_CHORDS = [
  ["A4", "C5", "E5", "A5"],
  ["F4", "A4", "C5", "F5"],
  ["C5", "E5", "G5", "C6"],
  ["G4", "B4", "D5", "G5"],
  ["A4", "C5", "E5", "A5"],
  ["F4", "A4", "C5", "F5"],
  ["C5", "E5", "G5", "C6"],
  ["E4", "G#4", "B4", "E5"],
  ["A4", "C5", "E5", "A5"],
  ["F4", "A4", "C5", "F5"],
  ["G4", "B4", "D5", "G5"],
  ["A4", "C5", "E5", "A5"],
];

export type ChipEvent = { step: number; midi: number; len: number };

export const MELODY: ChipEvent[] = MELODY_BARS.flatMap((bar, i) => eighths(bar, i, 2));
export const BASS: ChipEvent[] = BASS_BARS.flatMap((bar, i) => eighths(bar, i, 4));

/** Sixteenth-note arpeggio, sparser in the odd bars so the melody breathes. */
export const ARP: ChipEvent[] = ARP_CHORDS.flatMap((chord, bar) =>
  Array.from({ length: 8 }, (_, i) => ({
    step: bar * STEPS_PER_BAR + i * 2 + (bar % 2 === 0 ? 0 : 1),
    midi: midi(chord[(i + bar) % chord.length]),
    len: 1,
  })),
);

export type DrumHit = { step: number; kind: "kick" | "snare" | "hat" };

export const DRUMS: DrumHit[] = Array.from({ length: STEPS_PER_LOOP }, (_, step) => step)
  .flatMap((step) => {
    const inBar = step % STEPS_PER_BAR;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const hits: DrumHit[] = [];
    if (inBar === 0 || inBar === 8 || (inBar === 14 && bar % 4 === 3)) {
      hits.push({ step, kind: "kick" });
    }
    if (inBar === 4 || inBar === 12) hits.push({ step, kind: "snare" });
    if (inBar % 2 === 0) hits.push({ step, kind: "hat" });
    if (inBar === 15 && bar === 11) hits.push({ step, kind: "snare" });
    return hits;
  });
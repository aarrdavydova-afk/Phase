"use strict";

const PHASE_SONG = {
  roots: ["E2", "C2", "G1", "D2"],
  upper: [
    ["E5", "G5", "B5"],
    ["E5", "G5", "C6"],
    ["D5", "G5", "B5"],
    ["D5", "F#5", "A5"],
  ],
  lower: [
    ["E4", "G4", "B4"],
    ["E4", "G4", "C5"],
    ["D4", "G4", "B4"],
    ["D4", "F#4", "A4"],
  ],
  lead: [
    [
      [0, 0, 2, 0.8],
      [3, 1, 1, 0.64],
      [4, 2, 2.5, 0.85],
      [8, 1, 1.2, 0.72],
    ],
    [
      [0, 0, 2, 0.8],
      [3, 1, 1, 0.64],
      [4, 2, 2.5, 0.85],
      [8, 1, 1.2, 0.72],
    ],
    [
      [0, 2, 2, 0.8],
      [3, 1, 1, 0.64],
      [4, 0, 2.5, 0.85],
      [8, 1, 1.2, 0.72],
    ],
    [
      [0, 2, 2, 0.8],
      [3, 1, 1, 0.64],
      [4, 0, 2.5, 0.85],
      [8, 0, 1.2, 0.72],
    ],
  ],
  answer: [
    [10, 0, 1.3, 0.65],
    [12, 1, 1.3, 0.7],
    [14, 2, 1.2, 0.6],
  ],

  shapes: [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [2, 1, 0],
    [1, 2, 0],
  ],
};
function phaseMelodyEvents(voice, bar, variant) {
  if (variant === null) return [];
  const bank = voice === 0 ? PHASE_SONG.upper : PHASE_SONG.lower;
  const events = voice === 0 ? PHASE_SONG.lead[bar % 4] : PHASE_SONG.answer;
  const shape = PHASE_SONG.shapes[variant];
  return events.map(([step, index, length, velocity]) => ({
    step,
    note: bank[bar % 4][shape[index]],
    length,
    velocity,
  }));
}

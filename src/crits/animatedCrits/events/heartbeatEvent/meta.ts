import type { EventMeta } from "../../eventMeta";

// the rare "Heartbeat" event: the wisp runs a heart monitor trace into the
// clicked floor's button, every beat throbbing it for free upgrade levels,
// ever faster, the last slamming into it
export default {
  label: "Heartbeat",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstBeatMs: 220, // the trace running level before the first beat
    gapMs: [280, 130] as [number, number], // between beats, quickening
    spikeMs: [170, 110] as [number, number], // each beat's spike, sharpening
    finalMs: 380, // the last spike up to the top and down into the button
    holdMs: 700, // after the slam, before the screen unfreezes
    levelShare: 0.04, // levels per beat, of the floor's upgrade count (x3 the last)
    minLevels: 3,
  },
} as const satisfies EventMeta;

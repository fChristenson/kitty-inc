import type { EventMeta } from "../../eventMeta";

// the floors zoom away into a sunset sky of rushing clouds; the ship chases a
// golden bandit wisp weaving ahead and dropping glowing mines that rush at
// the view, shooting each (free levels) as they come faster, the bandit
// ducking into cloud banks and back; then it locks on, a volley blows the
// bandit apart and the view dives through the gap onto the floors
export default {
  label: "Sky Chase",
  style: "rail shooter",
  reward: "levels",
  chance: 0.01,
  values: {
    splitMs: 320, // the floors zooming away into the sky
    // each mine shot as it rushes at the view, from the click, quickening
    mineHitMs: [640, 960, 1230, 1460, 1660, 1830, 1980, 2110, 2220, 2310, 2390],
    // the bandit ducking into a cloud bank and back out, [from, to]
    dodgeMs: [
      [1060, 1420],
      [1700, 2020],
    ],
    lockAtMs: 2520, // the lock-on on the bandit starts
    lockMs: 300, // the lock-on closing in, beeps quickening
    volley: 7, // shots in the volley, the last blowing the bandit apart
    volleyGapMs: 40, // between the volley's shots
    levelShare: 0.015, // free levels on the floor per mine
    finalShare: 0.12, // free levels on the floor for the bandit
  },
  isNew: true,
} as const satisfies EventMeta;

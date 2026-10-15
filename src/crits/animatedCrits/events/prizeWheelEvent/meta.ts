import type { EventMeta } from "../../eventMeta";

// a ring of wisps flies out into a huge wheel and spins past a pointer wisp,
// ticking; it slows, crawls and tips onto the winner; the wheel blows apart,
// every wisp slamming onto a bar with levels, the winner diving last onto the
// clicked one, a crit tier up
export default {
  label: "Prize Wheel",
  style: "wisp",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    spinMs: 2200, // from the click till the wheel stops
    turns: 5, // whole turns it spins through
    flyMs: 260, // each wisp's flight off the wheel onto its bar
    levelShare: 0.002, // levels a wisp lands on its bar
    winnerShare: 0.008, // levels the winner lands on the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;

import type { EventMeta } from "../../eventMeta";

// two plough wisps clear snowed glitter lane by lane into a ridge, then heap
// it onto the lock
export default {
  label: "Snowplow",
  style: "clutter",
  reward: "a free floor",
  chance: 0.01,
  values: {
    snowMs: 450, // the glitter snowing down
    passMs: [230, 140] as [number, number], // each lane's pass, quickening
    liftMs: 80, // each lift back out to the next lane
    ridgeMs: 380, // ploughing the ridge onto the lock
    gatherMs: 220, // the heap settling
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;

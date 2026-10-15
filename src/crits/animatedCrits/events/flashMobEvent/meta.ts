import type { EventMeta } from "../../eventMeta";

// a mob of hundreds of specks and a few lead wisps pours in off the screen's
// edges and dances round the building as one mass; in quickening waves a
// chunk peels off and piles into a floor, each a new worker, then the rest
// packs into a ball and drives into the clicked floor, several hires there
export default {
  label: "Flash Mob",
  style: "swarm",
  reward: "hires",
  chance: 0.01,
  values: {
    firstMs: 100, // from the click till the mob starts pouring in
    pourMs: 480, // pouring in off the edges till the whole mob has gathered
    danceMs: 160, // the gathered mob wheeling round till the first wave peels off
    waveGapMs: 240, // between the first two waves, each next gap shorter
    packMs: 280, // the rest packing into one tight ball before the drive
    clickedHires: 3, // hires landing on the clicked floor at the climax
    holdMs: 500,
    mergeMs: 0,
  },
  isNew: true,
} as const satisfies EventMeta;

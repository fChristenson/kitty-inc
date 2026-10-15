import type { EventMeta } from "../../eventMeta";

// a storm of hundreds of glitter specks and a few lead wisps sweeps in as one
// mass and coils round the income bars down the building, each a tight whirl
// that packs and bursts a wave into its bar, a crit tier, the coils
// quickening; then it wheels up into one churning ball over the clicked floor
// and drives into it, several crit tiers there
export default {
  label: "Glitter Storm",
  style: "swarm",
  reward: "crit tiers",
  chance: 0.01,
  values: {
    firstMs: 100, // from the click till the storm starts sweeping in
    sweepMs: 300, // sweeping in onto the first bar
    coilMs: [240, 100] as [number, number], // each coil round a bar, quickening
    moveMs: 90, // the mass rushing on from one bar to the next
    riseMs: 180, // wheeling up over the clicked floor
    packMs: 200, // packing into one churning ball before the drive
    clickedTiers: 3, // crit tiers for the clicked floor (one for the rest)
    clickedGapMs: 110, // between the clicked floor's tiers
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;

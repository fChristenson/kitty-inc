import type { CritMeta } from "../../../critKit/meta";

// a bomb bursting into bomblets that each burst again on the bars, or
// meteors shot down over the building, their debris showering the bars
export default {
  label: "Cluster Bomb",
  chance: 0.03,
  style: "explosion",
} satisfies CritMeta;

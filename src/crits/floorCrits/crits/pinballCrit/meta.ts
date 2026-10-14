import type { CritMeta } from "../../../critKit/meta";

// the floor crits playing their number onto the bars: once its number has slammed in, it pinballs between
// the bars in view, snowballs down them (growing a step a bar), is
// juggled onto them, stomps onto all of them or rains onto them, each
// other bar it hits landing levels
export default {
  label: "Pinball",
  chance: 0.03,
  style: "bounce",
} satisfies CritMeta;

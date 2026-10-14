import type { CritMeta } from "../../../critKit/meta";

// a pulse shorting every bar out, then rebooting them in blasts
export default {
  label: "EMP",
  chance: 0.03,
  style: "bars",
} satisfies CritMeta;

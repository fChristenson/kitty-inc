import type { CritMeta } from "../../../critKit/meta";

// a blade wisp's draw, then a dash from bar to bar cutting each in two, and
// one long final slash through its own
export default {
  label: "Katana",
  chance: 0.03,
  style: "slice",
  isNew: true,
} satisfies CritMeta;

import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Golden Handshake",
  color: COLOR.gold,
  icon: "goldenHandshake",
  description: "Gives every unlocked floor a free manager",
  chance: 0.03,
} satisfies ProcMeta;

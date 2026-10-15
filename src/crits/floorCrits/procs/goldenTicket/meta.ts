import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Golden Ticket",
  color: COLOR.goldenTicketYellow,
  icon: "goldenTicket",
  description: "Guarantees this floor's next crit is ultra",
  chance: 0.008,
} satisfies ProcMeta;

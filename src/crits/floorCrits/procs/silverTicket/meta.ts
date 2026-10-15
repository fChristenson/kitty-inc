import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Silver Ticket",
  color: COLOR.silverTicketGray,
  icon: "silverTicket",
  description: "Guarantees this floor's next crit is mega",
  chance: 0.02,
} satisfies ProcMeta;

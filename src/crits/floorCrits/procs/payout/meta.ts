import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Payout",
  color: COLOR.payoutOlive,
  icon: "payout",
  description: "Instantly adds every company's income + upgrades",
  chance: 0.005,
} satisfies ProcMeta;

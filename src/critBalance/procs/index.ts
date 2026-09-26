// every non-featured proc's odds and effect sizes, one file per reward shape
import { CASCADES_BALANCE } from "./cascades";
import { TIERS_BALANCE } from "./tiers";
import { FLOOR_UNLOCKS_BALANCE } from "./floorUnlocks";
import { PAYOUTS_BALANCE } from "./payouts";
import { FREE_UPGRADES_BALANCE } from "./freeUpgrades";
import { BOOSTS_BALANCE } from "./boosts";
import { STAFFING_BALANCE } from "./staffing";
import { SALES_BALANCE } from "./sales";

export const PROC_CRIT_BALANCE = {
  ...CASCADES_BALANCE,
  ...TIERS_BALANCE,
  ...FLOOR_UNLOCKS_BALANCE,
  ...PAYOUTS_BALANCE,
  ...FREE_UPGRADES_BALANCE,
  ...BOOSTS_BALANCE,
  ...STAFFING_BALANCE,
  ...SALES_BALANCE,
} as const;

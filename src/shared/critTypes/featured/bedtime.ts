import type { BEDTIME_CRITS } from "../../critData/bedtime";
import type { FeaturedRewards } from "./types";

export const BEDTIME_REWARDS = {
  bedtimeSelfie: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.bedtimeSelfieGrowth),
  duvetDaydream: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.duvetDaydreamUpgrades),
  lazySunday: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.lazySundayGrowth),
  pillowFort: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.pillowFortUpgrades),
  shoulderSlip: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.shoulderSlipGrowth),
  skyBlueNightshirt: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.skyBlueNightshirtGrowth),
  sleepoverTwins: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.sleepoverTwinsGrowth),
} satisfies FeaturedRewards<typeof BEDTIME_CRITS>;

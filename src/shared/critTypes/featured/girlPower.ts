import type { GIRL_POWER_CRITS } from "../../critData/girlPower";
import type { FeaturedRewards } from "./types";

export const GIRL_POWER_REWARDS = {
  streetSquad: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.streetSquadContinueChance),
  divaTrio: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.divaTrioTierSteps, balance.divaTrioUpgrades),
  squadGoals: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.squadGoalsDiscount),
  hypeCrew: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hypeCrewShare),
  girlGangBadge: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.girlGangBadgeBoostSeconds, balance.girlGangBadgeExtraWorkers),
  leopardLineup: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.leopardLineupContinueChance),
  bleacherCheer: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bleacherCheerShare),
  carpoolCool: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.carpoolCoolShare),
} satisfies FeaturedRewards<typeof GIRL_POWER_CRITS>;

import type { CAT_MARTIAL_ARTS_CRITS } from "../../critData/catMartialArts";
import type { FeaturedRewards } from "./types";

export const CAT_MARTIAL_ARTS_REWARDS = {
  blackBeltBiscuit: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blackBeltBiscuitDiscount),
  dojoWink: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.dojoWinkShare),
  boStaffBoots: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.boStaffBootsBoostSeconds, balance.boStaffBootsExtraWorkers),
  karateKittyChop: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.karateKittyChopContinueChance),
  kendoKitten: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.kendoKittenDiscount),
  kungFuWhiskers: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kungFuWhiskersShare),
  muayThaiMeow: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.muayThaiMeowBoostSeconds, balance.muayThaiMeowExtraWorkers),
  jabTabby: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.jabTabbyContinueChance),
  tigerTeepKick: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tigerTeepKickDiscount),
  ninjaPounce: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ninjaPounceShare),
  samuraiScratch: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.samuraiScratchBoostSeconds, balance.samuraiScratchExtraWorkers),
  shogunWhiskers: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.shogunWhiskersContinueChance),
  senseiWhiskers: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.senseiWhiskersDiscount),
  shaolinPurr: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shaolinPurrShare),
  sumoChonk: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.sumoChonkBoostSeconds, balance.sumoChonkExtraWorkers),
  bellyBumpBanzai: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.bellyBumpBanzaiContinueChance),
  tailWhipKick: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tailWhipKickDiscount),
  tigerClawStance: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tigerClawStanceShare),
  goldenFurFury: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.goldenFurFuryShare, 1),
  spikyBlueCat: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.spikyBlueCatShare, 2),
  spikyManeKitty: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.spikyManeKittyShare, 1),
} satisfies FeaturedRewards<typeof CAT_MARTIAL_ARTS_CRITS>;

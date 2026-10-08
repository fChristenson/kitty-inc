import type { ROMANTIC_PORTRAITS_CRITS } from "../critData/romanticPortraits";
import type { FeaturedRewards } from "./types";

export const ROMANTIC_PORTRAITS_REWARDS = {
  baldAndBeautiful: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.baldAndBeautifulBoostSeconds, balance.baldAndBeautifulExtraWorkers),
  battleScarBeau: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.battleScarBeauContinueChance),
  boneBunBesties: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.boneBunBestiesDiscount),
  brunetteBliss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.brunetteBlissShare),
  bunBraidBond: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.bunBraidBondBoostSeconds, balance.bunBraidBondExtraWorkers),
  buzzcutBesos: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.buzzcutBesosContinueChance),
  flexAndPeck: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.flexAndPeckShare),
  frostHairFlirt: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.frostHairFlirtBoostSeconds, balance.frostHairFlirtExtraWorkers),
  goldChainSmooch: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.goldChainSmoochDiscount),
  goldHoopTrio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.goldHoopTrioBoostSeconds, balance.goldHoopTrioExtraWorkers),
  ivoryManeKiss: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.ivoryManeKissShare),
  mohawkMakeout: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mohawkMakeoutDiscount),
  ponytailParade: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.ponytailParadeBoostSeconds, balance.ponytailParadeExtraWorkers),
  scarredSweetheart: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.scarredSweetheartContinueChance),
  sixPackSmooch: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sixPackSmoochDiscount),
  spikySweetheart: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.spikySweetheartShare),
  swoleMates: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.swoleMatesBoostSeconds, balance.swoleMatesExtraWorkers),
  tealBunBlush: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.tealBunBlushDiscount),
  goldenBraidBond: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenBraidBondShare),
  nightAndDay: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.nightAndDayShare),
  topKnotTrio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.topKnotTrioBoostSeconds, balance.topKnotTrioExtraWorkers),
  silverFoxFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.silverFoxFundShare),
  pompadourKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pompadourKissMultiple),
  blondeBobKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.blondeBobKissUpgrades),
  blueQuiffPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueQuiffPeckMultiple),
  fadeAndBraid: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.fadeAndBraidMultiple),
  flaxenBraidPeck: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.flaxenBraidPeckGrowth),
  goldilocks: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.goldilocksMultiple),
  twinPonytails: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.twinPonytailsMultiple),
  lemonCropTop: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.lemonCropTopGrowth),
  rapunzelSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.rapunzelSmoochMultiple),
  pinkBraidSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkBraidSmoochMultiple),
  tealBraids: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealBraidsGrowth),
  tomboySmooch: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.tomboySmoochUpgrades),
  blueBobSmooch: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.blueBobSmoochMultiple),
  braidsAndCurls: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.braidsAndCurlsGrowth),
  platinumPeck: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.platinumPeckMultiple),
  hoopEarringKiss: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.hoopEarringKissGrowth),
  violetWavesKiss: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.violetWavesKissMultiple),
} satisfies FeaturedRewards<typeof ROMANTIC_PORTRAITS_CRITS>;

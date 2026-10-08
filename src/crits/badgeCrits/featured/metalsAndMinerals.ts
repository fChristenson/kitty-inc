import type { METALS_AND_MINERALS_CRITS } from "../critData/metalsAndMinerals";
import type { FeaturedRewards } from "./types";

export const METALS_AND_MINERALS_REWARDS = {
  mendeleviumMajesty: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.mendeleviumMajestyTierSteps,
      balance.mendeleviumMajestyUpgrades,
    ),
  nobeliumLaureate: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  bohriumSummit: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.bohriumSummitFloors),
  darmstadtiumDowntown: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.darmstadtiumDowntownDiscount,
    ),
  fleroviumFortress: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  moscoviumMosaic: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.moscoviumMosaicUpgrades,
      balance.moscoviumMosaicPayouts,
    ),
  osmiumRegalia: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.osmiumRegaliaTierSteps,
      balance.osmiumRegaliaUpgrades,
    ),
  iridiumAegis: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.iridiumAegisDiscount),
  leadLode: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.leadLodeDiscount),
  bismuthBastion: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.bismuthBastionContinueChance),
  franciumFortune: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.franciumFortuneShare),
  thoriumThrone: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.thoriumThroneTierSteps,
      balance.thoriumThroneUpgrades,
    ),
  carbonCrown: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.carbonCrownTierSteps,
      balance.carbonCrownUpgrades,
    ),
  magnesiumMagnificence: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  aluminumAllStar: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.aluminumAllStarUpgrades,
      balance.aluminumAllStarPayouts,
    ),
  calciumCornerstone: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  scandiumStronghold: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.scandiumStrongholdWorkers),
  chromiumGleam: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  ironEmpire: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  nickelNestEgg: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.nickelNestEggContinueChance),
  bromineBounty: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bromineBountySeconds),
  molybdenumMachine: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.molybdenumMachineUpgrades,
      balance.molybdenumMachinePayouts,
    ),
  rutheniumRiches: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.rutheniumRichesSeconds),
  tinTreasure: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.tinTreasureShare),
  lanthanumLuster: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  erbiumElegance: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  tantalumTrove: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  tungstenTriumph: (context, { balance, upgradeHereAndPayHighest }) =>
    upgradeHereAndPayHighest(
      context,
      balance.tungstenTriumphUpgrades,
      balance.tungstenTriumphPayouts,
    ),
  platinumPodium: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  heavyElement: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.heavyElementWorkers),
  quicksilverDrop: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.quicksilverDropShare),
} satisfies FeaturedRewards<typeof METALS_AND_MINERALS_CRITS>;

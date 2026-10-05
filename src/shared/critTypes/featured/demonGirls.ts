import type { DEMON_GIRLS_CRITS } from "../../critData/demonGirls";
import type { FeaturedRewards } from "./types";

export const DEMON_GIRLS_REWARDS = {
  hellfireHeartbreaker: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.hellfireHeartbreakerTierSteps,
      balance.hellfireHeartbreakerUpgrades,
    ),
  spadeTailSass: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.spadeTailSassUpgrades),
  sinfullySolvent: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sinfullySolventShare),
  slyStack: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.slyStackPayouts),
  lavenderLounge: (context, { actions, balance, selectByRate }) =>
    actions.upgrade(
      [selectByRate(context, true)],
      balance.lavenderLoungeUpgrades,
    ),
  pitchforkCharmer: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  scarletSaunter: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.scarletSaunterDiscount),
  forkFlourish: (context, { actions }) =>
    actions.startEvent(context.floors, "rushHour"),
  brimstoneBelle: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.brimstoneBellePayouts),
  flapperFlames: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.flapperFlamesBoostSeconds,
      balance.flapperFlamesExtraWorkers,
    ),
  sootAndSequins: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.sootAndSequinsContinueChance),
  impeccableTaste: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.impeccableTastePayouts),
  heartsAflame: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.heartsAflameBoostSeconds,
      balance.heartsAflameExtraWorkers,
    ),
  finePrintFiend: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.finePrintFiendContinueChance),
  signedInScarlet: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.signedInScarletContinueChance,
    ),
  termsAndTemptations: (context, { actions, balance, highestFloor }) =>
    actions.payCycles(
      [highestFloor(context)],
      balance.termsAndTemptationsPayouts,
    ),
  hotTake: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.hotTakeFloors),
  coinFlambe: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.coinFlambeShare),
  rivetRebel: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.rivetRebelUpgrades),
  flickerGrin: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, false)],
      balance.flickerGrinPayouts,
    ),
  smolderEyes: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.smolderEyesWorkers),
  crimsonGlare: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  midnightSideEye: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.midnightSideEyeFloors),
  amberStare: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.amberStareWorkers),
  brimstoneBonus: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.brimstoneBonusBoostSeconds,
      balance.brimstoneBonusExtraWorkers,
    ),
  devilishDeal: (context, { actions, highestFloor }) =>
    actions.armCrit([highestFloor(context)], "crit"),
  hellfireHustle: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.hellfireHustleBoostSeconds,
      balance.hellfireHustleExtraWorkers,
    ),
  hornedHedge: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.hornedHedgeWorkers),
  infernalInvoice: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "down",
      balance.infernalInvoiceContinueChance,
    ),
  pitchforkProfits: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.pitchforkProfitsTierSteps,
      balance.pitchforkProfitsUpgrades,
    ),
  sinfulSurplus: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sinfulSurplusDiscount),
  soulContractClause: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.soulContractClauseSeconds),
  underworldUpsell: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  blueDevil: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.blueDevilGrowth),
  brimstoneBiceps: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.brimstoneBicepsMultiple),
  devilMayKiss: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.devilMayKissGrowth),
  sinnersPlea: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.sinnersPleaUpgrades),
  tealTemptress: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.tealTemptressMultiple),
  hornsAndBraids: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.hornsAndBraidsGrowth),
  lipstickDevils: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lipstickDevilsUpgrades),
  flexingFiends: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.flexingFiendsMultiple),
  demonHandshake: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.demonHandshakeGrowth),
  ashAndEmber: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.ashAndEmberUpgrades),
  infernalToeHold: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.infernalToeHoldMultiple),
} satisfies FeaturedRewards<typeof DEMON_GIRLS_CRITS>;

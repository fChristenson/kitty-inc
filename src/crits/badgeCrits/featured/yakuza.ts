import type { YAKUZA_CRITS } from "../critData/yakuza";
import type { FeaturedRewards } from "./types";

export const YAKUZA_REWARDS = {
  oyabunsBlessing: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.oyabunsBlessingTierSteps,
      balance.oyabunsBlessingUpgrades,
    ),
  irezumiInk: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.irezumiInkDiscount),
  teboriTabby: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  indigoInkwell: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.indigoInkwellFloors),
  dragonBackpiece: (context, { balance, selectByRate, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.dragonBackpieceTierSteps,
      balance.dragonBackpieceUpgrades,
    ),
  dragonPearlPact: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.dragonPearlPactPayouts,
    ),
  gingerDragon: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.gingerDragonFloors),
  katanaCashflow: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.katanaCashflowFloors),
  samuraiSpillway: (context, { actions, balance, belowAndHere }) =>
    actions.payCycles(belowAndHere(context), balance.samuraiSpillwayPayouts),
  goldenKoiClan: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.goldenKoiClanWorkers),
  koiCoinWhirlpool: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.koiCoinWhirlpoolContinueChance,
    ),
  manekiMobster: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.manekiMobsterWorkers);
    actions.hireManagers(context.floors);
  },
  hanafudaHeist: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.hanafudaHeistContinueChance),
  hannyaMuscle: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.hannyaMuscleUpgrades),
  redMaskGuard: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.redMaskGuardUpgrades),
  maskedRetainer: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.maskedRetainerContinueChance),
  blackSedanConvoy: (context, { actions, balance, cascadeDown }) =>
    actions.upgrade(cascadeDown(context), balance.blackSedanConvoyUpgrades),
  pompadourPosse: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.pompadourPosseWorkers);
    actions.hireManagers(context.floors);
  },
  sakazukiOath: (context, { actions, balance, highestFloor, hereAnd }) =>
    actions.payCycles(
      hereAnd(context, highestFloor(context)),
      balance.sakazukiOathPayouts,
    ),
  sakuraSworn: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  shogunShakedown: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.shogunShakedownBoostSeconds,
      balance.shogunShakedownExtraWorkers,
    ),
  tanukiTreasurer: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.tanukiTreasurerWorkers);
    actions.hireManagers(context.floors);
  },
} satisfies FeaturedRewards<typeof YAKUZA_CRITS>;

import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const YAKUZA_CRITS = {
  oyabunsBlessing: {
    label: "Oyabun's Blessing",
    color: COLOR.goldenHandshakeGold,
    image: "crits/yakuza/oyabunsBlessing.webp",
    description: "One tier promotion and thirty-eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.oyabunsBlessingTierSteps,
        balance.oyabunsBlessingUpgrades,
      ),
  },
  irezumiInk: {
    label: "Irezumi Ink",
    color: COLOR.nightShiftIndigo,
    image: "crits/yakuza/irezumiInk.webp",
    description: "Cuts every price in this building by 4.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.irezumiInkDiscount),
  },
  teboriTabby: {
    label: "Tebori Tabby",
    color: COLOR.autumnSaleAmber,
    image: "crits/yakuza/teboriTabby.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "mega"),
  },
  indigoInkwell: {
    label: "Indigo Inkwell",
    color: COLOR.pairBlue,
    image: "crits/yakuza/indigoInkwell.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.indigoInkwellFloors),
  },
  dragonBackpiece: {
    label: "Dragon Backpiece",
    color: COLOR.dressCodeGreen,
    image: "crits/yakuza/dragonBackpiece.webp",
    description: "Two tier promotions and twenty upgrades on the top earner",
    reward: (context, { balance, selectByRate, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.dragonBackpieceTierSteps,
        balance.dragonBackpieceUpgrades,
      ),
  },
  dragonPearlPact: {
    label: "Dragon Pearl Pact",
    color: COLOR.fullHouseCrimson,
    image: "crits/yakuza/dragonPearlPact.webp",
    description: "Sixty-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.dragonPearlPactPayouts,
      ),
  },
  gingerDragon: {
    label: "Ginger Dragon",
    color: COLOR.goldStandardAmber,
    image: "crits/yakuza/gingerDragon.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.gingerDragonFloors),
  },
  katanaCashflow: {
    label: "Katana Cashflow",
    color: COLOR.red,
    image: "crits/yakuza/katanaCashflow.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.katanaCashflowFloors),
  },
  samuraiSpillway: {
    label: "Samurai Spillway",
    color: COLOR.bonusRoundGold,
    image: "crits/yakuza/samuraiSpillway.webp",
    description: "Fifty-one payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.samuraiSpillwayPayouts),
  },
  goldenKoiClan: {
    label: "Golden Koi Clan",
    color: COLOR.goldenTicketYellow,
    image: "crits/yakuza/goldenKoiClan.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.goldenKoiClanWorkers),
  },
  koiCoinWhirlpool: {
    label: "Koi Coin Whirlpool",
    color: COLOR.fastForwardBlue,
    image: "crits/yakuza/koiCoinWhirlpool.webp",
    description:
      "Repeats the crit above and below, 54% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.koiCoinWhirlpoolContinueChance,
      ),
  },
  manekiMobster: {
    label: "Maneki Mobster",
    color: COLOR.white,
    image: "crits/yakuza/manekiMobster.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.manekiMobsterWorkers);
      actions.hireManagers(context.floors);
    },
  },
  hanafudaHeist: {
    label: "Hanafuda Heist",
    color: COLOR.grandOpeningRose,
    image: "crits/yakuza/hanafudaHeist.webp",
    description:
      "Repeats the crit on the floor below, 59% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.hanafudaHeistContinueChance),
  },
  hannyaMuscle: {
    label: "Hannya Muscle",
    color: COLOR.doubleDownCrimson,
    image: "crits/yakuza/hannyaMuscle.webp",
    description: "Sixty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hannyaMuscleUpgrades),
  },
  redMaskGuard: {
    label: "Red Mask Guard",
    color: COLOR.fireDrillRed,
    image: "crits/yakuza/redMaskGuard.webp",
    description: "Fifty-nine upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.redMaskGuardUpgrades),
  },
  maskedRetainer: {
    label: "Masked Retainer",
    color: COLOR.silverTicketGray,
    image: "crits/yakuza/maskedRetainer.webp",
    description:
      "Repeats the crit above and below, 55% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.maskedRetainerContinueChance),
  },
  blackSedanConvoy: {
    label: "Black Sedan Convoy",
    color: COLOR.internSkyBlue,
    image: "crits/yakuza/blackSedanConvoy.webp",
    description: "Fifty-five upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.blackSedanConvoyUpgrades),
  },
  pompadourPosse: {
    label: "Pompadour Posse",
    color: COLOR.royalFlushPurple,
    image: "crits/yakuza/pompadourPosse.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.pompadourPosseWorkers);
      actions.hireManagers(context.floors);
    },
  },
  sakazukiOath: {
    label: "Sakazuki Oath",
    color: COLOR.fullHouseCrimson,
    image: "crits/yakuza/sakazukiOath.webp",
    description: "Forty payouts here and on the highest floor",
    reward: (context, { actions, balance, highestFloor, hereAnd }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.sakazukiOathPayouts,
      ),
  },
  sakuraSworn: {
    label: "Sakura Sworn",
    color: COLOR.peppermintPink,
    image: "crits/yakuza/sakuraSworn.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  shogunShakedown: {
    label: "Shogun Shakedown",
    color: COLOR.amberMuted,
    image: "crits/yakuza/shogunShakedown.webp",
    description: "Boosts every worker for 55s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.shogunShakedownBoostSeconds,
        balance.shogunShakedownExtraWorkers,
      ),
  },
  tanukiTreasurer: {
    label: "Tanuki Treasurer",
    color: COLOR.chairGiveawayBrown,
    image: "crits/yakuza/tanukiTreasurer.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.tanukiTreasurerWorkers);
      actions.hireManagers(context.floors);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

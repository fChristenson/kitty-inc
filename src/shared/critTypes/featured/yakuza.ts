import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const YAKUZA_CRITS = {
  oyabunsBlessing: {
    label: "Oyabun's Blessing",
    color: COLOR.goldenHandshakeGold,
    image: "crits/yakuza/oyabunsBlessing.png",
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
    image: "crits/yakuza/irezumiInk.png",
    description: "Sixty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.irezumiInkUpgrades),
  },
  teboriTabby: {
    label: "Tebori Tabby",
    color: COLOR.autumnSaleAmber,
    image: "crits/yakuza/teboriTabby.png",
    description: "Sixty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.teboriTabbyPayouts),
  },
  indigoInkwell: {
    label: "Indigo Inkwell",
    color: COLOR.pairBlue,
    image: "crits/yakuza/indigoInkwell.png",
    description: "Thirty-three upgrades and thirty-five payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.indigoInkwellUpgrades,
        balance.indigoInkwellPayouts,
      ),
  },
  dragonBackpiece: {
    label: "Dragon Backpiece",
    color: COLOR.dressCodeGreen,
    image: "crits/yakuza/dragonBackpiece.png",
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
    image: "crits/yakuza/dragonPearlPact.png",
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
    image: "crits/yakuza/gingerDragon.png",
    description: "Sixty-two upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.gingerDragonUpgrades,
      ),
  },
  katanaCashflow: {
    label: "Katana Cashflow",
    color: COLOR.red,
    image: "crits/yakuza/katanaCashflow.png",
    description: "Fifty upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.katanaCashflowUpgrades),
  },
  samuraiSpillway: {
    label: "Samurai Spillway",
    color: COLOR.bonusRoundGold,
    image: "crits/yakuza/samuraiSpillway.png",
    description: "Fifty-one payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.samuraiSpillwayPayouts),
  },
  goldenKoiClan: {
    label: "Golden Koi Clan",
    color: COLOR.goldenTicketYellow,
    image: "crits/yakuza/goldenKoiClan.png",
    description: "Fifty-four upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.goldenKoiClanUpgrades),
  },
  koiCoinWhirlpool: {
    label: "Koi Coin Whirlpool",
    color: COLOR.fastForwardBlue,
    image: "crits/yakuza/koiCoinWhirlpool.png",
    description: "Fifty-six payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.koiCoinWhirlpoolPayouts),
  },
  manekiMobster: {
    label: "Maneki Mobster",
    color: COLOR.white,
    image: "crits/yakuza/manekiMobster.png",
    description: "Forty-eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.manekiMobsterPayouts),
  },
  hanafudaHeist: {
    label: "Hanafuda Heist",
    color: COLOR.grandOpeningRose,
    image: "crits/yakuza/hanafudaHeist.png",
    description: "Sixty-six payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.hanafudaHeistPayouts,
      ),
  },
  hannyaMuscle: {
    label: "Hannya Muscle",
    color: COLOR.doubleDownCrimson,
    image: "crits/yakuza/hannyaMuscle.png",
    description: "Sixty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hannyaMuscleUpgrades),
  },
  redMaskGuard: {
    label: "Red Mask Guard",
    color: COLOR.fireDrillRed,
    image: "crits/yakuza/redMaskGuard.png",
    description: "Fifty-nine upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.redMaskGuardUpgrades),
  },
  maskedRetainer: {
    label: "Masked Retainer",
    color: COLOR.silverTicketGray,
    image: "crits/yakuza/maskedRetainer.png",
    description: "Sixty payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.maskedRetainerPayouts),
  },
  blackSedanConvoy: {
    label: "Black Sedan Convoy",
    color: COLOR.internSkyBlue,
    image: "crits/yakuza/blackSedanConvoy.png",
    description: "Fifty-five upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.blackSedanConvoyUpgrades),
  },
  pompadourPosse: {
    label: "Pompadour Posse",
    color: COLOR.royalFlushPurple,
    image: "crits/yakuza/pompadourPosse.png",
    description: "Forty-four upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.pompadourPosseUpgrades),
  },
  sakazukiOath: {
    label: "Sakazuki Oath",
    color: COLOR.fullHouseCrimson,
    image: "crits/yakuza/sakazukiOath.png",
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
    image: "crits/yakuza/sakuraSworn.png",
    description: "Sixty upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.sakuraSwornUpgrades),
  },
  shogunShakedown: {
    label: "Shogun Shakedown",
    color: COLOR.amberMuted,
    image: "crits/yakuza/shogunShakedown.png",
    description: "Thirty upgrades and thirty-two payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.shogunShakedownUpgrades,
        balance.shogunShakedownPayouts,
      ),
  },
  tanukiTreasurer: {
    label: "Tanuki Treasurer",
    color: COLOR.chairGiveawayBrown,
    image: "crits/yakuza/tanukiTreasurer.png",
    description:
      "Twenty-one upgrades and twenty payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.tanukiTreasurerUpgrades,
        balance.tanukiTreasurerPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

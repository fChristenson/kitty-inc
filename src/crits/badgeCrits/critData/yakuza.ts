import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const YAKUZA_CRITS = {
  oyabunsBlessing: {
    label: "Oyabun's Blessing",
    color: COLOR.goldenHandshakeGold,
    image: "crits/yakuza/oyabunsBlessing.webp",
    description: "One tier promotion and thirty-eight upgrades here",
  },
  irezumiInk: {
    label: "Irezumi Ink",
    color: COLOR.nightShiftIndigo,
    image: "crits/yakuza/irezumiInk.webp",
    description: "Cuts every price in this building by 4.4%",
  },
  teboriTabby: {
    label: "Tebori Tabby",
    color: COLOR.autumnSaleAmber,
    image: "crits/yakuza/teboriTabby.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  indigoInkwell: {
    label: "Indigo Inkwell",
    color: COLOR.pairBlue,
    image: "crits/yakuza/indigoInkwell.webp",
    description: "Unlocks the next floor for free",
  },
  dragonBackpiece: {
    label: "Dragon Backpiece",
    color: COLOR.dressCodeGreen,
    image: "crits/yakuza/dragonBackpiece.webp",
    description: "Two tier promotions and twenty upgrades on the top earner",
  },
  dragonPearlPact: {
    label: "Dragon Pearl Pact",
    color: COLOR.fullHouseCrimson,
    image: "crits/yakuza/dragonPearlPact.webp",
    description: "Sixty-four payouts from the highest-earning floor",
  },
  gingerDragon: {
    label: "Ginger Dragon",
    color: COLOR.goldStandardAmber,
    image: "crits/yakuza/gingerDragon.webp",
    description: "Unlocks the next 3 floors for free",
  },
  katanaCashflow: {
    label: "Katana Cashflow",
    color: COLOR.red,
    image: "crits/yakuza/katanaCashflow.webp",
    description: "Unlocks the next 2 floors for free",
  },
  samuraiSpillway: {
    label: "Samurai Spillway",
    color: COLOR.bonusRoundGold,
    image: "crits/yakuza/samuraiSpillway.webp",
    description: "Fifty-one payouts on this floor and every floor below",
  },
  goldenKoiClan: {
    label: "Golden Koi Clan",
    color: COLOR.goldenTicketYellow,
    image: "crits/yakuza/goldenKoiClan.webp",
    description: "Hires 1 free worker on every unlocked floor",
  },
  koiCoinWhirlpool: {
    label: "Koi Coin Whirlpool",
    color: COLOR.fastForwardBlue,
    image: "crits/yakuza/koiCoinWhirlpool.webp",
    description:
      "Repeats the crit above and below, 54% chance to keep spreading",
  },
  manekiMobster: {
    label: "Maneki Mobster",
    color: COLOR.white,
    image: "crits/yakuza/manekiMobster.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
  },
  hanafudaHeist: {
    label: "Hanafuda Heist",
    color: COLOR.grandOpeningRose,
    image: "crits/yakuza/hanafudaHeist.webp",
    description:
      "Repeats the crit on the floor below, 59% chance to keep falling",
  },
  hannyaMuscle: {
    label: "Hannya Muscle",
    color: COLOR.doubleDownCrimson,
    image: "crits/yakuza/hannyaMuscle.webp",
    description: "Sixty-five free upgrades on this floor",
  },
  redMaskGuard: {
    label: "Red Mask Guard",
    color: COLOR.fireDrillRed,
    image: "crits/yakuza/redMaskGuard.webp",
    description: "Fifty-nine upgrades on the highest unlocked floor",
  },
  maskedRetainer: {
    label: "Masked Retainer",
    color: COLOR.silverTicketGray,
    image: "crits/yakuza/maskedRetainer.webp",
    description:
      "Repeats the crit above and below, 55% chance to keep spreading",
  },
  blackSedanConvoy: {
    label: "Black Sedan Convoy",
    color: COLOR.internSkyBlue,
    image: "crits/yakuza/blackSedanConvoy.webp",
    description: "Fifty-five upgrades rolling down the floors below",
  },
  pompadourPosse: {
    label: "Pompadour Posse",
    color: COLOR.royalFlushPurple,
    image: "crits/yakuza/pompadourPosse.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
  },
  sakazukiOath: {
    label: "Sakazuki Oath",
    color: COLOR.fullHouseCrimson,
    image: "crits/yakuza/sakazukiOath.webp",
    description: "Forty payouts here and on the highest floor",
  },
  sakuraSworn: {
    label: "Sakura Sworn",
    color: COLOR.peppermintPink,
    image: "crits/yakuza/sakuraSworn.webp",
    description: "Raises every floor below this one to its level",
  },
  shogunShakedown: {
    label: "Shogun Shakedown",
    color: COLOR.amberMuted,
    image: "crits/yakuza/shogunShakedown.webp",
    description: "Boosts every worker for 55s, counting as 1 extra worker",
  },
  tanukiTreasurer: {
    label: "Tanuki Treasurer",
    color: COLOR.chairGiveawayBrown,
    image: "crits/yakuza/tanukiTreasurer.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
  },
} as const satisfies Record<string, FeaturedCritData>;

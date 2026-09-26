import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const YAKUZA_CRIT_INFO = {
  oyabunsBlessing: {
    label: "Oyabun's Blessing",
    color: COLOR.goldenHandshakeGold,
    icon: "oyabunsBlessing",
    description: "One tier promotion and thirty-eight upgrades here",
  },
  irezumiInk: {
    label: "Irezumi Ink",
    color: COLOR.nightShiftIndigo,
    icon: "irezumiInk",
    description: "Sixty-three free upgrades on this floor",
  },
  teboriTabby: {
    label: "Tebori Tabby",
    color: COLOR.autumnSaleAmber,
    icon: "teboriTabby",
    description: "Sixty-one instant payouts on this floor",
  },
  indigoInkwell: {
    label: "Indigo Inkwell",
    color: COLOR.pairBlue,
    icon: "indigoInkwell",
    description: "Thirty-three upgrades and thirty-five payouts on this floor",
  },
  dragonBackpiece: {
    label: "Dragon Backpiece",
    color: COLOR.dressCodeGreen,
    icon: "dragonBackpiece",
    description: "Two tier promotions and twenty upgrades on the top earner",
  },
  dragonPearlPact: {
    label: "Dragon Pearl Pact",
    color: COLOR.fullHouseCrimson,
    icon: "dragonPearlPact",
    description: "Sixty-four payouts from the highest-earning floor",
  },
  gingerDragon: {
    label: "Ginger Dragon",
    color: COLOR.goldStandardAmber,
    icon: "gingerDragon",
    description: "Sixty-two upgrades on the top earner",
  },
  katanaCashflow: {
    label: "Katana Cashflow",
    color: COLOR.red,
    icon: "katanaCashflow",
    description: "Fifty upgrades on this floor and every floor below",
  },
  samuraiSpillway: {
    label: "Samurai Spillway",
    color: COLOR.bonusRoundGold,
    icon: "samuraiSpillway",
    description: "Fifty-one payouts on this floor and every floor below",
  },
  goldenKoiClan: {
    label: "Golden Koi Clan",
    color: COLOR.goldenTicketYellow,
    icon: "goldenKoiClan",
    description: "Fifty-four upgrades on alternating floors",
  },
  koiCoinWhirlpool: {
    label: "Koi Coin Whirlpool",
    color: COLOR.fastForwardBlue,
    icon: "koiCoinWhirlpool",
    description: "Fifty-six payouts on alternating floors",
  },
  manekiMobster: {
    label: "Maneki Mobster",
    color: COLOR.white,
    icon: "manekiMobster",
    description: "Forty-eight payouts on every unlocked floor",
  },
  hanafudaHeist: {
    label: "Hanafuda Heist",
    color: COLOR.grandOpeningRose,
    icon: "hanafudaHeist",
    description: "Sixty-six payouts on the lowest-earning floor",
  },
  hannyaMuscle: {
    label: "Hannya Muscle",
    color: COLOR.doubleDownCrimson,
    icon: "hannyaMuscle",
    description: "Sixty-five free upgrades on this floor",
  },
  redMaskGuard: {
    label: "Red Mask Guard",
    color: COLOR.fireDrillRed,
    icon: "redMaskGuard",
    description: "Fifty-nine upgrades on the highest unlocked floor",
  },
  maskedRetainer: {
    label: "Masked Retainer",
    color: COLOR.silverTicketGray,
    icon: "maskedRetainer",
    description: "Sixty payouts on the highest unlocked floor",
  },
  blackSedanConvoy: {
    label: "Black Sedan Convoy",
    color: COLOR.internSkyBlue,
    icon: "blackSedanConvoy",
    description: "Fifty-five upgrades rolling down the floors below",
  },
  pompadourPosse: {
    label: "Pompadour Posse",
    color: COLOR.royalFlushPurple,
    icon: "pompadourPosse",
    description: "Forty-four upgrades on every unlocked floor",
  },
  sakazukiOath: {
    label: "Sakazuki Oath",
    color: COLOR.fullHouseCrimson,
    icon: "sakazukiOath",
    description: "Forty payouts here and on the highest floor",
  },
  sakuraSworn: {
    label: "Sakura Sworn",
    color: COLOR.peppermintPink,
    icon: "sakuraSworn",
    description: "Sixty upgrades on the lowest-level floor",
  },
  shogunShakedown: {
    label: "Shogun Shakedown",
    color: COLOR.amberMuted,
    icon: "shogunShakedown",
    description: "Thirty upgrades and thirty-two payouts on the top earner",
  },
  tanukiTreasurer: {
    label: "Tanuki Treasurer",
    color: COLOR.chairGiveawayBrown,
    icon: "tanukiTreasurer",
    description:
      "Twenty-one upgrades and twenty payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;

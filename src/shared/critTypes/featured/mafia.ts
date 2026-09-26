import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const MAFIA_CRIT_INFO = {
  theCatfather: {
    label: "The Catfather",
    color: COLOR.fullHouseCrimson,
    icon: "theCatfather",
    description: "Two tier promotions and twenty-three upgrades here",
  },
  unrefusableOffer: {
    label: "Unrefusable Offer",
    color: COLOR.goldenHandshakeGold,
    icon: "unrefusableOffer",
    description: "Sixty-two payouts from the highest-earning floor",
  },
  briefcaseBonus: {
    label: "Briefcase Bonus",
    color: COLOR.autumnSaleAmber,
    icon: "briefcaseBonus",
    description: "Thirty-two upgrades and thirty-four payouts on this floor",
  },
  violinCaseCaper: {
    label: "Violin Case Caper",
    color: COLOR.chairGiveawayBrown,
    icon: "violinCaseCaper",
    description: "Fifty-nine instant payouts on this floor",
  },
  technicolorTake: {
    label: "Technicolor Take",
    color: COLOR.royalFlushPurple,
    icon: "technicolorTake",
    description: "Forty-six payouts on every unlocked floor",
  },
  stringsAttached: {
    label: "Strings Attached",
    color: COLOR.espressoShotBrown,
    icon: "stringsAttached",
    description: "Fifty-two upgrades on alternating floors",
  },
  fiddlesticksFund: {
    label: "Fiddlesticks Fund",
    color: COLOR.dressCodeGreen,
    icon: "fiddlesticksFund",
    description: "Fifty-three payouts on alternating floors",
  },
  fedoraFlex: {
    label: "Fedora Flex",
    color: COLOR.nightShiftIndigo,
    icon: "fedoraFlex",
    description: "Sixty-one free upgrades on this floor",
  },
  brimTipper: {
    label: "Brim Tipper",
    color: COLOR.silverTicketGray,
    icon: "brimTipper",
    description: "Sixty upgrades on the top earner",
  },
  greenbackFan: {
    label: "Greenback Fan",
    color: COLOR.luckyCloverGreen,
    icon: "greenbackFan",
    description:
      "Twenty-eight upgrades and thirty-one payouts on the top earner",
  },
  craftyConsigliere: {
    label: "Crafty Consigliere",
    color: COLOR.mysticTeal,
    icon: "craftyConsigliere",
    description: "Forty-one upgrades here and on the lowest-level floor",
  },
  cappuccinoCapo: {
    label: "Cappuccino Capo",
    color: COLOR.espressoShotBrown,
    icon: "cappuccinoCapo",
    description: "Forty-seven upgrades on this floor and every floor below",
  },
  demitasseDues: {
    label: "Demitasse Dues",
    color: COLOR.amberMuted,
    icon: "demitasseDues",
    description: "Forty-nine payouts on this floor and every floor below",
  },
  latteLoyalty: {
    label: "Latte Loyalty",
    color: COLOR.goldStandardAmber,
    icon: "latteLoyalty",
    description: "Fifty-five upgrades on the lowest-level floor",
  },
  takeTheCannoli: {
    label: "Take the Cannoli",
    color: COLOR.peppermintPink,
    icon: "takeTheCannoli",
    description: "Sixty-one payouts on the lowest-level floor",
  },
  speakeasyStash: {
    label: "Speakeasy Stash",
    color: COLOR.chairGiveawayBrown,
    icon: "speakeasyStash",
    description: "Fifty-seven upgrades on the highest unlocked floor",
  },
  passwordPlease: {
    label: "Password Please",
    color: COLOR.bonusRoundGold,
    icon: "passwordPlease",
    description: "Fifty-eight payouts on the highest unlocked floor",
  },
  hiddenDoorHaul: {
    label: "Hidden Door Haul",
    color: COLOR.goldenTicketYellow,
    icon: "hiddenDoorHaul",
    description: "Fifty-eight upgrades on the cheapest floor to upgrade",
  },
  pinstripePension: {
    label: "Pinstripe Pension",
    color: COLOR.silverTicketGray,
    icon: "pinstripePension",
    description: "Forty-three upgrades on every unlocked floor",
  },
  lipsSealed: {
    label: "Lips Sealed",
    color: COLOR.goldenHandshakeGold,
    icon: "lipsSealed",
    description: "Sixty-three payouts on the lowest-earning floor",
  },
  protectionRacket: {
    label: "Protection Racket",
    color: COLOR.fastForwardBlue,
    icon: "protectionRacket",
    description: "Forty-three upgrades here and on the highest floor",
  },
  runningBoardRiches: {
    label: "Running Board Riches",
    color: COLOR.nightShiftIndigo,
    icon: "runningBoardRiches",
    description: "Fifty-three upgrades rolling down the floors below",
  },
  sundaySauceSitdown: {
    label: "Sunday Sauce Sitdown",
    color: COLOR.red,
    icon: "sundaySauceSitdown",
    description: "Twenty upgrades and nineteen payouts on every unlocked floor",
  },
  kissTheRing: {
    label: "Kiss the Ring",
    color: COLOR.doubleDownCrimson,
    icon: "kissTheRing",
    description: "One tier promotion and thirty-six upgrades on the top earner",
  },
  bootlegBarrel: {
    label: "Bootleg Barrel",
    color: COLOR.autumnSaleAmber,
    icon: "bootlegBarrel",
    description: "Sixty-four payouts on the cheapest floor to upgrade",
  },
  wiseguySwagger: {
    label: "Wiseguy Swagger",
    color: COLOR.goldStandardAmber,
    icon: "wiseguySwagger",
    description: "Thirty-eight upgrades here and on the lowest-earning floor",
  },
  dontWorryAboutIt: {
    label: "Don't Worry About It",
    color: COLOR.internSkyBlue,
    icon: "dontWorryAboutIt",
    description:
      "Twenty-nine upgrades and thirty-three payouts on the highest unlocked floor",
  },
  mindYourOwnBusiness: {
    label: "Mind Your Own Business",
    color: COLOR.pairBlue,
    icon: "mindYourOwnBusiness",
    description: "Twenty-six upgrades and thirty payouts on alternating floors",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;

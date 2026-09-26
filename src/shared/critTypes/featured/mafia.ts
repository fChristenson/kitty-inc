import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MAFIA_CRITS = {
  theCatfather: {
    label: "The Catfather",
    color: COLOR.fullHouseCrimson,
    image: "crits/mafia/theCatfather.png",
    description: "Two tier promotions and twenty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.theCatfatherTierSteps,
        balance.theCatfatherUpgrades,
      ),
  },
  unrefusableOffer: {
    label: "Unrefusable Offer",
    color: COLOR.goldenHandshakeGold,
    image: "crits/mafia/unrefusableOffer.png",
    description: "Sixty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.unrefusableOfferPayouts,
      ),
  },
  briefcaseBonus: {
    label: "Briefcase Bonus",
    color: COLOR.autumnSaleAmber,
    image: "crits/mafia/briefcaseBonus.png",
    description: "Thirty-two upgrades and thirty-four payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.briefcaseBonusUpgrades,
        balance.briefcaseBonusPayouts,
      ),
  },
  violinCaseCaper: {
    label: "Violin Case Caper",
    color: COLOR.chairGiveawayBrown,
    image: "crits/mafia/violinCaseCaper.png",
    description: "Fifty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.violinCaseCaperPayouts),
  },
  technicolorTake: {
    label: "Technicolor Take",
    color: COLOR.royalFlushPurple,
    image: "crits/mafia/technicolorTake.png",
    description: "Forty-six payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.technicolorTakePayouts),
  },
  stringsAttached: {
    label: "Strings Attached",
    color: COLOR.espressoShotBrown,
    image: "crits/mafia/stringsAttached.png",
    description: "Fifty-two upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.stringsAttachedUpgrades),
  },
  fiddlesticksFund: {
    label: "Fiddlesticks Fund",
    color: COLOR.dressCodeGreen,
    image: "crits/mafia/fiddlesticksFund.png",
    description: "Fifty-three payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.fiddlesticksFundPayouts),
  },
  fedoraFlex: {
    label: "Fedora Flex",
    color: COLOR.nightShiftIndigo,
    image: "crits/mafia/fedoraFlex.png",
    description: "Sixty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.fedoraFlexUpgrades),
  },
  brimTipper: {
    label: "Brim Tipper",
    color: COLOR.silverTicketGray,
    image: "crits/mafia/brimTipper.png",
    description: "Sixty upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.brimTipperUpgrades,
      ),
  },
  greenbackFan: {
    label: "Greenback Fan",
    color: COLOR.luckyCloverGreen,
    image: "crits/mafia/greenbackFan.png",
    description:
      "Twenty-eight upgrades and thirty-one payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.greenbackFanUpgrades,
        balance.greenbackFanPayouts,
      ),
  },
  craftyConsigliere: {
    label: "Crafty Consigliere",
    color: COLOR.mysticTeal,
    image: "crits/mafia/craftyConsigliere.png",
    description: "Forty-one upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.craftyConsigliereUpgrades,
      ),
  },
  cappuccinoCapo: {
    label: "Cappuccino Capo",
    color: COLOR.espressoShotBrown,
    image: "crits/mafia/cappuccinoCapo.png",
    description: "Forty-seven upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.cappuccinoCapoUpgrades),
  },
  demitasseDues: {
    label: "Demitasse Dues",
    color: COLOR.amberMuted,
    image: "crits/mafia/demitasseDues.png",
    description: "Forty-nine payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.demitasseDuesPayouts),
  },
  latteLoyalty: {
    label: "Latte Loyalty",
    color: COLOR.goldStandardAmber,
    image: "crits/mafia/latteLoyalty.png",
    description: "Fifty-five upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.latteLoyaltyUpgrades),
  },
  takeTheCannoli: {
    label: "Take the Cannoli",
    color: COLOR.peppermintPink,
    image: "crits/mafia/takeTheCannoli.png",
    description: "Sixty-one payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.takeTheCannoliPayouts),
  },
  speakeasyStash: {
    label: "Speakeasy Stash",
    color: COLOR.chairGiveawayBrown,
    image: "crits/mafia/speakeasyStash.png",
    description: "Fifty-seven upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.speakeasyStashUpgrades),
  },
  passwordPlease: {
    label: "Password Please",
    color: COLOR.bonusRoundGold,
    image: "crits/mafia/passwordPlease.png",
    description: "Fifty-eight payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.passwordPleasePayouts),
  },
  hiddenDoorHaul: {
    label: "Hidden Door Haul",
    color: COLOR.goldenTicketYellow,
    image: "crits/mafia/hiddenDoorHaul.png",
    description: "Fifty-eight upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.hiddenDoorHaulUpgrades),
  },
  pinstripePension: {
    label: "Pinstripe Pension",
    color: COLOR.silverTicketGray,
    image: "crits/mafia/pinstripePension.png",
    description: "Forty-three upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.pinstripePensionUpgrades),
  },
  lipsSealed: {
    label: "Lips Sealed",
    color: COLOR.goldenHandshakeGold,
    image: "crits/mafia/lipsSealed.png",
    description: "Sixty-three payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.lipsSealedPayouts,
      ),
  },
  protectionRacket: {
    label: "Protection Racket",
    color: COLOR.fastForwardBlue,
    image: "crits/mafia/protectionRacket.png",
    description: "Forty-three upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.protectionRacketUpgrades,
      ),
  },
  runningBoardRiches: {
    label: "Running Board Riches",
    color: COLOR.nightShiftIndigo,
    image: "crits/mafia/runningBoardRiches.png",
    description: "Fifty-three upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.runningBoardRichesUpgrades),
  },
  sundaySauceSitdown: {
    label: "Sunday Sauce Sitdown",
    color: COLOR.red,
    image: "crits/mafia/sundaySauceSitdown.png",
    description: "Twenty upgrades and nineteen payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.sundaySauceSitdownUpgrades,
        balance.sundaySauceSitdownPayouts,
      ),
  },
  kissTheRing: {
    label: "Kiss the Ring",
    color: COLOR.doubleDownCrimson,
    image: "crits/mafia/kissTheRing.png",
    description: "One tier promotion and thirty-six upgrades on the top earner",
    reward: (context, { balance, selectByRate, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.kissTheRingTierSteps,
        balance.kissTheRingUpgrades,
      ),
  },
  bootlegBarrel: {
    label: "Bootleg Barrel",
    color: COLOR.autumnSaleAmber,
    image: "crits/mafia/bootlegBarrel.png",
    description: "Sixty-four payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.bootlegBarrelPayouts),
  },
  wiseguySwagger: {
    label: "Wiseguy Swagger",
    color: COLOR.goldStandardAmber,
    image: "crits/mafia/wiseguySwagger.png",
    description: "Thirty-eight upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.wiseguySwaggerUpgrades,
      ),
  },
  dontWorryAboutIt: {
    label: "Don't Worry About It",
    color: COLOR.internSkyBlue,
    image: "crits/mafia/dontWorryAboutIt.png",
    description:
      "Twenty-nine upgrades and thirty-three payouts on the highest unlocked floor",
    reward: (context, { balance, highestFloor, upgradeAndPay }) =>
      upgradeAndPay(
        [highestFloor(context)],
        balance.dontWorryAboutItUpgrades,
        balance.dontWorryAboutItPayouts,
      ),
  },
  mindYourOwnBusiness: {
    label: "Mind Your Own Business",
    color: COLOR.pairBlue,
    image: "crits/mafia/mindYourOwnBusiness.png",
    description: "Twenty-six upgrades and thirty payouts on alternating floors",
    reward: (context, { balance, alternating, upgradeAndPay }) =>
      upgradeAndPay(
        alternating(context),
        balance.mindYourOwnBusinessUpgrades,
        balance.mindYourOwnBusinessPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

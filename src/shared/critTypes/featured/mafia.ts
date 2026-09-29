import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MAFIA_CRITS = {
  theCatfather: {
    label: "The Catfather",
    color: COLOR.fullHouseCrimson,
    image: "crits/mafia/theCatfather.webp",
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
    image: "crits/mafia/unrefusableOffer.webp",
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
    image: "crits/mafia/briefcaseBonus.webp",
    description: "Cuts every price in this building by 4.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.briefcaseBonusDiscount),
  },
  violinCaseCaper: {
    label: "Violin Case Caper",
    color: COLOR.chairGiveawayBrown,
    image: "crits/mafia/violinCaseCaper.webp",
    description: "Fifty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.violinCaseCaperPayouts),
  },
  technicolorTake: {
    label: "Technicolor Take",
    color: COLOR.royalFlushPurple,
    image: "crits/mafia/technicolorTake.webp",
    description: "Forty-six payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.technicolorTakePayouts),
  },
  stringsAttached: {
    label: "Strings Attached",
    color: COLOR.espressoShotBrown,
    image: "crits/mafia/stringsAttached.webp",
    description: "Fifty-two upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.stringsAttachedUpgrades),
  },
  fiddlesticksFund: {
    label: "Fiddlesticks Fund",
    color: COLOR.dressCodeGreen,
    image: "crits/mafia/fiddlesticksFund.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.fiddlesticksFundFloors),
  },
  fedoraFlex: {
    label: "Fedora Flex",
    color: COLOR.nightShiftIndigo,
    image: "crits/mafia/fedoraFlex.webp",
    description: "Boosts every worker for 34s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.fedoraFlexBoostSeconds,
        balance.fedoraFlexExtraWorkers,
      ),
  },
  brimTipper: {
    label: "Brim Tipper",
    color: COLOR.silverTicketGray,
    image: "crits/mafia/brimTipper.webp",
    description: "Boosts every worker for 64s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.brimTipperBoostSeconds,
        balance.brimTipperExtraWorkers,
      ),
  },
  greenbackFan: {
    label: "Greenback Fan",
    color: COLOR.luckyCloverGreen,
    image: "crits/mafia/greenbackFan.webp",
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
    image: "crits/mafia/craftyConsigliere.webp",
    description: "Cuts every price in this building by 4.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.craftyConsigliereDiscount),
  },
  cappuccinoCapo: {
    label: "Cappuccino Capo",
    color: COLOR.espressoShotBrown,
    image: "crits/mafia/cappuccinoCapo.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  demitasseDues: {
    label: "Demitasse Dues",
    color: COLOR.amberMuted,
    image: "crits/mafia/demitasseDues.webp",
    description: "Cuts every price in this building by 7.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.demitasseDuesDiscount),
  },
  latteLoyalty: {
    label: "Latte Loyalty",
    color: COLOR.goldStandardAmber,
    image: "crits/mafia/latteLoyalty.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  takeTheCannoli: {
    label: "Take the Cannoli",
    color: COLOR.peppermintPink,
    image: "crits/mafia/takeTheCannoli.webp",
    description: "Cuts every price in this building by 4.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.takeTheCannoliDiscount),
  },
  speakeasyStash: {
    label: "Speakeasy Stash",
    color: COLOR.chairGiveawayBrown,
    image: "crits/mafia/speakeasyStash.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.speakeasyStashFloors),
  },
  passwordPlease: {
    label: "Password Please",
    color: COLOR.bonusRoundGold,
    image: "crits/mafia/passwordPlease.webp",
    description: "Fifty-eight payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.passwordPleasePayouts),
  },
  hiddenDoorHaul: {
    label: "Hidden Door Haul",
    color: COLOR.goldenTicketYellow,
    image: "crits/mafia/hiddenDoorHaul.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.hiddenDoorHaulFloors),
  },
  pinstripePension: {
    label: "Pinstripe Pension",
    color: COLOR.silverTicketGray,
    image: "crits/mafia/pinstripePension.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.pinstripePensionWorkers);
      actions.hireManagers(context.floors);
    },
  },
  lipsSealed: {
    label: "Lips Sealed",
    color: COLOR.goldenHandshakeGold,
    image: "crits/mafia/lipsSealed.webp",
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
    image: "crits/mafia/protectionRacket.webp",
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
    image: "crits/mafia/runningBoardRiches.webp",
    description: "Fifty-three upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.runningBoardRichesUpgrades),
  },
  sundaySauceSitdown: {
    label: "Sunday Sauce Sitdown",
    color: COLOR.red,
    image: "crits/mafia/sundaySauceSitdown.webp",
    description: "Boosts every worker for 126s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.sundaySauceSitdownBoostSeconds,
        balance.sundaySauceSitdownExtraWorkers,
      ),
  },
  kissTheRing: {
    label: "Kiss the Ring",
    color: COLOR.doubleDownCrimson,
    image: "crits/mafia/kissTheRing.webp",
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
    image: "crits/mafia/bootlegBarrel.webp",
    description:
      "Repeats the crit on the floor below, 57% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.bootlegBarrelContinueChance),
  },
  wiseguySwagger: {
    label: "Wiseguy Swagger",
    color: COLOR.goldStandardAmber,
    image: "crits/mafia/wiseguySwagger.webp",
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
    image: "crits/mafia/dontWorryAboutIt.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.dontWorryAboutItWorkers),
  },
  mindYourOwnBusiness: {
    label: "Mind Your Own Business",
    color: COLOR.pairBlue,
    image: "crits/mafia/mindYourOwnBusiness.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

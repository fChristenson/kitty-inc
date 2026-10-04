import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CAT_GIRLS_CRITS = {
  pawsAndEffect: {
    label: "Paws and Effect",
    color: COLOR.peppermintPink,
    image: "crits/catGirls/pawsAndEffect.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  catwalkQueen: {
    label: "Catwalk Queen",
    color: COLOR.bonusRoundGold,
    image: "crits/catGirls/catwalkQueen.webp",
    description: "Two tier promotions and twenty-five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.catwalkQueenTierSteps,
        balance.catwalkQueenUpgrades,
      ),
  },
  runwayRoyalty: {
    label: "Runway Royalty",
    color: COLOR.goldenTicketYellow,
    image: "crits/catGirls/runwayRoyalty.webp",
    description: "Two tier promotions and 10 upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.runwayRoyaltyTierSteps,
        balance.runwayRoyaltyUpgrades,
      ),
  },
  blueHourStrut: {
    label: "Blue Hour Strut",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/blueHourStrut.webp",
    description: "Cuts every price in this building by 10.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blueHourStrutDiscount),
  },
  felineFine: {
    label: "Feline Fine",
    color: COLOR.autumnSaleAmber,
    image: "crits/catGirls/felineFine.webp",
    description: "Sixty-four upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.felineFineUpgrades),
  },
  kittenHeels: {
    label: "Kitten Heels",
    color: COLOR.grandOpeningRose,
    image: "crits/catGirls/kittenHeels.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  },
  catsPajamas: {
    label: "Cat's Pajamas",
    color: COLOR.internSkyBlue,
    image: "crits/catGirls/catsPajamas.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.catsPajamasFloors),
  },
  bedtimeBonus: {
    label: "Bedtime Bonus",
    color: COLOR.pairBlue,
    image: "crits/catGirls/bedtimeBonus.webp",
    description:
      "Twenty-seven upgrades and thirty-one payouts on alternating floors",
    reward: (context, { alternating, balance, upgradeAndPay }) =>
      upgradeAndPay(
        alternating(context),
        balance.bedtimeBonusUpgrades,
        balance.bedtimeBonusPayouts,
      ),
  },
  purrsuasion: {
    label: "Purrsuasion",
    color: COLOR.silverTicketGray,
    image: "crits/catGirls/purrsuasion.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.purrsuasionFloors),
  },
  coinBoop: {
    label: "Coin Boop",
    color: COLOR.goldStandardAmber,
    image: "crits/catGirls/coinBoop.webp",
    description: "Adds 13.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.coinBoopShare),
  },
  topCat: {
    label: "Top Cat",
    color: COLOR.overflowBlue,
    image: "crits/catGirls/topCat.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.topCatWorkers),
  },
  clawContract: {
    label: "Claw Contract",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/clawContract.webp",
    description: "Repeats the crit on the floor below, 12% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.clawContractContinueChance),
  },
  kittenKaboodle: {
    label: "Kitten Kaboodle",
    color: COLOR.amberMuted,
    image: "crits/catGirls/kittenKaboodle.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.kittenKaboodleTierSteps, balance.kittenKaboodleUpgrades),
  },
  meowtivation: {
    label: "Meowtivation",
    color: COLOR.coinGold,
    image: "crits/catGirls/meowtivation.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  nineLivesLedger: {
    label: "Nine Lives Ledger",
    color: COLOR.sameBoatCoral,
    image: "crits/catGirls/nineLivesLedger.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.nineLivesLedgerFloors),
  },
  purrfectPose: {
    label: "Purrfect Pose",
    color: COLOR.amberMuted,
    image: "crits/catGirls/purrfectPose.webp",
    description: "Cuts every price in this building by 1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.purrfectPoseDiscount),
  },
  tailSpinTycoon: {
    label: "Tail Spin Tycoon",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/tailSpinTycoon.webp",
    description: "Adds 42s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.tailSpinTycoonSeconds),
  },
  whiskerWink: {
    label: "Whisker Wink",
    color: COLOR.summerSaleOrange,
    image: "crits/catGirls/whiskerWink.webp",
    description: "Repeats the crit above and below, 65% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.whiskerWinkContinueChance),
  },
  primaryPaws: {
    label: "Primary Paws",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/primaryPaws.webp",
    description: "Grows this floor's level by 25.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.primaryPawsGrowth),
  },
  snowyAndSandy: {
    label: "Snowy And Sandy",
    color: COLOR.amberMuted,
    image: "crits/catGirls/snowyAndSandy.webp",
    description: "Grows this floor's level by 25.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.snowyAndSandyGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

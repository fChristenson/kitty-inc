import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DEMON_GIRLS_CRITS = {
  hellfireHeartbreaker: {
    label: "Hellfire Heartbreaker",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/hellfireHeartbreaker.webp",
    description: "One tier promotion and forty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.hellfireHeartbreakerTierSteps,
        balance.hellfireHeartbreakerUpgrades,
      ),
  },
  spadeTailSass: {
    label: "Spade Tail Sass",
    color: COLOR.red,
    image: "crits/demonGirls/spadeTailSass.webp",
    description: "Sixty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.spadeTailSassUpgrades),
  },
  sinfullySolvent: {
    label: "Sinfully Solvent",
    color: COLOR.royalFlushPurple,
    image: "crits/demonGirls/sinfullySolvent.webp",
    description: "Adds 5.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sinfullySolventShare),
  },
  slyStack: {
    label: "Sly Stack",
    color: COLOR.bonusRoundGold,
    image: "crits/demonGirls/slyStack.webp",
    description: "Sixty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.slyStackPayouts),
  },
  lavenderLounge: {
    label: "Lavender Lounge",
    color: COLOR.peppermintPink,
    image: "crits/demonGirls/lavenderLounge.webp",
    description: "Sixty-six upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.lavenderLoungeUpgrades,
      ),
  },
  pitchforkCharmer: {
    label: "Pitchfork Charmer",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/pitchforkCharmer.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  },
  scarletSaunter: {
    label: "Scarlet Saunter",
    color: COLOR.fireDrillRed,
    image: "crits/demonGirls/scarletSaunter.webp",
    description: "Cuts every price in this building by 6.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.scarletSaunterDiscount),
  },
  forkFlourish: {
    label: "Fork Flourish",
    color: COLOR.goldStandardAmber,
    image: "crits/demonGirls/forkFlourish.webp",
    description: "Caps every floor's income timer at 0.5s for 15s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "rushHour"),
  },
  brimstoneBelle: {
    label: "Brimstone Belle",
    color: COLOR.autumnSaleAmber,
    image: "crits/demonGirls/brimstoneBelle.webp",
    description: "Fifty payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.brimstoneBellePayouts),
  },
  flapperFlames: {
    label: "Flapper Flames",
    color: COLOR.amberMuted,
    image: "crits/demonGirls/flapperFlames.webp",
    description: "Boosts every worker for 71s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.flapperFlamesBoostSeconds,
        balance.flapperFlamesExtraWorkers,
      ),
  },
  sootAndSequins: {
    label: "Soot and Sequins",
    color: COLOR.nightShiftIndigo,
    image: "crits/demonGirls/sootAndSequins.webp",
    description:
      "Repeats the crit above and below, 45% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.sootAndSequinsContinueChance),
  },
  impeccableTaste: {
    label: "Impeccable Taste",
    color: COLOR.mysticTeal,
    image: "crits/demonGirls/impeccableTaste.webp",
    description: "Fifty-eight payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.impeccableTastePayouts),
  },
  heartsAflame: {
    label: "Hearts Aflame",
    color: COLOR.grandOpeningRose,
    image: "crits/demonGirls/heartsAflame.webp",
    description: "Boosts every worker for 35s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.heartsAflameBoostSeconds,
        balance.heartsAflameExtraWorkers,
      ),
  },
  finePrintFiend: {
    label: "Fine Print Fiend",
    color: COLOR.espressoShotBrown,
    image: "crits/demonGirls/finePrintFiend.webp",
    description:
      "Repeats the crit on the floor above, 57% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.finePrintFiendContinueChance),
  },
  signedInScarlet: {
    label: "Signed in Scarlet",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/signedInScarlet.webp",
    description:
      "Repeats the crit above and below, 46% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.signedInScarletContinueChance,
      ),
  },
  termsAndTemptations: {
    label: "Terms and Temptations",
    color: COLOR.chairGiveawayBrown,
    image: "crits/demonGirls/termsAndTemptations.webp",
    description: "Sixty-three payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.termsAndTemptationsPayouts,
      ),
  },
  hotTake: {
    label: "Hot Take",
    color: COLOR.red,
    image: "crits/demonGirls/hotTake.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.hotTakeFloors),
  },
  coinFlambe: {
    label: "Coin Flambe",
    color: COLOR.goldenTicketYellow,
    image: "crits/demonGirls/coinFlambe.webp",
    description: "Adds 13.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.coinFlambeShare),
  },
  rivetRebel: {
    label: "Rivet Rebel",
    color: COLOR.silverTicketGray,
    image: "crits/demonGirls/rivetRebel.webp",
    description: "Fifty-eight upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.rivetRebelUpgrades),
  },
  flickerGrin: {
    label: "Flicker Grin",
    color: COLOR.autumnSaleAmber,
    image: "crits/demonGirls/flickerGrin.webp",
    description: "Sixty-eight payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.flickerGrinPayouts,
      ),
  },
  smolderEyes: {
    label: "Smolder Eyes",
    color: COLOR.goldStandardAmber,
    image: "crits/demonGirls/smolderEyes.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.smolderEyesWorkers),
  },
  crimsonGlare: {
    label: "Crimson Glare",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/crimsonGlare.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
  midnightSideEye: {
    label: "Midnight Side-Eye",
    color: COLOR.nightShiftIndigo,
    image: "crits/demonGirls/midnightSideEye.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.midnightSideEyeFloors),
  },
  amberStare: {
    label: "Amber Stare",
    color: COLOR.goldenHandshakeGold,
    image: "crits/demonGirls/amberStare.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.amberStareWorkers),
  },
  brimstoneBonus: {
    label: "Brimstone Bonus",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/brimstoneBonus.webp",
    description: "Boosts this floor's workers for 28s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.brimstoneBonusBoostSeconds,
        balance.brimstoneBonusExtraWorkers,
      ),
  },
  devilishDeal: {
    label: "Devilish Deal",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/devilishDeal.webp",
    description: "Arms the highest floor's next click as an x5 crit",
    reward: (context, { actions, highestFloor }) =>
      actions.armCrit([highestFloor(context)], "crit"),
  },
  hellfireHustle: {
    label: "Hellfire Hustle",
    color: COLOR.red,
    image: "crits/demonGirls/hellfireHustle.webp",
    description: "Boosts every worker for 22s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.hellfireHustleBoostSeconds,
        balance.hellfireHustleExtraWorkers,
      ),
  },
  hornedHedge: {
    label: "Horned Hedge",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/hornedHedge.webp",
    description: "Hires 1 free worker on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.hornedHedgeWorkers),
  },
  infernalInvoice: {
    label: "Infernal Melons",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/infernalInvoice.webp",
    description:
      "Repeats the crit on the floor below, 11% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "down",
        balance.infernalInvoiceContinueChance,
      ),
  },
  pitchforkProfits: {
    label: "Pitchfork Profits",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/pitchforkProfits.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.pitchforkProfitsTierSteps,
        balance.pitchforkProfitsUpgrades,
      ),
  },
  sinfulSurplus: {
    label: "Sinful Surplus",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/sinfulSurplus.webp",
    description: "Cuts every price in this building by 1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.sinfulSurplusDiscount),
  },
  soulContractClause: {
    label: "Soul Contract Clause",
    color: COLOR.redActive,
    image: "crits/demonGirls/soulContractClause.webp",
    description: "Adds 5s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.soulContractClauseSeconds),
  },
  underworldUpsell: {
    label: "Underworld Upsell",
    color: COLOR.redActive,
    image: "crits/demonGirls/underworldUpsell.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  blueDevil: {
    label: "Blue Devil",
    color: COLOR.internSkyBlue,
    image: "crits/demonGirls/blueDevil.webp",
    description: "Grows every unlocked floor's level by 4.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.blueDevilGrowth),
  },
  brimstoneBiceps: {
    label: "Brimstone Biceps",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/brimstoneBiceps.webp",
    description: "Pays 5 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.brimstoneBicepsMultiple),
  },
  devilMayKiss: {
    label: "Devil May Kiss",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/devilMayKiss.webp",
    description: "Grows every unlocked floor's level by 4.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.devilMayKissGrowth),
  },
  sinnersPlea: {
    label: "Sinners Plea",
    color: COLOR.redActive,
    image: "crits/demonGirls/sinnersPlea.webp",
    description: "Spreads 51 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.sinnersPleaUpgrades),
  },
  tealTemptress: {
    label: "Teal Temptress",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/tealTemptress.webp",
    description: "Pays 16 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.tealTemptressMultiple),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

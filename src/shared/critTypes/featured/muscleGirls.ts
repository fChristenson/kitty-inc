import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MUSCLE_GIRLS_CRITS = {
  barbellBelle: {
    label: "Barbell Belle",
    color: COLOR.peppermintPink,
    image: "crits/muscleGirls/barbellBelle.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  ponytailPress: {
    label: "Ponytail Press",
    color: COLOR.springSalePink,
    image: "crits/muscleGirls/ponytailPress.webp",
    description: "Boosts every worker for 46s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.ponytailPressBoostSeconds,
        balance.ponytailPressExtraWorkers,
      ),
  },
  leotardLuster: {
    label: "Leotard Luster",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/leotardLuster.webp",
    description: "Sixty-four payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.leotardLusterPayouts),
  },
  glitterGrip: {
    label: "Glitter Grip",
    color: COLOR.grandOpeningRose,
    image: "crits/muscleGirls/glitterGrip.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  bicepBombshell: {
    label: "Bicep Bombshell",
    color: COLOR.red,
    image: "crits/muscleGirls/bicepBombshell.webp",
    description: "One tier promotion and forty-nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.bicepBombshellTierSteps,
        balance.bicepBombshellUpgrades,
      ),
  },
  curlCutie: {
    label: "Curl Cutie",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/curlCutie.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  kissTheGuns: {
    label: "Kiss the Guns",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/kissTheGuns.webp",
    description: "Seventy-six payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.kissTheGunsPayouts,
      ),
  },
  deadliftDiva: {
    label: "Deadlift Diva",
    color: COLOR.easterSalePink,
    image: "crits/muscleGirls/deadliftDiva.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.deadliftDivaFloors),
  },
  goldPlated: {
    label: "Gold Plated",
    color: COLOR.gold,
    image: "crits/muscleGirls/goldPlated.webp",
    description: "Adds 105s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldPlatedSeconds),
  },
  hipHingeHeroine: {
    label: "Hip Hinge Heroine",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/hipHingeHeroine.webp",
    description:
      "Repeats the crit above and below, 56% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.hipHingeHeroineContinueChance,
      ),
  },
  dumbbellDarling: {
    label: "Dumbbell Darling",
    color: COLOR.purple,
    image: "crits/muscleGirls/dumbbellDarling.webp",
    description: "Seventy-eight payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.dumbbellDarlingPayouts),
  },
  flexAppeal: {
    label: "Flex Appeal",
    color: COLOR.blue,
    image: "crits/muscleGirls/flexAppeal.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.flexAppealFloors),
  },
  coinFlexer: {
    label: "Coin Flexer",
    color: COLOR.goldenTicketYellow,
    image: "crits/muscleGirls/coinFlexer.webp",
    description: "Adds 27s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.coinFlexerSeconds),
  },
  gymCrush: {
    label: "Gym Crush",
    color: COLOR.teal,
    image: "crits/muscleGirls/gymCrush.webp",
    description: "Boosts every worker for 37s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.gymCrushBoostSeconds,
        balance.gymCrushExtraWorkers,
      ),
  },
  ironHeartthrob: {
    label: "Iron Heartthrob",
    color: COLOR.fireDrillRed,
    image: "crits/muscleGirls/ironHeartthrob.webp",
    description:
      "Two tier promotions and twenty-four upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.ironHeartthrobTierSteps,
        balance.ironHeartthrobUpgrades,
      ),
  },
  pointTaken: {
    label: "Point Taken",
    color: COLOR.unionBossSlate,
    image: "crits/muscleGirls/pointTaken.webp",
    description: "Forty-nine payouts here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.pointTakenPayouts,
      ),
  },
  inkedApproval: {
    label: "Inked Approval",
    color: COLOR.rainCheckBlue,
    image: "crits/muscleGirls/inkedApproval.webp",
    description:
      "Repeats the crit above and below, 49% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.inkedApprovalContinueChance),
  },
  leatherFlex: {
    label: "Leather Flex",
    color: COLOR.espressoShotBrown,
    image: "crits/muscleGirls/leatherFlex.webp",
    description:
      "Repeats the crit above and below, 60% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.leatherFlexContinueChance),
  },
  kettlebellKiss: {
    label: "Kettlebell Kiss",
    color: COLOR.coffeeRunTeal,
    image: "crits/muscleGirls/kettlebellKiss.webp",
    description: "Seventy-three payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.kettlebellKissPayouts),
  },
  swingAndASmooch: {
    label: "Swing and a Smooch",
    color: COLOR.spendingFreezeTeal,
    image: "crits/muscleGirls/swingAndASmooch.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  muscleMommy: {
    label: "Muscle Mommy",
    color: COLOR.royalFlushPurple,
    image: "crits/muscleGirls/muscleMommy.webp",
    description: "Boosts every worker for 132s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.muscleMommyBoostSeconds,
        balance.muscleMommyExtraWorkers,
      ),
  },
  kneelingKnockout: {
    label: "Kneeling Knockout",
    color: COLOR.halloweenSalePurple,
    image: "crits/muscleGirls/kneelingKnockout.webp",
    description:
      "One tier promotion and fifty-six upgrades on the lowest-level floor",
    reward: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.kneelingKnockoutTierSteps,
        balance.kneelingKnockoutUpgrades,
      ),
  },
  peachyKeen: {
    label: "Peachy Keen",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/peachyKeen.webp",
    description: "Cuts every price in this building by 7.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.peachyKeenDiscount),
  },
  gluteGains: {
    label: "Glute Gains",
    color: COLOR.cyan,
    image: "crits/muscleGirls/gluteGains.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.gluteGainsFloors),
  },
  headbandHustle: {
    label: "Headband Hustle",
    color: COLOR.floorShareBlue,
    image: "crits/muscleGirls/headbandHustle.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) => actions.giveOfficeChairs(context.floors),
  },
  outOfTheBlue: {
    label: "Out of the Blue",
    color: COLOR.recruitmentDriveBlue,
    image: "crits/muscleGirls/outOfTheBlue.webp",
    description:
      "Repeats the crit on the floor above, 59% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.outOfTheBlueContinueChance),
  },
  proteinPrincess: {
    label: "Protein Princess",
    color: COLOR.heavenlyGold,
    image: "crits/muscleGirls/proteinPrincess.webp",
    description:
      "One tier promotion and fifty-three upgrades on the highest floor",
    reward: (context, { balance, highestFloor, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        highestFloor(context),
        balance.proteinPrincessTierSteps,
        balance.proteinPrincessUpgrades,
      ),
  },
  shakerSovereign: {
    label: "Shaker Sovereign",
    color: COLOR.pairBlue,
    image: "crits/muscleGirls/shakerSovereign.webp",
    description: "Boosts every worker for 53s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.shakerSovereignBoostSeconds,
        balance.shakerSovereignExtraWorkers,
      ),
  },
  crownedChug: {
    label: "Crowned Chug",
    color: COLOR.fancyFridayIndigo,
    image: "crits/muscleGirls/crownedChug.webp",
    description: "Boosts every worker for 53s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.crownedChugBoostSeconds,
        balance.crownedChugExtraWorkers,
      ),
  },
  pumpAndPout: {
    label: "Pump & Pout",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/pumpAndPout.webp",
    description: "Boosts every worker for 54s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.pumpAndPoutBoostSeconds,
        balance.pumpAndPoutExtraWorkers,
      ),
  },
  neonFlex: {
    label: "Neon Flex",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/neonFlex.webp",
    description: "Forty upgrades and forty-two payouts on the cheapest floor",
    reward: (context, { balance, cheapest, upgradeAndPay }) =>
      upgradeAndPay(
        [cheapest(context)],
        balance.neonFlexUpgrades,
        balance.neonFlexPayouts,
      ),
  },
  sixPackSweetheart: {
    label: "Six-Pack Sweetheart",
    color: COLOR.teamBuildingCoral,
    image: "crits/muscleGirls/sixPackSweetheart.webp",
    description: "Hires a free manager on every unlocked floor",
    reward: (context, { actions }) => actions.hireManagers(context.floors),
  },
  absOfHearts: {
    label: "Abs of Hearts",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/absOfHearts.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.absOfHeartsFloors),
  },
  spottersWink: {
    label: "Spotter's Wink",
    color: COLOR.goldStandardAmber,
    image: "crits/muscleGirls/spottersWink.webp",
    description: "Fifty payouts here and on the cheapest floor",
    reward: (context, { actions, balance, cheapest, hereAnd }) =>
      actions.payCycles(
        hereAnd(context, cheapest(context)),
        balance.spottersWinkPayouts,
      ),
  },
  rackAndReady: {
    label: "Rack and Ready",
    color: COLOR.goldenHandshakeGold,
    image: "crits/muscleGirls/rackAndReady.webp",
    description: "Forty-six upgrades here and on the cheapest floor",
    reward: (context, { actions, balance, cheapest, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, cheapest(context)),
        balance.rackAndReadyUpgrades,
      ),
  },
  overheadOkay: {
    label: "Overhead Okay",
    color: COLOR.bonusRoundGold,
    image: "crits/muscleGirls/overheadOkay.webp",
    description: "Boosts every worker for 37s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.overheadOkayBoostSeconds,
        balance.overheadOkayExtraWorkers,
      ),
  },
  squatSiren: {
    label: "Squat Siren",
    color: COLOR.fireDrillRed,
    image: "crits/muscleGirls/squatSiren.webp",
    description:
      "One tier promotion and forty-five upgrades on the cheapest floor",
    reward: (context, { balance, cheapest, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        cheapest(context),
        balance.squatSirenTierSteps,
        balance.squatSirenUpgrades,
      ),
  },
  deepSquatDazzle: {
    label: "Deep Squat Dazzle",
    color: COLOR.redActive,
    image: "crits/muscleGirls/deepSquatDazzle.webp",
    description: "Cuts every price in this building by 7.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.deepSquatDazzleDiscount),
  },
  sumoSweetie: {
    label: "Sumo Sweetie",
    color: COLOR.internSkyBlue,
    image: "crits/muscleGirls/sumoSweetie.webp",
    description:
      "Thirty-seven upgrades and thirty-nine payouts on the lowest-level floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.sumoSweetieUpgrades,
        balance.sumoSweetiePayouts,
      ),
  },
  copperCrouch: {
    label: "Copper Crouch",
    color: COLOR.headhunterRust,
    image: "crits/muscleGirls/copperCrouch.webp",
    description:
      "Twenty-eight upgrades and thirty payouts on this floor and every floor below",
    reward: (context, { balance, belowAndHere, upgradeAndPay }) =>
      upgradeAndPay(
        belowAndHere(context),
        balance.copperCrouchUpgrades,
        balance.copperCrouchPayouts,
      ),
  },
  bluePlateSpecial: {
    label: "Blue Plate Special",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/bluePlateSpecial.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.bluePlateSpecialFloors),
  },
  barbellBow: {
    label: "Barbell Bow",
    color: COLOR.nightShiftIndigo,
    image: "crits/muscleGirls/barbellBow.webp",
    description:
      "Two tier promotions and nineteen upgrades on the highest floor",
    reward: (context, { balance, highestFloor, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        highestFloor(context),
        balance.barbellBowTierSteps,
        balance.barbellBowUpgrades,
      ),
  },
  soleMate: {
    label: "Sole Mate",
    color: COLOR.peppermintPink,
    image: "crits/muscleGirls/soleMate.webp",
    description: "Seventy-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.soleMateUpgrades),
  },
  toeTapper: {
    label: "Toe Tapper",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/toeTapper.webp",
    description: "Seventy-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.toeTapperPayouts),
  },
  heelAppeal: {
    label: "Heel Appeal",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/heelAppeal.webp",
    description: "Raises every floor below this one to its level",
    reward: (context, { actions, belowAndHere }) =>
      actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  },
  solePower: {
    label: "Sole Power",
    color: COLOR.spendingFreezeTeal,
    image: "crits/muscleGirls/solePower.webp",
    description: "Boosts every worker for 138s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.solePowerBoostSeconds,
        balance.solePowerExtraWorkers,
      ),
  },
  tiptoeTitan: {
    label: "Tiptoe Titan",
    color: COLOR.grandOpeningRose,
    image: "crits/muscleGirls/tiptoeTitan.webp",
    description: "One tier promotion and fifty-seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.tiptoeTitanTierSteps,
        balance.tiptoeTitanUpgrades,
      ),
  },
  footloose: {
    label: "Footloose",
    color: COLOR.springSalePink,
    image: "crits/muscleGirls/footloose.webp",
    description: "Sixty-six payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.footloosePayouts),
  },
  tenLittlePiggies: {
    label: "Ten Little Piggies",
    color: COLOR.headhunterRust,
    image: "crits/muscleGirls/tenLittlePiggies.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.tenLittlePiggiesFloors),
  },
  pedicurePinup: {
    label: "Pedicure Pinup",
    color: COLOR.easterSalePink,
    image: "crits/muscleGirls/pedicurePinup.webp",
    description: "Cuts every price in this building by 4.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.pedicurePinupDiscount),
  },
  wiggleRoom: {
    label: "Wiggle Room",
    color: COLOR.pairBlue,
    image: "crits/muscleGirls/wiggleRoom.webp",
    description: "Eighty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.wiggleRoomPayouts),
  },
  cozyToes: {
    label: "Cozy Toes",
    color: COLOR.royalFlushPurple,
    image: "crits/muscleGirls/cozyToes.webp",
    description: "Seventy-five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.cozyToesPayouts),
  },
  barefootBoss: {
    label: "Barefoot Boss",
    color: COLOR.goldStandardAmber,
    image: "crits/muscleGirls/barefootBoss.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  kickBackQueen: {
    label: "Kick Back Queen",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/kickBackQueen.webp",
    description:
      "Twenty-four upgrades and twenty-six payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.kickBackQueenUpgrades,
        balance.kickBackQueenPayouts,
      ),
  },
  bendOverBackwards: {
    label: "Bend Over Backwards",
    color: COLOR.teamBuildingCoral,
    image: "crits/muscleGirls/bendOverBackwards.webp",
    description: "Cuts every price in this building by 7.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bendOverBackwardsDiscount),
  },
  downwardDogDays: {
    label: "Downward Dog Days",
    color: COLOR.goldenTicketYellow,
    image: "crits/muscleGirls/downwardDogDays.webp",
    description: "Sixty-two payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.downwardDogDaysPayouts),
  },
  plankYouVeryMuch: {
    label: "Plank You Very Much",
    color: COLOR.coffeeRunTeal,
    image: "crits/muscleGirls/plankYouVeryMuch.webp",
    description: "Seventy-two upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.plankYouVeryMuchUpgrades,
      ),
  },
  namasteSlay: {
    label: "Namaste Slay",
    color: COLOR.peppermintPink,
    image: "crits/muscleGirls/namasteSlay.webp",
    description:
      "One tier promotion and fifty-eight upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.namasteSlayTierSteps,
        balance.namasteSlayUpgrades,
      ),
  },
  mightyOak: {
    label: "Mighty Oak",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/mightyOak.webp",
    description: "Fifty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.mightyOakPayouts),
  },
  savasanaSiesta: {
    label: "Savasana Siesta",
    color: COLOR.nightShiftIndigo,
    image: "crits/muscleGirls/savasanaSiesta.webp",
    description:
      "Repeats the crit above and below, 40% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.savasanaSiestaContinueChance),
  },
  catCowCrawl: {
    label: "Cat-Cow Crawl",
    color: COLOR.halloweenSalePurple,
    image: "crits/muscleGirls/catCowCrawl.webp",
    description: "Cuts every price in this building by 6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.catCowCrawlDiscount),
  },
  lizardLounge: {
    label: "Lizard Lounge",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/lizardLounge.webp",
    description:
      "Repeats the crit above and below, 51% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.lizardLoungeContinueChance),
  },
  pamperedPaws: {
    label: "Pampered Paws",
    color: COLOR.goldenHandshakeGold,
    image: "crits/muscleGirls/pamperedPaws.webp",
    description: "Cuts every price in this building by 4.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.pamperedPawsDiscount),
  },
  blondeAmbition: {
    label: "Blonde Ambition",
    color: COLOR.fireDrillRed,
    image: "crits/muscleGirls/blondeAmbition.webp",
    description: "Seventy-seven payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.blondeAmbitionPayouts),
  },
  bigFootEnergy: {
    label: "Big Foot Energy",
    color: COLOR.fancyFridayIndigo,
    image: "crits/muscleGirls/bigFootEnergy.webp",
    description: "Two tier promotions and twenty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.bigFootEnergyTierSteps,
        balance.bigFootEnergyUpgrades,
      ),
  },
  tickleMePink: {
    label: "Tickle Me Pink",
    color: COLOR.springSalePink,
    image: "crits/muscleGirls/tickleMePink.webp",
    description: "Forty-five upgrades and forty-seven payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.tickleMePinkUpgrades,
        balance.tickleMePinkPayouts,
      ),
  },
  galaTootsies: {
    label: "Gala Tootsies",
    color: COLOR.blue,
    image: "crits/muscleGirls/galaTootsies.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  redCarpetStomp: {
    label: "Red Carpet Stomp",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/redCarpetStomp.webp",
    description:
      "One tier promotion and fifty-nine upgrades on the lowest-earning floor",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, false),
        balance.redCarpetStompTierSteps,
        balance.redCarpetStompUpgrades,
      ),
  },
  backDayBeauty: {
    label: "Back Day Beauty",
    color: COLOR.pairBlue,
    image: "crits/muscleGirls/backDayBeauty.webp",
    description: "Forty-seven upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.backDayBeautyUpgrades,
      ),
  },
  putYourFeetUp: {
    label: "Put Your Feet Up",
    color: COLOR.cyan,
    image: "crits/muscleGirls/putYourFeetUp.webp",
    description:
      "Repeats the crit on the floor below, 61% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.putYourFeetUpContinueChance),
  },
  highTen: {
    label: "High Ten",
    color: COLOR.purple,
    image: "crits/muscleGirls/highTen.webp",
    description: "Cuts every price in this building by 5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.highTenDiscount),
  },
  legsForDays: {
    label: "Legs for Days",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/legsForDays.webp",
    description:
      "Repeats the crit above and below, 84% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.legsForDaysContinueChance),
  },
  toeTheLine: {
    label: "Toe the Line",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/toeTheLine.webp",
    description: "Cuts every price in this building by 7.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.toeTheLineDiscount),
  },
  melonPicnic: {
    label: "Melon Picnic",
    color: COLOR.grandOpeningRose,
    image: "crits/muscleGirls/melonPicnic.webp",
    description: "Raises alternating floors to half the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(
        alternating(context),
        Math.floor(topLevel(context) / 2),
      ),
  },
  juicePress: {
    label: "Juice Press",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/juicePress.webp",
    description: "Boosts every worker for 40s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.juicePressBoostSeconds,
        balance.juicePressExtraWorkers,
      ),
  },
  rindBreaker: {
    label: "Rind Breaker",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/rindBreaker.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.rindBreakerFloors),
  },
  seedStorm: {
    label: "Seed Storm",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/seedStorm.webp",
    description:
      "Repeats the crit on the floor above, 40% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.seedStormContinueChance),
  },
  priceSqueeze: {
    label: "Price Squeeze",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/priceSqueeze.webp",
    description: "Cuts every price in this building by 3.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.priceSqueezeDiscount),
  },
  farmhandFlex: {
    label: "Farmhand Flex",
    color: COLOR.headhunterRust,
    image: "crits/muscleGirls/farmhandFlex.webp",
    description: "Hires 3 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.farmhandFlexWorkers),
  },
  prizeHeifer: {
    label: "Prize Heifer",
    color: COLOR.starYellow,
    image: "crits/muscleGirls/prizeHeifer.webp",
    description: "One tier promotion and forty-five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.prizeHeiferTierSteps,
        balance.prizeHeiferUpgrades,
      ),
  },
  barnBuster: {
    label: "Barn Buster",
    color: COLOR.fireDrillRed,
    image: "crits/muscleGirls/barnBuster.webp",
    description: "Unlocks the next 4 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.barnBusterFloors),
  },
  belowParallel: {
    label: "Below Parallel",
    color: COLOR.starYellow,
    image: "crits/muscleGirls/belowParallel.webp",
    description: "Boosts every worker for 39s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.belowParallelBoostSeconds,
        balance.belowParallelExtraWorkers,
      ),
  },
  deepSquatDividend: {
    label: "Deep Squat Dividend",
    color: COLOR.starYellow,
    image: "crits/muscleGirls/deepSquatDividend.webp",
    description: "Hires 2 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.deepSquatDividendWorkers);
      actions.hireManagers(context.floors);
    },
  },
  heelDrive: {
    label: "Heel Drive",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/heelDrive.webp",
    description:
      "Repeats the crit on the floor above, 10% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.heelDriveContinueChance),
  },
  legDayLedger: {
    label: "Leg Day Ledger",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/legDayLedger.webp",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.legDayLedgerTierSteps,
        balance.legDayLedgerUpgrades,
      ),
  },
  plantarPower: {
    label: "Plantar Power",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/plantarPower.webp",
    description: "Cuts every price in this building by 1.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.plantarPowerDiscount),
  },
  posteriorChainProfits: {
    label: "Posterior Chain Profits",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/posteriorChainProfits.webp",
    description: "Adds 20.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.posteriorChainProfitsShare),
  },
  rackPullRiches: {
    label: "Rack Pull Riches",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/rackPullRiches.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  rockBottomRally: {
    label: "Rock Bottom Rally",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/rockBottomRally.webp",
    description: "Unlocks the next 2 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.rockBottomRallyFloors),
  },
  squatGoals: {
    label: "Squat Goals",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/squatGoals.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  tiptoeTreasury: {
    label: "Tiptoe Treasury",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/tiptoeTreasury.webp",
    description: "Arms every floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  },
  quicksilverQueen: {
    label: "Quicksilver Queen",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/quicksilverQueen.webp",
    description: "Cuts every price in this building by 1.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.quicksilverQueenDiscount),
  },
  moolahMaker: {
    label: "Moolah Maker",
    color: COLOR.supplyRunTan,
    image: "crits/muscleGirls/moolahMaker.webp",
    description: "Adds 3.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.moolahMakerShare),
  },
  spotOn: {
    label: "Spot On",
    color: COLOR.red,
    image: "crits/muscleGirls/spotOn.webp",
    description: "Boosts every worker for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.spotOnBoostSeconds,
        balance.spotOnExtraWorkers,
      ),
  },
  ringMyBell: {
    label: "Ring My Bell",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/ringMyBell.webp",
    description: "Hires 2 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.ringMyBellWorkers);
      actions.hireManagers(context.floors);
    },
  },
  mirrorFinish: {
    label: "Mirror Finish",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/mirrorFinish.webp",
    description:
      "Repeats the crit on the floor above, 14% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.mirrorFinishContinueChance,
      ),
  },
  tillTheCowsComeHome: {
    label: "Till the Cows Come Home",
    color: COLOR.chairGiveawayBrown,
    image: "crits/muscleGirls/tillTheCowsComeHome.webp",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.tillTheCowsComeHomeTierSteps,
        balance.tillTheCowsComeHomeUpgrades,
      ),
  },
  sumoStanceStocks: {
    label: "Sumo Stance Stocks",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/sumoStanceStocks.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  purrFectPair: {
    label: "Purr-fect Pair",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/purrFectPair.webp",
    description: "Two tier promotions and thirty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.purrFectPairTierSteps,
        balance.purrFectPairUpgrades,
      ),
  },
  doubleTrouble: {
    label: "Double Trouble",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/doubleTrouble.webp",
    description: "Cuts every price in this building by 10.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.doubleTroubleDiscount),
  },
  copycats: {
    label: "Copycats",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/copycats.webp",
    description: "Adds 6.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.copycatsShare),
  },
  ringsideRuby: {
    label: "Ringside Ruby",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/ringsideRuby.webp",
    description: "Adds 12.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ringsideRubyShare),
  },
  knockoutNova: {
    label: "Knockout Nova",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/knockoutNova.webp",
    description: "Boosts every worker for 82s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.knockoutNovaBoostSeconds,
        balance.knockoutNovaExtraWorkers,
      ),
  },
  clinchQueen: {
    label: "Clinch Queen",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/clinchQueen.webp",
    description:
      "Repeats the crit above and below, 93% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.clinchQueenContinueChance),
  },
  braidedBruiser: {
    label: "Braided Bruiser",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/braidedBruiser.webp",
    description: "Cuts every price in this building by 16%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.braidedBruiserDiscount),
  },
  backSquatBounty: {
    label: "Back Squat Bounty",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/backSquatBounty.webp",
    description: "Boosts every worker for 125s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.backSquatBountyBoostSeconds,
        balance.backSquatBountyExtraWorkers,
      ),
  },
  doubleBicepBonanza: {
    label: "Double Bicep Bonanza",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/doubleBicepBonanza.webp",
    description:
      "Repeats the crit on the floor above, 82% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.doubleBicepBonanzaContinueChance,
      ),
  },
  hellfireHug: {
    label: "Hellfire Hug",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/hellfireHug.webp",
    description: "Cuts every price in this building by 17.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.hellfireHugDiscount),
  },
  kneelDeal: {
    label: "Kneel Deal",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/kneelDeal.webp",
    description: "Adds 14.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.kneelDealShare),
  },
  hornedHeartbreakers: {
    label: "Horned Heartbreakers",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/hornedHeartbreakers.webp",
    description: "Boosts every worker for 127s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.hornedHeartbreakersBoostSeconds,
        balance.hornedHeartbreakersExtraWorkers,
      ),
  },
  shoulderDevilDuo: {
    label: "Shoulder Devil Duo",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/shoulderDevilDuo.webp",
    description: "Boosts every worker for 135s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.shoulderDevilDuoBoostSeconds,
        balance.shoulderDevilDuoExtraWorkers,
      ),
  },
  goblinGluteGains: {
    label: "Goblin Glute Gains",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/goblinGluteGains.webp",
    description: "Cuts every price in this building by 20.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.goblinGluteGainsDiscount),
  },
  lowSquatLoot: {
    label: "Low Squat Loot",
    color: COLOR.threeOfAKindGreen,
    image: "crits/muscleGirls/lowSquatLoot.webp",
    description: "Adds 21.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.lowSquatLootShare),
  },
  squatQueenCapital: {
    label: "Squat Queen Capital",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/squatQueenCapital.webp",
    description: "Boosts every worker for 161s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.squatQueenCapitalBoostSeconds,
        balance.squatQueenCapitalExtraWorkers,
      ),
  },
  bunAndBurn: {
    label: "Bun And Burn",
    color: COLOR.threeOfAKindGreen,
    image: "crits/muscleGirls/bunAndBurn.webp",
    description: "Cuts every price in this building by 20.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bunAndBurnDiscount),
  },
  quadSquadQuarterly: {
    label: "Quad Squad Quarterly",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/quadSquadQuarterly.webp",
    description: "Adds 21.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.quadSquadQuarterlyShare),
  },
  bearHugBonus: {
    label: "Bear Hug Bonus",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/bearHugBonus.webp",
    description: "Nine instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.bearHugBonusPayouts),
  },
  bottomLine: {
    label: "Bottom Line",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/bottomLine.webp",
    description: "Adds 23.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bottomLineShare),
  },
  crushingQuarter: {
    label: "Crushing Quarter",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/crushingQuarter.webp",
    description: "Eleven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.crushingQuarterPayouts),
  },
  floorPlan: {
    label: "Floor Plan",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/floorPlan.webp",
    description: "Forty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.floorPlanUpgrades),
  },
  hostileTakeover: {
    label: "Hostile Takeover",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/hostileTakeover.webp",
    description: "Forty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.hostileTakeoverUpgrades),
  },
  knockoutProfits: {
    label: "Knockout Profits",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/knockoutProfits.webp",
    description: "Adds 23.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.knockoutProfitsShare),
  },
  lastOneStanding: {
    label: "Last One Standing",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/lastOneStanding.webp",
    description: "Forty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.lastOneStandingUpgrades),
  },
  leveragedBuyout: {
    label: "Leveraged Buyout",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/leveragedBuyout.webp",
    description: "Forty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.leveragedBuyoutUpgrades),
  },
  marketDominance: {
    label: "Market Dominance",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/marketDominance.webp",
    description: "Forty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.marketDominanceUpgrades),
  },
  pinnedPayday: {
    label: "Pinned Payday",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/pinnedPayday.webp",
    description: "Thirty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pinnedPaydayPayouts),
  },
  poundForPound: {
    label: "Pound for Pound",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/poundForPound.webp",
    description: "Thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.poundForPoundPayouts),
  },
  tapOutTycoon: {
    label: "Tap Out Tycoon",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/tapOutTycoon.webp",
    description: "Fifty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.tapOutTycoonUpgrades),
  },
  winnerTakesAll: {
    label: "Winner Takes All",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/winnerTakesAll.webp",
    description: "Adds 24% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.winnerTakesAllShare),
  },
  gymBuddyBudget: {
    label: "Gym Buddy Budget",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/gymBuddyBudget.webp",
    description: "Adds 24.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.gymBuddyBudgetShare),
  },
  backToBackBonus: {
    label: "Back to Back Bonus",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/backToBackBonus.webp",
    description: "Fifty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.backToBackBonusPayouts),
  },
  backupPlan: {
    label: "Backup Plan",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/backupPlan.webp",
    description: "Fifty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.backupPlanUpgrades),
  },
  flexAppealFunds: {
    label: "Flex Appeal Funds",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/flexAppealFunds.webp",
    description: "Adds 25.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.flexAppealFundsShare),
  },
  handsOnHipsHoldings: {
    label: "Hands on Hips Holdings",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/handsOnHipsHoldings.webp",
    description: "Adds 25.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.handsOnHipsHoldingsShare),
  },
  pocketRocketPayday: {
    label: "Pocket Rocket Payday",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/pocketRocketPayday.webp",
    description: "Sixty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pocketRocketPaydayPayouts),
  },
  shoulderToShoulderShares: {
    label: "Shoulder to Shoulder Shares",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/shoulderToShoulderShares.webp",
    description: "Adds 25.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shoulderToShoulderSharesShare),
  },
  tealDeal: {
    label: "Teal Deal",
    color: COLOR.teaBreakBrown,
    image: "crits/muscleGirls/tealDeal.webp",
    description: "Sixty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tealDealPayouts),
  },
  trioTrustFund: {
    label: "Trio Trust Fund",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/trioTrustFund.webp",
    description: "Adds 25.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.trioTrustFundShare),
  },
  gingerPaycheck: {
    label: "Ginger Paycheck",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/gingerPaycheck.webp",
    description: "Eighty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.gingerPaycheckPayouts),
  },
  threeWaySplit: {
    label: "Three Way Split",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/threeWaySplit.webp",
    description: "Adds 26.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.threeWaySplitShare),
  },
  blowAKissBudget: {
    label: "Blow a Kiss Budget",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/blowAKissBudget.webp",
    description: "Adds 26.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blowAKissBudgetShare),
  },
  blueKissBonus: {
    label: "Blue Kiss Bonus",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/blueKissBonus.webp",
    description: "Eighty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.blueKissBonusPayouts),
  },
  doubleKissDeposit: {
    label: "Double Kiss Deposit",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/doubleKissDeposit.webp",
    description: "Eighty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.doubleKissDepositPayouts),
  },
  duoKissDividend: {
    label: "Duo Kiss Dividend",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/duoKissDividend.webp",
    description: "Eighty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.duoKissDividendPayouts),
  },
  farewellKissFund: {
    label: "Farewell Kiss Fund",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/farewellKissFund.webp",
    description: "Adds 27% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.farewellKissFundShare),
  },
  kissKissCapital: {
    label: "Kiss Kiss Capital",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/kissKissCapital.webp",
    description: "Adds 27.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.kissKissCapitalShare),
  },
  kissMarkProfit: {
    label: "Kiss Mark Profit",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/kissMarkProfit.webp",
    description: "Adds 27.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.kissMarkProfitShare),
  },
  kissYourMoneyHello: {
    label: "Kiss Your Money Hello",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/kissYourMoneyHello.webp",
    description: "Eighty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.kissYourMoneyHelloPayouts),
  },
  pointedProfits: {
    label: "Pointed Profits",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/pointedProfits.webp",
    description: "Adds 27.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pointedProfitsShare),
  },
  rainbowKissRebate: {
    label: "Rainbow Kiss Rebate",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/rainbowKissRebate.webp",
    description: "Adds 27.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rainbowKissRebateShare),
  },
  sealedKissCheck: {
    label: "Sealed Kiss Check",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/sealedKissCheck.webp",
    description: "Eighty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sealedKissCheckPayouts),
  },
  smoochStipend: {
    label: "Smooch Stipend",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/smoochStipend.webp",
    description: "Ninety instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.smoochStipendPayouts),
  },
  sunnySmoochShares: {
    label: "Sunny Smooch Shares",
    color: COLOR.starYellow,
    image: "crits/muscleGirls/sunnySmoochShares.webp",
    description: "Adds 76s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sunnySmoochSharesSeconds),
  },
  twinSmoochSavings: {
    label: "Twin Smooch Savings",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/twinSmoochSavings.webp",
    description: "Adds 77s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.twinSmoochSavingsSeconds),
  },
  pixieKissPaycheck: {
    label: "Pixie Kiss Paycheck",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/pixieKissPaycheck.webp",
    description: "Ninety-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pixieKissPaycheckPayouts),
  },
  smoochSalary: {
    label: "Smooch Salary",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/smoochSalary.webp",
    description: "Ninety-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.smoochSalaryPayouts),
  },
  ballgownBullion: {
    label: "Ballgown Bullion",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/ballgownBullion.webp",
    description: "One hundred and three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.ballgownBullionPayouts),
  },
  coutureCapital: {
    label: "Couture Capital",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/coutureCapital.webp",
    description: "Adds 86s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.coutureCapitalSeconds),
  },
  emeraldEarnings: {
    label: "Emerald Earnings",
    color: COLOR.moneyGreen,
    image: "crits/muscleGirls/emeraldEarnings.webp",
    description: "Adds 87s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.emeraldEarningsSeconds),
  },
  goldBeltBudget: {
    label: "Gold Belt Budget",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/goldBeltBudget.webp",
    description: "Adds 88s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldBeltBudgetSeconds),
  },
  platinumPortfolio: {
    label: "Platinum Portfolio",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/platinumPortfolio.webp",
    description: "Adds 89s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.platinumPortfolioSeconds),
  },
  redDressReserve: {
    label: "Red Dress Reserve",
    color: COLOR.redActive,
    image: "crits/muscleGirls/redDressReserve.webp",
    description: "One hundred and four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.redDressReservePayouts),
  },
  ruffleReturns: {
    label: "Ruffle Returns",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/ruffleReturns.webp",
    description: "One hundred and five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.ruffleReturnsPayouts),
  },
  runwayRevenue: {
    label: "Runway Revenue",
    color: COLOR.fancyFridayIndigo,
    image: "crits/muscleGirls/runwayRevenue.webp",
    description: "One hundred and six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.runwayRevenuePayouts),
  },
  silverScreenShares: {
    label: "Silver Screen Shares",
    color: COLOR.nightOwlIndigo,
    image: "crits/muscleGirls/silverScreenShares.webp",
    description: "Adds 91s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.silverScreenSharesSeconds),
  },
  thighHighYield: {
    label: "Thigh High Yield",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleGirls/thighHighYield.webp",
    description: "Adds 92s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.thighHighYieldSeconds),
  },
  updoUpside: {
    label: "Updo Upside",
    color: COLOR.redActive,
    image: "crits/muscleGirls/updoUpside.webp",
    description: "One hundred and seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.updoUpsidePayouts),
  },
  bigHairPout: {
    label: "Big Hair Pout",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/bigHairPout.webp",
    description: "Adds 93s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bigHairPoutSeconds),
  },
  blushingPucker: {
    label: "Blushing Pucker",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/blushingPucker.webp",
    description: "One hundred and eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.blushingPuckerPayouts),
  },
  peckPlease: {
    label: "Peck Please",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/peckPlease.webp",
    description: "One hundred and nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.peckPleasePayouts),
  },
  lipService: {
    label: "Lip Service",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/lipService.webp",
    description: "Adds 94s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.lipServiceSeconds),
  },
  candyLips: {
    label: "Candy Lips",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/candyLips.webp",
    description: "Adds 95s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.candyLipsSeconds),
  },
  kissCurl: {
    label: "Kiss Curl",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/kissCurl.webp",
    description: "Adds 96s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.kissCurlSeconds),
  },
  kissyFace: {
    label: "Kissy Face",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/kissyFace.webp",
    description: "Adds 97s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.kissyFaceSeconds),
  },
  greenKisser: {
    label: "Green Kisser",
    color: COLOR.gold,
    image: "crits/muscleGirls/greenKisser.webp",
    description: "One hundred and ten instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.greenKisserPayouts),
  },
  lipGlossGrin: {
    label: "Lip Gloss Grin",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/lipGlossGrin.webp",
    description: "One hundred and eleven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lipGlossGrinPayouts),
  },
  hotLips: {
    label: "Hot Lips",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/hotLips.webp",
    description: "Adds 99s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.hotLipsSeconds),
  },
  mwahaha: {
    label: "Mwahaha",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/mwahaha.webp",
    description: "One hundred and twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.mwahahaPayouts),
  },
  mostKissable: {
    label: "Most Kissable",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/mostKissable.webp",
    description: "Adds 100s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.mostKissableSeconds),
  },
  puckerUp: {
    label: "Pucker Up",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/puckerUp.webp",
    description: "One hundred and thirteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.puckerUpPayouts),
  },
  redHotKiss: {
    label: "Red Hot Kiss",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/redHotKiss.webp",
    description: "One hundred and fourteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.redHotKissPayouts),
  },
  bedroomEyes: {
    label: "Bedroom Eyes",
    color: COLOR.rainCheckBlue,
    image: "crits/muscleGirls/bedroomEyes.webp",
    description: "Adds 101s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.bedroomEyesSeconds),
  },
  airKiss: {
    label: "Air Kiss",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/airKiss.webp",
    description: "One hundred and fifteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.airKissPayouts),
  },
  xoxo: {
    label: "XOXO",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/xoxo.webp",
    description: "Adds 102s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.xoxoSeconds),
  },
  sugarKiss: {
    label: "Sugar Kiss",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/sugarKiss.webp",
    description: "Adds 103s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sugarKissSeconds),
  },
  tenderLips: {
    label: "Tender Lips",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/tenderLips.webp",
    description: "One hundred and sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tenderLipsPayouts),
  },
  beeStungLips: {
    label: "Bee Stung Lips",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/beeStungLips.webp",
    description: "Adds 104s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.beeStungLipsSeconds),
  },
  winkAndAKiss: {
    label: "Wink And A Kiss",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/winkAndAKiss.webp",
    description: "One hundred and seventeen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.winkAndAKissPayouts),
  },
  selfLove: {
    label: "Self Love",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/selfLove.webp",
    description: "One hundred and eighteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.selfLovePayouts),
  },
  crouchingKiss: {
    label: "Crouching Kiss",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/crouchingKiss.webp",
    description: "Adds 106s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.crouchingKissSeconds),
  },
  baldAndBold: {
    label: "Bald And Bold",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/baldAndBold.webp",
    description: "Spreads 81 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.baldAndBoldUpgrades),
  },
  bigShoulderEnergy: {
    label: "Big Shoulder Energy",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/bigShoulderEnergy.webp",
    description: "Pays 9 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.bigShoulderEnergyMultiple),
  },
  blueStreak: {
    label: "Blue Streak",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/blueStreak.webp",
    description: "Grows every unlocked floor's level by 4.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.blueStreakGrowth),
  },
  cameoAppearance: {
    label: "Cameo Appearance",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/cameoAppearance.webp",
    description: "Spreads 82 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.cameoAppearanceUpgrades),
  },
  cheekyGoblin: {
    label: "Cheeky Goblin",
    color: COLOR.moneyGreen,
    image: "crits/muscleGirls/cheekyGoblin.webp",
    description: "Pays 2 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.cheekyGoblinMultiple),
  },
  chinUp: {
    label: "Chin Up",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/chinUp.webp",
    description: "Grows this floor's level by 12.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.chinUpGrowth),
  },
  cleanSlate: {
    label: "Clean Slate",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/cleanSlate.webp",
    description: "Spreads 83 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.cleanSlateUpgrades),
  },
  evergreenGains: {
    label: "Evergreen Gains",
    color: COLOR.rainCheckBlue,
    image: "crits/muscleGirls/evergreenGains.webp",
    description: "Pays 13 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.evergreenGainsMultiple),
  },
  forestFlirt: {
    label: "Forest Flirt",
    color: COLOR.dressCodeGreen,
    image: "crits/muscleGirls/forestFlirt.webp",
    description: "Grows every unlocked floor's level by 4.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.forestFlirtGrowth),
  },
  goblinSmirk: {
    label: "Goblin Smirk",
    color: COLOR.gold,
    image: "crits/muscleGirls/goblinSmirk.webp",
    description: "Spreads 84 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.goblinSmirkUpgrades),
  },
  goldenHoops: {
    label: "Golden Hoops",
    color: COLOR.coffeeRunTeal,
    image: "crits/muscleGirls/goldenHoops.webp",
    description: "Pays 17 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.goldenHoopsMultiple),
  },
  ivoryTower: {
    label: "Ivory Tower",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/ivoryTower.webp",
    description: "Grows this floor's level by 12.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.ivoryTowerGrowth),
  },
  lipNibble: {
    label: "Lip Nibble",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/lipNibble.webp",
    description: "Spreads 85 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.lipNibbleUpgrades),
  },
  mohawkMwah: {
    label: "Mohawk Mwah",
    color: COLOR.moneyGreen,
    image: "crits/muscleGirls/mohawkMwah.webp",
    description: "Pays 14 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.mohawkMwahMultiple),
  },
  overallWinner: {
    label: "Overall Winner",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/overallWinner.webp",
    description: "Grows this floor's level by 3.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.overallWinnerGrowth),
  },
  pointedLook: {
    label: "Pointed Look",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/pointedLook.webp",
    description: "Spreads 86 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.pointedLookUpgrades),
  },
  silverBraid: {
    label: "Silver Braid",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/silverBraid.webp",
    description: "Pays 4 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.silverBraidMultiple),
  },
  splitDecision: {
    label: "Split Decision",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/splitDecision.webp",
    description: "Grows every unlocked floor's level by 4.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.splitDecisionGrowth),
  },
  strappedForCash: {
    label: "Strapped For Cash",
    color: COLOR.gold,
    image: "crits/muscleGirls/strappedForCash.webp",
    description: "Spreads 11 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.strappedForCashUpgrades),
  },
  olivePout: {
    label: "Olive Pout",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/olivePout.webp",
    description: "Pays 18 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.olivePoutMultiple),
  },
  axeDeduction: {
    label: "Axe Deduction",
    color: COLOR.chairGiveawayBrown,
    image: "crits/muscleGirls/axeDeduction.webp",
    description: "Pays 11 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.axeDeductionMultiple),
  },
  chopChop: {
    label: "Chop Chop",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/chopChop.webp",
    description: "Grows this floor's level by 12.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.chopChopGrowth),
  },
  norseCode: {
    label: "Norse Code",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/norseCode.webp",
    description: "Spreads 94 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.norseCodeUpgrades),
  },
  plunderPose: {
    label: "Plunder Pose",
    color: COLOR.chairGiveawayBrown,
    image: "crits/muscleGirls/plunderPose.webp",
    description: "Pays 27 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.plunderPoseMultiple),
  },
  raidDay: {
    label: "Raid Day",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/raidDay.webp",
    description: "Grows this floor's level by 13% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.raidDayGrowth),
  },
  shieldMaiden: {
    label: "Shield Maiden",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/shieldMaiden.webp",
    description: "Spreads 95 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.shieldMaidenUpgrades),
  },
  valhallaVenture: {
    label: "Valhalla Venture",
    color: COLOR.supplyRunTan,
    image: "crits/muscleGirls/valhallaVenture.webp",
    description: "Pays 21 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.valhallaVentureMultiple),
  },
  redheadHug: {
    label: "Redhead Hug",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/redheadHug.webp",
    description: "Spreads 13 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.redheadHugUpgrades),
  },
  blueBobNuzzle: {
    label: "Blue Bob Nuzzle",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/blueBobNuzzle.webp",
    description: "Pays 5 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.blueBobNuzzleMultiple),
  },
  curlyCuddle: {
    label: "Curly Cuddle",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/curlyCuddle.webp",
    description: "Grows this floor's level by 8.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.curlyCuddleGrowth),
  },
  leanOnMe: {
    label: "Lean on Me",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/leanOnMe.webp",
    description: "Spreads 14 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.leanOnMeUpgrades),
  },
  pinkPowerhouses: {
    label: "Pink Powerhouses",
    color: COLOR.fullHouseCrimson,
    image: "crits/muscleGirls/pinkPowerhouses.webp",
    description: "Pays 7 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.pinkPowerhousesMultiple),
  },
  ravenSnuggle: {
    label: "Raven Snuggle",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/ravenSnuggle.webp",
    description: "Grows every unlocked floor's level by 2.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.ravenSnuggleGrowth),
  },
  sereneSqueeze: {
    label: "Serene Squeeze",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/sereneSqueeze.webp",
    description: "Spreads 16 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.sereneSqueezeUpgrades),
  },
  orcMatronHomage: {
    label: "Orc Matron Homage",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/orcMatronHomage.webp",
    description: "Pays 57 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.orcMatronHomageMultiple),
  },
  swimsuitVenus: {
    label: "Swimsuit Venus",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/swimsuitVenus.webp",
    description: "Grows every unlocked floor's level by 6.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.swimsuitVenusGrowth),
  },
  calfKissPilgrim: {
    label: "Calf Kiss Pilgrim",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/calfKissPilgrim.webp",
    description: "Spreads 33 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.calfKissPilgrimUpgrades),
  },
  goldenBraidIdol: {
    label: "Golden Braid Idol",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/goldenBraidIdol.webp",
    description: "Pays 58 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.goldenBraidIdolMultiple),
  },
  goblinAcolyte: {
    label: "Goblin Acolyte",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/goblinAcolyte.webp",
    description: "Grows every unlocked floor's level by 6.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.goblinAcolyteGrowth),
  },
  greenLeggingsGenuflect: {
    label: "Green Leggings Genuflect",
    color: COLOR.paydayEmerald,
    image: "crits/muscleGirls/greenLeggingsGenuflect.webp",
    description: "Spreads 34 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.greenLeggingsGenuflectUpgrades),
  },
  adoringGaze: {
    label: "Adoring Gaze",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/adoringGaze.webp",
    description: "Pays 59 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.adoringGazeMultiple),
  },
  kneepadOrcSovereign: {
    label: "Kneepad Orc Sovereign",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/kneepadOrcSovereign.webp",
    description: "Grows this floor's level by 13.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.kneepadOrcSovereignGrowth),
  },
  loinclothDeity: {
    label: "Loincloth Deity",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/muscleGirls/loinclothDeity.webp",
    description: "Spreads 35 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.loinclothDeityUpgrades),
  },
  mountainGoddess: {
    label: "Mountain Goddess",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/mountainGoddess.webp",
    description: "Pays 60 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.mountainGoddessMultiple),
  },
  armoredOrcIdol: {
    label: "Armored Orc Idol",
    color: COLOR.luckyCloverGreen,
    image: "crits/muscleGirls/armoredOrcIdol.webp",
    description: "Grows every unlocked floor's level by 6.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels(context.floors, balance.armoredOrcIdolGrowth),
  },
  royalHandKiss: {
    label: "Royal Hand Kiss",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/royalHandKiss.webp",
    description: "Spreads 36 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.royalHandKissUpgrades),
  },
  pinkBootsPraise: {
    label: "Pink Boots Praise",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/pinkBootsPraise.webp",
    description: "Pays 61 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.pinkBootsPraiseMultiple),
  },
  buzzcutTitaness: {
    label: "Buzzcut Titaness",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/buzzcutTitaness.webp",
    description: "Grows this floor's level by 13.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.buzzcutTitanessGrowth),
  },
  pinkTopPedestal: {
    label: "Pink Top Pedestal",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/pinkTopPedestal.webp",
    description: "Spreads 37 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.pinkTopPedestalUpgrades),
  },
  purpleLeggingsReverence: {
    label: "Purple Leggings Reverence",
    color: COLOR.teaBreakBrown,
    image: "crits/muscleGirls/purpleLeggingsReverence.webp",
    description: "Pays 62 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.purpleLeggingsReverenceMultiple),
  },
  marbleAbsVigil: {
    label: "Marble Abs Vigil",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/marbleAbsVigil.webp",
    description: "Grows this floor's level by 9.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.marbleAbsVigilGrowth),
  },
  seatedEmpress: {
    label: "Seated Empress",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/seatedEmpress.webp",
    description: "Spreads 38 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.seatedEmpressUpgrades),
  },
  flexSwoon: {
    label: "Flex Swoon",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/flexSwoon.webp",
    description: "Pays 63 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.flexSwoonMultiple),
  },
  tealTribute: {
    label: "Teal Tribute",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/tealTribute.webp",
    description: "Grows this floor's level by 9.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.tealTributeGrowth),
  },
  thunderThighHymn: {
    label: "Thunder Thigh Hymn",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/thunderThighHymn.webp",
    description: "Spreads 39 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.thunderThighHymnUpgrades),
  },
  sculptedLegDevotee: {
    label: "Sculpted Leg Devotee",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/sculptedLegDevotee.webp",
    description: "Grows this floor's level by 9.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.sculptedLegDevoteeGrowth),
  },
  gildedMuscleBow: {
    label: "Gilded Muscle Bow",
    color: COLOR.amber,
    image: "crits/muscleGirls/gildedMuscleBow.webp",
    description: "Spreads 39 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.gildedMuscleBowUpgrades),
  },
  washboardKiss: {
    label: "Washboard Kiss",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/washboardKiss.webp",
    description: "Grows this floor's level by 3.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.washboardKissGrowth),
  },
  armsCrossedGoddess: {
    label: "Arms Crossed Goddess",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/armsCrossedGoddess.webp",
    description: "Spreads 41 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.armsCrossedGoddessUpgrades),
  },
  twinThighDevotion: {
    label: "Twin Thigh Devotion",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/twinThighDevotion.webp",
    description: "Pays 70 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.twinThighDevotionMultiple),
  },
  leotardDivinity: {
    label: "Leotard Divinity",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/leotardDivinity.webp",
    description: "Grows this floor's level by 3.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.leotardDivinityGrowth),
  },
  bronzeAbsShrine: {
    label: "Bronze Abs Shrine",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/bronzeAbsShrine.webp",
    description: "Spreads 42 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.bronzeAbsShrineUpgrades),
  },
  cherryTopColossus: {
    label: "Cherry Top Colossus",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/cherryTopColossus.webp",
    description: "Pays 71 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.cherryTopColossusMultiple),
  },
  coralCropVeneration: {
    label: "Coral Crop Veneration",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/coralCropVeneration.webp",
    description: "Grows this floor's level by 3.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.coralCropVenerationGrowth),
  },
  creamCropAbs: {
    label: "Cream Crop Abs",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/creamCropAbs.webp",
    description: "Spreads 43 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.creamCropAbsUpgrades),
  },
  crimsonCoreAwe: {
    label: "Crimson Core Awe",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/crimsonCoreAwe.webp",
    description: "Pays 72 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.crimsonCoreAweMultiple),
  },
  prostratePilgrims: {
    label: "Prostrate Pilgrims",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/prostratePilgrims.webp",
    description: "Grows this floor's level by 3.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.prostratePilgrimsGrowth),
  },
  pillarLegsPraise: {
    label: "Pillar Legs Praise",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/pillarLegsPraise.webp",
    description: "Spreads 44 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.pillarLegsPraiseUpgrades),
  },
  platinumAmazon: {
    label: "Platinum Amazon",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/platinumAmazon.webp",
    description: "Pays 73 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.platinumAmazonMultiple),
  },
  absAltar: {
    label: "Abs Altar",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/absAltar.webp",
    description: "Grows this floor's level by 3.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.absAltarGrowth),
  },
  navySanctum: {
    label: "Navy Sanctum",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/navySanctum.webp",
    description: "Spreads 55 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.navySanctumUpgrades),
  },
  bentKneeOath: {
    label: "Bent Knee Oath",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/bentKneeOath.webp",
    description: "Pays 74 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.bentKneeOathMultiple),
  },
  plumMatriarch: {
    label: "Plum Matriarch",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/plumMatriarch.webp",
    description: "Grows this floor's level by 3.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.plumMatriarchGrowth),
  },
  bowingBeforeBeauty: {
    label: "Bowing Before Beauty",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/bowingBeforeBeauty.webp",
    description: "Spreads 56 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.bowingBeforeBeautyUpgrades),
  },
  redLeggingsRapture: {
    label: "Red Leggings Rapture",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/redLeggingsRapture.webp",
    description: "Pays 15 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.redLeggingsRaptureMultiple),
  },
  bellyBlessing: {
    label: "Belly Blessing",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/bellyBlessing.webp",
    description: "Grows this floor's level by 3.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.bellyBlessingGrowth),
  },
  giantessSanctuary: {
    label: "Giantess Sanctuary",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/giantessSanctuary.webp",
    description: "Spreads 57 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.giantessSanctuaryUpgrades),
  },
  ponytailPriestess: {
    label: "Ponytail Priestess",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/ponytailPriestess.webp",
    description: "Pays 16 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.ponytailPriestessMultiple),
  },
  sunsetCongregation: {
    label: "Sunset Congregation",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/sunsetCongregation.webp",
    description: "Grows this floor's level by 3.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.sunsetCongregationGrowth),
  },
  quadTemple: {
    label: "Quad Temple",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/quadTemple.webp",
    description: "Spreads 58 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.quadTempleUpgrades),
  },
  aquaShortsMuse: {
    label: "Aqua Shorts Muse",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/aquaShortsMuse.webp",
    description: "Pays 17 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.aquaShortsMuseMultiple),
  },
  twinHandOffering: {
    label: "Twin Hand Offering",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/twinHandOffering.webp",
    description: "Grows this floor's level by 5.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.twinHandOfferingGrowth),
  },
  waistWorship: {
    label: "Waist Worship",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/waistWorship.webp",
    description: "Spreads 59 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.waistWorshipUpgrades),
  },
  pinkTightsPowerhouse: {
    label: "Pink Tights Powerhouse",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/pinkTightsPowerhouse.webp",
    description: "Pays 18 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.pinkTightsPowerhouseMultiple),
  },
  rainbowShortsShrine: {
    label: "Rainbow Shorts Shrine",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/rainbowShortsShrine.webp",
    description: "Grows this floor's level by 5.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.rainbowShortsShrineGrowth),
  },
  sunnyDivaAltar: {
    label: "Sunny Diva Altar",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/sunnyDivaAltar.webp",
    description: "Spreads 60 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.sunnyDivaAltarUpgrades),
  },
  emeraldTopAdoration: {
    label: "Emerald Top Adoration",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/emeraldTopAdoration.webp",
    description: "Pays 19 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.emeraldTopAdorationMultiple),
  },
  quadricepPrayer: {
    label: "Quadricep Prayer",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/quadricepPrayer.webp",
    description: "Grows this floor's level by 5.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.quadricepPrayerGrowth),
  },
  blondeDisciple: {
    label: "Blonde Disciple",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/blondeDisciple.webp",
    description: "Spreads 61 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.blondeDiscipleUpgrades),
  },
  prayingHandsPledge: {
    label: "Praying Hands Pledge",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/prayingHandsPledge.webp",
    description: "Pays 20 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.prayingHandsPledgeMultiple),
  },
  chiseledAbsKiss: {
    label: "Chiseled Abs Kiss",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/chiseledAbsKiss.webp",
    description: "Grows this floor's level by 5.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.chiseledAbsKissGrowth),
  },
  absOfStone: {
    label: "Abs of Stone",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/absOfStone.webp",
    description: "Spreads 62 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.absOfStoneUpgrades),
  },
  abdominalAdoration: {
    label: "Abdominal Adoration",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/abdominalAdoration.webp",
    description: "Pays 21 times every unlocked floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash(context.floors, balance.abdominalAdorationMultiple),
  },
  abGridGlory: {
    label: "Ab Grid Glory",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/abGridGlory.webp",
    description: "Grows this floor's level by 5.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.abGridGloryGrowth),
  },
  bicepPlea: {
    label: "Bicep Plea",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/bicepPlea.webp",
    description: "Spreads 56 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.bicepPleaUpgrades),
  },
  armInArm: {
    label: "Arm In Arm",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/armInArm.webp",
    description: "Pays 139 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.armInArmMultiple),
  },
  boxBraidBoost: {
    label: "Box Braid Boost",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/boxBraidBoost.webp",
    description: "Grows this floor's level by 18.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.boxBraidBoostGrowth),
  },
  braidWatch: {
    label: "Braid Watch",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/braidWatch.webp",
    description: "Spreads 150 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.braidWatchUpgrades),
  },
  buzzcutBackside: {
    label: "Buzzcut Backside",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/buzzcutBackside.webp",
    description: "Pays 140 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.buzzcutBacksideMultiple),
  },
  formCheck: {
    label: "Form Check",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/formCheck.webp",
    description: "Grows this floor's level by 18.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.formCheckGrowth),
  },
  glovedSwat: {
    label: "Gloved Swat",
    color: COLOR.roundUpOrange,
    image: "crits/muscleGirls/glovedSwat.webp",
    description: "Spreads 151 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.glovedSwatUpgrades),
  },
  grapeSpandex: {
    label: "Grape Spandex",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/grapeSpandex.webp",
    description: "Pays 141 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.grapeSpandexMultiple),
  },
  headbandTwins: {
    label: "Headband Twins",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/headbandTwins.webp",
    description: "Grows this floor's level by 18.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.headbandTwinsGrowth),
  },
  highlighterLeggings: {
    label: "Highlighter Leggings",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/muscleGirls/highlighterLeggings.webp",
    description: "Spreads 152 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.highlighterLeggingsUpgrades),
  },
  hipNuzzle: {
    label: "Hip Nuzzle",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/hipNuzzle.webp",
    description: "Pays 142 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.hipNuzzleMultiple),
  },
  hitchhikerThumb: {
    label: "Hitchhiker Thumb",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/hitchhikerThumb.webp",
    description: "Grows this floor's level by 18.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.hitchhikerThumbGrowth),
  },
  ivoryShorts: {
    label: "Ivory Shorts",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/ivoryShorts.webp",
    description: "Spreads 153 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.ivoryShortsUpgrades),
  },
  lowLunge: {
    label: "Low Lunge",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/lowLunge.webp",
    description: "Pays 143 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.lowLungeMultiple),
  },
  magentaHype: {
    label: "Magenta Hype",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/magentaHype.webp",
    description: "Grows this floor's level by 18.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.magentaHypeGrowth),
  },
  matchingSneakers: {
    label: "Matching Sneakers",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/matchingSneakers.webp",
    description: "Spreads 154 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.matchingSneakersUpgrades),
  },
  neonTrimNudge: {
    label: "Neon Trim Nudge",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/neonTrimNudge.webp",
    description: "Pays 144 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.neonTrimNudgeMultiple),
  },
  orangeAndLime: {
    label: "Orange And Lime",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleGirls/orangeAndLime.webp",
    description: "Grows this floor's level by 18.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.orangeAndLimeGrowth),
  },
  peekabooBuddy: {
    label: "Peekaboo Buddy",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/peekabooBuddy.webp",
    description: "Spreads 155 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.peekabooBuddyUpgrades),
  },
  pinkTankPat: {
    label: "Pink Tank Pat",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/pinkTankPat.webp",
    description: "Pays 145 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.pinkTankPatMultiple),
  },
  redSockSumo: {
    label: "Red Sock Sumo",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/redSockSumo.webp",
    description: "Grows this floor's level by 18.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.redSockSumoGrowth),
  },
  sidelineCoach: {
    label: "Sideline Coach",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleGirls/sidelineCoach.webp",
    description: "Spreads 156 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.sidelineCoachUpgrades),
  },
  steadyingHand: {
    label: "Steadying Hand",
    color: COLOR.amberMuted,
    image: "crits/muscleGirls/steadyingHand.webp",
    description: "Pays 146 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.steadyingHandMultiple),
  },
  yellowShortsSmack: {
    label: "Yellow Shorts Smack",
    color: COLOR.coinGold,
    image: "crits/muscleGirls/yellowShortsSmack.webp",
    description: "Grows this floor's level by 18.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.yellowShortsSmackGrowth),
  },
  bearyBuff: {
    label: "Beary Buff",
    color: COLOR.chairGiveawayBrown,
    image: "crits/muscleGirls/bearyBuff.webp",
    description: "Grows this floor's level by 26.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.bearyBuffGrowth),
  },
  gingerGnawers: {
    label: "Ginger Gnawers",
    color: COLOR.orange,
    image: "crits/muscleGirls/gingerGnawers.webp",
    description: "Grows this floor's level by 26.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.gingerGnawersGrowth),
  },
  hippoHeavyweights: {
    label: "Hippo Heavyweights",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleGirls/hippoHeavyweights.webp",
    description: "Grows this floor's level by 26.9% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.hippoHeavyweightsGrowth),
  },
  labRatLifters: {
    label: "Lab Rat Lifters",
    color: COLOR.overflowBlue,
    image: "crits/muscleGirls/labRatLifters.webp",
    description: "Grows this floor's level by 27% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.labRatLiftersGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

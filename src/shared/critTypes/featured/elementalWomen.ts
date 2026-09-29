import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ELEMENTAL_WOMEN_CRITS = {
  flameFlirt: {
    label: "Flame Flirt",
    color: COLOR.orange,
    image: "crits/elementalWomen/flameFlirt.webp",
    description: "Boosts every worker for 36s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.flameFlirtBoostSeconds,
        balance.flameFlirtExtraWorkers,
      ),
  },
  tidalTease: {
    label: "Tidal Tease",
    color: COLOR.cyan,
    image: "crits/elementalWomen/tidalTease.webp",
    description: "Sixty-one payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.tidalTeasePayouts),
  },
  riptideRomance: {
    label: "Riptide Romance",
    color: COLOR.pairBlue,
    image: "crits/elementalWomen/riptideRomance.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.riptideRomanceFloors),
  },
  zephyrGlamour: {
    label: "Zephyr Glamour",
    color: COLOR.teal,
    image: "crits/elementalWomen/zephyrGlamour.webp",
    description:
      "Repeats the crit above and below, 67% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.zephyrGlamourContinueChance),
  },
  galeGala: {
    label: "Gale Gala",
    color: COLOR.winterSaleIceBlue,
    image: "crits/elementalWomen/galeGala.webp",
    description: "Cuts every price in this building by 7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.galeGalaDiscount),
  },
  crosswindCrush: {
    label: "Crosswind Crush",
    color: COLOR.springSalePink,
    image: "crits/elementalWomen/crosswindCrush.webp",
    description: "Boosts every worker for 56s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.crosswindCrushBoostSeconds,
        balance.crosswindCrushExtraWorkers,
      ),
  },
  windfallWaltz: {
    label: "Windfall Waltz",
    color: COLOR.threeOfAKindGreen,
    image: "crits/elementalWomen/windfallWaltz.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.windfallWaltzFloors),
  },
  glacialGlam: {
    label: "Glacial Glam",
    color: COLOR.frozenIceBlue,
    image: "crits/elementalWomen/glacialGlam.webp",
    description: "Seventy-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.glacialGlamUpgrades),
  },
  snowglobeWink: {
    label: "Snowglobe Wink",
    color: COLOR.snowdayFrost,
    image: "crits/elementalWomen/snowglobeWink.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
  iceboxIdol: {
    label: "Icebox Idol",
    color: COLOR.snowballBlue,
    image: "crits/elementalWomen/iceboxIdol.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.iceboxIdolWorkers),
  },
  joltValentine: {
    label: "Jolt Valentine",
    color: COLOR.purple,
    image: "crits/elementalWomen/joltValentine.webp",
    description: "One tier promotion and forty-seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.joltValentineTierSteps,
        balance.joltValentineUpgrades,
      ),
  },
  sparkSweetheart: {
    label: "Spark Sweetheart",
    color: COLOR.sunshineGold,
    image: "crits/elementalWomen/sparkSweetheart.webp",
    description: "Boosts every worker for 50s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.sparkSweetheartBoostSeconds,
        balance.sparkSweetheartExtraWorkers,
      ),
  },
  voltageVow: {
    label: "Voltage Vow",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/elementalWomen/voltageVow.webp",
    description: "Boosts every worker for 50s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.voltageVowBoostSeconds,
        balance.voltageVowExtraWorkers,
      ),
  },
  magmaMuse: {
    label: "Magma Muse",
    color: COLOR.red,
    image: "crits/elementalWomen/magmaMuse.webp",
    description: "Hires a free manager on every unlocked floor",
    reward: (context, { actions }) => actions.hireManagers(context.floors),
  },
  moltenMogul: {
    label: "Molten Mogul",
    color: COLOR.roundUpOrange,
    image: "crits/elementalWomen/moltenMogul.webp",
    description:
      "Two tier promotions and twenty-three upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.moltenMogulTierSteps,
        balance.moltenMogulUpgrades,
      ),
  },
  lavaLounger: {
    label: "Lava Lounger",
    color: COLOR.fireDrillRed,
    image: "crits/elementalWomen/lavaLounger.webp",
    description: "Boosts every worker for 51s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.lavaLoungerBoostSeconds,
        balance.lavaLoungerExtraWorkers,
      ),
  },
  mossMaiden: {
    label: "Moss Maiden",
    color: COLOR.luckyCloverGreen,
    image: "crits/elementalWomen/mossMaiden.webp",
    description: "Cuts every price in this building by 4.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.mossMaidenDiscount),
  },
  blossomBashful: {
    label: "Blossom Bashful",
    color: COLOR.grandOpeningRose,
    image: "crits/elementalWomen/blossomBashful.webp",
    description: "Cuts every price in this building by 4.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blossomBashfulDiscount),
  },
  bedrockBeauty: {
    label: "Bedrock Beauty",
    color: COLOR.chairGiveawayBrown,
    image: "crits/elementalWomen/bedrockBeauty.webp",
    description: "Boosts every worker for 36s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.bedrockBeautyBoostSeconds,
        balance.bedrockBeautyExtraWorkers,
      ),
  },
  basaltBombshell: {
    label: "Basalt Bombshell",
    color: COLOR.unionBossSlate,
    image: "crits/elementalWomen/basaltBombshell.webp",
    description: "Cuts every price in this building by 6.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.basaltBombshellDiscount),
  },
  nuggetKnockout: {
    label: "Nugget Knockout",
    color: COLOR.goldStandardAmber,
    image: "crits/elementalWomen/nuggetKnockout.webp",
    description:
      "One tier promotion and fifty-one upgrades on the highest floor",
    reward: (context, { balance, highestFloor, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        highestFloor(context),
        balance.nuggetKnockoutTierSteps,
        balance.nuggetKnockoutUpgrades,
      ),
  },
  duneDarling: {
    label: "Dune Darling",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/elementalWomen/duneDarling.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.duneDarlingFloors),
  },
  hourglassHeiress: {
    label: "Hourglass Heiress",
    color: COLOR.mergerGold,
    image: "crits/elementalWomen/hourglassHeiress.webp",
    description: "Forty-seven payouts here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.payCycles(
        hereAnd(context, selectByRate(context, false)),
        balance.hourglassHeiressPayouts,
      ),
  },
  sandsOfFortune: {
    label: "Sands of Fortune",
    color: COLOR.gold,
    image: "crits/elementalWomen/sandsOfFortune.webp",
    description: "Adds 40s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sandsOfFortuneSeconds),
  },
  vaporVogue: {
    label: "Vapor Vogue",
    color: COLOR.royalFlushPurple,
    image: "crits/elementalWomen/vaporVogue.webp",
    description: "Seventy-two payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.vaporVoguePayouts,
      ),
  },
  teatimeTease: {
    label: "Teatime Tease",
    color: COLOR.teaBreakBrown,
    image: "crits/elementalWomen/teatimeTease.webp",
    description: "Boosts every worker for 52s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.teatimeTeaseBoostSeconds,
        balance.teatimeTeaseExtraWorkers,
      ),
  },
  earlGreyGlamour: {
    label: "Earl Grey Glamour",
    color: COLOR.halloweenSalePurple,
    image: "crits/elementalWomen/earlGreyGlamour.webp",
    description: "Cuts every price in this building by 6.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.earlGreyGlamourDiscount),
  },
  tempestTiara: {
    label: "Tempest Tiara",
    color: COLOR.nightShiftIndigo,
    image: "crits/elementalWomen/tempestTiara.webp",
    description: "Boosts every worker for 52s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.tempestTiaraBoostSeconds,
        balance.tempestTiaraExtraWorkers,
      ),
  },
  starlightSwoon: {
    label: "Starlight Swoon",
    color: COLOR.heavenlyGold,
    image: "crits/elementalWomen/starlightSwoon.webp",
    description: "Raises every floor to the building's top level",
    reward: (context, { actions, topLevel }) =>
      actions.raiseLevels(context.floors, topLevel(context)),
  },
  stardustSigh: {
    label: "Stardust Sigh",
    color: COLOR.starYellow,
    image: "crits/elementalWomen/stardustSigh.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.stardustSighFloors),
  },
  umbraEnchantress: {
    label: "Umbra Enchantress",
    color: COLOR.fancyFridayIndigo,
    image: "crits/elementalWomen/umbraEnchantress.webp",
    description:
      "One tier promotion and fifty-four upgrades on the lowest-level floor",
    reward: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        lowestLevel(context),
        balance.umbraEnchantressTierSteps,
        balance.umbraEnchantressUpgrades,
      ),
  },
  nightfallNudge: {
    label: "Nightfall Nudge",
    color: COLOR.nightOwlIndigo,
    image: "crits/elementalWomen/nightfallNudge.webp",
    description: "Forty-nine upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.nightfallNudgeUpgrades,
      ),
  },
  hoodedHush: {
    label: "Hooded Hush",
    color: COLOR.cloneArmyViolet,
    image: "crits/elementalWomen/hoodedHush.webp",
    description: "Fifty payouts here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.payCycles(
        hereAnd(context, lowestLevel(context)),
        balance.hoodedHushPayouts,
      ),
  },
  smokescreenSmirk: {
    label: "Smokescreen Smirk",
    color: COLOR.silverTicketGray,
    image: "crits/elementalWomen/smokescreenSmirk.webp",
    description: "Hires 1 free worker on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.smokescreenSmirkWorkers),
  },
  ringletRascal: {
    label: "Ringlet Rascal",
    color: COLOR.peppermintPink,
    image: "crits/elementalWomen/ringletRascal.webp",
    description: "Forty-four upgrades here and on the cheapest floor",
    reward: (context, { actions, balance, cheapest, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, cheapest(context)),
        balance.ringletRascalUpgrades,
      ),
  },
  ashenAllure: {
    label: "Ashen Allure",
    color: COLOR.disabledGray,
    image: "crits/elementalWomen/ashenAllure.webp",
    description:
      "Repeats the crit above and below, 47% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.ashenAllureContinueChance),
  },
  geodeCoquette: {
    label: "Geode Coquette",
    color: COLOR.royalFlushPurple,
    image: "crits/elementalWomen/geodeCoquette.webp",
    description: "Two tier promotions and seventeen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.geodeCoquetteTierSteps,
        balance.geodeCoquetteUpgrades,
      ),
  },
  amethystAllure: {
    label: "Amethyst Allure",
    color: COLOR.threeOfAKindGreen,
    image: "crits/elementalWomen/amethystAllure.webp",
    description: "Hires a free manager on alternating floors",
    reward: (context, { actions, alternating }) =>
      actions.hireManagers(alternating(context)),
  },
  crystalCurtsy: {
    label: "Crystal Curtsy",
    color: COLOR.cyan,
    image: "crits/elementalWomen/crystalCurtsy.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  prismPinup: {
    label: "Prism Pinup",
    color: COLOR.mysticTeal,
    image: "crits/elementalWomen/prismPinup.webp",
    description: "Hires 2 free workers on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers(context.floors, balance.prismPinupWorkers),
  },
  frostbiteFinesse: {
    label: "Frostbite Finesse",
    color: COLOR.blue,
    image: "crits/elementalWomen/frostbiteFinesse.webp",
    description: "Free office chairs for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeChairs(context.floors),
  },
  nebulaNocturne: {
    label: "Nebula Nocturne",
    color: COLOR.shareholdersGreen,
    image: "crits/elementalWomen/nebulaNocturne.webp",
    description: "Repeats the crit on the floor below, 16% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.nebulaNocturneContinueChance),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

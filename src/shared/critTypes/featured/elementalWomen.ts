import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ELEMENTAL_WOMEN_CRITS = {
  flameFlirt: {
    label: "Flame Flirt",
    color: COLOR.orange,
    image: "crits/elementalWomen/flameFlirt.png",
    description: "Seventy-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.flameFlirtPayouts),
  },
  tidalTease: {
    label: "Tidal Tease",
    color: COLOR.cyan,
    image: "crits/elementalWomen/tidalTease.png",
    description: "Sixty-one payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.tidalTeasePayouts),
  },
  riptideRomance: {
    label: "Riptide Romance",
    color: COLOR.pairBlue,
    image: "crits/elementalWomen/riptideRomance.png",
    description: "Fifty-three upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.riptideRomanceUpgrades),
  },
  zephyrGlamour: {
    label: "Zephyr Glamour",
    color: COLOR.teal,
    image: "crits/elementalWomen/zephyrGlamour.png",
    description: "Fifty-two payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.zephyrGlamourPayouts),
  },
  galeGala: {
    label: "Gale Gala",
    color: COLOR.winterSaleIceBlue,
    image: "crits/elementalWomen/galeGala.png",
    description: "Forty-eight upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.galeGalaUpgrades),
  },
  crosswindCrush: {
    label: "Crosswind Crush",
    color: COLOR.springSalePink,
    image: "crits/elementalWomen/crosswindCrush.png",
    description: "Forty-eight upgrades here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.upgrade(hereAnd(context, highestFloor(context)), balance.crosswindCrushUpgrades),
  },
  windfallWaltz: {
    label: "Windfall Waltz",
    color: COLOR.threeOfAKindGreen,
    image: "crits/elementalWomen/windfallWaltz.png",
    description: "Seventy-one payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.windfallWaltzPayouts),
  },
  glacialGlam: {
    label: "Glacial Glam",
    color: COLOR.frozenIceBlue,
    image: "crits/elementalWomen/glacialGlam.png",
    description: "Seventy-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.glacialGlamUpgrades),
  },
  snowglobeWink: {
    label: "Snowglobe Wink",
    color: COLOR.snowdayFrost,
    image: "crits/elementalWomen/snowglobeWink.png",
    description: "Seventy-three payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.snowglobeWinkPayouts),
  },
  iceboxIdol: {
    label: "Icebox Idol",
    color: COLOR.snowballBlue,
    image: "crits/elementalWomen/iceboxIdol.png",
    description: "Sixty-six upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.iceboxIdolUpgrades),
  },
  joltValentine: {
    label: "Jolt Valentine",
    color: COLOR.purple,
    image: "crits/elementalWomen/joltValentine.png",
    description: "One tier promotion and forty-seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.joltValentineTierSteps, balance.joltValentineUpgrades),
  },
  sparkSweetheart: {
    label: "Spark Sweetheart",
    color: COLOR.sunshineGold,
    image: "crits/elementalWomen/sparkSweetheart.png",
    description: "Seventy-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles([selectByRate(context, true)], balance.sparkSweetheartPayouts),
  },
  voltageVow: {
    label: "Voltage Vow",
    color: COLOR.fourOfAKindIndigo,
    image: "crits/elementalWomen/voltageVow.png",
    description: "Seventy-one upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade([selectByRate(context, true)], balance.voltageVowUpgrades),
  },
  magmaMuse: {
    label: "Magma Muse",
    color: COLOR.red,
    image: "crits/elementalWomen/magmaMuse.png",
    description: "Thirty-seven upgrades and thirty-nine payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay([selectByRate(context, true)], balance.magmaMuseUpgrades, balance.magmaMusePayouts),
  },
  moltenMogul: {
    label: "Molten Mogul",
    color: COLOR.roundUpOrange,
    image: "crits/elementalWomen/moltenMogul.png",
    description: "Two tier promotions and twenty-three upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(selectByRate(context, true), balance.moltenMogulTierSteps, balance.moltenMogulUpgrades),
  },
  lavaLounger: {
    label: "Lava Lounger",
    color: COLOR.fireDrillRed,
    image: "crits/elementalWomen/lavaLounger.png",
    description: "Forty-one upgrades and forty-three payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay([context.floor], balance.lavaLoungerUpgrades, balance.lavaLoungerPayouts),
  },
  mossMaiden: {
    label: "Moss Maiden",
    color: COLOR.luckyCloverGreen,
    image: "crits/elementalWomen/mossMaiden.png",
    description: "Seventy-two upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.mossMaidenUpgrades),
  },
  blossomBashful: {
    label: "Blossom Bashful",
    color: COLOR.grandOpeningRose,
    image: "crits/elementalWomen/blossomBashful.png",
    description: "Seventy-one payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.blossomBashfulPayouts),
  },
  bedrockBeauty: {
    label: "Bedrock Beauty",
    color: COLOR.chairGiveawayBrown,
    image: "crits/elementalWomen/bedrockBeauty.png",
    description: "Sixty-nine upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.bedrockBeautyUpgrades),
  },
  basaltBombshell: {
    label: "Basalt Bombshell",
    color: COLOR.unionBossSlate,
    image: "crits/elementalWomen/basaltBombshell.png",
    description: "Thirty-four upgrades and thirty-six payouts on the highest unlocked floor",
    reward: (context, { balance, highestFloor, upgradeAndPay }) =>
      upgradeAndPay([highestFloor(context)], balance.basaltBombshellUpgrades, balance.basaltBombshellPayouts),
  },
  nuggetKnockout: {
    label: "Nugget Knockout",
    color: COLOR.goldStandardAmber,
    image: "crits/elementalWomen/nuggetKnockout.png",
    description: "One tier promotion and fifty-one upgrades on the highest floor",
    reward: (context, { balance, highestFloor, promoteAndUpgrade }) =>
      promoteAndUpgrade(highestFloor(context), balance.nuggetKnockoutTierSteps, balance.nuggetKnockoutUpgrades),
  },
  duneDarling: {
    label: "Dune Darling",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/elementalWomen/duneDarling.png",
    description: "Fifty-eight payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.duneDarlingPayouts),
  },
  hourglassHeiress: {
    label: "Hourglass Heiress",
    color: COLOR.mergerGold,
    image: "crits/elementalWomen/hourglassHeiress.png",
    description: "Forty-seven payouts here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.payCycles(hereAnd(context, selectByRate(context, false)), balance.hourglassHeiressPayouts),
  },
  sandsOfFortune: {
    label: "Sands of Fortune",
    color: COLOR.gold,
    image: "crits/elementalWomen/sandsOfFortune.png",
    description: "Sixty-seven upgrades on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade([selectByRate(context, false)], balance.sandsOfFortuneUpgrades),
  },
  vaporVogue: {
    label: "Vapor Vogue",
    color: COLOR.royalFlushPurple,
    image: "crits/elementalWomen/vaporVogue.png",
    description: "Seventy-two payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles([selectByRate(context, false)], balance.vaporVoguePayouts),
  },
  teatimeTease: {
    label: "Teatime Tease",
    color: COLOR.teaBreakBrown,
    image: "crits/elementalWomen/teatimeTease.png",
    description: "Forty-five upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.upgrade(hereAnd(context, selectByRate(context, false)), balance.teatimeTeaseUpgrades),
  },
  earlGreyGlamour: {
    label: "Earl Grey Glamour",
    color: COLOR.halloweenSalePurple,
    image: "crits/elementalWomen/earlGreyGlamour.png",
    description: "Forty-six payouts here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.payCycles(hereAnd(context, highestFloor(context)), balance.earlGreyGlamourPayouts),
  },
  tempestTiara: {
    label: "Tempest Tiara",
    color: COLOR.nightShiftIndigo,
    image: "crits/elementalWomen/tempestTiara.png",
    description: "Sixty-three upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.tempestTiaraUpgrades),
  },
  starlightSwoon: {
    label: "Starlight Swoon",
    color: COLOR.heavenlyGold,
    image: "crits/elementalWomen/starlightSwoon.png",
    description: "Twenty-one upgrades and twenty-three payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(context.floors, balance.starlightSwoonUpgrades, balance.starlightSwoonPayouts),
  },
  stardustSigh: {
    label: "Stardust Sigh",
    color: COLOR.starYellow,
    image: "crits/elementalWomen/stardustSigh.png",
    description: "Fifty upgrades here and on the top earner",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.upgrade(hereAnd(context, selectByRate(context, true)), balance.stardustSighUpgrades),
  },
  umbraEnchantress: {
    label: "Umbra Enchantress",
    color: COLOR.fancyFridayIndigo,
    image: "crits/elementalWomen/umbraEnchantress.png",
    description: "One tier promotion and fifty-four upgrades on the lowest-level floor",
    reward: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
      promoteAndUpgrade(lowestLevel(context), balance.umbraEnchantressTierSteps, balance.umbraEnchantressUpgrades),
  },
  nightfallNudge: {
    label: "Nightfall Nudge",
    color: COLOR.nightOwlIndigo,
    image: "crits/elementalWomen/nightfallNudge.png",
    description: "Forty-nine upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.upgrade(hereAnd(context, lowestLevel(context)), balance.nightfallNudgeUpgrades),
  },
  hoodedHush: {
    label: "Hooded Hush",
    color: COLOR.cloneArmyViolet,
    image: "crits/elementalWomen/hoodedHush.png",
    description: "Fifty payouts here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.payCycles(hereAnd(context, lowestLevel(context)), balance.hoodedHushPayouts),
  },
  smokescreenSmirk: {
    label: "Smokescreen Smirk",
    color: COLOR.silverTicketGray,
    image: "crits/elementalWomen/smokescreenSmirk.png",
    description: "Forty-eight payouts here and on the cheapest floor",
    reward: (context, { actions, balance, cheapest, hereAnd }) =>
      actions.payCycles(hereAnd(context, cheapest(context)), balance.smokescreenSmirkPayouts),
  },
  ringletRascal: {
    label: "Ringlet Rascal",
    color: COLOR.peppermintPink,
    image: "crits/elementalWomen/ringletRascal.png",
    description: "Forty-four upgrades here and on the cheapest floor",
    reward: (context, { actions, balance, cheapest, hereAnd }) =>
      actions.upgrade(hereAnd(context, cheapest(context)), balance.ringletRascalUpgrades),
  },
  ashenAllure: {
    label: "Ashen Allure",
    color: COLOR.disabledGray,
    image: "crits/elementalWomen/ashenAllure.png",
    description: "Thirty-five upgrades and thirty-seven payouts on the lowest-level floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay([lowestLevel(context)], balance.ashenAllureUpgrades, balance.ashenAllurePayouts),
  },
  geodeCoquette: {
    label: "Geode Coquette",
    color: COLOR.royalFlushPurple,
    image: "crits/elementalWomen/geodeCoquette.png",
    description: "Two tier promotions and seventeen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.geodeCoquetteTierSteps, balance.geodeCoquetteUpgrades),
  },
  amethystAllure: {
    label: "Amethyst Allure",
    color: COLOR.threeOfAKindGreen,
    image: "crits/elementalWomen/amethystAllure.png",
    description: "Thirty-eight upgrades and forty payouts on the cheapest floor",
    reward: (context, { balance, cheapest, upgradeAndPay }) =>
      upgradeAndPay([cheapest(context)], balance.amethystAllureUpgrades, balance.amethystAllurePayouts),
  },
  crystalCurtsy: {
    label: "Crystal Curtsy",
    color: COLOR.cyan,
    image: "crits/elementalWomen/crystalCurtsy.png",
    description: "Twenty-nine upgrades and thirty-one payouts on alternating floors",
    reward: (context, { alternating, balance, upgradeAndPay }) =>
      upgradeAndPay(alternating(context), balance.crystalCurtsyUpgrades, balance.crystalCurtsyPayouts),
  },
  prismPinup: {
    label: "Prism Pinup",
    color: COLOR.mysticTeal,
    image: "crits/elementalWomen/prismPinup.png",
    description: "Forty-two payouts on the top earner and forty-four upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel, selectByRate }) => {
      actions.payCycles([selectByRate(context, true)], balance.prismPinupPayouts);
      actions.upgrade([lowestLevel(context)], balance.prismPinupUpgrades);
    },
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

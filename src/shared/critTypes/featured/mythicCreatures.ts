import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MYTHIC_CREATURES_CRITS = {
  golem: {
    label: "Golem",
    color: COLOR.unionBossSlate,
    image: "crits/mythicCreatures/golem.webp",
    description:
      "Repeats the crit on the floor below, 17% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.golemContinueChance),
  },
  emberwingDragon: {
    label: "Emberwing Dragon",
    color: COLOR.red,
    image: "crits/mythicCreatures/emberwingDragon.webp",
    description: "Cuts every price in this building by 1.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.emberwingDragonDiscount),
  },
  moonlitKirin: {
    label: "Moonlit Kirin",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/moonlitKirin.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  pocketPhoenix: {
    label: "Pocket Phoenix",
    color: COLOR.sunshineGold,
    image: "crits/mythicCreatures/pocketPhoenix.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  crystalGriffin: {
    label: "Crystal Griffin",
    color: COLOR.blue,
    image: "crits/mythicCreatures/crystalGriffin.webp",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.crystalGriffinPayouts),
  },
  velvetManticore: {
    label: "Velvet Manticore",
    color: COLOR.halloweenSalePurple,
    image: "crits/mythicCreatures/velvetManticore.webp",
    description: "One tier promotion and nine upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.velvetManticoreTierSteps,
        balance.velvetManticoreUpgrades,
      ),
  },
  frostfangYeti: {
    label: "Frostfang Yeti",
    color: COLOR.frozenIceBlue,
    image: "crits/mythicCreatures/frostfangYeti.webp",
    description: "Cuts every price in this building by 1.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.frostfangYetiDiscount),
  },
  lanternKitsune: {
    label: "Lantern Kitsune",
    color: COLOR.orange,
    image: "crits/mythicCreatures/lanternKitsune.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  coralSeaSerpent: {
    label: "Coral Sea Serpent",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/coralSeaSerpent.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  clockworkMinotaur: {
    label: "Clockwork Minotaur",
    color: COLOR.gold,
    image: "crits/mythicCreatures/clockworkMinotaur.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.clockworkMinotaurFloors),
  },
  starryCerberus: {
    label: "Starry Cerberus",
    color: COLOR.nightShiftIndigo,
    image: "crits/mythicCreatures/starryCerberus.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.starryCerberusFloors),
  },
  goldenSphinx: {
    label: "Golden Sphinx",
    color: COLOR.heavenlyGold,
    image: "crits/mythicCreatures/goldenSphinx.webp",
    description: "Adds 7s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.goldenSphinxSeconds),
  },
  mossbackTreant: {
    label: "Mossback Treant",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/mossbackTreant.webp",
    description: "Five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.mossbackTreantUpgrades),
  },
  rainbowAlicorn: {
    label: "Rainbow Alicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/rainbowAlicorn.webp",
    description:
      "Repeats the crit on the floor above, 15% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.rainbowAlicornContinueChance),
  },
  bogWitchFamiliar: {
    label: "Bog Witch Familiar",
    color: COLOR.dressCodeGreen,
    image: "crits/mythicCreatures/bogWitchFamiliar.webp",
    description: "Cuts every price in this building by 1.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.bogWitchFamiliarDiscount),
  },
  pearlHippocampus: {
    label: "Pearl Hippocampus",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/pearlHippocampus.webp",
    description: "Adds 3.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pearlHippocampusShare),
  },
  thunderbirdChick: {
    label: "Thunderbird Chick",
    color: COLOR.blue,
    image: "crits/mythicCreatures/thunderbirdChick.webp",
    description: "Boosts this floor's workers for 23s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.thunderbirdChickBoostSeconds,
        balance.thunderbirdChickExtraWorkers,
      ),
  },
  obsidianBasilisk: {
    label: "Obsidian Basilisk",
    color: COLOR.fullHouseCrimson,
    image: "crits/mythicCreatures/obsidianBasilisk.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  cloudNymph: {
    label: "Cloud Nymph",
    color: COLOR.winterSaleIceBlue,
    image: "crits/mythicCreatures/cloudNymph.webp",
    description: "Five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cloudNymphPayouts),
  },
  glassWyvern: {
    label: "Glass Wyvern",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/glassWyvern.webp",
    description: "Thirty payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.glassWyvernPayouts,
      ),
  },
  mossbackManticore: {
    label: "Mossback Manticore",
    color: COLOR.dressCodeGreen,
    image: "crits/mythicCreatures/mossbackManticore.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.mossbackManticoreWorkers),
  },
  emberwingDragon2: {
    label: "Emberwing Dragon Hoard",
    color: COLOR.gold,
    image: "crits/mythicCreatures/emberwingDragon2.webp",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emberwingDragon2Payouts),
  },
  alicorn: {
    label: "Aurora Alicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/alicorn.webp",
    description: "Cuts every price in this building by 4.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.alicornDiscount),
  },
  alicorn2: {
    label: "Starfall Alicorn",
    color: COLOR.starYellow,
    image: "crits/mythicCreatures/alicorn2.webp",
    description: "Cuts every price in this building by 11.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.alicorn2Discount),
  },
  crystallineDragon: {
    label: "Crystalheart Dragon",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/crystallineDragon.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.crystallineDragonWorkers);
      actions.hireManagers(context.floors);
    },
  },
  dragonWithEgg: {
    label: "Dragon's Nest Egg",
    color: COLOR.gold,
    image: "crits/mythicCreatures/dragonWithEgg.webp",
    description: "Two tier promotions and twenty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.dragonWithEggTierSteps,
        balance.dragonWithEggUpgrades,
      ),
  },
  griffin: {
    label: "Skyvault Griffin",
    color: COLOR.blue,
    image: "crits/mythicCreatures/griffin.webp",
    description: "Adds 49s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.griffinSeconds),
  },
  hippocampus: {
    label: "Pearlwater Hippocampus",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/hippocampus.webp",
    description: "Adds 12.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hippocampusShare),
  },
  hydra: {
    label: "Hydra Headcount",
    color: COLOR.red,
    image: "crits/mythicCreatures/hydra.webp",
    description: "Cuts every price in this building by 7.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.hydraDiscount),
  },
  kirin: {
    label: "Cloudbell Kirin",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/kirin.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  kitsune: {
    label: "Nine-Tail Fortune",
    color: COLOR.orange,
    image: "crits/mythicCreatures/kitsune.webp",
    description: "Adds 29s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.kitsuneSeconds),
  },
  manticore: {
    label: "Sunmane Manticore",
    color: COLOR.sunshineGold,
    image: "crits/mythicCreatures/manticore.webp",
    description: "Forty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.manticoreUpgrades),
  },
  manticore2: {
    label: "Stormtail Manticore",
    color: COLOR.blue,
    image: "crits/mythicCreatures/manticore2.webp",
    description:
      "Repeats the crit above and below, 41% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.manticore2ContinueChance),
  },
  manticore3: {
    label: "Goldclaw Manticore",
    color: COLOR.heavenlyGold,
    image: "crits/mythicCreatures/manticore3.webp",
    description: "Adds 60% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.manticore3Share),
  },
  pegasus: {
    label: "Cloudrunner Pegasus",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/pegasus.webp",
    description: "Free office supplies for every unlocked floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies(context.floors),
  },
  phoneix: {
    label: "Ember Rebirth",
    color: COLOR.redActive,
    image: "crits/mythicCreatures/phoneix.webp",
    description: "Forty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.phoneixPayouts),
  },
  puppyPosey: {
    label: "Posey's Mythic Paws",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/puppyPosey.webp",
    description:
      "Repeats the crit above and below, 90% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.puppyPoseyContinueChance),
  },
  salamander: {
    label: "Ember Salamander",
    color: COLOR.orange,
    image: "crits/mythicCreatures/salamander.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.salamanderWorkers),
  },
  salamander2: {
    label: "Cinder Salamander",
    color: COLOR.red,
    image: "crits/mythicCreatures/salamander2.webp",
    description: "Raises alternating floors to the building's top level",
    reward: (context, { actions, alternating, topLevel }) =>
      actions.raiseLevels(alternating(context), topLevel(context)),
  },
  salamander3: {
    label: "Molten Salamander",
    color: COLOR.gold,
    image: "crits/mythicCreatures/salamander3.webp",
    description: "Forty-five payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.salamander3Payouts,
      ),
  },
  seaSerpet: {
    label: "Abyssal Sea Serpent",
    color: COLOR.blue,
    image: "crits/mythicCreatures/seaSerpet.webp",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.seaSerpetUpgrades),
  },
  thunderbird: {
    label: "Thunderbird's Roar",
    color: COLOR.starYellow,
    image: "crits/mythicCreatures/thunderbird.webp",
    description: "Boosts every worker for 69s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.thunderbirdBoostSeconds,
        balance.thunderbirdExtraWorkers,
      ),
  },
  treant: {
    label: "Rootbound Treant",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/treant.webp",
    description:
      "Repeats the crit on the floor above, 60% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.treantContinueChance),
  },
  unicorn: {
    label: "Starlit Unicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/unicorn.webp",
    description: "Thirty-six payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.unicornPayouts),
  },
  velvetManticore2: {
    label: "Velvet Manticore's Charm",
    color: COLOR.halloweenSalePurple,
    image: "crits/mythicCreatures/velvetManticore2.webp",
    description: "Two tier promotions and twenty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.velvetManticore2TierSteps,
        balance.velvetManticore2Upgrades,
      ),
  },
  velvetManticore3: {
    label: "Velvet Manticore's Fortune",
    color: COLOR.purple,
    image: "crits/mythicCreatures/velvetManticore3.webp",
    description: "Adds 169s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.velvetManticore3Seconds),
  },
  mewtwo: {
    label: "Mewtwo",
    color: COLOR.disabledGray,
    image: "crits/mythicCreatures/mewtwo.webp",
    description: "Spreads 92 free upgrades over the lowest-level floors",
    reward: (context, { actions, balance }) =>
      actions.spreadUpgrades(context.floors, balance.mewtwoUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

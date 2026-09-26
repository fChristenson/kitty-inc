import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const MYTHIC_CREATURES_CRITS = {
  golem: {
    label: "Golem",
    color: COLOR.unionBossSlate,
    image: "crits/mythicCreatures/golem.png",
    description: "Thirty-five free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.golemUpgrades),
  },
  emberwingDragon: {
    label: "Emberwing Dragon",
    color: COLOR.red,
    image: "crits/mythicCreatures/emberwingDragon.png",
    description: "Eighteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.emberwingDragonUpgrades),
  },
  moonlitKirin: {
    label: "Moonlit Kirin",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/moonlitKirin.png",
    description: "Ten payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moonlitKirinPayouts,
      ),
  },
  pocketPhoenix: {
    label: "Pocket Phoenix",
    color: COLOR.sunshineGold,
    image: "crits/mythicCreatures/pocketPhoenix.png",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.pocketPhoenixUpgrades),
  },
  crystalGriffin: {
    label: "Crystal Griffin",
    color: COLOR.blue,
    image: "crits/mythicCreatures/crystalGriffin.png",
    description: "Eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.crystalGriffinPayouts),
  },
  velvetManticore: {
    label: "Velvet Manticore",
    color: COLOR.halloweenSalePurple,
    image: "crits/mythicCreatures/velvetManticore.png",
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
    image: "crits/mythicCreatures/frostfangYeti.png",
    description: "Eleven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.frostfangYetiUpgrades),
  },
  lanternKitsune: {
    label: "Lantern Kitsune",
    color: COLOR.orange,
    image: "crits/mythicCreatures/lanternKitsune.png",
    description: "Six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lanternKitsunePayouts),
  },
  coralSeaSerpent: {
    label: "Coral Sea Serpent",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/coralSeaSerpent.png",
    description: "Twelve payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.coralSeaSerpentPayouts),
  },
  clockworkMinotaur: {
    label: "Clockwork Minotaur",
    color: COLOR.gold,
    image: "crits/mythicCreatures/clockworkMinotaur.png",
    description: "Thirteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.clockworkMinotaurUpgrades),
  },
  starryCerberus: {
    label: "Starry Cerberus",
    color: COLOR.nightShiftIndigo,
    image: "crits/mythicCreatures/starryCerberus.png",
    description: "Eight free upgrades on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.starryCerberusUpgrades),
  },
  goldenSphinx: {
    label: "Golden Sphinx",
    color: COLOR.heavenlyGold,
    image: "crits/mythicCreatures/goldenSphinx.png",
    description: "Ten free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.goldenSphinxUpgrades),
  },
  mossbackTreant: {
    label: "Mossback Treant",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/mossbackTreant.png",
    description: "Five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.mossbackTreantUpgrades),
  },
  rainbowAlicorn: {
    label: "Rainbow Alicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/rainbowAlicorn.png",
    description: "Nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.rainbowAlicornPayouts,
      ),
  },
  bogWitchFamiliar: {
    label: "Bog Witch Familiar",
    color: COLOR.dressCodeGreen,
    image: "crits/mythicCreatures/bogWitchFamiliar.png",
    description: "Six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bogWitchFamiliarUpgrades),
  },
  pearlHippocampus: {
    label: "Pearl Hippocampus",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/pearlHippocampus.png",
    description: "Seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pearlHippocampusPayouts),
  },
  thunderbirdChick: {
    label: "Thunderbird Chick",
    color: COLOR.blue,
    image: "crits/mythicCreatures/thunderbirdChick.png",
    description: "Nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.thunderbirdChickUpgrades),
  },
  obsidianBasilisk: {
    label: "Obsidian Basilisk",
    color: COLOR.fullHouseCrimson,
    image: "crits/mythicCreatures/obsidianBasilisk.png",
    description: "Twenty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.obsidianBasiliskUpgrades),
  },
  cloudNymph: {
    label: "Cloud Nymph",
    color: COLOR.winterSaleIceBlue,
    image: "crits/mythicCreatures/cloudNymph.png",
    description: "Five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cloudNymphPayouts),
  },
  glassWyvern: {
    label: "Glass Wyvern",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/glassWyvern.png",
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
    image: "crits/mythicCreatures/mossbackManticore.png",
    description: "Thirty payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.mossbackManticorePayouts),
  },
  emberwingDragon2: {
    label: "Emberwing Dragon Hoard",
    color: COLOR.gold,
    image: "crits/mythicCreatures/emberwingDragon2.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.emberwingDragon2Payouts),
  },
  alicorn: {
    label: "Aurora Alicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/alicorn.png",
    description: "Thirty-six payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles([selectByRate(context, true)], balance.alicornPayouts),
  },
  alicorn2: {
    label: "Starfall Alicorn",
    color: COLOR.starYellow,
    image: "crits/mythicCreatures/alicorn2.png",
    description: "Forty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.alicorn2Upgrades),
  },
  crystallineDragon: {
    label: "Crystalheart Dragon",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/crystallineDragon.png",
    description: "Forty-seven free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.crystallineDragonUpgrades),
  },
  dragonWithEgg: {
    label: "Dragon's Nest Egg",
    color: COLOR.gold,
    image: "crits/mythicCreatures/dragonWithEgg.png",
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
    image: "crits/mythicCreatures/griffin.png",
    description: "Forty payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.griffinPayouts),
  },
  hippocampus: {
    label: "Pearlwater Hippocampus",
    color: COLOR.silverTicketGray,
    image: "crits/mythicCreatures/hippocampus.png",
    description: "Thirty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.hippocampusPayouts),
  },
  hydra: {
    label: "Hydra Headcount",
    color: COLOR.red,
    image: "crits/mythicCreatures/hydra.png",
    description: "Forty-four free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.hydraUpgrades),
  },
  kirin: {
    label: "Cloudbell Kirin",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/kirin.png",
    description: "Thirty-seven upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.kirinUpgrades),
  },
  kitsune: {
    label: "Nine-Tail Fortune",
    color: COLOR.orange,
    image: "crits/mythicCreatures/kitsune.png",
    description: "Forty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.kitsunePayouts),
  },
  manticore: {
    label: "Sunmane Manticore",
    color: COLOR.sunshineGold,
    image: "crits/mythicCreatures/manticore.png",
    description: "Forty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.manticoreUpgrades),
  },
  manticore2: {
    label: "Stormtail Manticore",
    color: COLOR.blue,
    image: "crits/mythicCreatures/manticore2.png",
    description: "Thirty-nine payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.manticore2Payouts),
  },
  manticore3: {
    label: "Goldclaw Manticore",
    color: COLOR.heavenlyGold,
    image: "crits/mythicCreatures/manticore3.png",
    description: "Forty-six upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.manticore3Upgrades),
  },
  pegasus: {
    label: "Cloudrunner Pegasus",
    color: COLOR.cyan,
    image: "crits/mythicCreatures/pegasus.png",
    description: "Thirty-five free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.pegasusUpgrades),
  },
  phoneix: {
    label: "Ember Rebirth",
    color: COLOR.redActive,
    image: "crits/mythicCreatures/phoneix.png",
    description: "Forty-one instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.phoneixPayouts),
  },
  puppyPosey: {
    label: "Posey's Mythic Paws",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/puppyPosey.png",
    description: "Forty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.puppyPoseyUpgrades),
  },
  salamander: {
    label: "Ember Salamander",
    color: COLOR.orange,
    image: "crits/mythicCreatures/salamander.png",
    description: "Thirty-four payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.salamanderPayouts),
  },
  salamander2: {
    label: "Cinder Salamander",
    color: COLOR.red,
    image: "crits/mythicCreatures/salamander2.png",
    description: "Forty-two free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.salamander2Upgrades),
  },
  salamander3: {
    label: "Molten Salamander",
    color: COLOR.gold,
    image: "crits/mythicCreatures/salamander3.png",
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
    image: "crits/mythicCreatures/seaSerpet.png",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.seaSerpetUpgrades),
  },
  thunderbird: {
    label: "Thunderbird's Roar",
    color: COLOR.starYellow,
    image: "crits/mythicCreatures/thunderbird.png",
    description: "Forty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.thunderbirdPayouts),
  },
  treant: {
    label: "Rootbound Treant",
    color: COLOR.moneyGreen,
    image: "crits/mythicCreatures/treant.png",
    description: "Forty upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.treantUpgrades),
  },
  unicorn: {
    label: "Starlit Unicorn",
    color: COLOR.peppermintPink,
    image: "crits/mythicCreatures/unicorn.png",
    description: "Thirty-six payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.unicornPayouts),
  },
  velvetManticore2: {
    label: "Velvet Manticore's Charm",
    color: COLOR.halloweenSalePurple,
    image: "crits/mythicCreatures/velvetManticore2.png",
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
    image: "crits/mythicCreatures/velvetManticore3.png",
    description: "Forty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.velvetManticore3Upgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;

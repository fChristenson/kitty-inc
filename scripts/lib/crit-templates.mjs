// Reward templates for new featured crits, one list per effect group
// (docs/critEffectGroups.md). Each template is a reward the game already
// supports: its reward code, description, balance keys and the amounts it
// starts from in each magnitude tier (T1 smallest .. T6 biggest). The same
// templates recognise existing crits, so new ones are ordered against them.

const ONES =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(
    " ",
  );
const TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(
  " ",
);
export function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100)
    return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${numberWords(rest)}` : ""}`;
}
const Words = (n) => numberWords(n)[0].toUpperCase() + numberWords(n).slice(1);
export const percent = (value) => `${Number((value * 100).toFixed(1))}%`;

const NUMBER_WORD = new RegExp(
  `\\b(${[...ONES, ...TENS.filter(Boolean), "hundred"].join("|")})(-(${ONES.slice(1, 10).join("|")}))?\\b`,
  "gi",
);
// a description with its amounts blanked, so every tier of a template matches
export const descriptionPattern = (text) =>
  text.replace(NUMBER_WORD, "#").replace(/\d+(\.\d+)?/g, "#");
export const normalizeSource = (source) =>
  source
    .replace(/\s+/g, "")
    .replace(/,([)}\]])/g, "$1")
    .replace(/'/g, '"');

const call = (params, body) => `(${params}) =>\n      ${body}`;
const block = (params, lines) =>
  `(${params}) => {\n${lines.map((line) => `      ${line};`).join("\n")}\n    }`;

// steps: how far a balance amount may be nudged to stay distinct from
// same-template crits; 0 keeps it fixed. max: the highest a nudged amount may go
const template = (
  id,
  group,
  { tiers, steps = {}, max = {}, description, reward, size },
) => ({
  id,
  group,
  tiers,
  steps,
  max,
  description,
  reward,
  size:
    size ??
    ((params) => Object.values(params).reduce((sum, value) => sum + value, 0)),
});
const fixed = (id, group, tier, description, reward) =>
  template(id, group, {
    tiers: { [tier]: {} },
    description: () => description,
    reward: () => reward,
  });

export const TEMPLATES = [
  // 3 Income multiples and refunds
  template("incomeShare", "income", {
    tiers: {
      1: { Share: 0.03 },
      2: { Share: 0.05 },
      3: { Share: 0.1 },
      4: { Share: 0.2 },
      5: { Share: 0.35 },
      6: { Share: 0.6 },
    },
    steps: { Share: 0.001 },
    description: (p) => `Adds ${percent(p.Share)} of your total income`,
    reward: (k) =>
      call(
        "_context, { actions, balance }",
        `actions.addIncomeShare(balance.${k}Share)`,
      ),
  }),
  template("incomeSeconds", "income", {
    tiers: {
      1: { Seconds: 5 },
      2: { Seconds: 10 },
      3: { Seconds: 20 },
      4: { Seconds: 40 },
      5: { Seconds: 75 },
      6: { Seconds: 150 },
    },
    steps: { Seconds: 1 },
    description: (p) => `Adds ${p.Seconds}s of your company's income`,
    reward: (k) =>
      call(
        "_context, { actions, balance }",
        `actions.addIncomeSeconds(balance.${k}Seconds)`,
      ),
  }),
  // 10 Price effects
  template("discountAll", "prices", {
    tiers: {
      1: { Discount: 0.01 },
      2: { Discount: 0.02 },
      3: { Discount: 0.04 },
      4: { Discount: 0.06 },
      5: { Discount: 0.1 },
      6: { Discount: 0.15 },
    },
    steps: { Discount: 0.001 },
    description: (p) =>
      `Cuts every price in this building by ${percent(p.Discount)}`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.discountPrices(context.floors, balance.${k}Discount)`,
      ),
  }),
  // 7 Unlocks
  template("unlockOne", "unlocks", {
    tiers: { 3: { Floors: 1 } },
    description: () => "Unlocks the next floor for free",
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.unlockFloors(context, balance.${k}Floors)`,
      ),
  }),
  template("unlockMany", "unlocks", {
    tiers: { 4: { Floors: 2 }, 5: { Floors: 3 }, 6: { Floors: 5 } },
    description: (p) => `Unlocks the next ${p.Floors} floors for free`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.unlockFloors(context, balance.${k}Floors)`,
      ),
  }),
  // 5 Crit repeats and walks
  ...[
    [
      "repeatUp",
      "up",
      "Repeats the crit on the floor above, # chance to keep climbing",
      { 1: 0.1, 2: 0.25, 3: 0.5, 5: 0.62, 6: 0.8 },
    ],
    [
      "repeatDown",
      "down",
      "Repeats the crit on the floor below, # chance to keep falling",
      { 1: 0.1, 2: 0.25, 3: 0.5, 5: 0.62, 6: 0.8 },
    ],
    [
      "repeatBoth",
      "both",
      "Repeats the crit above and below, # chance to keep spreading",
      { 4: 0.4, 5: 0.6, 6: 0.8 },
    ],
  ].map(([id, direction, text, tiers]) =>
    template(id, "repeats", {
      tiers: Object.fromEntries(
        Object.entries(tiers).map(([tier, value]) => [
          tier,
          { ContinueChance: value },
        ]),
      ),
      steps: { ContinueChance: 0.01 },
      max: { ContinueChance: 0.95 },
      description: (p) => text.replace("#", percent(p.ContinueChance)),
      reward: (k) =>
        call(
          "context, { actions, balance }",
          `actions.repeatCrit(context, "${direction}", balance.${k}ContinueChance)`,
        ),
    }),
  ),
  // 9 Worker boosts and speed
  template("boostHere", "boosts", {
    tiers: { 1: { BoostSeconds: 20, ExtraWorkers: 0 } },
    steps: { BoostSeconds: 1 },
    description: (p) => `Boosts this floor's workers for ${p.BoostSeconds}s`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.boostWorkers([context.floor], balance.${k}BoostSeconds, balance.${k}ExtraWorkers)`,
      ),
  }),
  template("boostAll", "boosts", {
    tiers: {
      2: { BoostSeconds: 15, ExtraWorkers: 0 },
      3: { BoostSeconds: 30, ExtraWorkers: 0 },
    },
    steps: { BoostSeconds: 1 },
    description: (p) => `Boosts every worker for ${p.BoostSeconds}s`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.boostWorkers(context.floors, balance.${k}BoostSeconds, balance.${k}ExtraWorkers)`,
      ),
  }),
  template("boostAllExtraWorker", "boosts", {
    tiers: { 4: { BoostSeconds: 45, ExtraWorkers: 1 } },
    steps: { BoostSeconds: 1 },
    description: (p) =>
      `Boosts every worker for ${p.BoostSeconds}s, counting as 1 extra worker`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.boostWorkers(context.floors, balance.${k}BoostSeconds, balance.${k}ExtraWorkers)`,
      ),
  }),
  template("boostAllExtraWorkers", "boosts", {
    tiers: {
      5: { BoostSeconds: 60, ExtraWorkers: 2 },
      6: { BoostSeconds: 120, ExtraWorkers: 3 },
    },
    steps: { BoostSeconds: 1 },
    description: (p) =>
      `Boosts every worker for ${p.BoostSeconds}s, counting as ${p.ExtraWorkers} extra workers`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.boostWorkers(context.floors, balance.${k}BoostSeconds, balance.${k}ExtraWorkers)`,
      ),
  }),
  // 8 Staffing and office items
  template("hireWorkerHere", "staffing", {
    tiers: { 1: { Workers: 1 } },
    description: () => "Hires 1 free worker on this floor",
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.hireWorkers([context.floor], balance.${k}Workers)`,
      ),
  }),
  template("hireWorkersHere", "staffing", {
    tiers: { 2: { Workers: 2 } },
    description: (p) => `Hires ${p.Workers} free workers on this floor`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.hireWorkers([context.floor], balance.${k}Workers)`,
      ),
  }),
  fixed(
    "chairsHere",
    "staffing",
    1,
    "Free office chairs for this floor",
    call("context, { actions }", "actions.giveOfficeChairs([context.floor])"),
  ),
  fixed(
    "suppliesHere",
    "staffing",
    1,
    "Free office supplies for this floor",
    call("context, { actions }", "actions.giveOfficeSupplies([context.floor])"),
  ),
  fixed(
    "chairsAndSuppliesHere",
    "staffing",
    2,
    "Free office chairs and supplies for this floor",
    block("context, { actions }", [
      "actions.giveOfficeChairs([context.floor])",
      "actions.giveOfficeSupplies([context.floor])",
    ]),
  ),
  fixed(
    "managerHere",
    "staffing",
    2,
    "Hires a free manager for this floor",
    call("context, { actions }", "actions.hireManagers([context.floor])"),
  ),
  template("hireWorkerAlternating", "staffing", {
    tiers: { 3: { Workers: 1 } },
    description: () => "Hires 1 free worker on alternating floors",
    reward: (k) =>
      call(
        "context, { actions, balance, alternating }",
        `actions.hireWorkers(alternating(context), balance.${k}Workers)`,
      ),
  }),
  fixed(
    "chairsAll",
    "staffing",
    3,
    "Free office chairs for every unlocked floor",
    call("context, { actions }", "actions.giveOfficeChairs(context.floors)"),
  ),
  fixed(
    "suppliesAll",
    "staffing",
    3,
    "Free office supplies for every unlocked floor",
    call("context, { actions }", "actions.giveOfficeSupplies(context.floors)"),
  ),
  fixed(
    "managersAlternating",
    "staffing",
    4,
    "Hires a free manager on alternating floors",
    call(
      "context, { actions, alternating }",
      "actions.hireManagers(alternating(context))",
    ),
  ),
  template("hireWorkerAll", "staffing", {
    tiers: { 4: { Workers: 1 } },
    description: () => "Hires 1 free worker on every unlocked floor",
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.hireWorkers(context.floors, balance.${k}Workers)`,
      ),
  }),
  template("hireWorkersAndManagersAll", "staffing", {
    tiers: { 5: { Workers: 2 }, 6: { Workers: 3 } },
    description: (p) =>
      `Hires ${p.Workers} free workers and a manager on every unlocked floor`,
    reward: (k) =>
      block("context, { actions, balance }", [
        `actions.hireWorkers(context.floors, balance.${k}Workers)`,
        "actions.hireManagers(context.floors)",
      ]),
  }),
  // 6 Guaranteed next crit
  fixed(
    "armHere",
    "nextCrit",
    1,
    "Arms this floor's next click as an x5 crit",
    call("context, { actions }", 'actions.armCrit([context.floor], "crit")'),
  ),
  fixed(
    "armHighest",
    "nextCrit",
    2,
    "Arms the highest floor's next click as an x5 crit",
    call(
      "context, { actions, highestFloor }",
      'actions.armCrit([highestFloor(context)], "crit")',
    ),
  ),
  fixed(
    "armLowest",
    "nextCrit",
    2,
    "Arms the lowest-level floor's next click as an x5 crit",
    call(
      "context, { actions, lowestLevel }",
      'actions.armCrit([lowestLevel(context)], "crit")',
    ),
  ),
  fixed(
    "armHereMega",
    "nextCrit",
    3,
    "Arms this floor's next click as an x25 crit",
    call("context, { actions }", 'actions.armCrit([context.floor], "mega")'),
  ),
  fixed(
    "armAll",
    "nextCrit",
    4,
    "Arms every floor's next click as an x5 crit",
    call("context, { actions }", 'actions.armCrit(context.floors, "crit")'),
  ),
  // 11 Level sharing and copying
  fixed(
    "lowestToHalfTop",
    "levels",
    2,
    "Raises the lowest-level floor to half the building's top level",
    call(
      "context, { actions, lowestLevel, topLevel }",
      "actions.raiseLevels([lowestLevel(context)], Math.floor(topLevel(context) / 2))",
    ),
  ),
  fixed(
    "lowestToTop",
    "levels",
    3,
    "Raises the lowest-level floor to the building's top level",
    call(
      "context, { actions, lowestLevel, topLevel }",
      "actions.raiseLevels([lowestLevel(context)], topLevel(context))",
    ),
  ),
  fixed(
    "belowToHere",
    "levels",
    4,
    "Raises every floor below this one to its level",
    call(
      "context, { actions, belowAndHere }",
      "actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount)",
    ),
  ),
  fixed(
    "alternatingToTop",
    "levels",
    5,
    "Raises alternating floors to the building's top level",
    call(
      "context, { actions, alternating, topLevel }",
      "actions.raiseLevels(alternating(context), topLevel(context))",
    ),
  ),
  // 12 Event triggers
  fixed(
    "freezeHere",
    "events",
    1,
    "Locks this floor's upgrade price for 5s",
    call(
      "context, { actions }",
      'actions.startEvent([context.floor], "frozen")',
    ),
  ),
  fixed(
    "freezeAll",
    "events",
    3,
    "Locks every floor's upgrade price for 5s",
    call(
      "context, { actions }",
      'actions.startEvent(context.floors, "spendingFreeze")',
    ),
  ),
  // 4 Permanent tier promotion
  template("promoteHere", "promotion", {
    tiers: {
      1: { TierSteps: 1, Upgrades: 6 },
      2: { TierSteps: 1, Upgrades: 14 },
      3: { TierSteps: 1, Upgrades: 17 },
    },
    steps: { Upgrades: 1 },
    description: (p) =>
      `One tier promotion and ${numberWords(p.Upgrades)} upgrades here`,
    reward: (k) =>
      call(
        "context, { balance, promoteAndUpgrade }",
        `promoteAndUpgrade(context.floor, balance.${k}TierSteps, balance.${k}Upgrades)`,
      ),
    size: (p) => p.TierSteps * 1000 + p.Upgrades,
  }),
  template("promoteHereTwice", "promotion", {
    tiers: {
      5: { TierSteps: 2, Upgrades: 20 },
      6: { TierSteps: 2, Upgrades: 30 },
    },
    steps: { Upgrades: 1 },
    description: (p) =>
      `Two tier promotions and ${numberWords(p.Upgrades)} upgrades here`,
    reward: (k) =>
      call(
        "context, { balance, promoteAndUpgrade }",
        `promoteAndUpgrade(context.floor, balance.${k}TierSteps, balance.${k}Upgrades)`,
      ),
    size: (p) => p.TierSteps * 1000 + p.Upgrades,
  }),
  template("promoteLowest", "promotion", {
    tiers: { 3: { TierSteps: 1, Upgrades: 10 } },
    steps: { Upgrades: 1 },
    description: (p) =>
      `One tier promotion and ${numberWords(p.Upgrades)} upgrades on the lowest-level floor`,
    reward: (k) =>
      call(
        "context, { balance, promoteAndUpgrade, lowestLevel }",
        `promoteAndUpgrade(lowestLevel(context), balance.${k}TierSteps, balance.${k}Upgrades)`,
      ),
    size: (p) => p.TierSteps * 1000 + p.Upgrades,
  }),
  // 1 Free upgrades (already at its share; only when nothing else fits)
  // 13 Upgrade-price cash
  template("priceCashHere", "priceCash", {
    tiers: {
      1: { Multiple: 3 },
      2: { Multiple: 6 },
      3: { Multiple: 12 },
      4: { Multiple: 25 },
      5: { Multiple: 50 },
      6: { Multiple: 100 },
    },
    steps: { Multiple: 1 },
    description: (p) =>
      `Pays ${p.Multiple} times this floor's upgrade price in cash`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.addUpgradePriceCash([context.floor], balance.${k}Multiple)`,
      ),
  }),
  template("priceCashTop", "priceCash", {
    tiers: {
      2: { Multiple: 4 },
      3: { Multiple: 8 },
      4: { Multiple: 15 },
      5: { Multiple: 30 },
      6: { Multiple: 60 },
    },
    steps: { Multiple: 1 },
    description: (p) =>
      `Pays ${p.Multiple} times the highest floor's upgrade price in cash`,
    reward: (k) =>
      call(
        "context, { actions, balance, highestFloor }",
        `actions.addUpgradePriceCash([highestFloor(context)], balance.${k}Multiple)`,
      ),
  }),
  template("priceCashAll", "priceCash", {
    tiers: {
      3: { Multiple: 2 },
      4: { Multiple: 4 },
      5: { Multiple: 8 },
      6: { Multiple: 15 },
    },
    steps: { Multiple: 1 },
    description: (p) =>
      `Pays ${p.Multiple} times every unlocked floor's upgrade price in cash`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.addUpgradePriceCash(context.floors, balance.${k}Multiple)`,
      ),
  }),
  // 14 Level growth
  template("growHere", "growth", {
    tiers: {
      1: { Growth: 0.03 },
      2: { Growth: 0.05 },
      3: { Growth: 0.08 },
      4: { Growth: 0.12 },
      5: { Growth: 0.18 },
      6: { Growth: 0.25 },
    },
    steps: { Growth: 0.001 },
    description: (p) =>
      `Grows this floor's level by ${percent(p.Growth)} in free upgrades`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.growLevels([context.floor], balance.${k}Growth)`,
      ),
  }),
  template("growAll", "growth", {
    tiers: {
      3: { Growth: 0.02 },
      4: { Growth: 0.04 },
      5: { Growth: 0.06 },
      6: { Growth: 0.1 },
    },
    steps: { Growth: 0.001 },
    description: (p) =>
      `Grows every unlocked floor's level by ${percent(p.Growth)} in free upgrades`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.growLevels(context.floors, balance.${k}Growth)`,
      ),
  }),
  // 15 Spread upgrades
  template("spreadLowest", "spread", {
    tiers: {
      1: { Upgrades: 10 },
      2: { Upgrades: 20 },
      3: { Upgrades: 35 },
      4: { Upgrades: 55 },
      5: { Upgrades: 80 },
      6: { Upgrades: 120 },
    },
    steps: { Upgrades: 1 },
    description: (p) =>
      `Spreads ${p.Upgrades} free upgrades over the lowest-level floors`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.spreadUpgrades(context.floors, balance.${k}Upgrades)`,
      ),
  }),
  template("spreadBelow", "spread", {
    tiers: {
      2: { Upgrades: 15 },
      3: { Upgrades: 30 },
      4: { Upgrades: 50 },
      5: { Upgrades: 75 },
    },
    steps: { Upgrades: 1 },
    description: (p) =>
      `Spreads ${p.Upgrades} free upgrades over this floor and the ones below`,
    reward: (k) =>
      call(
        "context, { actions, balance, belowAndHere }",
        `actions.spreadUpgrades(belowAndHere(context), balance.${k}Upgrades)`,
      ),
  }),
  // 1 Free upgrades (already at its share; only when nothing else fits)
  template("upgradeHere", "upgrades", {
    tiers: {
      1: { Upgrades: 7 },
      2: { Upgrades: 15 },
      3: { Upgrades: 24 },
      4: { Upgrades: 38 },
    },
    steps: { Upgrades: 1 },
    description: (p) => `${Words(p.Upgrades)} free upgrades on this floor`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.upgrade([context.floor], balance.${k}Upgrades)`,
      ),
  }),
  template("upgradeLowest", "upgrades", {
    tiers: { 1: { Upgrades: 8 } },
    steps: { Upgrades: 1 },
    description: (p) =>
      `${Words(p.Upgrades)} free upgrades on the lowest-level floor`,
    reward: (k) =>
      call(
        "context, { actions, balance, lowestLevel }",
        `actions.upgrade([lowestLevel(context)], balance.${k}Upgrades)`,
      ),
  }),
  // 2 Payouts (already at its share; only when nothing else fits)
  template("payHere", "payouts", {
    tiers: {
      1: { Payouts: 7 },
      2: { Payouts: 30 },
      3: { Payouts: 50 },
      4: { Payouts: 80 },
    },
    steps: { Payouts: 1 },
    description: (p) => `${Words(p.Payouts)} instant payouts on this floor`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.payCycles([context.floor], balance.${k}Payouts)`,
      ),
  }),
  template("payAll", "payouts", {
    tiers: { 2: { Payouts: 8 } },
    steps: { Payouts: 1 },
    description: (p) =>
      `${Words(p.Payouts)} instant payouts on every unlocked floor`,
    reward: (k) =>
      call(
        "context, { actions, balance }",
        `actions.payCycles(context.floors, balance.${k}Payouts)`,
      ),
  }),
];

const firstParams = (t) => t.tiers[Object.keys(t.tiers)[0]];
export function matchTemplate(kind, source, description) {
  const code = normalizeSource(source);
  const pattern = descriptionPattern(description);
  return TEMPLATES.find(
    (t) =>
      normalizeSource(t.reward(kind)) === code &&
      descriptionPattern(t.description(firstParams(t))) === pattern,
  );
}
export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
export const offeredTiers = (templates) =>
  [
    ...new Set(templates.flatMap((t) => Object.keys(t.tiers).map(Number))),
  ].sort();

// The featured crits as data: effect group, reward template, size and chance
// of each, plus each effect group's target share (GROUPS). Used by
// scripts/new-crits.mjs to give each new crit a unique, balanced effect, and
// by lib/crit-odds.mjs to set every chance so no group dominates.
import { createServer } from "vite";
import { TEMPLATES, matchTemplate } from "./crit-templates.mjs";

// [id, label, target % of featured crits, reward-source test]; checked in
// order, so the specific action groups come before the upgrade/payout catch-alls
export const GROUPS = [
  ["events", "Event triggers", 3, /actions\.startEvent/],
  ["levels", "Level sharing and copying", 7, /actions\.raiseLevels/],
  ["nextCrit", "Guaranteed next crit", 3, /actions\.armCrit/],
  ["prices", "Price effects", 8, /actions\.discountPrices/],
  ["boosts", "Worker boosts and speed", 9, /actions\.boostWorkers/],
  [
    "staffing",
    "Staffing and office items",
    9,
    /actions\.(hireWorkers|hireManagers|giveOfficeChairs|giveOfficeSupplies)/,
  ],
  ["unlocks", "Unlocks", 7, /actions\.unlockFloors/],
  ["workerTiers", "Worker perma tiers", 5, /actions\.raiseWorkerTiers/],
  ["repeats", "Crit repeats and walks", 9, /actions\.repeatCrit|cascade/i],
  [
    "promotion",
    "Permanent tier promotion",
    9,
    /promote|TierSteps|nextCritTier/,
  ],
  ["income", "Income multiples and refunds", 8, /actions\.addIncome/],
  ["priceCash", "Upgrade-price cash", 4, /actions\.addUpgradePriceCash/],
  ["growth", "Level growth", 4, /actions\.growLevels/],
  ["spread", "Spread upgrades", 4, /actions\.spreadUpgrades/],
  ["payouts", "Payouts", 12, /payCycles|Payouts/],
  ["upgrades", "Free upgrades", 12, /./],
].map(([id, label, target, test]) => ({ id, label, target, test }));

// chance at the top of each magnitude tier (T1 smallest reward, T6 biggest);
// a tier's band runs from its top halfway down to the next tier's
export const TIER_CHANCES = [
  0.012924, 0.01077, 0.008616, 0.006462, 0.004308, 0.002154,
];
// T6 bottoms out halfway to Heavenly's scaled chance
const BELOW_T6 = 0.001077;
export const tierBand = (tier) => [
  (TIER_CHANCES[tier - 1] + (TIER_CHANCES[tier] ?? BELOW_T6)) / 2,
  TIER_CHANCES[tier - 1],
];
export const tierOf = (chance) => {
  const tier = [1, 2, 3, 4, 5, 6].find((t) => chance >= tierBand(t)[0]);
  return tier ?? 6;
};
// share of each group's crits that should sit in each tier
export const TIER_QUOTAS = [0.3, 0.25, 0.2, 0.13, 0.08, 0.04];
// featured chances stay inside this range (below Boost, above Heavenly)
export const CHANCE_RANGE = [tierBand(6)[0], TIER_CHANCES[0]];

export const groupOf = (rewardSource) =>
  GROUPS.find((group) => group.test.test(rewardSource)).id;

export async function withGame(run) {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  try {
    const { CONFIG } = await server.ssrLoadModule("/src/config.ts");
    const types = await server.ssrLoadModule("/src/crits/critTypes/index.ts");
    const { FEATURED_REWARDS } = await server.ssrLoadModule(
      "/src/crits/badgeCrits/featured/index.ts",
    );
    return await run({ CONFIG, crit: { ...types, FEATURED_REWARDS } });
  } finally {
    await server.close();
  }
}

export function loadCatalog({ CONFIG, crit }) {
  return Object.entries(crit.FEATURED_CRITS).map(([kind, def]) => {
    const source = crit.FEATURED_REWARDS[kind].toString();
    const template = matchTemplate(kind, source, def.description);
    const chance = CONFIG.crit[`${kind}Chance`];
    return {
      kind,
      label: def.label,
      category: def.image.split("/")[1],
      description: def.description,
      group: template?.group ?? groupOf(source),
      template: template?.id ?? null,
      size: template ? template.size(paramsOf(CONFIG, kind, template)) : null,
      chance,
      tier: tierOf(chance),
    };
  });
}

export const paramsOf = (CONFIG, kind, template) =>
  Object.fromEntries(
    Object.keys(template.tiers[Object.keys(template.tiers)[0]]).map((key) => [
      key,
      CONFIG.crit[`${kind}${key}`],
    ]),
  );

// per group: crit count, share of count and of summed chance vs its target
export function mixOf(catalog) {
  const total = catalog.reduce((sum, entry) => sum + entry.chance, 0);
  return GROUPS.map((group) => {
    const members = catalog.filter((entry) => entry.group === group.id);
    const weight = members.reduce((sum, entry) => sum + entry.chance, 0);
    return {
      ...group,
      count: members.length,
      share: (100 * members.length) / catalog.length,
      weightShare: (100 * weight) / total,
      tiers: [1, 2, 3, 4, 5, 6].map(
        (tier) => members.filter((entry) => entry.tier === tier).length,
      ),
      deficit: (group.target / 100) * (catalog.length + 1) - members.length,
    };
  });
}

// upgrades and payouts are over their combined share, so new crits only go
// there when a spec pins the group or template
export const AUTO_GROUPS = GROUPS.map((group) => group.id).filter(
  (id) => id !== "upgrades" && id !== "payouts",
);

// the group furthest below its target share if one more crit were added
export const neediestGroup = (catalog, allowed = AUTO_GROUPS) =>
  mixOf(catalog)
    .filter((group) => allowed.includes(group.id))
    .sort((a, b) => b.deficit - a.deficit)[0].id;

// the tier (among those the group's templates offer) furthest below its quota
export function neediestTier(catalog, group, offered) {
  const members = catalog.filter((entry) => entry.group === group);
  return offered
    .map((tier) => ({
      tier,
      deficit:
        TIER_QUOTAS[tier - 1] * (members.length + 1) -
        members.filter((entry) => entry.tier === tier).length,
    }))
    .sort((a, b) => b.deficit - a.deficit || a.tier - b.tier)[0].tier;
}

export const templatesIn = (group) =>
  TEMPLATES.filter((template) => template.group === group);

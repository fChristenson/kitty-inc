// Sets every featured crit's Chance so each effect group's summed chances
// match its target share (GROUPS in crit-catalog.mjs). Image categories need
// nothing here: the game picks one category file at random per roll and rolls
// only its crits, so every category is seen as often however many it has.
// Each crit's Chance is its rank in its group (inside a group the bigger
// rewards are rarer, within CHANCE_RANGE). Chances only depend on each
// crit's rank, so re-running it after adding crits never drifts. Rewrites
// src/critBalance/*.ts.
import fs from "node:fs";
import path from "node:path";
import {
  withGame,
  loadCatalog,
  GROUPS,
  CHANCE_RANGE,
} from "./crit-catalog.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BALANCE = path.join(ROOT, "src/critBalance");
const [LO, HI] = CHANCE_RANGE;
// how steeply odds fall from a group's most to least common crit, bounded so a
// group never collapses to one flat chance
const MIN_CURVE = 0.25;
const MAX_CURVE = 50;

// chance at rank i of n (0 = most common): from HI down to LO along (1-p)^k
const chanceAt = (i, n, k) =>
  n === 1 ? HI : LO + (HI - LO) * (1 - i / (n - 1)) ** k;

const groupSum = (n, k) => {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += chanceAt(i, n, k);
  return sum;
};

// the curve whose summed chance is closest to `want` (sum falls as k grows)
function curveFor(n, want) {
  let lo = MIN_CURVE;
  let hi = MAX_CURVE;
  for (let step = 0; step < 60; step++) {
    const mid = Math.sqrt(lo * hi);
    if (groupSum(n, mid) > want) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

// each crit's rank chance, every group's curve fitted to its share
function rankChances(catalog, total, targetSum) {
  const groups = GROUPS.map((group) => ({
    ...group,
    // current order is the magnitude order: most common (smallest) first
    members: catalog
      .filter((entry) => entry.group === group.id)
      .sort((a, b) => b.chance - a.chance || a.kind.localeCompare(b.kind)),
    want: (total * group.target) / targetSum,
  })).filter((group) => group.members.length > 0);
  // within a template the bigger reward always takes the rarer of its slots
  for (const group of groups) {
    const byTemplate = new Map();
    group.members.forEach((entry, slot) => {
      if (!entry.template || entry.size === null) return;
      if (!byTemplate.has(entry.template)) byTemplate.set(entry.template, []);
      byTemplate.get(entry.template).push(slot);
    });
    const ordered = [...group.members];
    for (const slots of byTemplate.values()) {
      const members = slots
        .map((slot) => group.members[slot])
        .sort((a, b) => a.size - b.size || b.chance - a.chance);
      slots.forEach((slot, i) => (ordered[slot] = members[i]));
    }
    group.members = ordered;
  }
  // a group whose curve hits a bound can't take its full share; the rest of
  // the groups split what it leaves over
  let free = groups;
  for (let pass = 0; pass < 10 && free.length; pass++) {
    for (const group of groups) {
      group.curve = curveFor(group.members.length, group.want);
      group.sum = groupSum(group.members.length, group.curve);
    }
    const leftover = total - groups.reduce((sum, group) => sum + group.sum, 0);
    free = groups.filter(
      (group) =>
        group.curve > MIN_CURVE * 1.01 && group.curve < MAX_CURVE * 0.99,
    );
    if (Math.abs(leftover) < total * 1e-6) break;
    const freeWant = free.reduce((sum, group) => sum + group.want, 0);
    for (const group of free) group.want += (leftover * group.want) / freeWant;
  }
  const chances = new Map();
  for (const group of groups)
    group.members.forEach((entry, i) =>
      chances.set(
        entry.kind,
        Number(chanceAt(i, group.members.length, group.curve).toPrecision(9)),
      ),
    );
  return chances;
}

export function planCritOdds(catalog) {
  const total = catalog.reduce((sum, entry) => sum + entry.chance, 0);
  const targetSum = GROUPS.reduce((sum, group) => sum + group.target, 0);
  const chances = rankChances(catalog, total, targetSum);
  const after = (entry) => chances.get(entry.kind);
  const newTotal = catalog.reduce((sum, entry) => sum + after(entry), 0);
  const share = (entries, of, sum) =>
    (100 * entries.reduce((s, entry) => s + of(entry), 0)) / sum;
  const groupIds = new Set(catalog.map((entry) => entry.group));
  const groupWeight = GROUPS.filter((g) => groupIds.has(g.id)).reduce(
    (sum, group) => sum + group.target,
    0,
  );
  const report = GROUPS.filter((group) => groupIds.has(group.id)).map(
    (group) => {
      const entries = catalog.filter((entry) => entry.group === group.id);
      return {
        id: group.id,
        count: entries.length,
        target: (100 * group.target) / groupWeight,
        before: share(entries, (entry) => entry.chance, total),
        after: share(entries, after, newTotal),
      };
    },
  );
  return { chances, report };
}

export function writeChances(chances) {
  let changed = 0;
  for (const file of fs.readdirSync(BALANCE)) {
    if (!file.endsWith(".ts") || file === "index.ts") continue;
    const target = path.join(BALANCE, file);
    const source = fs.readFileSync(target, "utf8");
    const next = source.replace(
      /^(\s*)(\w+)Chance: [^,\n]+,/gm,
      (line, indent, kind) =>
        chances.has(kind)
          ? `${indent}${kind}Chance: ${chances.get(kind)},`
          : line,
    );
    if (next !== source) {
      fs.writeFileSync(target, next);
      changed++;
    }
  }
  return changed;
}

export async function rebalanceCritOdds({ write = true } = {}) {
  const { chances, report } = await withGame((game) =>
    planCritOdds(loadCatalog(game)),
  );
  console.log("effect group     crits  target%  before%  after%");
  for (const row of report)
    console.log(
      `${row.id.padEnd(16)} ${String(row.count).padStart(6)}  ${row.target.toFixed(1).padStart(7)}  ${row.before.toFixed(1).padStart(7)}  ${row.after.toFixed(1).padStart(6)}`,
    );
  if (write)
    console.log(`rebalanced odds in ${writeChances(chances)} balance file(s)`);
  return report;
}

// Rates every reward crits and events hand out on one common scale, so their
// odds can be tuned: how often each lands and how much it's worth, in
// minutes of the building's total income. A permanent gain (levels, floor
// crit tiers, worker perma tiers, staff, unlocks, price cuts) counts its
// income gain over --horizon seconds; a one-off (cash, payouts, boosts)
// counts once. Everything is measured against one reference building, set by
// the flags below; the model is rough by design, it's for comparing rewards.
//
//   node scripts/reward-balance.mjs [--level=60 --floors=6 ...] [--list=events|featured|legacy] [--top=15] [--json]
//
// --json writes every reward's numbers to tmp/_reward-balance.json.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { withGame } from "./lib/crit-catalog.mjs";

const DEFAULTS = {
  floors: 6, // unlocked floors in the building
  maxFloors: 20, // floors a building can have (MAX_FLOORS_PER_BUILDING)
  level: 60, // each floor's upgrade level
  tier: 1, // each floor's crit tier multiplier now (1, 5, 25 or 125)
  growth: 30, // levels each floor gains over the horizon (floor tiers pay off on these)
  workers: 2, // workers per floor (cap 3)
  managers: 0.5, // share of floors with a manager
  perma: 1, // each worker's perma multiplier now (1, 5, 25 or 125)
  uptime: 0.25, // share of the time a floor's workers are boosted
  office: 0.8, // share of floors already owning chairs and supplies
  staffed: 0.6, // share of floors already at the worker cap
  lowest: 0.6, // the lowest floor's level, as a share of the top level
  bank: 120, // banked total, in seconds of income
  view: 4, // income bars in view during an event
  viewWorkers: 8, // climbable workers in view during an event
  hireSpots: 2, // floors in view with room for a hire
  locked: 0.3, // chance a locked floor is in view (unlock events can arm)
  hiresOpen: 0.6, // chance some floor in view has room (hire events can arm)
  horizon: 1800, // seconds a permanent gain counts over
  cps: 4, // upgrade clicks per second
  eventMs: 2500, // an event's average length
  top: 15,
};

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [key, value = "true"] = a.slice(2).split("=");
      return [key, value];
    }),
);
const S = { ...DEFAULTS };
for (const [key, value] of Object.entries(args))
  if (key in DEFAULTS) S[key] = Number(value);

// ---------- the reference building ----------
const F = S.floors;
const L = S.level;
const T = S.tier;
const W = Math.min(3, S.workers);
const A0 = L * T; // levels weighted by the tier each was bought at
// a boosted perma worker's speed-up is its tier multiplier to this power
const configSource = readFileSync("src/config.ts", "utf8");
const configNumber = (key, fallback) =>
  Number(
    configSource.match(new RegExp(`${key}:\\s*([\\d.]+)`))?.[1] ?? fallback,
  );
const PERMA_EXP = configNumber("permaBoostExponent", 1);
const PAYOUT_SECONDS = configNumber("payoutSeconds", 0);
const FREE_FLOOR_SHARE = configNumber("freeFloorLevelShare", 0);
// a floor's income, up to the building scale (which cancels out)
const base = (level, weighted) => (1 + 2 * weighted) * (1 + level / 20);
// boost speed with every worker boosted
const boostSpeed = (workers, managers, perma = S.perma) =>
  2 ** ((workers / 3) * (workers + managers)) * perma ** (workers * PERMA_EXP);
const avgSpeed = (workers, managers, perma = S.perma) =>
  1 - S.uptime + S.uptime * boostSpeed(workers, managers, perma);
const E = avgSpeed(W, S.managers);
const officeSpeed = 4 ** S.office;
const floorRate = base(L, A0) * E * officeSpeed;
const R = F * floorRate; // total income per second
const interval = 1 / ((1 + L / 20) * E * officeSpeed);
const payoutSeconds = PAYOUT_SECONDS || Math.max(interval, 0.5); // one reward payout, in seconds of its floor
const upgradeCost = (level) => 2 * ((3 + level) / 3) ** 4;
const upgradesValue =
  F *
  Array.from({ length: L }, (_, n) => upgradeCost(n)).reduce(
    (a, b) => a + b,
    0,
  );
const unlockCost = (index) => 200 * 2 ** (index - 1);
const TIER_LEVELS = { crit: 5, mega: 25, ultra: 125 };

// ---------- effects: each returns { type, amount, perm, once } ----------
// perm: permanent gain as a share of total income; once: seconds of income
const fx = (type, amount, perm, once = 0) => ({ type, amount, perm, once });
const clampFloors = (k) => Math.max(0, Math.min(F, k));
const levels = (n, k = 1) => {
  k = clampFloors(k);
  const r = base(L + n, A0 + n * T) / base(L, A0) - 1;
  return fx("levels", n * k, (r * k) / F);
};
// a tier only multiplies upgrades bought after it, so it pays off over the
// horizon's growth; counted at half its end gain (it ramps up)
const floorTier = (steps, k = 1) => {
  k = clampFloors(k);
  const t = Math.min(125, T * 5 ** steps);
  const G = S.growth;
  const r = base(L + G, A0 + G * t) / base(L + G, A0 + G * T) - 1;
  return fx("floorTier", steps * k, (0.5 * r * k) / F);
};
const workerTier = (steps, k = 1) => {
  if (k <= 0) return fx("workerTier", 0, 0);
  const floorsHit = Math.min(F, Math.ceil(k / W));
  const each = k / floorsHit;
  const step = (Math.min(125, S.perma * 5 ** steps) / S.perma) ** PERMA_EXP;
  const boosted =
    1 - S.uptime + S.uptime * boostSpeed(W, S.managers) * step ** each;
  return fx("workerTier", steps * k, ((boosted / E - 1) * floorsHit) / F);
};
// sure: the hire lands on a floor with room (events pick such floors);
// promotes: a full floor promotes one worker a perma tier instead (featured)
const hire = (n, k = 1, sure = false, promotes = true) => {
  k = clampFloors(k);
  const w = Math.min(3, W + n);
  const r = avgSpeed(w, S.managers) / E - 1;
  const share = sure ? 1 : 1 - S.staffed;
  const full = sure || !promotes ? 0 : S.staffed;
  const promoted = full * k * workerTier(1, 1).perm;
  return fx("staff", n * k * share, (r * k * share) / F + promoted);
};
const legacyHire = (n, k = 1) => hire(n, k, false, false);
const manager = (k = 1) => {
  k = clampFloors(k);
  const r = avgSpeed(W, 1) / E - 1;
  return fx("staff", k * (1 - S.managers), (r * k * (1 - S.managers)) / F);
};
const office = (n, k = 1) => {
  k = clampFloors(k);
  const share = 1 - S.office;
  return fx("staff", n * k * share, ((2 ** n - 1) * k * share) / F);
};
// copy: the new floor arrives as good as the one it copies; otherwise it
// starts at FREE_FLOOR_SHARE of the level below
const unlock = (n, copy = false) => {
  n = Math.max(0, Math.min(n, S.maxFloors - F));
  let cost = 0;
  for (let i = 0; i < n; i++) cost += unlockCost(F + i);
  const start = Math.round(L * FREE_FLOOR_SHARE);
  const each = copy ? 1 : base(start, start * T) / base(L, A0);
  return fx("unlock", n, (n * each) / F, cost / R);
};
const cash = (seconds) => fx("cash", seconds, 0, seconds);
const bank = (share) => fx("cash", share * S.bank, 0, share * S.bank);
const payouts = (n, k = 1) =>
  fx("cash", 0, 0, (n * clampFloors(k) * payoutSeconds) / F);
const assets = (share) => fx("cash", 0, 0, (share * upgradesValue) / R);
const priceCash = (multiple, k = 1) =>
  fx("cash", 0, 0, (multiple * clampFloors(k) * upgradeCost(L)) / R);
const boost = (seconds, k = 1, extra = 0) => {
  const lift = boostSpeed(W, S.managers + extra) / E - 1;
  return fx("boost", seconds, 0, (seconds * clampFloors(k) * lift) / F);
};
// a permanent price cut: as if income were 1/(1-f) for buying upgrades
const discount = (f, k = F) =>
  fx("prices", f, ((1 / (1 - f) - 1) * clampFloors(k)) / F);
const timedDiscount = (f, seconds) =>
  fx("prices", seconds, 0, seconds * (1 / (1 - f) - 1));
const priceLock = (seconds) => fx("prices", seconds, 0, seconds * 0.2);
const rushHour = (seconds) =>
  fx("boost", seconds, 0, seconds * Math.max(0, interval / 0.5 - 1));
const eventCash = (multiple) =>
  fx("cash", multiple, 0, (multiple * ((F + 1) / 2) * payoutSeconds) / F);

// ---------- crit tier odds ----------
async function main() {
  await withGame(async ({ CONFIG, crit }) => {
    const c = CONFIG.crit;
    const pTier = {
      ultra: c.ultra.chance,
      mega: (1 - c.ultra.chance) * c.mega.chance,
      crit: (1 - c.ultra.chance) * (1 - c.mega.chance) * c.crit.chance,
    };
    const pCrit = pTier.ultra + pTier.mega + pTier.crit;
    const avgTierLevels =
      (pTier.ultra * 125 + pTier.mega * 25 + pTier.crit * 5) / pCrit;
    const tierLevels = (times, k = 1) => levels(avgTierLevels * times, k);

    // ---------- featured crits: parsed from their reward source ----------
    const featured = Object.entries(crit.FEATURED_CRITS).map(([kind, def]) => {
      const source = def.reward.toString();
      const effects = featuredEffects(source, c, tierLevels);
      return {
        source: "featured",
        kind,
        label: def.label,
        chance: c[`${kind}Chance`] ?? 0,
        effects,
        modelled: effects.length > 0,
      };
    });

    // ---------- legacy procs: hand-modelled from src/critBalance/procs ----------
    const featuredKinds = new Set(Object.keys(crit.FEATURED_CRITS));
    const legacy = crit.CRIT_PROC_KINDS.filter(
      (k) => !featuredKinds.has(k),
    ).map((kind) => {
      const model = LEGACY[kind];
      return {
        source: "legacy",
        kind,
        label: crit.CRIT_PROC_INFO[kind]?.label ?? kind,
        chance: c[`${kind}Chance`] ?? 0,
        effects: model ? model({ tierLevels, c }) : [],
        modelled: !!model,
      };
    });

    // ---------- events: classified from their source ----------
    const events = readdirSync("src/floors")
      .filter((d) => d.endsWith("Event"))
      .map((dir) => eventEntry(dir, CONFIG))
      .filter(Boolean);

    // ---------- how often each lands, per hour ----------
    const clicksPerHour = S.cps * 3600;
    const gatewayPerSec = S.cps * pCrit * c.specialCritGatewayChance;
    const armWeight = events.reduce((s, e) => s + e.chance * e.arm, 0);
    const pEvent = 1 - events.reduce((p, e) => p * (1 - e.chance * e.arm), 1);
    const cycle =
      CONFIG.eventProcs.cooldownMs / 1000 +
      S.eventMs / 1000 +
      1 / (gatewayPerSec * pEvent);
    const eventsPerHour = 3600 / cycle;
    const procGatewaysPerHour = gatewayPerSec * 3600 - eventsPerHour;
    const procs = [...featured, ...legacy];
    const lambda = procs.reduce((s, p) => s + p.chance, 0);
    for (const p of procs) {
      const mu = Math.max(1e-9, lambda - p.chance);
      p.perHour = procGatewaysPerHour * p.chance * ((1 - Math.exp(-mu)) / mu);
    }
    for (const e of events)
      e.perHour = (eventsPerHour * e.chance * e.arm) / armWeight;
    const tiers = Object.entries(pTier).map(([tier, p]) => ({
      source: "critTier",
      kind: tier,
      label: `${tier} tier (${TIER_LEVELS[tier]} free levels)`,
      chance: p,
      perHour: clicksPerHour * p,
      effects: [levels(TIER_LEVELS[tier], 1)],
      modelled: true,
    }));

    const all = [...tiers, ...procs, ...events];
    for (const r of all) {
      r.value = valueOf(r.effects);
      r.main = mainType(r.effects);
      r.powerPerHour = r.perHour * r.value;
    }

    report({
      CONFIG,
      pTier,
      pCrit,
      gatewayPerSec,
      pEvent,
      eventsPerHour,
      procGatewaysPerHour,
      lambda,
      all,
      tiers,
      featured,
      legacy,
      events,
    });
  });
}

const minutes = (e) => (e.perm * S.horizon + e.once) / 60;
const valueOf = (effects) => effects.reduce((s, e) => s + minutes(e), 0);
const mainType = (effects) =>
  effects.length === 0
    ? "unmodelled"
    : effects.reduce((a, b) => (minutes(b) > minutes(a) ? b : a)).type;

// ---------- featured reward parsing ----------
const ACTION =
  /(actions\.\w+|promoteAndUpgrade|upgradeAndPay|upgradeHereAndPayHighest)\(/g;
function calls(source) {
  const out = [];
  let m;
  ACTION.lastIndex = 0;
  while ((m = ACTION.exec(source))) {
    let depth = 1;
    let i = ACTION.lastIndex;
    const start = i;
    for (; i < source.length && depth; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    out.push({
      name: m[1].replace("actions.", ""),
      args: split(source.slice(start, i - 1)),
    });
  }
  return out;
}
function split(body) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) {
      parts.push(body.slice(from, i).trim());
      from = i + 1;
    }
  }
  if (body.slice(from).trim()) parts.push(body.slice(from).trim());
  return parts;
}
const valueArg = (arg, c) => {
  if (arg === undefined) return undefined;
  const ref = arg.match(/balance\.(\w+)/);
  if (ref) return c[ref[1]];
  if (/^-?[\d.]+$/.test(arg)) return Number(arg);
  const text = arg.match(/^["'](\w+)["']$/);
  return text ? text[1] : undefined;
};
// how many floors a target expression reaches
const scopeOf = (arg = "") => {
  if (/belowAndHere\(/.test(arg)) return (F + 1) / 2;
  if (/alternating\(/.test(arg)) return Math.ceil(F / 2);
  if (/hereAnd\(/.test(arg)) return 2;
  if (/cascadeDown\(/.test(arg)) return 2;
  if (/context\.floors/.test(arg)) return F;
  const list = arg.match(/^\[(.*)\]$/);
  if (list) return split(list[1]).length;
  return 1;
};
const raiseTarget = (arg) =>
  /topLevel/.test(arg) && /\/\s*2/.test(arg)
    ? L / 2
    : /topLevel|upgradeCount/.test(arg)
      ? L
      : Number(arg) || 0;

function featuredEffects(source, c, tierLevels) {
  const out = [];
  // an amount worked out in code (e.g. "up to the next multiple of N"):
  // half the first balance number it uses
  const computed = (c[source.match(/balance\.(\w+)/)?.[1]] ?? 2) / 2;
  for (const { name, args } of calls(source)) {
    const v = (i) => valueArg(args[i], c) ?? computed;
    const k = scopeOf(args[0]);
    switch (name) {
      case "upgrade":
        out.push(levels(v(1), k));
        break;
      case "payCycles":
        out.push(payouts(v(1), k));
        break;
      case "addIncomeShare":
        out.push(bank(v(0)));
        break;
      case "addIncomeSeconds":
        out.push(cash(v(0)));
        break;
      case "repeatCrit": {
        const floors = (v(1) === "both" ? 2 : 1) / (1 - v(2));
        out.push(tierLevels(1, Math.min(F - 1, floors)));
        break;
      }
      case "armCrit":
        out.push(levels(TIER_LEVELS[v(1)] ?? 5, k));
        break;
      case "unlockFloors":
        out.push(unlock(v(1)));
        break;
      case "hireWorkers":
        out.push(hire(v(1), k));
        break;
      case "hireManagers":
        out.push(manager(k));
        break;
      case "giveOfficeChairs":
      case "giveOfficeSupplies":
        out.push(office(1, k));
        break;
      case "boostWorkers":
        out.push(boost(v(1), k, v(2) ?? 0));
        break;
      case "discountPrices":
        out.push(discount(v(1), k));
        break;
      case "raiseLevels": {
        const from = k === 1 ? S.lowest * L : ((1 + S.lowest) / 2) * L;
        out.push(levels(Math.max(0, raiseTarget(args[1]) - from), k));
        break;
      }
      case "addUpgradePriceCash":
        out.push(priceCash(v(1), k));
        break;
      case "growLevels":
        out.push(levels(Math.max(1, Math.ceil(L * v(1))), k));
        break;
      case "spreadUpgrades":
        out.push(levels(v(1) / k, k));
        break;
      case "raiseWorkerTiers":
        out.push(workerTier(v(2), Math.max(1, Math.ceil(k * W * v(1)))));
        break;
      case "startEvent":
        out.push(v(1) === "sale" ? timedDiscount(0.5, 15) : priceLock(5 * k));
        break;
      case "promoteAndUpgrade":
        out.push(floorTier(v(1), 1), levels(v(2), 1));
        break;
      case "upgradeAndPay":
        out.push(levels(v(1), k), payouts(v(2), k));
        break;
      case "upgradeHereAndPayHighest":
        out.push(levels(v(1), 1), payouts(v(2), 1));
        break;
    }
  }
  return out.filter((e) => Number.isFinite(e.perm) && Number.isFinite(e.once));
}

// ---------- legacy procs (from the comments in src/critBalance/procs) ----------
// ~ marks a guess where the balance file doesn't give the size
const LEGACY = {
  // payouts
  booty: () => [bank(1)],
  cashFlow: () => [cash(1)],
  openBook: () => [assets(1)],
  tickTock: () => [payouts(2, F)],
  fastForward: () => [payouts(5, F)], // ~ "steeper" than tick tock
  snowball: () => [payouts(F, F)],
  payday: () => [bank(2)],
  goldStandard: () => [bank(4)], // ~ "steeper" than payday
  secondWind: () => [assets(1)],
  fireDrill: () => [payouts(1, F)],
  bonusRound: () => [payouts(2, 1)],
  overflow: () => [payouts(5, 1)],
  performanceBonus: () => [payouts(W + S.managers, F)],
  goldenParachute: () => [cash(15)],
  rainCheck: ({ c }) => [cash(c.rainCheckSeconds ?? 5)],
  executiveBonus: () => [assets(0.25)],
  payout: () => [bank(1), assets(1)],
  shareholders: () => [cash(10)], // ~
  // free upgrades
  keynote: () => [levels(10, 1)],
  bullMarket: () => [levels(L, F)],
  dejaVu: ({ tierLevels }) => [tierLevels(2, 1)],
  luckyClover: () => [levels(500, 1)],
  roundUp: () => [levels(5, F)],
  safetyNet: () => [levels(5, 1)],
  floorShare: () => [levels(10, 1)], // ~
  sameBoat: () => [levels(20, 1)], // ~
  casualFriday: () => [levels(5, F)], // ~
  fancyFriday: () => [levels(10, F)], // ~
  doubleDown: ({ tierLevels }) => [tierLevels(2, 1)],
  teaBreak: () => [levels(1, 1)],
  merger: () => [levels((L * (1 - S.lowest)) / 2, F / 2)],
  // boosts
  boost: () => [boost(15, F)],
  sunshine: () => [boost(30, F)],
  snowday: () => [boost(45, F)],
  nightShift: () => [boost(10, F, 1)],
  rushHour: ({ c }) => [rushHour((c.rushHourDurationMs ?? 15000) / 1000)],
  rateLock: () => [fx("boost", 10, 0, 10 / F)],
  espressoShot: () => [boost(15, F)],
  coffeeRun: () => [boost(60, F)],
  teamLunch: () => [boost(30, 1)],
  nightOwl: () => [boost(10, F, 2)],
  powerSurge: () => [boost(15, F)], // ~
  // cascades
  chain: ({ tierLevels }) => [tierLevels(1, 2)],
  bounce: ({ tierLevels }) => [tierLevels(1, 2)],
  explosion: ({ tierLevels }) => [tierLevels(1, 4)],
  dominoEffect: () => [levels(2, F / 2)], // ~
  // floor unlocks
  blueprint: () => [unlock(1, true)],
  skip: () => [unlock(S.maxFloors)],
  mystic: () => [], // map-only building purchase
  luckyNumber: () => [unlock(7)],
  grandOpening: () => [unlock(S.maxFloors)],
  firstClass: () => [unlock(1)], // ~
  // sales
  winterSale: ({ c }) => [discount(c.seasonalSaleDiscount ?? 0.25)],
  springSale: ({ c }) => [discount(c.seasonalSaleDiscount ?? 0.25)],
  summerSale: ({ c }) => [discount(c.seasonalSaleDiscount ?? 0.25)],
  autumnSale: ({ c }) => [discount(c.seasonalSaleDiscount ?? 0.25)],
  halloweenSale: ({ c }) => [discount(c.halloweenSaleDiscount ?? 0.5)],
  easterSale: ({ c }) => [discount(c.easterSaleDiscount ?? 0.5)],
  frozen: () => [priceLock(5)],
  spendingFreeze: () => [priceLock(5 * F)],
  freeSale: () => [timedDiscount(0.5, 15)], // ~ the paid Sale's size
  priceMatch: () => [priceLock(5)],
  // staffing
  chairGiveaway: () => [office(1, 1)],
  suppliesGiveaway: () => [office(1, 1)],
  intern: () => [legacyHire(1, 1)],
  talentScout: () => [legacyHire(1, 1), boost(15, 1)],
  unionBoss: () => [manager(1)],
  fullyStaffed: () => [legacyHire(3, F), manager(F)],
  shiftChange: () => [legacyHire(3, 2)],
  cloneArmy: () => [legacyHire(3, F)],
  goldenHandshake: () => [manager(F)],
  supplyRun: () => [office(2, 1)],
  teamBuilding: () => [legacyHire(1, F)],
  headhunter: () => [legacyHire(3, 1)],
  dressCode: () => [legacyHire(1, F)], // ~ manager or worker
  recruitmentDrive: () => [legacyHire(3, 2)],
  // tiers
  upgrade: () => [floorTier(1, 1)],
  peppermint: () => [floorTier(1, F - 1)],
  heavenly: () => [unlock(S.maxFloors), floorTier(3, F), levels(125, F)],
  pair: () => [floorTier(1, 2)],
  threeOfAKind: () => [floorTier(1, 3)],
  fourOfAKind: () => [floorTier(1, 4)],
  fullHouse: () => [floorTier(1, 5)],
  royalFlush: () => [floorTier(1, 6)],
  goldenTicket: () => [levels(125, 1)],
  silverTicket: () => [levels(25, 1)],
  executiveOrder: () => [floorTier(1, F)],
  springCleaning: () => [floorTier(1, F), levels(-L, F)],
};

// ---------- events ----------
// older events whose rewards the source scan can't size; [] = only the
// covered crit's tier, which every crit pays anyway
const EVENT_OVERRIDES = {
  halo: () => [workerTier(3, 1)],
  blessing: () => [workerTier(1, S.viewWorkers)],
  mentor: () => [workerTier(2, 1)],
  constellation: () => [workerTier(1, 5)],
  risingTide: () => [floorTier(1, S.view / 2)],
  tidalWave: () => [floorTier(1, S.view / 2)],
  conveyor: () => [hire(3, 1, true)],
  hunt: () => [bank(1)], // ~ multiplies the total
  renovate: () => [],
  reveal: () => [], // ~ plus one random proc
};
const MULTI_HIT = /const (?:PUMPS|LAPS|GULPS|SNAPS|SHOCKS|RINGS|RAMS) = (\d+)/;

function eventEntry(dir, CONFIG) {
  const name = dir.replace(/Event$/, "");
  const cfg = CONFIG[`${name}Event`];
  let src;
  try {
    src = readFileSync(`src/floors/${dir}/index.ts`, "utf8");
  } catch {
    return null;
  }
  const label =
    src.match(/registerWispEvent\(\s*KEY,\s*"([^"]+)"/)?.[1] ?? name;
  const constant = (id) => {
    const m = src.match(new RegExp(`const ${id} = ([\\d_.]+)`));
    return m ? Number(m[1].replace(/_/g, "")) : null;
  };
  const effects = [];
  const overridden = name in EVENT_OVERRIDES;
  if (overridden) effects.push(...EVENT_OVERRIDES[name]());
  else {
    const reward = src.match(/rewardMultiplier:\s*([\w.]+)/)?.[1];
    const multiple =
      reward === undefined
        ? /\brewardMultiplier\b|addTotalIncome\(|currentPayoutAmount|getTotalIncome\(/.test(
            src,
          )
          ? 4
          : /startMoneyCover\(/.test(src)
            ? 1 // moneyCover's default
            : 0
        : Number.isFinite(Number(reward))
          ? Number(reward)
          : (constant(reward) ?? 4);
    if (multiple > 0) effects.push(eventCash(multiple));
    if (/\.levels\(|giveBarLevels|upgradeFloorFree/.test(src)) {
      const single = /bars: \[own\]/.test(src);
      const bars = single
        ? 1
        : Math.min(S.view, constant("MAX_BARS") ?? S.view);
      const hits = Number(src.match(MULTI_HIT)?.[1] ?? 1);
      const share = cfg?.levelShare ?? 0.1;
      effects.push(levels(Math.max(2, Math.round(L * share)) * hits, bars));
    }
    if (
      /\.tierUp\(|giveBarTier|promoteFloorTier|critMultiplierTier\s*=\s*next/.test(
        src,
      )
    )
      effects.push(floorTier(1, 1));
    if (
      /\.promote\(|promoteWorkerPermaTier|giveWorkerTier|mergeWorkersInto/.test(
        src,
      )
    )
      effects.push(
        workerTier(
          1,
          Math.min(S.viewWorkers, constant("MAX_WORKERS") ?? S.viewWorkers),
        ),
      );
    if (/giveHire|recruitWorker|recruitToCap/.test(src))
      effects.push(
        hire(
          1,
          Math.min(S.hireSpots, constant("MAX_HIRES") ?? S.hireSpots),
          true,
        ),
      );
    if (/unlockFloorFree/.test(src)) effects.push(unlock(1));
  }
  const arm = /findRewardLocked/.test(src)
    ? S.locked
    : /findRewardHires|recruitToCap/.test(src)
      ? S.hiresOpen
      : 1;
  return {
    source: "event",
    kind: name,
    label,
    chance: cfg?.chance ?? 0,
    arm,
    effects,
    modelled: overridden || effects.length > 0,
  };
}

// ---------- report ----------
const TYPES = [
  "levels",
  "floorTier",
  "workerTier",
  "staff",
  "unlock",
  "cash",
  "boost",
  "prices",
];
const SOURCES = ["critTier", "legacy", "featured", "event"];
const fmt = (n, digits = 1) =>
  !Number.isFinite(n)
    ? "-"
    : Math.abs(n) >= 1e5
      ? n.toExponential(1)
      : n.toFixed(digits);
const pct = (n) => `${fmt(100 * n)}%`;
const row = (cells, widths) =>
  cells
    .map((cell, i) => String(cell)[i === 0 ? "padEnd" : "padStart"](widths[i]))
    .join("  ");

function table(title, header, rows) {
  const widths = header.map((h, i) =>
    Math.max(String(h).length, ...rows.map((r) => String(r[i]).length)),
  );
  console.log(`\n${title}`);
  console.log(row(header, widths));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(row(r, widths));
}

function report(ctx) {
  const { all, events, featured, legacy } = ctx;
  console.log(
    "Reward balance (power = minutes of total income; permanent gains count over the horizon)",
  );
  console.log(
    `building: ${F} floors at level ${L}, tier x${T}, ${W} workers (perma x${S.perma}, boosted ${pct(S.uptime)}), horizon ${S.horizon}s, ${S.cps} clicks/s`,
  );
  console.log(
    `per click: crit ${pct(ctx.pCrit)} (crit ${pct(ctx.pTier.crit)}, mega ${pct(ctx.pTier.mega)}, ultra ${pct(ctx.pTier.ultra)}); special slot ${fmt(ctx.gatewayPerSec * 3600, 0)}/h -> ${fmt(ctx.eventsPerHour, 0)} events/h (any event claims ${pct(ctx.pEvent)} of free slots), ${fmt(ctx.procGatewaysPerHour, 0)} proc slots/h (a proc lands in ${pct(1 - Math.exp(-ctx.lambda))})`,
  );
  console.log(
    `one level here: +${pct(levels(1, 1).perm * F)} to its floor; one floor tier step: +${pct(floorTier(1, 1).perm * F * 2)} to its floor by the horizon; one worker perma step: +${pct(workerTier(1, 1).perm * F)} to its floor`,
  );

  // power by source x type
  table(
    "What one unit is worth (minutes of income)",
    ["unit", "minutes"],
    [
      ["1 free level on one floor", levels(1, 1)],
      [
        "10% of a floor's level (event bar levels)",
        levels(Math.max(2, Math.round(L * 0.1)), 1),
      ],
      ["1 floor crit tier step", floorTier(1, 1)],
      ["1 worker perma tier step", workerTier(1, 1)],
      ["1 hire on a floor with room", hire(1, 1, true)],
      ["1 manager", manager(1)],
      ["1 office item (chairs or supplies)", office(1, 1)],
      ["1 free floor", unlock(1)],
      ["event cash x4", eventCash(4)],
      ["1 payout on every floor", payouts(1, F)],
      ["10s of income", cash(10)],
      ["25% permanent price cut", discount(0.25)],
    ].map(([unit, e]) => [unit, fmt(minutes(e), 2)]),
  );

  const totalPower = all.reduce((s, r) => s + r.powerPerHour, 0);
  const cell = (rows, type) =>
    rows.reduce(
      (s, r) =>
        s +
        r.perHour *
          r.effects
            .filter((e) => e.type === type)
            .reduce((a, e) => a + minutes(e), 0),
      0,
    );
  table(
    "Power per hour by source and reward type (minutes of income gained per hour of play)",
    ["source", "rolls/h", ...TYPES, "total", "share"],
    SOURCES.map((source) => {
      const rows = all.filter((r) => r.source === source);
      const sum = rows.reduce((s, r) => s + r.powerPerHour, 0);
      return [
        source,
        fmt(
          rows.reduce((s, r) => s + r.perHour, 0),
          0,
        ),
        ...TYPES.map((t) => fmt(cell(rows, t))),
        fmt(sum),
        pct(sum / totalPower),
      ];
    }).concat([
      [
        "all",
        fmt(
          all.reduce((s, r) => s + r.perHour, 0),
          0,
        ),
        ...TYPES.map((t) => fmt(cell(all, t))),
        fmt(totalPower),
        "100%",
      ],
    ]),
  );

  // volume: how much of each reward lands per hour
  const amount = (type) =>
    all.reduce(
      (s, r) =>
        s +
        r.perHour *
          r.effects
            .filter((e) => e.type === type)
            .reduce((a, e) => a + e.amount, 0),
      0,
    );
  table(
    "Volume per hour",
    ["reward", "per hour", "unit"],
    [
      ["levels", fmt(amount("levels"), 0), "free levels"],
      ["floorTier", fmt(amount("floorTier"), 2), "floor crit tier steps"],
      ["workerTier", fmt(amount("workerTier"), 2), "worker perma tier steps"],
      [
        "staff",
        fmt(amount("staff"), 2),
        "hires/managers/office items that land",
      ],
      ["unlock", fmt(amount("unlock"), 2), "free floors"],
      ["cash", fmt(amount("cash"), 0), "seconds of income (flat cash only)"],
    ],
  );

  // by main reward type: how often vs how strong
  table(
    "By main reward type (a reward counts under its biggest effect)",
    ["type", "rewards", "rolls/h", "avg min/hit", "power/h", "share"],
    [...TYPES, "unmodelled"].map((type) => {
      const rows = all.filter((r) => r.main === type);
      const perHour = rows.reduce((s, r) => s + r.perHour, 0);
      const power = rows.reduce((s, r) => s + r.powerPerHour, 0);
      return [
        type,
        rows.length,
        fmt(perHour, 1),
        fmt(power / perHour, 2),
        fmt(power),
        pct(power / totalPower),
      ];
    }),
  );

  const line = (r) => [
    `${r.label} [${r.source}${r.source === "event" ? "" : `:${r.kind}`}]`,
    r.main,
    fmt(r.chance * (r.arm ?? 1), 4),
    fmt(r.perHour, 2),
    fmt(r.value, 2),
    fmt(r.powerPerHour, 1),
    pct(r.powerPerHour / totalPower),
  ];
  const header = [
    "reward",
    "type",
    "chance",
    "per hour",
    "min/hit",
    "power/h",
    "share",
  ];
  const ranked = all.filter((r) => r.source !== "critTier");
  table(
    `Top ${S.top} by power per hour`,
    header,
    [...ranked]
      .sort((a, b) => b.powerPerHour - a.powerPerHour)
      .slice(0, S.top)
      .map(line),
  );
  table(
    `Top ${S.top} biggest single hits`,
    header,
    [...ranked]
      .sort((a, b) => b.value - a.value)
      .slice(0, S.top)
      .map(line),
  );

  const unmodelled = ranked.filter((r) => !r.modelled && r.chance > 0);
  if (unmodelled.length)
    console.log(
      `\nunmodelled (${unmodelled.length}, not counted): ${unmodelled.map((r) => `${r.kind} [${r.source}]`).join(", ")}`,
    );

  const lists = { events, featured, legacy };
  if (lists[args.list])
    table(
      `All ${args.list}, by power per hour`,
      header,
      [...lists[args.list]]
        .sort((a, b) => b.powerPerHour - a.powerPerHour)
        .map(line),
    );

  if (args.json) {
    mkdirSync("tmp", { recursive: true });
    writeFileSync(
      "tmp/_reward-balance.json",
      JSON.stringify(
        {
          settings: S,
          rewards: all.map(
            ({
              source,
              kind,
              label,
              chance,
              arm,
              perHour,
              value,
              powerPerHour,
              main,
              effects,
            }) => ({
              source,
              kind,
              label,
              chance,
              arm,
              perHour,
              minutesPerHit: value,
              powerPerHour,
              main,
              effects: effects.map((e) => ({ ...e, minutes: minutes(e) })),
            }),
          ),
        },
        null,
        2,
      ),
    );
    console.log("\nwrote tmp/_reward-balance.json");
  }
}

main();

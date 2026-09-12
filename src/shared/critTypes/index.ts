// The one shared definition of "what crit tiers exist" — CRIT_TIER_CONFIG,
// CritTier, and every pure tier-comparison/ordering helper live here so any
// module (floors/upgradeButton's stateful roll/consume logic, floorInteractions,
// critCelebration, background/cityMap, gameState's own Floor type, main.ts) can
// read the exact same canonical data without going through floors/'s facade or
// duplicating a plain string union to dodge a circular import (gameState.ts
// used to do exactly that for Floor.critMultiplierTier before this move).
//
// Adding a new tier is meant to be a two-line change: add its entry to
// CRIT_TIER_CONFIG below, and its name to CRIT_TIER_ORDER (rarest-first) —
// every consumer (rollCritUpgrade's roll cascade, rollFloorBuyCrit,
// nextCritTier's promotion chain) already reads that ordering generically
// instead of a hardcoded if/else per tier.
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";

export type CritTier = "crit" | "mega" | "ultra";

export interface CritTierDef {
  chance: number; // rolled once per completed upgrade click, see rollCritUpgrade
  multiplier: number;
  color: string;
  label: string; // canonical "xN" text — shared by the button AND the flash text
}

// chance/multiplier per tier live in src/config.ts (CONFIG.crit) — only the
// cosmetic color/label stay here
export const CRIT_TIER_CONFIG: Record<CritTier, CritTierDef> = {
  crit: {
    ...CONFIG.crit.crit,
    color: COLOR.purple,
    label: "x5",
  },
  mega: {
    // ~1 in 100 upgrade clicks — deliberately much rarer than crit's so it reads
    // as a genuine jackpot moment, not just a bigger version of the common crit
    ...CONFIG.crit.mega,
    color: COLOR.starYellow,
    label: "x25",
  },
  ultra: {
    // rarer still than mega's — the true jackpot-of-jackpots moment
    ...CONFIG.crit.ultra,
    color: COLOR.red,
    label: "x125",
  },
};

// rarest-first — the single order rollCritUpgrade/rollFloorBuyCrit iterate to
// decide which tier (if any) a roll lands on; a FUTURE tier just needs an
// entry added to CRIT_TIER_CONFIG above and its name inserted here at the
// right rarity position, no roll-cascade code to touch
export const CRIT_TIER_ORDER: CritTier[] = ["ultra", "mega", "crit"];

// back-compat convenience re-exports for callers that just want one tier's
// multiplier — still sourced from CRIT_TIER_CONFIG above, never a separate
// hardcoded number
export const CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.crit.multiplier;
export const MEGA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.mega.multiplier;
export const ULTRA_CRIT_UPGRADE_COUNT = CRIT_TIER_CONFIG.ultra.multiplier;

// "chain crit" — an extra roll on top of an already-landed crit/mega/ultra (see
// upgradeButton.ts's rollCritUpgrade): applies that same tier's upgrade to the
// next floor too, then has chainContinueChance to keep going up the building
// one floor at a time
export const CHAIN_CRIT_CHANCE = CONFIG.crit.chainChance;
export const CHAIN_CRIT_CONTINUE_CHANCE = CONFIG.crit.chainContinueChance;

// "boost crit" — another proc riding on an already-landed crit/mega/ultra (see
// rollCrit below), same as chain: instead of extra upgrades it grants a
// free worker boost. Neither proc's button EVER changes appearance on its
// own — both are invisible until the already-armed tier is actually clicked,
// only then do they reveal themselves via their own celebration flash
export const BOOST_CRIT_CHANCE = CONFIG.crit.boostChance;
export const BOOST_CRIT_COLOR = COLOR.blue;
export const BOOST_CRIT_LABEL = "Boost";

// "bounce crit" — a third piggyback proc, same shape as chain (extends the
// landed tier's free-upgrade payout floor by floor) but the walk starts from
// the BOTTOM of the building (floor 0) and climbs up, instead of starting at
// the floor that actually crit — see floorInteractions.ts's applyChainCrit
// call with startIndex -1
export const BOUNCE_CRIT_CHANCE = CONFIG.crit.bounceChance;
export const BOUNCE_CRIT_CONTINUE_CHANCE = CONFIG.crit.bounceContinueChance;
export const BOUNCE_CRIT_LABEL = "Bounce";

// "explosion crit" — a fourth piggyback proc, same shape as chain again, but
// spreads BOTH directions (up AND down) from the floor that actually crit,
// instead of only upward — see floorInteractions.ts's applyExplosionCrit
export const EXPLOSION_CRIT_CHANCE = CONFIG.crit.explosionChance;
export const EXPLOSION_CRIT_CONTINUE_CHANCE =
  CONFIG.crit.explosionContinueChance;
export const EXPLOSION_CRIT_LABEL = "Boom";

// "booty crit" — a fifth piggyback proc, a flat one-time effect (not
// tier-scaled) like boost: doubles the CURRENTLY ACTIVE company's total
// income once, applied by floorInteractions.ts
export const BOOTY_CRIT_CHANCE = CONFIG.crit.bootyChance;
export const BOOTY_CRIT_COLOR = COLOR.gold;
export const BOOTY_CRIT_LABEL = "Booty";

// "upgrade crit" — a sixth piggyback proc, a flat one-time effect (not
// tier-scaled) like boost/booty: permanently promotes the affected floor's
// (or, for a building-unlock crit, every floor in that building's) own
// critMultiplierTier one step further — applied by floorInteractions.ts/
// main.ts using nextCritTier (defined further down this file)
export const UPGRADE_CRIT_CHANCE = CONFIG.crit.upgradeChance;
export const UPGRADE_CRIT_COLOR = COLOR.cyan;
export const UPGRADE_CRIT_LABEL = "Upgrade";

// state for all three piggyback procs lives here too (not upgradeButton.ts) so
// the whole "what can ride along with a landed crit" system stays in one place
const chainCrits = new WeakSet<Floor>();
const boostCrits = new WeakSet<Floor>();
const bounceCrits = new WeakSet<Floor>();
const explosionCrits = new WeakSet<Floor>();
const bootyCrits = new WeakSet<Floor>();
const upgradeCrits = new WeakSet<Floor>();

// call once a tier has just landed (see rollCrit below) to roll all five
// piggyback procs — each is rolled independently, but at most
// MAX_SPECIAL_CRIT_PROCS of the ones that actually land get applied (picked
// randomly among them) so a single crit can never stack every proc at once
export const MAX_SPECIAL_CRIT_PROCS = 2;

// gateway roll checked ONCE before any individual proc chance is even rolled
// (see CONFIG.crit's own comment) — a miss here skips the whole system
// silently for this crit, no procs possible at all this time
export const SPECIAL_CRIT_GATEWAY_CHANCE = CONFIG.crit.specialCritGatewayChance;

// Fisher-Yates shuffle then keep only the first `max` — the generic mechanic
// behind capping how many piggyback procs land on the same crit at once,
// used by rollCrit below
export function pickAtMost<T>(items: T[], max: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, max);
}

// full result of one rollCrit() call once a tier has actually landed — the
// one shape both rollCritUpgrade (per-click, upgradeButton.ts) and
// rollFloorBuyCrit (one-shot floor/building purchase, also upgradeButton.ts)
// now get back from the exact same shared roll
export interface CritRollResult {
  tier: CritTier;
  chain: boolean;
  boost: boolean;
  bounce: boolean;
  explosion: boolean;
  booty: boolean;
  upgrade: boolean;
}

// the ONE shared "roll a crit" entry point: walks CRIT_TIER_ORDER rarest-first
// for the tier (previously duplicated separately by rollCritUpgrade and
// rollFloorBuyCrit), then — only if a tier actually landed — rolls the
// special-proc gateway, all 6 independent proc chances, and caps the result to
// MAX_SPECIAL_CRIT_PROCS. `onLanded` is called exactly once, with the full
// result, if and only if a tier landed — a miss is silent, onLanded is never
// invoked. Callers decide what "landing" means for their own case: mutating a
// Floor's armed state (rollCritUpgrade) vs. just capturing the result to
// return (rollFloorBuyCrit) — this function itself has no Floor/state
// dependency at all
export function rollCrit(onLanded: (result: CritRollResult) => void): void {
  for (const tier of CRIT_TIER_ORDER) {
    if (Math.random() < CRIT_TIER_CONFIG[tier].chance) {
      type ProcKind =
        | "chain"
        | "boost"
        | "bounce"
        | "explosion"
        | "booty"
        | "upgrade";
      const landed: ProcKind[] = [];
      if (Math.random() < SPECIAL_CRIT_GATEWAY_CHANCE) {
        if (Math.random() < CHAIN_CRIT_CHANCE) landed.push("chain");
        if (Math.random() < BOOST_CRIT_CHANCE) landed.push("boost");
        if (Math.random() < BOUNCE_CRIT_CHANCE) landed.push("bounce");
        if (Math.random() < EXPLOSION_CRIT_CHANCE) landed.push("explosion");
        if (Math.random() < BOOTY_CRIT_CHANCE) landed.push("booty");
        if (Math.random() < UPGRADE_CRIT_CHANCE) landed.push("upgrade");
      }
      const kept = new Set(pickAtMost(landed, MAX_SPECIAL_CRIT_PROCS));
      onLanded({
        tier,
        chain: kept.has("chain"),
        boost: kept.has("boost"),
        bounce: kept.has("bounce"),
        explosion: kept.has("explosion"),
        booty: kept.has("booty"),
        upgrade: kept.has("upgrade"),
      });
      return;
    }
  }
}

// whether the CURRENTLY ARMED crit (if any) is also a chain/boost/bounce
// crit — see rollCrit/floorInteractions.ts's plain-click crit branch
export function isChainCrit(floor: Floor): boolean {
  return chainCrits.has(floor);
}

export function isBoostCrit(floor: Floor): boolean {
  return boostCrits.has(floor);
}

export function isBounceCrit(floor: Floor): boolean {
  return bounceCrits.has(floor);
}

export function isExplosionCrit(floor: Floor): boolean {
  return explosionCrits.has(floor);
}

export function isBootyCrit(floor: Floor): boolean {
  return bootyCrits.has(floor);
}

export function isUpgradeCrit(floor: Floor): boolean {
  return upgradeCrits.has(floor);
}

// call right when an armed crit's click is handled, before rolling the next one
export function consumeCritProcs(floor: Floor): void {
  chainCrits.delete(floor);
  boostCrits.delete(floor);
  bounceCrits.delete(floor);
  explosionCrits.delete(floor);
  bootyCrits.delete(floor);
  upgradeCrits.delete(floor);
}

// dev/test-only: force the proc onto whatever tier the caller already armed
// (see upgradeButton.ts's forceChainCritUpgrade/forceBoostCritUpgrade/
// forceBounceCritUpgrade), bypassing chance entirely
export function forceChainCritProc(floor: Floor): void {
  chainCrits.add(floor);
}

export function forceBoostCritProc(floor: Floor): void {
  boostCrits.add(floor);
}

export function forceBounceCritProc(floor: Floor): void {
  bounceCrits.add(floor);
}

export function forceExplosionCritProc(floor: Floor): void {
  explosionCrits.add(floor);
}

export function forceBootyCritProc(floor: Floor): void {
  bootyCrits.add(floor);
}

export function forceUpgradeCritProc(floor: Floor): void {
  upgradeCrits.add(floor);
}

// rarer tiers always carry a bigger multiplier by design (see CRIT_TIER_CONFIG),
// so that's a safe, already-canonical rank to compare tiers by — null (no tier)
// always loses to any real tier
function critTierRank(tier: CritTier | null): number {
  return tier ? CRIT_TIER_CONFIG[tier].multiplier : 0;
}

// whichever of a/b is rarer/bigger; used when a fresh roll should only ever
// upgrade a floor's existing permanent tier, never downgrade it
export function pickHigherCritTier(
  a: CritTier | null,
  b: CritTier | null,
): CritTier | null {
  return critTierRank(b) > critTierRank(a) ? b : a;
}

// weakest-first promotion order — the reverse of CRIT_TIER_ORDER's rarest-first
const CRIT_TIER_PROMOTION_ORDER = [...CRIT_TIER_ORDER].reverse();

// the tier one step up from `tier` (null -> crit -> mega -> ultra, or whatever
// CRIT_TIER_ORDER ends up being once more tiers exist), capped at the top —
// see floorInteractions.ts's overtime-gauge-filled reward, which promotes a
// floor's permanent critMultiplierTier by exactly one step this way
export function nextCritTier(tier: CritTier | null): CritTier {
  if (tier === null) return CRIT_TIER_PROMOTION_ORDER[0];
  const index = CRIT_TIER_PROMOTION_ORDER.indexOf(tier);
  return CRIT_TIER_PROMOTION_ORDER[
    Math.min(index + 1, CRIT_TIER_PROMOTION_ORDER.length - 1)
  ];
}

// the building's own baseline crit tier — the LOWEST tier any current floor
// has, not "every floor must match exactly". A building-wide crit (see
// cityMap/index.ts) sets every floor to the same tier, but individual floors
// can then be promoted further above that (overtime-gauge promotion, a
// floor-buy crit roll) without ever demoting one below it — so requiring an
// EXACT match here used to make this flip back to null the moment just one
// floor got promoted past the rest, which made every floor unlocked
// afterward start back at "no crit" instead of the building's real baseline.
// Taking the lowest tier present is what a brand new floor
// (ensureLockedFloorAbove) should inherit as its own starting default.
export function getUniformCritTier(floors: Floor[]): CritTier | null {
  if (floors.length === 0) return null;
  return floors.reduce<CritTier | null>(
    (lowest, floor) =>
      critTierRank(floor.critMultiplierTier) < critTierRank(lowest)
        ? floor.critMultiplierTier
        : lowest,
    floors[0].critMultiplierTier,
  );
}

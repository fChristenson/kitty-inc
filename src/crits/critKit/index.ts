// the played crits' kit. Every floor, income, button, lock and rate crit is one
// folder, src/crits/<group>Crits/crits/<kind>/, and nothing outside it names
// the crit:
//   meta.ts   its card (label, odds, style; see ./meta), all startup reads
//   index.ts  its animation and its reward (registerFloorCrit, with its
//             group's hooks: see floorCrits/critPlayer's FloorCritDef),
//             loaded when it's armed or plays
// scripts/crit-registry.mjs collects the folders into registry.gen.ts; the
// rolls, the player's loaders and the test buttons all read it from here
import { CRITS, CRIT_LOADERS } from "./registry.gen";

export type { CritMeta, CritStyle } from "./meta";

export type CritGroup = keyof typeof CRITS;
export const CRIT_GROUPS = Object.keys(CRITS) as CritGroup[];

export type FloorCritKind = keyof typeof CRITS.floor;
export type IncomeCritKind = keyof typeof CRITS.income;
export type ButtonCritKind = keyof typeof CRITS.button;
export type LockCritKind = keyof typeof CRITS.lock;
export type RateCritKind = keyof typeof CRITS.rate;
// what the crit player plays: a floor, income, button, lock or rate crit
export type CritPlayKind = keyof typeof CRIT_LOADERS;

// each group's crits, by kind: their cards, chances included
export const PLAYED_CRITS: {
  readonly [G in CritGroup]: (typeof CRITS)[G];
} = CRITS;

const kindsOf = <G extends CritGroup>(group: G) =>
  Object.keys(CRITS[group]) as (keyof (typeof CRITS)[G])[];
export const FLOOR_CRIT_KINDS = kindsOf("floor");
export const INCOME_CRIT_KINDS = kindsOf("income");
export const BUTTON_CRIT_KINDS = kindsOf("button");
export const LOCK_CRIT_KINDS = kindsOf("lock");
export const RATE_CRIT_KINDS = kindsOf("rate");

// the group a played crit belongs to (undefined if it isn't one)
export function critGroupOf(kind: string | null): CritGroup | undefined {
  if (kind === null) return undefined;
  for (const group of CRIT_GROUPS)
    if (Object.hasOwn(CRITS[group], kind)) return group;
  return undefined;
}

export function isFloorCritKind(kind: string | null): kind is FloorCritKind {
  return critGroupOf(kind) === "floor";
}
export function isIncomeCritKind(kind: string | null): kind is IncomeCritKind {
  return critGroupOf(kind) === "income";
}
export function isButtonCritKind(kind: string | null): kind is ButtonCritKind {
  return critGroupOf(kind) === "button";
}
export function isLockCritKind(kind: string | null): kind is LockCritKind {
  return critGroupOf(kind) === "lock";
}
export function isRateCritKind(kind: string | null): kind is RateCritKind {
  return critGroupOf(kind) === "rate";
}

// loads kind's module, which registers it
export function loadCritModule(kind: CritPlayKind): Promise<unknown> {
  return CRIT_LOADERS[kind]();
}

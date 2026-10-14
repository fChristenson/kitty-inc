// the played crits' kit. Every floor, income, button, lock and rate crit is one
// folder, src/crits/<group>Crits/crits/<kind>/, and nothing outside it names
// the crit:
//   meta.ts   its card (label, odds, style; see ./meta), all startup reads
//   index.ts  its animation and its reward (registerFloorCrit, with its
//             group's hooks: see floorCrits/critPlayer's FloorCritDef),
//             loaded when it's armed or plays
// the rolls, the player's loaders and the test buttons all read the folders
// from here
import type { CritMeta } from "./meta";

export type { CritMeta, CritStyle } from "./meta";

export const CRIT_GROUPS = ["floor", "income", "button", "lock", "rate"] as const;
export type CritGroup = (typeof CRIT_GROUPS)[number];

export type FloorCritKind = string;
export type IncomeCritKind = string;
export type ButtonCritKind = string;
export type LockCritKind = string;
export type RateCritKind = string;
// what the crit player plays: a floor, income, button, lock or rate crit
export type CritPlayKind = string;

const METAS = import.meta.glob<CritMeta>(
  [
    "../floorCrits/crits/*/meta.ts",
    "../incomeCrits/crits/*/meta.ts",
    "../buttonCrits/crits/*/meta.ts",
    "../lockCrits/crits/*/meta.ts",
    "../rateCrits/crits/*/meta.ts",
  ],
  { eager: true, import: "default" },
);
const MODULES = import.meta.glob([
  "../floorCrits/crits/*/index.ts",
  "../incomeCrits/crits/*/index.ts",
  "../buttonCrits/crits/*/index.ts",
  "../lockCrits/crits/*/index.ts",
  "../rateCrits/crits/*/index.ts",
]);

// each group's crits, by kind: their cards, chances included
export const PLAYED_CRITS = Object.fromEntries(
  CRIT_GROUPS.map((group) => [group, {}]),
) as Record<CritGroup, Record<string, CritMeta>>;
const LOADERS: Record<string, () => Promise<unknown>> = {};
const GROUP_OF: Record<string, CritGroup> = {};
for (const [path, meta] of Object.entries(METAS)) {
  const [, group, kind] = /^\.\.\/(\w+)Crits\/crits\/(\w+)\//.exec(path)!;
  const load = MODULES[path.replace(/meta\.ts$/, "index.ts")];
  if (!load) throw new Error(`${kind}: a meta.ts with no index.ts`);
  PLAYED_CRITS[group as CritGroup][kind] = meta;
  LOADERS[kind] = load;
  GROUP_OF[kind] = group as CritGroup;
}

export const FLOOR_CRIT_KINDS = Object.keys(PLAYED_CRITS.floor);
export const INCOME_CRIT_KINDS = Object.keys(PLAYED_CRITS.income);
export const BUTTON_CRIT_KINDS = Object.keys(PLAYED_CRITS.button);
export const LOCK_CRIT_KINDS = Object.keys(PLAYED_CRITS.lock);
export const RATE_CRIT_KINDS = Object.keys(PLAYED_CRITS.rate);

// the group a played crit belongs to (undefined if it isn't one)
export function critGroupOf(kind: string | null): CritGroup | undefined {
  return kind !== null && Object.hasOwn(GROUP_OF, kind)
    ? GROUP_OF[kind]
    : undefined;
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
  return LOADERS[kind]();
}

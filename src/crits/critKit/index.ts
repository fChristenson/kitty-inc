// the played crits' kit. Every floor, income, button, lock and rate crit is one
// folder, src/crits/<group>Crits/crits/<kind>/, and nothing outside it names
// the crit:
//   meta.ts   its card (label, odds, style; see ./meta), all startup reads
//   index.ts  its animation and its reward (registerFloorCrit, with its
//             group's hooks: see floorCrits/critPlayer's FloorCritDef),
//             shipped in the played crit chunks of src/crits/chunks (split
//             by size, every group mixed: see scripts/crit-chunks.mjs),
//             loaded at idle or when one of them is armed; none for a floor
//             crit's `twist` (see ./meta)
// the rolls, the player's loaders and the test buttons all read the folders
// from here
import type { CritMeta } from "./meta";
import { PLAYED_CHUNKS, PLAYED_CHUNK_OF } from "../chunks/manifest";
import { loadWhenIdle } from "../../shared/idle";

export type { CritMeta, CritStyle } from "./meta";

export const CRIT_GROUPS = [
  "floor",
  "income",
  "button",
  "lock",
  "rate",
] as const;
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

const chunks = new Map<number, Promise<unknown>>();
function loadPlayedChunk(index: number): Promise<unknown> {
  let chunk = chunks.get(index);
  if (!chunk) {
    chunk = PLAYED_CHUNKS[index]();
    chunk.catch(() => chunks.delete(index));
    chunks.set(index, chunk);
  }
  return chunk;
}

// each group's crits, by kind: their cards, chances included
export const PLAYED_CRITS = Object.fromEntries(
  CRIT_GROUPS.map((group) => [group, {}]),
) as Record<CritGroup, Record<string, CritMeta>>;
const LOADERS: Record<string, () => Promise<unknown>> = {};
const GROUP_OF: Record<string, CritGroup> = {};
for (const [path, meta] of Object.entries(METAS)) {
  const [, group, kind] = /^\.\.\/(\w+)Crits\/crits\/(\w+)\//.exec(path)!;
  const chunk = PLAYED_CHUNK_OF[kind];
  if (!meta.twist && chunk === undefined)
    throw new Error(`${kind}: in no chunk (run scripts/crit-chunks.mjs)`);
  PLAYED_CRITS[group as CritGroup][kind] = meta;
  LOADERS[kind] = meta.twist
    ? () => Promise.resolve()
    : () => loadPlayedChunk(chunk!);
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

// loads kind's module (its whole chunk), which registers it
export function loadCritModule(kind: CritPlayKind): Promise<unknown> {
  return LOADERS[kind]();
}

// queues every played crit chunk, each loaded on its own at idle, so a crit is
// usually in before it's armed
export function queuePlayedCritChunks(): void {
  for (let i = 0; i < PLAYED_CHUNKS.length; i++)
    loadWhenIdle(() => loadPlayedChunk(i));
}

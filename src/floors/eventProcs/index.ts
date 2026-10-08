// the floor view's pools of event procs, one per EventCritType: each event
// module registers itself. Like a special crit, an event only lands on a crit
// — it claims that crit's special slot when the crit is rolled (see
// upgradeButton/crit.ts's rollCritUpgrade) and arms once the player clicks
// it; the events of one type share that type's cooldown
import type { Floor } from "../../gameState";
import type { CritProcKind, CritTier } from "../../shared/critTypes";
import { CONFIG } from "../../config";
import { runWhenIdle } from "../../shared/idle";
import { loadNextEventPart } from "../eventLoader";
import type { FloorRectResolver } from "../../shared/screenFreeze";
import {
  createEventProcPool,
  type EventProcDef,
  type EventProcPool,
} from "../../shared/eventProcPool";

// which floors currently intersect the viewport, each with its world-space top
// (the same space gameCanvas's getFloorRect reports) and the floor-local band
// of it that's actually in view
export interface OnScreenFloor {
  floor: Floor;
  top: number;
  visibleTop: number;
  visibleBottom: number;
}
export type OnScreenFloors = () => OnScreenFloor[];

// the whole visible canvas in a floor's own local coordinates
export type ScreenAreaLocal = (floor: Floor) => {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

// how far inside the visible band an event target's center must sit
const TARGET_VISIBLE_MARGIN = 40;
// well inside the event cooldown
const NEXT_PART_TIMEOUT_MS = 5000;

// whether a floor-local y on that on-screen floor is inside the view area
export function isVisibleOnFloor(entry: OnScreenFloor, y: number): boolean {
  return (
    y - TARGET_VISIBLE_MARGIN >= entry.visibleTop &&
    y + TARGET_VISIBLE_MARGIN <= entry.visibleBottom
  );
}

// what the qualifying click knows about the floor it happened on
export interface EventProcContext {
  floors: Floor[];
  getOnScreenFloors?: OnScreenFloors;
  getFloorRect?: FloorRectResolver;
  getScreenAreaLocal?: ScreenAreaLocal;
  isGroundFloor: boolean;
  // lands one regular crit tier on a floor of this building, paid out at once
  applyTierCrit?: (floor: Floor, tier: CritTier) => void;
  // the same, carrying special crit `kind`, which counts toward its badge
  applyProcCrit?: (floor: Floor, tier: CritTier, kind: CritProcKind) => void;
  // sets a floor's permanent crit tier, celebrated like that tier's crit
  promoteFloorTier?: (floor: Floor, tier: CritTier) => void;
  // unlocks a locked floor for free, rolling its unlock crit like a bought one
  unlockFloorFree?: (floor: Floor) => void;
  // gives a floor `levels` free upgrade levels
  upgradeFloorFree?: (floor: Floor, levels: number) => void;
  // the carrying crit's tier, handed to an event that covers it
  critTier?: CritTier;
}

// an event that covers the crit carrying it: the button shows its label and
// color instead of the tier, and the event reveals and pays that tier itself
export interface EventCritCover {
  label: string;
  color: string;
}
const covers = new Map<string, EventCritCover>();

type FloorEventProc = EventProcDef<Floor, EventProcContext>;
type FloorEventPool = EventProcPool<Floor, EventProcContext>;

// an animated crit: what a regular crit's special slot carries when
// shared/critTypes' rollCrit picks it (CONFIG.specialCrits). Each event crit
// type is a pool of events here, with its own cooldown
export type EventCritType = "animatedCrit";

const EVENT_CRIT_TYPES: EventCritType[] = ["animatedCrit"];
const pools = new Map<EventCritType, FloorEventPool>(
  EVENT_CRIT_TYPES.map((type) => [
    type,
    createEventProcPool<Floor, EventProcContext>(
      () => CONFIG.specialCrits[type].cooldownMs,
    ),
  ]),
);
const poolOfKey = new Map<string, FloorEventPool>();

export function registerEventProc(
  def: FloorEventProc,
  cover?: EventCritCover,
  type: EventCritType = "animatedCrit",
): void {
  const pool = pools.get(type)!;
  pool.register(def);
  poolOfKey.set(def.key, pool);
  if (cover) covers.set(def.key, cover);
}

// the cover of the event claiming floor's armed crit, if it has one
export function getClaimedEventCover(floor: Floor): EventCritCover | null {
  for (const pool of pools.values()) {
    const key = pool.claimedKey(floor);
    if (key !== null) return covers.get(key) ?? null;
  }
  return null;
}

// the crit being rolled on floor carries an animated crit: true when its pool
// claimed one, false when it's cooling down or none of its events can arm
export function claimEventProc(
  floor: Floor,
  context: EventProcContext,
): boolean {
  return pools.get("animatedCrit")!.claim(floor, context);
}

// call right before the player's click spends floor's crit: true when that
// crit carried an event, which armTakenEventProc then arms
export function takeClaimedEventProc(floor: Floor): boolean {
  return [...pools.values()].some((pool) => pool.take(floor));
}

// floor's crit was spent some other way, so its claimed event never happens
export function dropClaimedEventProc(floor: Floor): void {
  for (const pool of pools.values()) pool.drop(floor);
}

export function armTakenEventProc(
  floor: Floor,
  context: EventProcContext,
): boolean {
  return [...pools.values()].some((pool) => pool.armTaken(floor, context));
}

// an event calls this the moment it has fully played out, starting the cooldown
export function endEventProc(key: string): void {
  poolOfKey.get(key)?.ended(key);
  // no event can land during the cooldown: a quiet time to load more of them
  runWhenIdle(() => void loadNextEventPart(), NEXT_PART_TIMEOUT_MS);
}

// for events started outside a roll (dev test hooks)
export function trackEventProc(key: string, floor: Floor): void {
  poolOfKey.get(key)?.track(key, floor);
}

// dev test hook: floor's armed crit carries this event once clicked
export function forceClaimEventProc(key: string, floor: Floor): void {
  poolOfKey.get(key)?.forceClaim(key, floor);
}

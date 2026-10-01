// the floor view's one pool of event-button procs (Boost, Hunt, Swarm): each
// event module registers itself. Like a special crit, an event only lands on
// a crit — it claims that crit's special slot when the crit is rolled (see
// upgradeButton/crit.ts's rollCritUpgrade) and arms once the player clicks
// it, sharing CONFIG.eventProcs.cooldownMs across them all
import type { Floor } from "../../gameState";
import type { CritTier } from "../../shared/critTypes";
import { CONFIG } from "../../config";
import type { FloorRectResolver } from "../../shared/screenFreeze";
import {
  createEventProcPool,
  type EventProcDef,
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
  // sets a floor's permanent crit tier, celebrated like that tier's crit
  promoteFloorTier?: (floor: Floor, tier: CritTier) => void;
  // unlocks a locked floor for free, rolling its unlock crit like a bought one
  unlockFloorFree?: (floor: Floor) => void;
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

const pool = createEventProcPool<Floor, EventProcContext>(
  () => CONFIG.eventProcs.cooldownMs,
);

export function registerEventProc(
  def: FloorEventProc,
  cover?: EventCritCover,
): void {
  pool.register(def);
  if (cover) covers.set(def.key, cover);
}

// the cover of the event claiming floor's armed crit, if it has one
export function getClaimedEventCover(floor: Floor): EventCritCover | null {
  const key = pool.claimedKey(floor);
  return key === null ? null : (covers.get(key) ?? null);
}

// true when an event claimed the special slot of the crit being rolled on floor
export function claimEventProc(
  floor: Floor,
  context: EventProcContext,
): boolean {
  return pool.claim(floor, context);
}

// call right before the player's click spends floor's crit: true when that
// crit carried an event, which armTakenEventProc then arms
export function takeClaimedEventProc(floor: Floor): boolean {
  return pool.take(floor);
}

// floor's crit was spent some other way, so its claimed event never happens
export function dropClaimedEventProc(floor: Floor): void {
  pool.drop(floor);
}

export function armTakenEventProc(
  floor: Floor,
  context: EventProcContext,
): boolean {
  return pool.armTaken(floor, context);
}

// an event calls this the moment it has fully played out, starting the cooldown
export function endEventProc(key: string): void {
  pool.ended(key);
}

// for events started outside a roll (dev test hooks)
export function trackEventProc(key: string, floor: Floor): void {
  pool.track(key, floor);
}

// dev test hook: floor's armed crit carries this event once clicked
export function forceClaimEventProc(key: string, floor: Floor): void {
  pool.forceClaim(key, floor);
}

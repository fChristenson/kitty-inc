// animated crits: the animated events a crit's special slot can carry
// (events/<name>Event, loaded in parts by eventLoader), the pools they claim
// crits from (eventProcs) and the stages and helpers they play out on

export {
  armTakenEventProc,
  getClaimedEventCover,
  takeClaimedEventProc,
} from "./eventProcs";
export type {
  OnScreenFloor,
  OnScreenFloors,
  ScreenAreaLocal,
} from "./eventProcs";
export {
  disarmBoostEvent,
  isBoostEventArmed,
} from "./events/boostEvent/button";
export {
  disarmUnionEvent,
  isUnionEventArmed,
} from "./events/unionEvent/button";
export { disarmHuntEvent, isHuntEventArmed } from "./events/huntEvent/button";
export {
  disarmSwarmEvent,
  isSwarmEventArmed,
  isSwarmSaleActive,
  triggerSwarmSale,
} from "./events/swarmEvent/button";
export { startBoostEvent } from "./events/boostEvent";
export { startUnionEvent } from "./events/unionEvent";
export { startHuntEvent } from "./events/huntEvent";
export { drawRevealStage, revealStageTotalMs } from "./revealStage";
export {
  loadEventCatalog,
  loadNextEventPart,
  queueEventParts,
} from "./eventLoader";
export type { EventCatalog } from "./eventLoader";

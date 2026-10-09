// badge crits: the featured crits with their own art (critData, featured,
// balance), the badges and foils they land, and the badge capsule

export {
  BADGE_GLITTER_AT,
  BADGE_SHIMMER_AT,
  commitCritCounts,
  getBadgeFoil,
  getCritProcCount,
  queueBadgeFoilReveal,
  recordCritProcLanded,
  withDraftCritCounts,
} from "./critProcCounts";
export type { BadgeFoil } from "./critProcCounts";
export { drawCapsuleIcon, playCapsuleRevealBeats } from "./badgeReveal/capsule";
export {
  capsuleRevealContent,
  hasBadgeCapsule,
  takeBadgeCapsule,
} from "./badgeCapsule";
export { getCritBadgeOverlay } from "./critBadgeOverlay";
export {
  FEATURED_CRIT_KINDS,
  loadFeaturedRewards,
  pickFeaturedBadge,
} from "./featuredProcs";

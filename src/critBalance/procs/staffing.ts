// free workers, managers and office items: odds and effect sizes, spread into CONFIG.crit
export const STAFFING_BALANCE = {
  // "Chair Giveaway"/"Supplies Giveaway" crits — flat, not-tier-scaled procs: grant
  // the floor being upgraded its one-time office chairs/supplies purchase
  // (see hud/upgradeMenu's buyOfficeChairs/buyOfficeSupplies) for free,
  // if it doesn't already have it
  chairGiveawayChance: 0.1,
  suppliesGiveawayChance: 0.1,
  // "Intern"/"Union Boss" crits — flat, not-tier-scaled procs: grant the
  // floor being upgraded one free worker/manager (see hud/upgradeMenu's
  // buyWorker/buyManager), free of charge
  internChance: 0.1,
  // "Talent Scout" crit — adds one capped worker, then briefly boosts every
  // actual worker on the critted floor
  talentScoutChance: 0.08,
  unionBossChance: 0.08,
  // "Fully Staffed" crit — fills every unlocked floor to its worker cap and
  // grants every manager-eligible unlocked floor a manager for free
  fullyStaffedChance: 0.02,
  // "Shift Change" crit — fills the critted floor and the immediately lower
  // unlocked floor to the rendered worker cap
  shiftChangeChance: 0.08,
  // "Reinforcements" crit - copies the largest unlocked floor workforce to all
  // other unlocked floors for free
  cloneArmyChance: 0.03,
  // "Golden Handshake" crit — hands every unlocked floor a free manager at
  // once (Union Boss's building-wide sibling)
  goldenHandshakeChance: 0.03,
  // "Supply Run" crit — free office chairs AND supplies for the floor that
  // crit, in one go
  supplyRunChance: 0.08,
  // "Team Building" crit — one free worker on every unlocked floor at once
  // (Intern's building-wide sibling, priced like Golden Handshake)
  teamBuildingChance: 0.03,
  // "Headhunter" crit — matches the floor that crit to the building's
  // best-staffed floor; a no-op if it's already the best, so priced like
  // the other single-floor staffing procs
  headhunterChance: 0.06,
  // "Dress Code" crit — adds a manager or worker on every unlocked floor
  dressCodeChance: 0.08,
  // "Recruitment Drive" crit — fills this floor and contiguous unlocked
  // floors above it, stopping at the first maxed or locked floor
  recruitmentDriveChance: 0.06,
} as const;

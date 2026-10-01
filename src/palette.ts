// Single source of truth for every solid color the game uses. Canvas drawing code
// (floors/, hud/, background/, buildings/, utils.ts) imports COLOR directly.
// style.css's own :root block mirrors these exact hex values as CSS custom
// properties (no build-time link between the two) — keep both in sync by hand
// whenever a color changes here.
export const COLOR = {
  // money: HUD total, income bar fill, upgrade button, idle popup amount, hire button
  moneyGreen: "#22C55E",
  moneyGreenActive: "#16A34A",
  moneyGreenShadow: "#15803D",
  disabledGray: "#6B7280",
  disabledGrayShadow: "#4B5563",

  // sky gradient (gameCanvas)
  skyGround: "#11417F",
  skySpace: "#03040D",

  // building exterior wall
  wall: "#9AA5B1",
  wallShadow: "#7C8794",

  // coin particles (bursts/floats)
  coinGold: "#F5C542",
  // sampled from coinSpin.webp: its highlight, main and face golds
  coinSpriteHighlight: "#F8D858",
  coinSpriteGold: "#F8C818",
  coinSpriteFace: "#F8B818",
  coinOutline: "#8A5A12",
  coinHighlight: "#D9A521",

  // income panel track background
  incomeTrack: "#3D4957",

  // upgrade star badge
  starYellow: "#FBBF24",

  // generic cartoon text/button chrome
  white: "#FFFFFF",
  black: "#000000",
  buttonRing: "#FBFBFB",

  // action bar / menu accent buttons
  blue: "#3B82F6",
  blueActive: "#2563EB",
  blueShadow: "#1D4ED8",
  red: "#DC2626",
  redActive: "#B91C1C",
  amber: "#F59E0B",
  amberActive: "#D97706",
  amberShadow: "#B45309",
  // less saturated amber for worker-menu/popup buttons, so their fill reads calmer
  // than the vivid action-bar boost button, which keeps the vibrant amber above
  amberMuted: "#CC9434",
  amberMutedActive: "#BA7A31",
  amberMutedShadow: "#A26333",
  purple: "#8B5CF6",
  purpleActive: "#7C3AED",
  purpleShadow: "#6D28D9",
  // Tick Tock crit's own dedicated color (previously unused — bounce/
  // explosion crits both use the landed tier's own color instead)
  teal: "#14B8A6",
  // Explosion crit's own dedicated color
  orange: "#F97316",
  // Booty crit's own dedicated color
  gold: "#D4AF37",
  // Upgrade crit's own dedicated color
  cyan: "#06B6D4",
  // Peppermint crit's own dedicated color
  peppermintPink: "#EC4899",
  // Heavenly crit's own dedicated color
  heavenlyGold: "#FFD700",
  // Mystic crit's own dedicated color
  mysticTeal: "#0F766E",
  // Pair crit's own dedicated color
  pairBlue: "#38BDF8",
  // Three of a Kind crit's own dedicated color
  threeOfAKindGreen: "#10B981",
  // Four of a Kind crit's own dedicated color
  fourOfAKindIndigo: "#6366F1",
  // Full House crit's own dedicated color
  fullHouseCrimson: "#E11D48",
  // Royal Flush crit's own dedicated color — a regal purple, distinct from
  // the crit-tier purple and every other poker-hand color above
  royalFlushPurple: "#9333EA",
  // Chair Giveaway crit's own dedicated color
  chairGiveawayBrown: "#92400E",
  // Supplies Giveaway crit's own dedicated color
  suppliesGiveawayLime: "#84CC16",
  // Winter Sale crit's own dedicated color
  winterSaleIceBlue: "#7DD3FC",
  // Spring Sale crit's own dedicated color
  springSalePink: "#F472B6",
  // Summer Sale crit's own dedicated color
  summerSaleOrange: "#FB923C",
  // Autumn Sale crit's own dedicated color
  autumnSaleAmber: "#D97706",
  // Halloween Sale crit's own dedicated color
  halloweenSalePurple: "#7C3AED",
  // Easter Sale crit's own dedicated color — a soft pastel pink
  easterSalePink: "#F9A8D4",
  // Sunshine crit's own dedicated color
  sunshineGold: "#FACC15",
  // Snowday crit's own dedicated color
  snowdayFrost: "#A5F3FC",
  // Fast Forward crit's own dedicated color
  fastForwardBlue: "#2563EB",
  // Frozen crit's own dedicated color, matching the icecube icon
  frozenIceBlue: "#7DD3E8",
  // Spending Freeze crit's dedicated color
  spendingFreezeTeal: "#14B8A6",
  // Snowball crit's own dedicated color, matching the snowball icon
  snowballBlue: "#93C5FD",
  // Bull Market crit's own dedicated color — a bullish stock-market green
  bullMarketGreen: "#16A34A",
  // Payday crit's own dedicated color — a rich emerald, distinct from every
  // other green already in use
  paydayEmerald: "#059669",
  // Gold Standard crit's own dedicated color — a deep vault-gold, distinct
  // from booty's/heavenly's/mega's own golds
  goldStandardAmber: "#B8860B",
  // Night Shift crit's own dedicated color — a deep midnight indigo,
  // distinct from fourOfAKindIndigo's own brighter shade
  nightShiftIndigo: "#312E81",
  // Intern crit's own dedicated color — a fresh, junior-level sky blue
  internSkyBlue: "#0EA5E9",
  // Talent Scout crit's own dedicated color — a warm recruiting orange
  talentScoutOrange: "#F97316",
  // Union Boss crit's own dedicated color — a stern, authoritative slate
  unionBossSlate: "#475569",
  // Golden Ticket crit's own dedicated color — a bright pale yellow,
  // distinct from every other gold/amber already in use
  goldenTicketYellow: "#FDE047",
  // Silver Ticket crit's own dedicated color — a cool silvery slate,
  // distinct from unionBossSlate's own darker shade
  silverTicketGray: "#CBD5E1",
  // Golden Parachute crit's own dedicated color — a burnt marigold-orange,
  // checked for distinctness against every other gold/amber above
  goldenParachuteMarigold: "#C97A1A",
  // Rain Check crit's own dedicated color — a clear umbrella blue
  rainCheckBlue: "#0284C7",
  // Payout crit's own dedicated color — a deep olive green, checked for
  // distinctness against every other green already in use
  payoutOlive: "#4D7C0F",
  // Grand Opening crit's own dedicated color — bright ceremonial rose-red,
  // distinct from the base ultra red and every other event color
  grandOpeningRose: "#F43F5E",
  // Fully Staffed crit's own dedicated color — a practical workforce green
  // distinct from the money button and existing worker-related proc colors
  fullyStaffedGreen: "#22C55E",
  // Espresso Shot crit's own dedicated color
  espressoShotBrown: "#92400E",
  // Deja Vu crit's own dedicated color
  dejaVuBlue: "#0EA5E9",
  // Reinforcements crit's own dedicated color
  cloneArmyViolet: "#8B5CF6",
  luckyCloverGreen: "#65A30D",
  // Second Wind crit's own dedicated color
  secondWindSky: "#7DA7C9",
  // Executive Order crit's own dedicated color
  executiveOrderTeal: "#0F766E",
  // Round Up crit's own dedicated color
  roundUpOrange: "#EA580C",
  // Safety Net crit's own dedicated color
  safetyNetOrange: "#F97316",
  // Floor Share crit's own dedicated color
  floorShareBlue: "#2563EB",
  // Same Boat crit's own dedicated color
  sameBoatCoral: "#E76F51",
  // Golden Handshake crit's own dedicated color
  goldenHandshakeGold: "#CA8A04",
  // Supply Run crit's own dedicated color
  supplyRunTan: "#B45309",
  // Casual Friday crit's own dedicated color
  casualFridayTeal: "#0D9488",
  // Fancy Friday crit's own dedicated color
  fancyFridayIndigo: "#4338CA",
  // Fire Drill crit's own dedicated color
  fireDrillRed: "#DC2626",
  // Bonus Round crit's own dedicated color
  bonusRoundGold: "#D97706",
  // Overflow crit's own dedicated color
  overflowBlue: "#0369A1",
  // Performance Bonus crit's own dedicated color
  performanceBonusBlue: "#0284C7",
  // Double Down crit's own dedicated color
  doubleDownCrimson: "#9F1239",
  // Coffee Run crit's own dedicated color
  coffeeRunTeal: "#0E7490",
  // Team Building crit's own dedicated color
  teamBuildingCoral: "#F97056",
  // Spring Cleaning crit's own dedicated color
  springCleaningMint: "#14919B",
  // Night Owl crit's own dedicated color
  nightOwlIndigo: "#3730A3",
  // Headhunter crit's own dedicated color
  headhunterRust: "#C2410C",
  // Dress Code crit's own dedicated color
  dressCodeGreen: "#15803D",
  // Tea Break crit's own dedicated color
  teaBreakBrown: "#A16207",
  // Recruitment Drive crit's own dedicated color
  recruitmentDriveBlue: "#2563EB",
  // Merger crit's own dedicated color
  mergerGold: "#A16207",
  shareholdersGreen: "#166534",
  rateLockBlue: "#0EA5E9",

  // wood/dialog chrome (worker menu, idle popup panels)
  woodFill: "#F8D18E",
  woodOutline: "#302721",
  woodRing: "#FAF2DD",
  woodText: "#3A2A18",

  // Alchemy event's cauldron and its brew
  cauldronIron: "#3F4654",
  cauldronIronDark: "#262B35",
  potionGreen: "#7CDB3C",
  potionGreenLight: "#C6F57E",

  // Hourglass event's wooden frame
  hourglassWood: "#B9773D",
  hourglassWoodDark: "#8A5226",

  // Harvest event's dirt patches, leafy tops and seeds
  soil: "#8B5A33",
  soilDark: "#4E301A",
  cropLeaf: "#4CB944",
  cropLeafLight: "#9BE36A",
  seed: "#6B4A2B",

  // Rocket event's rocket and its flame
  rocketBody: "#F1F5F9",
  rocketRed: "#E11D48",
  rocketWindow: "#38BDF8",
  rocketNozzle: "#475569",
  flameOrange: "#FB923C",
  flameYellow: "#FDE047",
  rocketSmoke: "#E5E7EB",

  // the wisp's golden glitter (shared/wisp)
  wispGlitter: "#FFE9A8",
  wispSand: "#F2B33D",

  // Reveal event's blue "new badge" stage and its speed stripes
  revealSky: "#6FD0FF",
  revealBlue: "#1E5BD8",
  // the Rising Tide's water, clear near its surface, deep further down
  tideShallow: "#4FC3F7",
  tideDeep: "#1565C0",
  revealDeep: "#0A1A5C",
  revealStripe: "#9ADCFF",

  // page chrome
  pageBg: "#111417",
  pageText: "#F5F5F5",
  canvasBg: "#1A2027",
} as const;

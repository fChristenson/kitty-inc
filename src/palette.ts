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

  // wood/dialog chrome (worker menu, idle popup panels)
  woodFill: "#F8D18E",
  woodOutline: "#302721",
  woodRing: "#FAF2DD",
  woodText: "#3A2A18",

  // page chrome
  pageBg: "#111417",
  pageText: "#F5F5F5",
  canvasBg: "#1A2027",
} as const;

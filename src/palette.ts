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
  incomeTrack: "#1E293B",

  // upgrade star badge
  starYellow: "#FBBF24",

  // generic cartoon text/button chrome
  white: "#FFFFFF",
  black: "#000000",
  buttonOutline: "#1E2831",
  buttonRing: "#FBFBFB",

  // action bar / menu accent buttons
  blue: "#3B82F6",
  blueActive: "#2563EB",
  blueShadow: "#1D4ED8",
  red: "#DC2626",
  redActive: "#B91C1C",
  amber: "#F59E0B",
  amberActive: "#D97706",
  purple: "#8B5CF6",
  purpleActive: "#7C3AED",

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

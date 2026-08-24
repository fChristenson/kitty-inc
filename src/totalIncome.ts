import type { Floor } from "./floors";
import { collectDueIncome } from "./incomePanel";

// suffix tiers for compact large-number formatting (short scale). plain integers
// already fit the 6-digit cap below one million, so suffixes only start at "M"
const SUFFIX_TIERS: { value: number; suffix: string }[] = [
  { value: 1e33, suffix: "Dc" }, // decillion
  { value: 1e30, suffix: "No" }, // nonillion
  { value: 1e27, suffix: "Oc" }, // octillion
  { value: 1e24, suffix: "Sp" }, // septillion
  { value: 1e21, suffix: "Sx" }, // sextillion
  { value: 1e18, suffix: "Qi" }, // quintillion
  { value: 1e15, suffix: "Qa" }, // quadrillion
  { value: 1e12, suffix: "T" }, // trillion
  { value: 1e9, suffix: "B" }, // billion
  { value: 1e6, suffix: "M" }, // million
];

const DIGIT_CAP = 6; // max significant digits shown, e.g. "123.457M" or "999999"

export function formatTotalIncome(value: number): string {
  const rounded = Math.max(0, Math.floor(value));
  if (rounded < 1e6) return rounded.toString();

  const tier =
    SUFFIX_TIERS.find((t) => rounded >= t.value) ??
    SUFFIX_TIERS[SUFFIX_TIERS.length - 1];
  const scaled = rounded / tier.value;
  const intDigits = Math.floor(scaled).toString().length;
  const decimals = Math.max(0, DIGIT_CAP - intDigits);
  const trimmed = scaled
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return `${trimmed}${tier.suffix}`;
}

export function getTotalIncome(): number {
  return totalIncome;
}

// deducts amount from the running total if affordable; returns whether the spend succeeded
export function spendTotalIncome(amount: number): boolean {
  if (totalIncome < amount) return false;
  totalIncome -= amount;
  return true;
}

export function clearTotalIncome(): void {
  // also zero the in-memory value: location.reload() fires beforeunload first,
  // and that handler re-saves whatever totalIncome currently holds
  totalIncome = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

const STORAGE_KEY = "cash-clicker:total-income";
const SAVE_INTERVAL_MS = 1000;

function loadStoredTotal(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function saveStoredTotal(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

let totalIncome = loadStoredTotal();

// pays out each unlocked floor's income only once its fill-bar cycle actually completes,
// instead of accruing fractional $ continuously underneath a bar that looks stepped;
// runs its own rAF loop, independent of canvas redraws. read the total via getTotalIncome()
export function startTotalIncomeTicker(floors: Floor[]): void {
  let lastSave = performance.now();
  const tick = () => {
    const now = performance.now();
    for (const floor of floors) {
      if (!floor.unlocked) continue;
      totalIncome += collectDueIncome(floor, now);
    }

    if (now - lastSave >= SAVE_INTERVAL_MS) {
      lastSave = now;
      saveStoredTotal(totalIncome);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  window.addEventListener("beforeunload", () => saveStoredTotal(totalIncome));
}

// arbitrary-magnitude $ number, stored as mantissa (0, or 1 <= |mantissa| < 10)
// and exponent (integer power of 10) — plain `number` (float64) hard-caps at
// ~1.8e308; enough repeated exponential growth (a very high floor level, or
// bulk-buying hundreds of upgrades at once via corporationUpgradeMenu's x250
// multiplier) used to overflow that straight to `Infinity`, permanently
// soft-locking whatever it happened to (an Infinity cost is never affordable).
// Every operation here is written so it NEVER computes `10 ** hugeExponent`
// directly — only ever `10 ** smallBoundedDiff` (add/subtract, capped at 17,
// the float64 precision limit) or adds/multiplies already-safe small mantissas
// (multiply/pow) — so the exponent itself can grow arbitrarily large (bounded
// only by JS's safe-integer range, i.e. never in practice) without ever
// overflowing. Plain object shape (not a class) so it stays trivially
// JSON-serializable for localStorage persistence (see gameState.ts)
export interface BigNumber {
  readonly mantissa: number;
  readonly exponent: number;
}

export const ZERO: BigNumber = { mantissa: 0, exponent: 0 };

// a $ field as it may appear in a pre-BigNumber save (gameState.ts's SavedFloor,
// company.ts's CompanyRecord): the new {mantissa, exponent} shape (already
// plain-JSON-safe, written going forward), or a plain number (every save
// written before this migration) — toBigNumber below normalizes either
export type SerializedBigNumber =
  | number
  | { mantissa: number; exponent: number };

export function toBigNumber(
  value: SerializedBigNumber | undefined | null,
): BigNumber {
  if (value === undefined || value === null) return ZERO;
  if (typeof value === "number") return fromNumber(value);
  return { mantissa: value.mantissa, exponent: value.exponent };
}

// float64 has ~15-17 significant decimal digits — once two magnitudes differ
// by more than this, the smaller one can't affect the larger one's mantissa at
// all (same reasoning as adding 1 to 1e20 in plain floats doing nothing)
const PRECISION_DIGITS = 17;

export function isZero(value: BigNumber): boolean {
  return value.mantissa === 0;
}

// re-normalizes a mantissa that's temporarily out of the [1, 10) range (e.g.
// right after adding/multiplying two normalized mantissas together) — only
// ever called with an already-small, bounded mantissa (at most ~100 from a
// multiply, ~20 from an add), so these loops run at most 1-2 iterations, never
// unbounded
function normalize(mantissa: number, exponent: number): BigNumber {
  if (mantissa === 0 || !Number.isFinite(mantissa)) return ZERO;
  const sign = mantissa < 0 ? -1 : 1;
  let m = Math.abs(mantissa);
  let e = exponent;
  while (m >= 10) {
    m /= 10;
    e += 1;
  }
  while (m < 1) {
    m *= 10;
    e -= 1;
  }
  return { mantissa: sign * m, exponent: e };
}

// a plain JS number is always safely within float64 range by definition, so
// toExponential() here can never overflow — this is the one safe on-ramp from
// a normal number into a BigNumber
export function fromNumber(value: number): BigNumber {
  if (value === 0 || !Number.isFinite(value)) return ZERO;
  const sign = value < 0 ? -1 : 1;
  const [mantissaStr, expStr] = Math.abs(value).toExponential(15).split("e");
  return normalize(sign * Number(mantissaStr), Number(expStr));
}

// lossy escape hatch back to a plain number — for callers that only need a
// rough magnitude (e.g. a percentage/log calculation) or already know the
// value is small. Can legitimately return Infinity for a value too big for
// float64; never use this for an affordability compare or money math
export function toNumber(value: BigNumber): number {
  return value.mantissa * 10 ** value.exponent;
}

export function add(a: BigNumber, b: BigNumber): BigNumber {
  if (isZero(a)) return b;
  if (isZero(b)) return a;
  const baseExponent = Math.max(a.exponent, b.exponent);
  const diffA = baseExponent - a.exponent;
  const diffB = baseExponent - b.exponent;
  const ma = diffA > PRECISION_DIGITS ? 0 : a.mantissa / 10 ** diffA;
  const mb = diffB > PRECISION_DIGITS ? 0 : b.mantissa / 10 ** diffB;
  return normalize(ma + mb, baseExponent);
}

// money never goes negative in this game — a result that would be negative
// (b bigger than a, or float precision right at the PRECISION_DIGITS cutoff)
// clamps to ZERO instead of returning a signed result
export function subtract(a: BigNumber, b: BigNumber): BigNumber {
  if (isZero(b)) return a;
  if (isZero(a)) return ZERO;
  const baseExponent = Math.max(a.exponent, b.exponent);
  const diffA = baseExponent - a.exponent;
  const diffB = baseExponent - b.exponent;
  const ma = diffA > PRECISION_DIGITS ? 0 : a.mantissa / 10 ** diffA;
  const mb = diffB > PRECISION_DIGITS ? 0 : b.mantissa / 10 ** diffB;
  const result = ma - mb;
  if (result <= 0) return ZERO;
  return normalize(result, baseExponent);
}

export function multiplyBig(a: BigNumber, b: BigNumber): BigNumber {
  if (isZero(a) || isZero(b)) return ZERO;
  return normalize(a.mantissa * b.mantissa, a.exponent + b.exponent);
}

// scales by a plain finite multiplier (a growth rate like 1.3, a percentage
// like 0.1, a boost multiplier, ...) — scalar itself is never expected to be
// astronomically large, so fromNumber(scalar) is always safe
export function multiply(a: BigNumber, scalar: number): BigNumber {
  if (scalar === 0 || isZero(a)) return ZERO;
  return multiplyBig(a, fromNumber(scalar));
}

// divides by a plain finite, non-zero scalar (e.g. an interval in seconds) —
// same "scalar is never astronomically large" assumption as multiply
export function divide(a: BigNumber, scalar: number): BigNumber {
  if (isZero(a) || scalar === 0) return ZERO;
  return multiplyBig(a, fromNumber(1 / scalar));
}

// base**exponent via exponentiation by squaring — never computes `base **
// exponent` directly (which is exactly the operation that used to overflow),
// only ever safe BigNumber multiplies of already-bounded mantissas. O(log
// exponent) BigNumber multiplies, so this stays fast even for a floor level in
// the thousands
export function pow(base: number, exponent: number): BigNumber {
  if (exponent <= 0) return fromNumber(1);
  let result = fromNumber(1);
  let b = fromNumber(base);
  let e = exponent;
  while (e > 0) {
    if (e % 2 === 1) result = multiplyBig(result, b);
    b = multiplyBig(b, b);
    e = Math.floor(e / 2);
  }
  return result;
}

// assumes both operands are non-negative (true for every $ value in this
// game — subtract() above already enforces it, nothing ever constructs a
// negative BigNumber otherwise)
export function compare(a: BigNumber, b: BigNumber): number {
  if (a.exponent !== b.exponent) return a.exponent > b.exponent ? 1 : -1;
  if (a.mantissa === b.mantissa) return 0;
  return a.mantissa > b.mantissa ? 1 : -1;
}

export function lt(a: BigNumber, b: BigNumber): boolean {
  return compare(a, b) < 0;
}
export function lte(a: BigNumber, b: BigNumber): boolean {
  return compare(a, b) <= 0;
}
export function gt(a: BigNumber, b: BigNumber): boolean {
  return compare(a, b) > 0;
}
export function gte(a: BigNumber, b: BigNumber): boolean {
  return compare(a, b) >= 0;
}
export function eq(a: BigNumber, b: BigNumber): boolean {
  return compare(a, b) === 0;
}

export function max(a: BigNumber, b: BigNumber): BigNumber {
  return gte(a, b) ? a : b;
}
export function min(a: BigNumber, b: BigNumber): BigNumber {
  return lte(a, b) ? a : b;
}

// log10 of the real value, as a plain (possibly huge but always finite for any
// realistic magnitude) number — safe because it's just mantissa's own small
// log10 plus the exponent, never `Math.log10` of the reconstructed huge value
// itself. Used by corporationBoostMenu's getCompanyBaseModifierPercent
// (sqrt(log10(companyValue)))
export function log10(value: BigNumber): number {
  if (isZero(value)) return -Infinity;
  return Math.log10(value.mantissa) + value.exponent;
}

// inverse of log10() above — builds a BigNumber directly from its log10
// value without ever computing `10 ** logValue` on the whole (possibly huge)
// number, only `10 ** fractionalPart` (always in [1, 10), always safe).
// Exponentiates a BigNumber's log10 value directly (a plain BigNumber has no
// fractional-exponent pow of its own — shared/bigNumber's own pow() only
// supports integer exponents)
export function fromLog10(logValue: number): BigNumber {
  if (!Number.isFinite(logValue)) return ZERO;
  const exponent = Math.floor(logValue);
  const mantissa = 10 ** (logValue - exponent);
  return normalize(mantissa, exponent);
}

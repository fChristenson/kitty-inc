// a played crit's card: its src/crits/<group>Crits/crits/<kind>/meta.ts
// default-exports one (`export default { ... } satisfies CritMeta`), all
// startup reads of a crit (critKit globs every one)

// the animation styles (copilot-instructions' Animation styles); "number" is
// the crit's number itself thrown about, "bars" the bars themselves moving
export type CritStyle =
  | "money"
  | "wisp"
  | "mix"
  | "beam"
  | "lightning"
  | "explosion"
  | "gunfire"
  | "bounce"
  | "drill"
  | "spray"
  | "race"
  | "clutter"
  | "galaxy"
  | "drawing"
  | "charge"
  | "portal"
  | "slice"
  | "pull"
  | "summon"
  | "snowball"
  | "ripple"
  | "crush"
  | "blade"
  | "number"
  | "bars"
  | "experiment";

export interface CritMeta {
  // its name on its test button
  label: string;
  // its odds within its group's slot, relative to the group's sum
  chance: number;
  style: CritStyle;
  // its own amounts (taps per multiple, payouts...), read by its index.ts
  values?: Record<string, number>;
  // a floor crit that twists the tier crit itself instead of playing out (no
  // index.ts): it lands on the floor above or below too, or a second number
  // merges into it
  twist?: "up" | "down" | "merge";
  // its test button sits under New Effects until it's been tested
  isNew?: boolean;
}

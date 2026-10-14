// a played crit's card: its src/crits/<group>Crits/crits/<kind>/meta.ts
// default-exports one (`export default { ... } satisfies CritMeta`), literals
// only: scripts/crit-registry.mjs copies it into registry.gen.ts, which is
// all startup reads of a crit

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
  // its test button sits under New Effects until it's been tested
  isNew?: boolean;
}

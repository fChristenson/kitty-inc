// an animated crit's card: its src/crits/animatedCrits/events/<name>Event/
// meta.ts default-exports one (`export default { ... } as const satisfies
// EventMeta`): read by its own module and by the test panel (eventMetas)
export interface EventMeta {
  // its name on its test button
  label: string;
  // its style and reward words ("explosion", "levels, crit tiers"), for the
  // crit tallies (scripts/crit-dist.mjs)
  style?: string;
  reward?: string;
  // its odds among the animated crits
  chance?: number;
  // its own timings and amounts, read by its module
  values?: Readonly<Record<string, unknown>>;
  // its test button sits under New Effects until it's been tested
  isNew?: boolean;
}

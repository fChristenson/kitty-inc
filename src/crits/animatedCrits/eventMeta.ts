// an animated crit's card: its src/crits/animatedCrits/events/<name>Event/
// meta.ts default-exports one (`export default { ... } satisfies EventMeta`),
// read by the test panel (eventMetas)
export interface EventMeta {
  // its name on its test button
  label: string;
  // its test button sits under New Effects until it's been tested
  isNew?: boolean;
}

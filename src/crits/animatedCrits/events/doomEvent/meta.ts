import type { EventMeta } from "../../eventMeta";

// the floors' screen rises like a shutter onto a tech-base corridor, the view
// marches down it shotgunning demons, a big one last, and rushes through the
// exit door onto the floors
export default {
  label: "Doom",
  style: "fps",
  reward: "perma tier",
  chance: 0.01,
  values: {
    doorMs: 450, // the shutter rising and the shotgun coming up
    walkMs: 3400, // the march down the corridor, blasting the demon heads
    flyMs: 250, // the rush at the exit, until the floors behind it come close
  },
} as const satisfies EventMeta;

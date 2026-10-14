// the tap perks more than one crit leaves on a button (a crit's own perk
// lives in its module: see buttonBonus' defineTapPerk)
import { defineTapPerk } from "./buttonBonus";

// each tap landing a second level
export const doubleTaps = defineTapPerk(
  "Double",
  (t) => t.levelUp(t.floor, 1, "+2 Lvl"),
  true,
);

// Momentum, a rate crit: the number drops onto the top bar as a wisp ball
// that rolls along it picking up its glitter, then drops onto each bar below
// and rolls back, bigger and quicker; each bar it rolls off turns over: for
// a while every payout a step bigger than the one before. It bursts on its
// own bar
import { registerFloorCrit } from "../../../floorCrits/critPlayer";
import { barRoll } from "../../../floorCrits/critPlayer/barRoll";

// shakes by step: unused, a bar rolled off, its own burst
registerFloorCrit("momentumCrit", barRoll(1, 2, [0.6, 0.6, 2.8]));

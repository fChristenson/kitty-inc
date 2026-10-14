// Roll Call, a floor crit: the number drops onto the top bar as a wisp ball
// that rolls along it from rest, the glitter lying on it sticking on and
// turning with it; it drops onto each bar below and rolls back, bigger and
// quicker, each bar taking its levels as it rolls off; on its own bar it
// bursts, its crust flung off in a rattle of blasts
import { registerFloorCrit } from "../../critPlayer";
import { barRoll } from "../../critPlayer/barRoll";

// shakes by step: a bar rolled off, the burst
registerFloorCrit("rollCallCrit", barRoll(0, 1, [0.6, 2.8]));

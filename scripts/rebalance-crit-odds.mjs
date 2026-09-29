// node scripts/rebalance-crit-odds.mjs [--dry]
// resets every featured crit's chance by effect group (see lib/crit-odds.mjs)
import { rebalanceCritOdds } from "./lib/crit-odds.mjs";

await rebalanceCritOdds({ write: !process.argv.includes("--dry") });

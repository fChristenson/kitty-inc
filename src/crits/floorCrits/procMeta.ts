// a proc: a special crit riding on a landed tier, its reward applied by
// floorCritRewards; one folder per proc under floorCrits/procs
import type { ImageName } from "../../loadAssets";

export interface ProcMeta {
  label: string;
  color: string;
  icon: ImageName;
  description: string;
  // rolled once per landed tier that passes the special crit gateway
  chance: number;
  // its own amounts
  values?: Readonly<Record<string, number>>;
}

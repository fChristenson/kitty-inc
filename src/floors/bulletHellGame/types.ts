import type { Range } from "../../shared/easing";

// one bullet hell crit's game (CONFIG.specialCrits.bulletHellCrit.games):
// how its wisps move and what the held button fires at them

interface WispsBase {
  max: number; // on screen at once
  group: number; // popping in together
  spawnMs: Range; // between spawns, quickening
  size: number; // × WISP_SIZE
  split: number; // generations a wisp shot down splits into two smaller ones
}
export type BulletHellWisps = WispsBase &
  (
    | { move: "loop"; laps: Range; speedUp: number }
    | { move: "dart"; hopMs: Range; reach: Range; snapMs: number }
    | {
        move: "flock";
        leaderLaps: Range;
        swarmRadius: Range;
        swirlHz: number;
        snapMs: number;
      }
    // rings as fractions of the largest that fits the screen
    | { move: "orbit"; rings: readonly number[]; squash: number; lapsHz: Range }
    | { move: "drift"; speed: Range }
  );

interface ShotsBase {
  fireMs: number; // between shots while held
  size: number; // × WISP_SIZE
}
export type BulletHellShots = ShotsBase &
  (
    | { kind: "straight"; speed: number; jitter: number }
    | { kind: "spread"; speed: number; pellets: number; fan: number }
    | {
        kind: "homing";
        speed: Range;
        accelMs: number;
        turn: number; // rad per ms
        lifeMs: number;
      }
    | { kind: "bounce"; speed: number; bounces: number; pierce: number }
    | {
        kind: "cluster";
        fuseMs: number;
        lift: number;
        blast: number;
        bomblets: number;
        bombletSpeed: number;
        bombletFuseMs: Range;
        bombletBlast: number;
      }
  );

export interface BulletHellGameConfig {
  label: string;
  chance: number; // its weight among the bullet hell crits
  playMs: number;
  mergeMs: number;
  hitReward: number; // floor income × floor number per wisp shot down
  wisps: BulletHellWisps;
  shots: BulletHellShots;
}

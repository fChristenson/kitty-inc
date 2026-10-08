// the "Seep" event (money; worker perma tiers and cash): it covers its crit,
// whose click freezes the screen while cash starts seeping up out of the
// bottom of the screen in thin wriggling rivulets, one after another, each
// creeping up through the building to a worker in view; as each reaches
// its worker it soaks them in a burst, a bloop and a jolt and they climb a
// perma tier; the last lands in a huge blast and shake and the coins sweep
// into the total. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "seep";
const REWARD = 2;
const MAX_WORKERS = 6;
// rivulets wriggle WIGGLE px either way, WAVES times up their length
const WIGGLE = 26;
const WAVES = 3.5;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceSeepEvent = registerWispEvent(
  KEY,
  "Seep",
  () => CONFIG.seepEvent.chance,
  (floor, context, area) => {
    const { gapsMs, streamMs, travelMs, holdMs, mergeMs } = CONFIG.seepEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => b.at.y - a.at.y);
    if (workers.length === 0) return;
    const pour: Pour = { coinsAlong: 260, width: 14, streamMs, travelMs };
    let clock = 0;
    const rivulets = workers.map((worker, k) => {
      const startX = worker.at.x + (Math.random() - 0.5) * 120;
      const phase = Math.random() * Math.PI * 2;
      const line = sampleLine(
        (u) => ({
          x:
            lerp([startX, worker.at.x], u) +
            Math.sin(u * WAVES * Math.PI * 2 + phase) * WIGGLE * (1 - u),
          y: lerp([area.bottom, worker.at.y], u),
        }),
        50,
      );
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      return { worker, line, starts, lands: starts + travelMs };
    });
    const last = rivulets[rivulets.length - 1];
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      last.lands + holdMs + mergeMs,
    );

    const seeping = createBeats(
      rivulets,
      (r) => r.starts,
      (r) => pourLine(cover!, r.line, pour),
    );
    const soaking = createBeats(
      rivulets,
      (r) => r.lands,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(r.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, rivulets.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          seeping.tick(ms, now);
          soaking.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);

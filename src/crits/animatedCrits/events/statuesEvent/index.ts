// the "Statues" event (an experiment beyond the seven looks: the
// red-light-green-light game; worker perma tiers): it covers its crit,
// whose click freezes the screen while runner wisps line up along the
// bottom of the screen, one for each worker in view; "GO!" flashes in gold
// and they sprint for their workers; "STOP!" and they freeze dead,
// trembling; "GO!" again, quicker, and again, until each one reaches its
// worker with a flash, a bloop and a jolt and the worker climbs a perma
// tier; the last tags in with a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "statues";
const MAX_WORKERS = 6;
const BOTTOM = 60;
// three dashes, each covering a share of the way; a freeze between them
const DASHES = [0.35, 0.35, 0.3];
const STYLE = { fontSize: 46, strokeWidth: 8 };
const CALL_MS = 300;
const RUNNER = 0.4;
const CALL_SHAKE = 0.5;
const TAG_SHAKE: [number, number] = [0.6, 1.3];

export const forceStatuesEvent = registerWispEvent(
  KEY,
  "Statues",
  () => CONFIG.statuesEvent.chance,
  (floor, context, area) => {
    const { dashesMs, freezeMs, holdMs, mergeMs } = CONFIG.statuesEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const go = createCritTextSprite("GO!", COLOR.heavenlyGold, STYLE);
    const stop = createCritTextSprite("STOP!", COLOR.heavenlyGold, STYLE);
    const call: Point = { x: (area.left + area.right) / 2, y: area.top + 220 };
    // the dashes and freezes, as [start, end, share-before, share-after]
    let clock = 0;
    let share = 0;
    const dashes = DASHES.map((d, k) => {
      const span = lerp(dashesMs, k / (DASHES.length - 1));
      const dash = {
        starts: clock,
        ends: clock + span,
        from: share,
        to: share + d,
      };
      clock += span + (k < DASHES.length - 1 ? freezeMs : 0);
      share += d;
      return dash;
    });
    const calls = [
      ...dashes.map((d) => ({ at: d.starts, sprite: go })),
      ...dashes.slice(0, -1).map((d) => ({ at: d.ends, sprite: stop })),
    ];
    const runners = workers.map((worker, k) => {
      const start: Point = {
        x: lerp([area.left + 60, area.right - 60], (k + 0.5) / workers.length),
        y: area.bottom - BOTTOM,
      };
      // later runners are a touch slower, so the tags come one by one
      const pace = 1 + k * 0.06;
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        tags: dashes[dashes.length - 1].ends * pace,
        at: (ms: number): Point => {
          const t = ms / pace;
          let s = 0;
          let shiver = 0;
          for (const d of dashes) {
            if (t < d.starts) break;
            if (t < d.ends) {
              s = lerp([d.from, d.to], (t - d.starts) / (d.ends - d.starts));
              shiver = 0;
              break;
            }
            s = d.to;
            shiver = 3;
          }
          at.x =
            lerp([start.x, worker.at.x], s) + Math.sin(ms * 0.9 + k) * shiver;
          at.y = lerp([start.y, worker.at.y], s);
          return at;
        },
      };
    });
    const last = runners[runners.length - 1];
    const endAt = last.tags;

    const calling = createBeats(
      calls,
      (c) => c.at,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(CALL_SHAKE);
      },
    );
    const tagging = createBeats(
      runners,
      (r) => r.tags,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(r.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TAG_SHAKE, k / Math.max(1, runners.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          calling.tick(ms, now);
          tagging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const c of calls) {
            const t = (ms - c.at) / CALL_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              c.sprite,
              call.x,
              call.y,
              1 + 0.4 * (1 - clamp01(t * 3)),
            );
            ctx.globalAlpha = 1;
          }
          for (const r of runners)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * RUNNER,
              0.7,
              0,
              r.tags,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);

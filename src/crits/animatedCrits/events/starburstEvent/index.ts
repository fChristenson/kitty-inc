// the "Starburst" event (beam; cash): it covers its crit, whose click
// freezes the screen while star shells of light shoot up out of the clicked
// floor's button and burst high over the screen into stars of beams, rays
// flashing out every way at once and spraying coins, each with a bang and a
// jolt; burst after burst, ever bigger, until a giant shell bursts in the
// middle into a star that fills the screen in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "starburst";
const REWARD = 4;
const SHELLS = 5;
const RAYS = 10;
const EDGE = 130;
const TOP = 230;
const REACH: [number, number] = [120, 220];
const FINAL_REACH = 420;
const RAY_MS = 260;
const WIDTH = 16;
const SHELL = 0.35;
const COINS = 24;
const COIN_REACH: [number, number] = [40, 170];
const BURST_SHAKE: [number, number] = [0.6, 1.2];

export const forceStarburstEvent = registerWispEvent(
  KEY,
  "Starburst",
  () => CONFIG.starburstEvent.chance,
  (floor, context, area) => {
    const { shellsMs, riseMs, holdMs, mergeMs } = CONFIG.starburstEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const mid = (area.top + area.bottom) / 2;
    let clock = 0;
    const shells = Array.from({ length: SHELLS + 1 }, (_, k) => {
      const final = k === SHELLS;
      const at: Point = final
        ? { x: (left + right) / 2, y: (top + mid) / 2 }
        : {
            x: lerp([left, right], Math.random()),
            y: lerp([top, mid], Math.random()),
          };
      const leaves = clock;
      const bursts = leaves + riseMs;
      clock += final ? 0 : lerp(shellsMs, k / (SHELLS - 1));
      const reach = final ? FINAL_REACH : lerp(REACH, k / (SHELLS - 1));
      const turn = Math.random() * Math.PI;
      const count = final ? RAYS * 2 : RAYS;
      const rays = Array.from({ length: count }, (_, i) => {
        const a = turn + (i / count) * Math.PI * 2;
        return {
          dx: Math.cos(a),
          dy: Math.sin(a),
          tip: { x: 0, y: 0 } as Point,
        };
      });
      const shell: Point = { x: 0, y: 0 };
      return {
        at,
        leaves,
        bursts,
        reach,
        rays,
        final,
        shell: (ms: number): Point => {
          const u = easeOut(clamp01((ms - leaves) / riseMs));
          shell.x = lerp([button.x, at.x], u);
          shell.y = lerp([button.y, at.y], u);
          return shell;
        },
      };
    });
    const last = shells[SHELLS];
    const endAt = last.bursts;

    const launching = createBeats(
      shells,
      (s) => s.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const bursting = createBeats(
      shells,
      (s) => s.bursts,
      (s, k) => {
        cover!.launchFrom(
          s.at,
          ringTargets(s.at, s.final ? COINS * 3 : COINS, COIN_REACH),
        );
        if (s.final) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / (SHELLS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launching.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + RAY_MS) return;
          for (const s of shells) {
            drawWispBetween(
              ctx,
              s.shell,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.6,
              s.leaves,
              s.bursts,
            );
            const t = (ms - s.bursts) / RAY_MS;
            if (t < 0 || t >= 1) continue;
            const r = s.reach * easeOut(t);
            const fade = 1 - t * t;
            for (const ray of s.rays) {
              ray.tip.x = s.at.x + ray.dx * r;
              ray.tip.y = s.at.y + ray.dy * r;
              drawBeam(
                ctx,
                s.at,
                ray.tip,
                (s.final ? WIDTH * 1.6 : WIDTH) * fade,
                fade,
              );
            }
            drawBeamFlare(ctx, s.at, (s.final ? 80 : 40) * fade, fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

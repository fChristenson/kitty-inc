// the "Confetti Cannon" event (explosion; free upgrade levels): it covers
// its crit, whose click freezes the screen while two cannon wisps fly out of
// the clicked floor's button to the bottom corners of the screen and take
// turns firing: boom, a muzzle flash and a shell arcing high over an income
// bar, where it bursts in a big blast that scatters a cluster of bomblets
// along the bar, popping in a chain from end to end, each with its bang and
// shake, as the bar lands free levels; volley after volley, ever faster,
// until both cannons fire together and their shells burst over the last bar
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "confettiCannon";
const MAX_BARS = 4;
const EDGE = 60;
const SETUP_MS = 260;
const ABOVE = 110;
const LOFT = 220;
const BOMBLETS = 4;
const POP_MS = 45;
const FLASH_MS = 160;
const FLASH = 80;
const CANNON = 0.55;
const SHELL = 0.38;
const FUSE = 14;
const SHELL_BLAST = 230;
const BOMBLET_BLAST = 120;
const FINALE_BLAST = 340;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceConfettiCannonEvent = registerWispEvent(
  KEY,
  "Confetti Cannon",
  () => CONFIG.confettiCannonEvent.chance,
  (floor, context, area) => {
    const { volleysMs, flightMs, holdMs, mergeMs } = CONFIG.confettiCannonEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const posts: Point[] = [
      { x: area.left + EDGE, y: area.bottom - EDGE },
      { x: area.right - EDGE, y: area.bottom - EDGE },
    ];
    const cannons = posts.map((post) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01(ms / SETUP_MS));
        at.x = lerp([button.x, post.x], u);
        at.y = lerp([button.y, post.y], u);
        return at;
      };
    });
    const blasts: Blast[] = [];
    const shells: {
      post: Point;
      angle: number;
      fires: number;
      bursts: number;
      at: (ms: number) => Point;
    }[] = [];
    const fire = (post: Point, over: Point, fires: number) => {
      const ctrl: Point = {
        x: (post.x + over.x) / 2,
        y: Math.min(post.y, over.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      shells.push({
        post,
        angle: Math.atan2(ctrl.y - post.y, ctrl.x - post.x),
        fires,
        bursts: fires + flightMs,
        at: (ms: number): Point =>
          bezier(post, ctrl, over, clamp01((ms - fires) / flightMs), at),
      });
    };
    let clock: number = SETUP_MS;
    const volleys = bars.map((bar, k) => {
      const final = k === bars.length - 1;
      const fires = clock;
      const bursts = fires + flightMs;
      const over: Point = { x: bar.center.x, y: bar.center.y - ABOVE };
      if (final) for (const post of posts) fire(post, over, fires);
      else fire(posts[k % 2], over, fires);
      blasts.push({
        at: over,
        ms: bursts,
        size: final ? FINALE_BLAST : SHELL_BLAST,
        shake: final ? 1.6 : 1,
      });
      // the cluster pops along the bar from the side the shell came from
      const ltr = final || k % 2 === 0;
      for (let b = 0; b < BOMBLETS; b++) {
        const u = (b + 0.5) / BOMBLETS;
        blasts.push({
          at: {
            x: bar.box.x + bar.box.width * (ltr ? u : 1 - u),
            y: bar.center.y,
          },
          ms: bursts + 70 + b * POP_MS,
          size: BOMBLET_BLAST,
          shake: 0.7 + 0.1 * b,
        });
      }
      clock += lerp(volleysMs, k / Math.max(1, bars.length - 1));
      return { bar, over, bursts, done: bursts + 70 + (BOMBLETS - 1) * POP_MS };
    });
    const last = volleys[volleys.length - 1];
    const endAt = last.done;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const firing = createBeats(
      shells,
      (s) => s.fires,
      () => {
        if (cover?.isLive()) shakeScreen(0.5);
      },
    );
    const leveling = createBeats(
      volleys,
      (v) => v.done,
      (v) => {
        cover!.levels(v.bar, levelsFor(v.bar.floor), v.over);
        if (v !== last) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(v.bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          firing.tick(ms, now);
          leveling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of shells) {
            drawMuzzleFlash(
              ctx,
              s.post,
              s.angle,
              (ms - s.fires) / FLASH_MS,
              FLASH,
            );
            if (ms < s.fires || ms >= s.bursts) continue;
            drawLitFuse(ctx, s.at(ms), (ms - s.fires) / flightMs, FUSE, now);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.6,
              s.fires,
              s.bursts,
            );
          }
          if (ms > endAt) return;
          for (const cannon of cannons)
            drawWispBetween(
              ctx,
              cannon,
              ms,
              now,
              WISP_SIZE * CANNON,
              0.5,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

// the "Marble Drop" event (an experiment beyond the seven looks: the
// marbles-on-sticks game; free hires): it covers its crit, whose click
// freezes the screen while a heap of marble wisps tumbles out of the clicked
// floor's button into a nest of crossed light-rods at the top of the
// screen; one by one the rods are yanked out with a swish, and each time
// marbles drop through and bounce down the screen onto empty spots on the
// floors in view, each landing with a pop and a jolt as a new worker forms
// there; the last rod pulls in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "marbleDrop";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const TOP = 210;
// RODS rods ROD px long cross the nest; each pull drops the next marbles
const RODS = 4;
const ROD = 200;
const ROD_W = 6;
const PULL_MS = 120;
const BOUNCES = 2;
const HOP = 50;
const MARBLE = 0.3;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceMarbleDropEvent = registerWispEvent(
  KEY,
  "Marble Drop",
  () => CONFIG.marbleDropEvent.chance,
  (floor, context, area) => {
    const { fillMs, pullsMs, dropMs, holdMs, mergeMs } = CONFIG.marbleDropEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nest: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    let clock: number = fillMs;
    const rods = Array.from({ length: RODS }, (_, i) => {
      const a = (i / RODS) * Math.PI;
      const dx = (Math.cos(a) * ROD) / 2;
      const dy = ((Math.sin(a) * ROD) / 2) * 0.5;
      const pulls = clock;
      clock += lerp(pullsMs, i / (RODS - 1));
      return {
        pulls,
        a: { x: nest.x - dx, y: nest.y - dy } as Point,
        b: { x: nest.x + dx, y: nest.y + dy } as Point,
        tipA: { x: 0, y: 0 } as Point,
        tipB: { x: 0, y: 0 } as Point,
        dx,
        dy,
      };
    });
    // spread the marbles over the pulls
    const marbles = hires.map((hire, k) => {
      const rod =
        rods[Math.min(RODS - 1, Math.floor((k * RODS) / hires.length))];
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const sits: Point = {
        x: nest.x + (Math.random() - 0.5) * 80,
        y: nest.y - 20 - Math.random() * 30,
      };
      const lands = (fillMs * (k + 1)) / (hires.length + 1);
      const drops = rod.pulls + 40 * (k % 2);
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        drops,
        lands: drops + dropMs,
        at: (ms: number): Point => {
          if (ms < drops) {
            const u = easeOut(clamp01(ms / lands));
            at.x =
              lerp([button.x, sits.x], u) +
              (ms > lands ? Math.sin(ms / 60 + k) * 3 : 0);
            at.y = lerp([button.y, sits.y], u);
            return at;
          }
          const u = clamp01((ms - drops) / dropMs);
          const hop =
            Math.abs(Math.sin(u * (BOUNCES + 1) * Math.PI)) * HOP * (1 - u);
          at.x = lerp([sits.x, spot.x], u);
          at.y = lerp([sits.y, spot.y], easeIn(u)) - hop;
          return at;
        },
      };
    });
    const last = marbles.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;

    const pulling = createBeats(
      rods,
      (r) => r.pulls,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      marbles,
      (m) => m.lands,
      (m, k) => {
        giveHire(m.hire);
        if (m === last) {
          cover!.blast(m.spot);
          return;
        }
        cover!.burst(m.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, marbles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          pulling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const r of rods) {
            const out = clamp01((ms - r.pulls) / PULL_MS);
            if (out >= 1) continue;
            // yanked out sideways along its own length
            const shift = easeIn(out) * ROD;
            const k = shift / ROD;
            r.tipA.x = r.a.x + r.dx * 2 * k;
            r.tipA.y = r.a.y + r.dy * 2 * k;
            r.tipB.x = r.b.x + r.dx * 2 * k;
            r.tipB.y = r.b.y + r.dy * 2 * k;
            drawBeam(
              ctx,
              r.tipA,
              r.tipB,
              ROD_W,
              0.7 * (1 - out) * clamp01(ms / 200),
            );
          }
          for (const m of marbles)
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MARBLE,
              0.5,
              0,
              m.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

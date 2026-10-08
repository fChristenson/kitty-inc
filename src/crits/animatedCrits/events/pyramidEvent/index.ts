// the "Pyramid" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while wisps vault out of the clicked floor's button one
// after another and land on each other's shoulders in a pyramid at the
// bottom of the screen, every landing a pop and a jolt; it teeters as the
// screen rumbles, then springs apart from the top down, each wisp flung in
// a high arc onto an empty spot, landing with a bang and a jolt as a new
// worker forms there; the last landing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
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
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "pyramid";
const MAX_HIRES = 6;
const ROWS = [3, 2, 1];
const FORM_MS = 300;
const LIFT = 20;
const BOTTOM = 130;
const SPACE_X = 120;
const SPACE_Y = 105;
const VAULT = 180;
const FLING = 260;
const TEETER = 10;
const WISP = 0.5;
const STACK_SHAKE = 0.3;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forcePyramidEvent = registerWispEvent(
  KEY,
  "Pyramid",
  () => CONFIG.pyramidEvent.chance,
  (floor, context, area) => {
    const { climbMs, vaultMs, teeterMs, flingGapMs, flingMs, holdMs, mergeMs } =
      CONFIG.pyramidEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const midX = (area.left + area.right) / 2;
    const baseY = area.bottom - BOTTOM;
    // the pyramid's spots, base first, as many as there are hires
    const spots: Point[] = ROWS.flatMap((count, row) =>
      Array.from({ length: count }, (_, i) => ({
        x: midX + (i - (count - 1) / 2) * SPACE_X,
        y: baseY - row * SPACE_Y,
      })),
    ).slice(0, hires.length);
    const stackedAt = (spots.length - 1) * climbMs + vaultMs;
    const springsAt = stackedAt + teeterMs;
    // flung from the top down, onto the hires nearest first
    const order = spots.map((_, i) => spots.length - 1 - i);
    const wisps = spots.map((perch, i) => {
      const vaults = i * climbMs;
      const perches = vaults + vaultMs;
      const k = order.indexOf(i);
      const hire = hires[k];
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const flung = springsAt + k * flingGapMs;
      const lands = flung + flingMs;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        perch,
        perches,
        flung,
        lands,
        k,
        at: (ms: number): Point => {
          if (ms < perches) {
            const u = clamp01((ms - vaults) / vaultMs);
            at.x = lerp([button.x, perch.x], u);
            at.y =
              lerp([button.y, perch.y], easeIn(u)) -
              Math.sin(Math.PI * u) * VAULT;
            return at;
          }
          if (ms < flung) {
            // teetering, the top swaying most
            const sway =
              ms > stackedAt
                ? Math.sin(ms * 0.03) *
                  TEETER *
                  (1 + (baseY - perch.y) / SPACE_Y)
                : 0;
            at.x = perch.x + sway;
            at.y = perch.y;
            return at;
          }
          const u = easeOut(clamp01((ms - flung) / flingMs));
          at.x = lerp([perch.x, spot.x], u);
          at.y = lerp([perch.y, spot.y], u) - Math.sin(Math.PI * u) * FLING;
          return at;
        },
      };
    });
    const endAt = Math.max(...wisps.map((w) => w.lands));
    const last = wisps.find((w) => w.lands === endAt)!;

    const stacking = createBeats(
      wisps,
      (w) => w.perches,
      (w) => {
        cover!.burst(w.perch, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(STACK_SHAKE);
      },
    );
    const landing = createBeats(
      wisps,
      (w) => w.lands,
      (w) => {
        giveHire(w.hire);
        if (w === last) {
          cover!.blast(w.spot);
          return;
        }
        cover!.burst(w.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, w.k / Math.max(1, wisps.length - 1)));
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
          stacking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (let i = 0; i < wisps.length; i++)
            drawWispBetween(
              ctx,
              wisps[i].at,
              ms,
              now,
              WISP_SIZE * WISP,
              0.6,
              i * climbMs,
              wisps[i].lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

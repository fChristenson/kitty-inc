// the "Flippers" event (beam; cash): it covers its crit, whose click
// freezes the screen while two blazing flippers of light snap into place
// along the bottom of the screen like a pinball table's and a ball wisp
// drops from the top; each time it rolls down onto a flipper, the flipper
// whacks up with a crack, a flare and a jolt and smashes it high up the
// screen in a gush of cash, and it falls back onto the other one, the rally
// quicker every time; the last whack fires it straight up into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "flippers";
const REWARD = 4;
const SHOTS = 5;
const FLOOR = 150;
const GAP = 70;
const LENGTH = 260;
// the flippers rest REST rad below level and whack up to UP above it
const REST = 0.45;
const UP = -0.5;
const WHACK_MS = 70;
const BACK_MS = 160;
const CONTACT = 0.75;
const BALL_LIFT = 24;
const FLIPPER = 22;
const COINS = 10;
const BALL = 0.6;
const PIVOT = 0.35;
const WHACK_SHAKE: [number, number] = [0.6, 1.4];

export const forceFlippersEvent = registerWispEvent(
  KEY,
  "Flippers",
  () => CONFIG.flippersEvent.chance,
  (floor, context, area) => {
    const { dropMs, shotsMs, finalMs, holdMs, mergeMs } = CONFIG.flippersEvent;
    const total = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const y = area.bottom - FLOOR;
    // left pivot on the left, its tip pointing in and down; the right mirrored
    const pivots: Point[] = [
      { x: mid - GAP - LENGTH, y },
      { x: mid + GAP + LENGTH, y },
    ];
    const dirs = [1, -1];
    const contact = (side: number): Point => ({
      x: pivots[side].x + dirs[side] * Math.cos(REST) * LENGTH * CONTACT,
      y: pivots[side].y + Math.sin(REST) * LENGTH * CONTACT - BALL_LIFT,
    });
    const contacts = [contact(0), contact(1)];
    const top = area.top + 260;
    const spanX = (area.right - area.left) * 0.32;
    let clock = dropMs;
    const shots = Array.from({ length: SHOTS }, (_, k) => {
      const side = k % 2;
      const span = lerp(shotsMs, k / (SHOTS - 1));
      const whacks = clock;
      const peaks = whacks + span * 0.5;
      clock += span;
      const apex: Point = {
        x: mid + (Math.random() - 0.5) * spanX,
        y: top + Math.random() * 160,
      };
      return {
        side,
        whacks,
        peaks,
        lands: clock,
        from: contacts[side],
        apex,
        to: contacts[1 - side],
        line: sampleLine(
          (u) => ({
            x: lerp([contacts[side].x, apex.x], u),
            y: lerp([contacts[side].y, apex.y], easeOut(u)),
          }),
          20,
        ),
      };
    });
    const finalWhack = clock;
    const finalSide = SHOTS % 2;
    const endAt = finalWhack + finalMs;
    const finalLine = sampleLine(
      (u) => ({
        x: lerp([contacts[finalSide].x, total.x], u),
        y: lerp([contacts[finalSide].y, total.y], u),
      }),
      30,
    );
    const shotPour = (span: number): Pour => ({
      coinsAlong: 170,
      width: 30,
      streamMs: 140,
      travelMs: span,
    });
    const finalPour: Pour = {
      coinsAlong: 260,
      width: 40,
      streamMs: 220,
      travelMs: finalMs,
    };
    const durationMs = Math.max(
      pourDurationMs(finalWhack, finalPour),
      endAt + holdMs + mergeMs,
    );
    const whacks = [
      ...shots.map((s) => ({ side: s.side, ms: s.whacks })),
      { side: finalSide, ms: finalWhack },
    ];

    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point | null => {
      if (ms > endAt) return null;
      if (ms < dropMs) {
        const u = easeIn(clamp01(ms / dropMs));
        ballAt.x = lerp([mid, contacts[0].x], u);
        ballAt.y = lerp([area.top + 120, contacts[0].y], u);
        return ballAt;
      }
      if (ms >= finalWhack) {
        const u = easeOut(clamp01((ms - finalWhack) / finalMs));
        const aim = cover?.total() ?? total;
        ballAt.x = lerp([contacts[finalSide].x, aim.x], u);
        ballAt.y = lerp([contacts[finalSide].y, aim.y], u);
        return ballAt;
      }
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.whacks) s = shot;
      if (ms < s.peaks) {
        const u = easeOut((ms - s.whacks) / (s.peaks - s.whacks));
        ballAt.x = lerp([s.from.x, s.apex.x], u);
        ballAt.y = lerp([s.from.y, s.apex.y], u);
      } else {
        const u = easeIn(clamp01((ms - s.peaks) / (s.lands - s.peaks)));
        ballAt.x = lerp([s.apex.x, s.to.x], u);
        ballAt.y = lerp([s.apex.y, s.to.y], u);
      }
      return ballAt;
    };
    const flipAngle = (side: number, ms: number) => {
      let angle = REST;
      for (const w of whacks) {
        if (w.side !== side || ms < w.ms) continue;
        const t = ms - w.ms;
        if (t < WHACK_MS) angle = lerp([REST, UP], easeOut(t / WHACK_MS));
        else if (t < WHACK_MS + BACK_MS)
          angle = lerp([UP, REST], easeIn((t - WHACK_MS) / BACK_MS));
      }
      return angle;
    };
    const tip: Point = { x: 0, y: 0 };
    const pivotAts = pivots.map((p) => () => p);

    const whacking = createBeats(
      whacks,
      (w) => w.ms,
      (w, k) => {
        const at = contacts[w.side];
        if (k < SHOTS)
          pourLine(
            cover!,
            shots[k].line,
            shotPour(shots[k].peaks - shots[k].whacks),
          );
        else pourLine(cover!, finalLine, finalPour);
        cover!.burst(at, 0.5);
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, [60, 200], -Math.PI / 2, 1.6),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(WHACK_SHAKE, k / SHOTS));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          whacking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          for (let side = 0; side < 2; side++) {
            const a = flipAngle(side, ms);
            tip.x = pivots[side].x + dirs[side] * Math.cos(a) * LENGTH;
            tip.y = pivots[side].y + Math.sin(a) * LENGTH;
            drawBeam(ctx, pivots[side], tip, FLIPPER, 0.9 * fade);
            drawBeamFlare(ctx, pivots[side], 16, fade, now);
            drawWispBetween(
              ctx,
              pivotAts[side],
              ms,
              now,
              WISP_SIZE * PIVOT,
              0.4,
              0,
              endAt,
            );
          }
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * BALL, 0.9, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

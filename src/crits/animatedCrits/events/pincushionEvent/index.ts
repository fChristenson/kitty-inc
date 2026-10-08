// the "Pincushion" event (drill; a crit tier): it covers its crit, whose
// click freezes the screen while four drills fly in from the four diagonals
// and slam into the clicked floor's button one after another round the
// ring; all four stall in a crown of sparks, juddering, then bore in, their
// shoves rattling round the ring; they punch through one after another in a
// chain of blasts, then the button blows in a huge one and the clicked
// floor's bar jumps a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import { findRewardBars } from "../../eventRewards";

const KEY = "pincushion";
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.2;
// four drills grinding at once: each throws this share of a lone drill's sparks
const GUSH = 0.4;
// each drill's bite on the button, as shares of its half size, and how far
// out along its diagonal it flies in from
const BITE: Point = { x: 0.62, y: 0.55 };
const RANGE = 560;
const PUSHES = 6;
const REACH = 30;
// the diagonals, round the ring
const CORNERS: Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];
const THROUGH_BLAST = 190;
const FINAL_GAP_MS = 140;
const BITE_SHAKE = 0.8;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.3, 0.7];
const THROUGH_SHAKE = 1.3;
const SOUND_GAP_MS = 60;

export const forcePincushionEvent = registerWispEvent(
  KEY,
  "Pincushion",
  () => CONFIG.pincushionEvent.chance,
  (floor, context) => {
    const { approachMs, arriveGapMs, stallMs, boreMs, holdMs, mergeMs } =
      CONFIG.pincushionEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor);
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);

    const grinds: Grind[] = CORNERS.map((c, k) => {
      const target: Point = {
        x: button.x + c.x * (BTN_W / 2) * BITE.x,
        y: button.y + c.y * (BTN_H / 2) * BITE.y,
      };
      const d = Math.hypot(c.x, c.y * 0.8);
      const from: Point = {
        x: target.x + (c.x / d) * RANGE,
        y: target.y + ((c.y * 0.8) / d) * RANGE,
      };
      const drill = planDrill(from, target, {
        approachMs,
        boreMs,
        pushes: PUSHES,
        reach: REACH,
        startMs: k * arriveGapMs,
      });
      return planGrind(drill, stallMs);
    });
    const last = grinds[grinds.length - 1];
    const blowsAt = last.through + FINAL_GAP_MS;
    const endMs = Math.max(blowsAt, last.endMs);
    let soundAt = -Infinity;
    const sound = (now: number, play: () => void) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      play();
    };

    const flying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const biting = createBeats(
      grinds,
      (g) => g.bites,
      (g, _, now) => {
        cover!.burst(g.drill.target, 0.4);
        if (!cover!.isLive()) return;
        shakeScreen(BITE_SHAKE);
        sound(now, playExplosion);
      },
    );
    // the first drill's rumbles shake for all four
    const rumbling = createBeats(
      grinds[0].rumbles.filter((ms) => ms > last.bites),
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const pushes = grinds.flatMap((g) => g.pushes).sort((a, b) => a - b);
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
        sound(now, playBloop);
      },
    );
    const punching = createBeats(
      grinds,
      (g) => g.through,
      (g, _, now) => {
        cover!.burst(g.drill.target, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(THROUGH_SHAKE);
        sound(now, playExplosion);
      },
    );
    const blowing = createBeats(
      [blowsAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, button);
        cover!.slam(bar);
        cover!.blast(button);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          flying.tick(ms, now);
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          punching.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 900) return;
          for (const g of grinds) drawGrind(ctx, g, ms, now, SIZE, SPRAY, GUSH);
          for (const g of grinds)
            drawDetonation(
              ctx,
              g.drill.target,
              ms - g.through,
              THROUGH_BLAST,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);

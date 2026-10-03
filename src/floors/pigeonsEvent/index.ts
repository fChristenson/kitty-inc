// the "Pigeons" event (wisp; cash): it covers its crit, whose click freezes
// the screen while a flock of wisps flutters down from the top of the
// screen like pigeons, each landing on a perch with a bloop and a coin,
// bobbing and hopping where it sits; then the clicked floor's button claps,
// and the whole flock bursts into flight at once, every bird scattering a
// spray of coins as it takes off and flapping up into the total, the last in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "pigeons";
const REWARD = 4;
// perches in ROWS rows across the screen, COLS each
const ROWS = [0.4, 0.58, 0.76];
const COLS = 3;
const SWAY = 40;
const HOP = 10;
const TAKEOFF_MS = 40;
const BIRD = 0.4;
const COINS = 10;
const COIN_REACH: [number, number] = [30, 120];
const LAND_SHAKE = 0.3;

export const forcePigeonsEvent = registerWispEvent(
  KEY,
  "Pigeons",
  () => CONFIG.pigeonsEvent.chance,
  (floor, context, area) => {
    const { flutterMs, perchMs, flyMs, holdMs, mergeMs } = CONFIG.pigeonsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const perches = ROWS.flatMap((row) =>
      Array.from({ length: COLS }, (_, c) => ({
        x: area.left + width * ((c + 0.5) / COLS) + (Math.random() - 0.5) * 40,
        y: area.top + height * row,
      })),
    );
    const clapAt = flutterMs + perchMs;
    const birds = perches.map((perch, k) => {
      const from: Point = {
        x: perch.x + (Math.random() - 0.5) * 200,
        y: area.top - 40,
      };
      const lands = flutterMs * (0.5 + 0.5 * Math.random());
      const leaves = clapAt + k * TAKEOFF_MS;
      const arrives = leaves + flyMs;
      const ctrl: Point = {
        x: perch.x + (perch.x < total.x ? -1 : 1) * 160,
        y: perch.y - 120,
      };
      const phase = Math.random() * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      return {
        perch,
        lands,
        leaves,
        arrives,
        at: (ms: number): Point => {
          if (ms < lands) {
            const u = easeOut(clamp01(ms / lands));
            at.x =
              lerp([from.x, perch.x], u) +
              Math.sin(u * 6 + phase) * SWAY * (1 - u);
            at.y = lerp([from.y, perch.y], u);
          } else if (ms < leaves) {
            at.x = perch.x;
            at.y =
              perch.y - Math.abs(Math.sin((ms - lands) / 90 + phase)) * HOP;
          } else {
            const target = cover?.total() ?? total;
            bezier(
              perch,
              ctrl,
              target,
              easeIn(clamp01((ms - leaves) / flyMs)),
              at,
            );
          }
          return at;
        },
      };
    });
    const last = birds[birds.length - 1];
    const endAt = last.arrives;

    const landing = createBeats(
      birds,
      (b) => b.lands,
      (b) => {
        cover!.launchFrom(b.perch, [{ x: b.perch.x, y: b.perch.y + 30 }]);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const clapping = createBeats(
      [clapAt],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const takingOff = createBeats(
      birds,
      (b) => b.leaves,
      (b) =>
        cover!.launchFrom(b.perch, ringTargets(b.perch, COINS, COIN_REACH)),
    );
    const arriving = createBeats(
      birds,
      (b) => b.arrives,
      (b) => {
        const at = cover!.total() ?? total;
        if (b === last) cover!.blast(at);
        else cover!.burst(at, 0.3);
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
          landing.tick(ms, now);
          clapping.tick(ms, now);
          takingOff.tick(ms, now);
          arriving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const b of birds)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BIRD,
              0.5,
              0,
              b.arrives,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

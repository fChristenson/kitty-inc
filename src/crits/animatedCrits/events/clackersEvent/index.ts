// the "Clackers" event (bounce; levels): it covers its crit, whose click
// freezes the screen while a hand wisp appears over the clicked floor's bar
// holding two big wisps on strings of light, like the clacker toy; it pumps
// them and they swing up and smack together underneath, harder and higher
// each time until they whip all the way round, clacking below and above the
// hand ever faster, every clack a flash, a crack and a jolt that lands free
// levels on the bar; the last clack is a huge smash that slams the bar.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "clackers";
// the hand this high over the bar, the strings this long
const HAND_ABOVE = 330;
const STRING = 210;
const STRING_W = 5;
const BALL = WISP_SIZE * 1.4;
const HAND = WISP_SIZE * 0.8;
// swings a second, from the first pump to the last smash; the swing's reach
// (rad off straight down) grows from START_SWING to all the way round by
// FULL_AT of the way through
const SWINGS_HZ: [number, number] = [1.6, 6];
const START_SWING = 0.9;
const FULL_AT = 0.45;
const STEP_MS = 2;
const CLACK_SHAKE: [number, number] = [0.25, 0.75];
const SOUND_GAP_MS = 45;

interface Clack {
  ms: number;
  top: boolean;
}

export const forceClackersEvent = registerWispEvent(
  KEY,
  "Clackers",
  () => CONFIG.clackersEvent.chance,
  (floor, context) => {
    const { growMs, clackMs, holdMs, mergeMs, levelShare } =
      CONFIG.clackersEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const hand: Point = { x: bar.center.x, y: bar.box.y - HAND_ABOVE };
    const levels = levelsFor(bar.floor, levelShare, 1);

    // phase runs quicker and quicker; each ball sits reach × |sin(phase)| off
    // straight down, mirrored, so they meet below (0) and, once they swing
    // all the way round, above (π)
    const phaseAt = (ms: number) => {
      const s = clamp01(ms / clackMs) * (clackMs / 1000);
      const span = clackMs / 1000;
      return (
        Math.PI *
        2 *
        (SWINGS_HZ[0] * s +
          ((SWINGS_HZ[1] - SWINGS_HZ[0]) * s * s) / (2 * span))
      );
    };
    const reachAt = (ms: number) =>
      lerp([START_SWING, Math.PI], easeOut(clamp01(ms / (clackMs * FULL_AT))));
    const angleAt = (ms: number) =>
      reachAt(ms) * Math.abs(Math.sin(phaseAt(ms)));
    const clacks: Clack[] = [];
    let was = angleAt(0);
    let falling = false;
    for (let ms = STEP_MS; ms <= clackMs; ms += STEP_MS) {
      const now = angleAt(ms);
      if (falling && now > was) clacks.push({ ms: growMs + ms, top: false });
      if (!falling && now < was && was > Math.PI - 0.05)
        clacks.push({ ms: growMs + ms, top: true });
      falling = now < was;
      was = now;
    }
    const lastAt =
      clacks.length > 0 ? clacks[clacks.length - 1].ms : growMs + clackMs;
    let soundAt = -Infinity;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clacking = createBeats(
      clacks,
      (c) => c.ms,
      (c, k, now) => {
        const at: Point = {
          x: hand.x,
          y: hand.y + (c.top ? -STRING : STRING),
        };
        cover!.levels(bar, levels, at);
        if (k === clacks.length - 1) {
          cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.45);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CLACK_SHAKE, k / Math.max(1, clacks.length - 1)));
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
      },
    );

    const ball = (side: number) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > lastAt) return null;
        const drop = easeOut(clamp01(ms / growMs));
        const a = ms < growMs ? 0 : side * angleAt(ms - growMs);
        spot.x = hand.x + Math.sin(a) * STRING * drop;
        spot.y = hand.y + Math.cos(a) * STRING * drop;
        return spot;
      };
    };
    const left = ball(-1);
    const right = ball(1);
    const handAt = () => hand;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          clacking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > lastAt) return;
          const l = left(ms);
          if (l) drawBeam(ctx, hand, l, STRING_W, 0.6);
          const r = right(ms);
          if (r) drawBeam(ctx, hand, r, STRING_W, 0.6);
          drawWisp(ctx, handAt, ms, now, HAND, 0.4);
          drawWisp(ctx, left, ms, now, BALL, 0.8);
          drawWisp(ctx, right, ms, now, BALL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

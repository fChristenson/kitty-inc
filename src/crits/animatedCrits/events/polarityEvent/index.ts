// the "Polarity" event (wisp): it covers its crit, whose click freezes the
// screen while two big pole wisps pop up on either side of it and a swarm of
// small wisps streams out of the clicked floor's button onto one of them;
// the poles flip, ever faster, and every time the whole swarm snaps across
// to the other along arching field lines, slamming into it with a flash, a
// bloop, a jolt and a ring of coins; then the poles slam together in the
// middle in a huge blast and shake, and the coins sweep into the
// total-income readout. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "polarity";
const REWARD = 4;
// the poles INSET of the screen's width in from its sides, DROP of its height
// under its middle, POLE of its width across; SWARM wisps cluster round
// them, their field lines bowing up to ARCH of its height
const INSET = 0.13;
const DROP = 0.05;
const POLE = 0.075;
const POP_MS = 200;
const SWARM = 8;
const SMALL = 0.35;
const CLUSTER = 1.1;
const ARCH = 0.22;
const FLIPS = 6;
const FLIP_COINS = 22;
const FLIP_REACH: [number, number] = [40, 120];
const FLIP_BURST: [number, number] = [0.6, 1.1];
const FLIP_SHAKE: [number, number] = [0.9, 2];

export const forcePolarityEvent = registerWispEvent(
  KEY,
  "Polarity",
  () => CONFIG.polarityEvent.chance,
  (floor, context, area) => {
    const { gatherMs, flipGapsMs, dashMs, slamMs, holdMs, mergeMs } =
      CONFIG.polarityEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const homes: [Point, Point] = [
      { x: area.left + width * INSET, y: middle.y },
      { x: area.right - width * INSET, y: middle.y },
    ];
    const first = Math.random() < 0.5 ? 0 : 1;
    const flips: number[] = [];
    let clock = gatherMs;
    for (let k = 0; k < FLIPS; k++) {
      clock += lerp(flipGapsMs, k / (FLIPS - 1));
      flips.push(clock);
    }
    const slamAt = flips[FLIPS - 1] + dashMs + 80;
    const crashAt = slamAt + slamMs;
    const poleSize = Math.max(WISP_SIZE, width * POLE);
    const rc = poleSize * CLUSTER;

    // the poles, closing in on the middle once the flipping's done
    const poles = homes.map((home) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= crashAt) return null;
        const u = easeIn(clamp01((ms - slamAt) / slamMs));
        into.x = home.x + (middle.x - home.x) * u;
        into.y = home.y + (middle.y - home.y) * u;
        return into;
      };
    });
    // which pole the swarm's on after flip k (-1: the first)
    const sideAfter = (k: number) => (first + k + 1) % 2;
    const swarm = Array.from({ length: SWARM }, (_, i) => {
      const angle = (i / SWARM) * Math.PI * 2;
      const bow = (i / (SWARM - 1) - 0.5) * 2 * height * ARCH;
      const into = { x: 0, y: 0 };
      const from = { x: 0, y: 0 };
      const to = { x: 0, y: 0 };
      const control = { x: 0, y: 0 };
      const spot = (pole: number, ms: number, out: Point): Point => {
        const p = poles[pole](Math.min(ms, crashAt - 1))!;
        const a = angle + ms * 0.006;
        out.x = p.x + Math.cos(a) * rc;
        out.y = p.y + Math.sin(a) * rc;
        return out;
      };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= crashAt) return null;
        if (ms < gatherMs) {
          spot(first, gatherMs, to);
          const u = smoothstep(ms / gatherMs);
          into.x = button.x + (to.x - button.x) * u;
          into.y = button.y + (to.y - button.y) * u;
          return into;
        }
        let k = -1;
        while (k + 1 < FLIPS && ms >= flips[k + 1]) k++;
        const on = sideAfter(k);
        if (k < 0 || ms >= flips[k] + dashMs) return spot(on, ms, into);
        // dashing along its field line from the other pole
        spot(sideAfter(k - 1), flips[k], from);
        spot(on, flips[k] + dashMs, to);
        control.x = (from.x + to.x) / 2;
        control.y = (from.y + to.y) / 2 + bow;
        return bezier(
          from,
          control,
          to,
          easeIn((ms - flips[k]) / dashMs),
          into,
        );
      };
    });

    const flipping = createBeats(
      flips,
      (ms) => ms + dashMs,
      (_, k) => {
        const t = k / (FLIPS - 1);
        const at = homes[sideAfter(k)];
        cover!.burst(at, lerp(FLIP_BURST, t));
        cover!.launchFrom(at, ringTargets(at, FLIP_COINS, FLIP_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FLIP_SHAKE, t));
      },
    );
    const closing = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
      [crashAt],
      (ms) => ms,
      () => cover!.blast(middle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: crashAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flipping.tick(ms, now);
          closing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / slamAt);
          for (const at of swarm)
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              poleSize * SMALL,
              heat,
              0,
              crashAt,
            );
          const size = poleSize * easeOutBack(clamp01(ms / POP_MS));
          for (const at of poles)
            drawWispBetween(ctx, at, ms, now, size, heat, 0, crashAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

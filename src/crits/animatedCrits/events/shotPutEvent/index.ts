// the "Shot Put" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a heavy shot wisp spins up in tight circles on
// the clicked floor's button, faster each turn, then is heaved in a high
// arc onto an income bar, where it thuds down in a crater-burst with a huge
// jolt and a bang, landing a crit tier; it bounces back to the button for
// the next put, each farther and harder, own floor's bar first; the last
// put lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";

const KEY = "shotPut";
const MAX_BARS = 3;
// the wind-up: TURNS ever faster circles SPIN px round
const TURNS = 3;
const SPIN = 34;
// each put arcs ARC px over its ends; a bounce back BOUNCE px
const ARC: [number, number] = [220, 380];
const BOUNCE = 100;
const SHOT = 0.6;
const CRATER: [number, number] = [150, 210];
const THUD_SHAKE: [number, number] = [1.1, 1.7];

interface Piece {
  start: number;
  end: number;
  at: (u: number, into: Point) => Point;
}

export const forceShotPutEvent = registerWispEvent(
  KEY,
  "Shot Put",
  () => CONFIG.shotPutEvent.chance,
  (floor, context) => {
    const { spinsMs, flightsMs, bounceMs, holdMs, mergeMs } =
      CONFIG.shotPutEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const rank = (b: { floor: unknown; center: Point }) =>
      b.floor === floor ? -1 : Math.abs(b.center.y - button.y);
    const bars = findRewardBars(floor, context)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const n = bars.length;
    const pieces: Piece[] = [];
    let clock = 0;
    const add = (ms: number, at: Piece["at"]) => {
      pieces.push({ start: clock, end: clock + ms, at });
      clock += ms;
    };
    const release: Point = { x: button.x + SPIN, y: button.y };
    const puts = bars.map((bar, k) => {
      const u = k / Math.max(1, n - 1);
      add(lerp(spinsMs, u), (v, into) => {
        const a = Math.PI * 2 * TURNS * v * v;
        const r = SPIN * Math.min(1, v * 4);
        into.x = button.x + Math.cos(a) * r;
        into.y = button.y + Math.sin(a) * r;
        return into;
      });
      const to = bar.center;
      const ctrl: Point = {
        x: (release.x + to.x) / 2,
        y: Math.min(release.y, to.y) - lerp(ARC, u),
      };
      add(lerp(flightsMs, u), (v, into) => bezier(release, ctrl, to, v, into));
      const lands = clock;
      if (k < n - 1) {
        const back: Point = {
          x: (to.x + button.x) / 2,
          y: Math.min(to.y, button.y) - BOUNCE,
        };
        add(bounceMs, (v, into) => bezier(to, back, button, v, into));
      }
      return { bar, lands };
    });
    const last = puts[n - 1];
    const endAt = last.lands;
    const into: Point = { x: 0, y: 0 };
    const shot = (ms: number): Point => {
      const t = Math.max(0, Math.min(ms, endAt));
      let piece = pieces[0];
      for (const p of pieces) if (t >= p.start) piece = p;
      return piece.at(
        clamp01((t - piece.start) / (piece.end - piece.start)),
        into,
      );
    };

    const thudding = createBeats(
      puts,
      (p) => p.lands,
      (p, k) => {
        cover!.tierUp(p.bar, button);
        if (p === last) {
          cover!.slam(p.bar);
          cover!.blast(p.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(THUD_SHAKE, k / Math.max(1, n - 1)));
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
        tick: (ms, now) => thudding.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (let k = 0; k < n; k++)
            drawDetonation(
              ctx,
              puts[k].bar.center,
              ms - puts[k].lands,
              lerp(CRATER, k / Math.max(1, n - 1)),
              now,
            );
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              shot,
              ms,
              now,
              WISP_SIZE * SHOT,
              0.9,
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

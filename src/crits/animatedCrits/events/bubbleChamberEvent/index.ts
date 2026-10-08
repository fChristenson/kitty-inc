// the "Bubble Chamber" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while the clicked floor's button smashes open in
// a flash and a bang like a particle collision, spraying wisps out every
// way; each curls round in a tightening spiral like a particle's track in a
// bubble chamber, spinning down onto an empty spot, where a new worker
// forms with a pop and a jolt, the stray ones fizzling out in sparks; the
// last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "bubbleChamber";
const MAX_HIRES = 6;
const STRAYS = 4;
const FORM_MS = 300;
const LIFT = 20;
const TURNS: [number, number] = [1.2, 2.4];
const STRAY_REACH: [number, number] = [160, 420];
const DECAY = 1.4;
const MARGIN = 100;
const TRACK = 0.4;
const STRAY = 0.25;
const SMASH_SHAKE = 1.2;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

interface Track {
  hire: RewardHire | null;
  end: Point;
  lands: number;
  at: (ms: number) => Point;
}

export const forceBubbleChamberEvent = registerWispEvent(
  KEY,
  "Bubble Chamber",
  () => CONFIG.bubbleChamberEvent.chance,
  (floor, context, area) => {
    const { curlMs, holdMs, mergeMs } = CONFIG.bubbleChamberEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // spiralling in on its end: the radius decays as it turns
    const track = (
      hire: RewardHire | null,
      end: Point,
      k: number,
      count: number,
    ): Track => {
      const r0 = Math.hypot(button.x - end.x, button.y - end.y);
      const a0 = Math.atan2(button.y - end.y, button.x - end.x);
      const turn =
        (Math.random() < 0.5 ? -1 : 1) * between(TURNS) * Math.PI * 2;
      const lands = lerp(curlMs, k / Math.max(1, count - 1));
      const spot: Point = { x: 0, y: 0 };
      return {
        hire,
        end,
        lands,
        at: (ms) => {
          const u = easeOut(clamp01(ms / lands));
          const r = r0 * (1 - u) ** DECAY;
          const a = a0 + turn * u;
          spot.x = end.x + Math.cos(a) * r;
          spot.y = end.y + Math.sin(a) * r;
          return spot;
        },
      };
    };
    const count = hires.length + STRAYS;
    const order = Array.from({ length: count }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    );
    const tracks: Track[] = order.map((k, i) => {
      if (i < hires.length) {
        const hire = hires[i];
        return track(hire, { x: hire.x, y: hire.y - LIFT }, k, count);
      }
      const a = Math.random() * Math.PI * 2;
      const r = between(STRAY_REACH);
      const end: Point = {
        x: Math.min(
          area.right - MARGIN,
          Math.max(area.left + MARGIN, button.x + Math.cos(a) * r),
        ),
        y: Math.min(
          area.bottom - MARGIN,
          Math.max(area.top + MARGIN, button.y + Math.sin(a) * r),
        ),
      };
      return track(null, end, k, count);
    });
    const settles = tracks.filter((t) => t.hire);
    const endAt = Math.max(...tracks.map((t) => t.lands));
    const last = settles.reduce((a, b) => (b.lands > a.lands ? b : a));

    const smashing = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SMASH_SHAKE);
      },
    );
    const landing = createBeats(
      tracks,
      (t) => t.lands,
      (t) => {
        if (!t.hire) {
          cover!.burst(t.end, 0.25);
          if (cover!.isLive()) playBloop();
          return;
        }
        giveHire(t.hire);
        if (t === last) {
          cover!.blast(t.end);
          return;
        }
        cover!.burst(t.end, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, t.lands / endAt));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: Math.max(endAt, last.lands) + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          smashing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const t of tracks)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * (t.hire ? TRACK : STRAY),
              t.hire ? 0.8 : 0.4,
              0,
              t.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

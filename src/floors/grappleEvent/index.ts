// the "Grapple" event (wisp; free upgrade levels): it covers its crit, whose
// click freezes the screen while a wisp on the clicked floor's button fires a
// glowing grappling line up at the underside of an income bar, latches on
// with a clank, a flash and a jolt that lands free levels, and swings under
// it in a great arc; at the top of the swing it lets go and fires at the next
// bar up, swinging bar to bar up the screen ever faster; off the last it
// flings up off the top of the screen, and every bar slams in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "grapple";
const MAX_BARS = 5;
// each swing dips DIP px under its anchor
const DIP = 260;
const LINE = 5;
const SHOOT_MS = 70;
const SWINGER = 0.9;
const GRAB_SHAKE: [number, number] = [0.6, 1.4];
const GRAB_BURST: [number, number] = [0.4, 0.75];

export const forceGrappleEvent = registerWispEvent(
  KEY,
  "Grapple",
  () => CONFIG.grappleEvent.chance,
  (floor, context, area) => {
    const { swingsMs, levelShare, slamMs, holdMs, mergeMs } =
      CONFIG.grappleEvent;
    // bottom first, so it swings up the screen
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[0];
    const button = getButtonCenter(context.isGroundFloor);
    const first = Math.random() < 0.5 ? 0.3 : 0.7;
    const anchors: Point[] = bars.map((bar, k) => ({
      x: bar.box.x + bar.box.width * (k % 2 === 0 ? first : 1 - first),
      y: bar.box.y + bar.box.height,
    }));
    // swinging under anchor k from stops[k] to stops[k + 1]
    const stops: Point[] = [button];
    anchors.forEach((a, k) => {
      const next = anchors[k + 1];
      stops.push(
        next
          ? { x: a.x + (a.x - next.x) * -0.35, y: next.y + DIP * 0.35 }
          : {
              x: a.x + (a.x < (area.left + area.right) / 2 ? 1 : -1) * 160,
              y: area.top - 80,
            },
      );
    });
    const dips = anchors.map((a) => ({ x: a.x, y: a.y + DIP }));
    const grabs: number[] = [];
    let clock = 0;
    anchors.forEach((_, k) => {
      grabs.push(clock + SHOOT_MS);
      clock += lerp(swingsMs, k / Math.max(1, anchors.length - 1));
    });
    const leaveAt = clock;
    const slamAt = leaveAt + slamMs;

    const leg = (ms: number): number => {
      let k = 0;
      while (k + 1 < anchors.length && ms >= grabs[k + 1] - SHOOT_MS) k++;
      return k;
    };
    const into: Point = { x: 0, y: 0 };
    const tip: Point = { x: 0, y: 0 };
    const swinger = (ms: number): Point | null => {
      if (ms < 0 || ms >= leaveAt) return null;
      const k = leg(ms);
      const start = grabs[k] - SHOOT_MS;
      const end = k + 1 < anchors.length ? grabs[k + 1] - SHOOT_MS : leaveAt;
      bezier(
        stops[k],
        dips[k],
        stops[k + 1],
        smoothstep(clamp01((ms - start) / (end - start))),
        into,
      );
      return into;
    };

    const grabbing = createBeats(
      grabs,
      (ms) => ms,
      (_, k) => {
        const bar = bars[k];
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), {
          x: anchors[k].x,
          y: anchors[k].y + 60,
        });
        cover!.burst(anchors[k], lerp(GRAB_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GRAB_SHAKE, t));
      },
    );
    const finale = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare * 2, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: slamAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          grabbing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= leaveAt + 400) return;
          const at = swinger(ms);
          if (at) {
            const k = leg(ms);
            const shot = clamp01((ms - (grabs[k] - SHOOT_MS)) / SHOOT_MS);
            if (shot < 1) {
              tip.x = at.x + (anchors[k].x - at.x) * shot;
              tip.y = at.y + (anchors[k].y - at.y) * shot;
              drawAimLaser(ctx, at, tip);
            } else {
              drawBeam(ctx, at, anchors[k], LINE, 0.9);
              drawBeamFlare(ctx, anchors[k], 14, 0.8, now);
            }
          }
          drawWispBetween(
            ctx,
            swinger,
            ms,
            now,
            WISP_SIZE * SWINGER,
            clamp01(ms / leaveAt),
            0,
            leaveAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);

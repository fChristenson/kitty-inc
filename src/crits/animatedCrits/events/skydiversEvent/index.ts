// the "Skydivers" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while wisps leap in off the top of the screen and
// free-fall together, closing into a ring that links up in mid-air with a
// flash, a bloop and a jolt; then the ring bursts apart, each diver
// plunging off toward an empty spot on a floor in view and popping its
// chute just over it with a pop, floating down and landing as a new worker
// with a flash, a bang and a jolt; the last lands in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "skydivers";
const MAX_HIRES = 4;
// the divers leap from SKY px over the screen, WIDE px apart, closing into
// a RING px ring a third of the way down, turning SPIN of a lap
const SKY = 120;
const WIDE = 320;
const RING = 80;
const LINK_DROP = 0.35;
const SPIN = 0.3;
// chutes pop CHUTE px over the spot
const CHUTE = 140;
const DIVER = 0.6;
const FORM_MS = 280;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceSkydiversEvent = registerWispEvent(
  KEY,
  "Skydivers",
  () => CONFIG.skydiversEvent.chance,
  (floor, context, area) => {
    const { fallMs, holdLinkMs, divesMs, floatMs, holdMs, mergeMs } =
      CONFIG.skydiversEvent;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.x - b.x)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const count = hires.length;
    const mid = (area.left + area.right) / 2;
    const linkY = area.top + (area.bottom - area.top) * LINK_DROP;
    const sky = area.top - SKY;
    const linkAt = fallMs;
    const breakAt = linkAt + holdLinkMs;
    const ringAt = (i: number, ms: number, into: Point): Point => {
      const u = clamp01(ms / fallMs);
      const cy =
        lerp([sky, linkY], easeOut(u)) + Math.max(0, ms - linkAt) * 0.08;
      const r = lerp([WIDE, RING], easeIn(u));
      const a =
        (i / count) * Math.PI * 2 + SPIN * Math.PI * 2 * u - Math.PI / 2;
      into.x = mid + Math.cos(a) * r;
      into.y = cy + Math.sin(a) * r * 0.5;
      return into;
    };
    const divers = hires.map((hire, i) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const chute: Point = { x: hire.x, y: hire.y - 30 - CHUTE };
      const opensAt = breakAt + lerp(divesMs, i / Math.max(1, count - 1));
      const landsAt = opensAt + floatMs;
      const leaving = ringAt(i, breakAt, { x: 0, y: 0 });
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        chute,
        opensAt,
        landsAt,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > landsAt) return null;
          if (ms < breakAt) return ringAt(i, ms, at);
          if (ms < opensAt) {
            const u = easeIn((ms - breakAt) / (opensAt - breakAt));
            at.x = lerp([leaving.x, chute.x], u);
            at.y = lerp([leaving.y, chute.y], u);
            return at;
          }
          // under the chute: a sudden check, then a gentle sway down
          const u = easeOut((ms - opensAt) / floatMs);
          at.x = chute.x + Math.sin(u * Math.PI * 2) * 12 * (1 - u);
          at.y = lerp([chute.y, spot.y], u);
          return at;
        },
      };
    });
    const endAt = Math.max(...divers.map((d) => d.landsAt));
    const landings = [...divers].sort((a, b) => a.landsAt - b.landsAt);

    const linking = createBeats(
      [linkAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: mid, y: linkY }, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(1);
      },
    );
    const opening = createBeats(
      divers,
      (d) => d.opensAt,
      (d) => {
        cover!.burst(d.chute, 0.3);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      landings,
      (d) => d.landsAt,
      (d, k) => {
        giveHire(d.hire);
        if (k === landings.length - 1) {
          cover!.blast(d.spot);
          return;
        }
        cover!.burst(
          d.spot,
          0.6 + 0.3 * (k / Math.max(1, landings.length - 1)),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, landings.length - 1)));
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
          linking.tick(ms, now);
          opening.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const d of divers)
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              WISP_SIZE * DIVER,
              0.6,
              0,
              d.landsAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);

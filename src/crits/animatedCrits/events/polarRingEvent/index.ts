// the "Polar Ring" event (galaxy; a crit tier): it covers its crit, whose
// click freezes the screen while a galaxy of glitter swirls up over the
// clicked floor's bar, seen nearly edge on, with a second ring of stars
// orbiting straight over its poles like a hoop round a plate; the ring tips
// over, ever faster, every lurch a pop and a jolt, its stars blazing as it
// swings down onto the disk; it lands flat in a blinding flash and its stars
// are flung off their orbits in a shower that rains down onto the bar, which
// jumps a crit tier in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawStars,
  planDisk,
  scatterArms,
  scatterDisk,
} from "../../../../shared/galaxy";
import { findRewardBars } from "../../eventRewards";

const KEY = "polarRing";
const DISK_STARS = 240;
const RING_STARS = 140;
const STAR = 8;
// the galaxy this high over the bar, a share of the screen's width across
// (at most OUTER); the ring sits just outside it
const ABOVE = 320;
const DISK = 0.4;
const OUTER = 300;
const RING: [number, number] = [0.85, 1.05];
const CORE = WISP_SIZE * 1.1;
// the ring starts standing up and tips over in LURCHES quickening lurches
const LURCHES = 5;
const FLING = 180;
const LURCH_SHAKE: [number, number] = [0.3, 0.8];
const FLAT_SHAKE = 1.2;

export const forcePolarRingEvent = registerWispEvent(
  KEY,
  "Polar Ring",
  () => CONFIG.polarRingEvent.chance,
  (floor, context, area) => {
    const { growMs, tipMs, rainMs, spreadMs, holdMs, mergeMs } =
      CONFIG.polarRingEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + 140, bar.center.y - ABOVE),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(centre, {
      inner: 20,
      outer,
      squash: 0.28,
      rimHz: 0.6,
    });
    const diskStars = scatterArms(disk, DISK_STARS, 2, 0.6, 0.35);
    // the ring planned flat round the origin, then turned up off the disk
    const origin: Point = { x: 0, y: 0 };
    const ring = planDisk(origin, {
      inner: outer * RING[0],
      outer: outer * RING[1],
      squash: 0.3,
      rimHz: 0.5,
      spin: -1,
    });
    const ringStars = scatterDisk(ring, RING_STARS);
    const flatAt = growMs + tipMs;
    // the ring's tilt: standing up, tipping over in quickening lurches
    const lurches = Array.from(
      { length: LURCHES },
      (_, k) => growMs + tipMs * (1 - (1 - (k + 1) / LURCHES) ** 1.5),
    );
    const tiltAt = (ms: number) => {
      if (ms <= growMs) return Math.PI / 2;
      let k = 0;
      while (k < LURCHES - 1 && ms >= lurches[k]) k++;
      const from = k > 0 ? lurches[k - 1] : growMs;
      const within = clamp01((ms - from) / (lurches[k] - from));
      return (Math.PI / 2) * (1 - (k + easeIn(within)) / LURCHES);
    };
    const place = (i: number, ms: number, into: Point, grow = 1): Point => {
      ring.at(ringStars[i], ms, into, grow);
      const t = tiltAt(ms);
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = into.x;
      const y = into.y;
      into.x = centre.x + x * c - y * s;
      into.y = centre.y + x * s + y * c;
      return into;
    };

    // at flat, the ring's stars are flung off along their orbits onto the bar
    const shower = ringStars.map((o, i) => {
      const leaves = flatAt + (i / RING_STARS) * spreadMs;
      const from = place(i, leaves, { x: 0, y: 0 });
      const a = ring.heading(o, leaves);
      const to: Point = {
        x: bar.box.x + bar.box.width * lerp([0.1, 0.9], Math.random()),
        y: bar.center.y,
      };
      return {
        leaves,
        lands: leaves + rainMs,
        from,
        bow: {
          x: from.x + Math.cos(a) * FLING,
          y: from.y + Math.sin(a) * FLING,
        },
        to,
      };
    });
    const endMs = flatAt + spreadMs + rainMs;

    const tipping = createBeats(
      [growMs, ...lurches.slice(0, -1)],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LURCH_SHAKE, k / (LURCHES - 1)));
      },
    );
    const landing = createBeats(
      [flatAt, endMs],
      (ms) => ms,
      (ms) => {
        if (ms >= endMs) {
          cover!.tierUp(bar, centre);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(centre, 1.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FLAT_SHAKE);
      },
    );

    const star: Point = { x: 0, y: 0 };
    const centreAt = () => centre;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          tipping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - flatAt) / 500);
          drawStars(ctx, disk, diskStars, ms, STAR, grow, fade);
          drawWisp(
            ctx,
            centreAt,
            ms,
            now,
            CORE * grow * (0.3 + 0.7 * fade),
            0.6,
          );
          // the ring's stars blaze hotter the flatter it lies
          const heat = 1 - tiltAt(ms) / (Math.PI / 2);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < RING_STARS; i++) {
            const s = shower[i];
            if (ms >= s.lands) continue;
            if (ms < s.leaves) place(i, ms, star, grow);
            else
              bezier(
                s.from,
                s.bow,
                s.to,
                easeIn((ms - s.leaves) / rainMs),
                star,
              );
            stampGlimmer(
              ctx,
              star.x,
              star.y,
              STAR * (1 + heat),
              i + ms * 0.005,
              heat > 0.5 || i % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

// the "Tug of War" event: it covers its crit, whose click freezes the screen
// while two wisps light up on either side of it and cash gushes up out of
// the clicked floor's button into a sagging rope of cash slung between them,
// flowing back and forth along it; they heave it one way then the other in
// harder and harder jerks, each a flash, a bloop and a jolt, until it snaps
// in the middle with a bang, both halves whipping back into their wisps,
// which fling the cash up into the total-income readout in two arcing jets
// and dive in after it in a huge blast and shake, and the coins sweep into
// the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { totalSpot } from "../../cashFlow";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "tugOfWar";
const REWARD = 4;
const COINS = 900;
const COIN = 0.8;
// the wisps INSET of the screen's width in from its sides, DROP of its height
// under its middle; the rope between sags SAG of its height and is THICK px
const INSET = 0.12;
const DROP = 0.04;
const SAG = 0.12;
const THICK = 14;
// the heaves, as shares of the screen's width, alternating sides
const HEAVES = [0.07, -0.11, 0.15, -0.2];
const HEAVE_MS = 200;
// the wisps, as shares of the screen's width
const WISP: [number, number] = [0.06, 0.1];
const POP_MS = 200;
// each heave: a burst, a bloop and a jolt, growing; the snap: a burst, a bang
// and a jolt
const HEAVE_BURST: [number, number] = [0.4, 0.9];
const HEAVE_SHAKE: [number, number] = [0.8, 2];
const SNAP_BURST = 1.2;
const SNAP_SHAKE = 2.4;

export const forceTugOfWarEvent = registerWispEvent(
  KEY,
  "Tug of War",
  () => CONFIG.tugOfWarEvent.chance,
  (floor, context, area) => {
    const {
      fillMs,
      flyMs,
      flowMs,
      leadMs,
      heaveGapMs,
      recoilMs,
      jetMs,
      flightMs,
      holdMs,
      mergeMs,
    } = CONFIG.tugOfWarEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const y = (area.top + area.bottom) / 2 + height * DROP;
    const ends = [area.left + width * INSET, area.right - width * INSET];
    const heaves = HEAVES.map((share, k) => ({
      at: leadMs + k * heaveGapMs,
      to: share * width,
    }));
    const snapAt = leadMs + HEAVES.length * heaveGapMs;
    const fling = snapAt + recoilMs;
    const diveAt = fling + jetMs;
    const travelMs = diveAt + flightMs;
    // how far the whole rope's been hauled sideways
    const shift = (ms: number): number => {
      let from = 0;
      for (const h of heaves) {
        if (ms < h.at) return from;
        const u = (ms - h.at) / HEAVE_MS;
        if (u < 1) return from + (h.to - from) * easeOutBack(u);
        from = h.to;
      }
      return from;
    };
    const wispAt = (side: number, ms: number, into: Point): Point => {
      const dx = shift(Math.min(ms, snapAt));
      into.x = ends[side] + dx;
      into.y = y;
      if (ms < diveAt) return into;
      const total = cover?.total() ?? fallback;
      return bezier(
        { x: into.x, y },
        { x: into.x, y: area.top },
        total,
        easeIn(clamp01((ms - diveAt) / flightMs)),
        into,
      );
    };
    // the point s 0..1 along the rope, `lane` px off it
    const ropeAt = (
      ms: number,
      s: number,
      lane: number,
      into: Point,
    ): Point => {
      const dx = shift(ms);
      const a = { x: ends[0] + dx, y };
      const b = { x: ends[1] + dx, y };
      bezier(a, { x: (a.x + b.x) / 2, y: y + height * SAG * 2 }, b, s, into);
      into.y += lane + Math.sin(s * 14 - ms / 50) * 2;
      return into;
    };
    const wisps = [0, 1].map((side) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < 0 || ms >= travelMs ? null : wispAt(side, ms, into);
    });

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const launch = Math.random() * fillMs;
      const s0 = Math.random();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = (Math.random() - 0.5) * THICK;
      const along = (ms: number) => (((s0 + (dir * ms) / flowMs) % 1) + 1) % 1;
      const snapS = along(snapAt);
      const side = snapS < 0.5 ? 0 : 1;
      // the coins nearest the wisp fly first
      const leave = fling + jetMs * (1 - 2 * Math.abs(snapS - 0.5));
      const bend = {
        x: (button.x + ends[side]) / 2,
        y: Math.min(button.y, y) - height * 0.2,
      };
      return (f) => {
        const ms = f * travelMs;
        if (ms < launch) return { x: button.x, y: button.y, scale: 0 };
        if (ms < snapAt) {
          const on = ropeAt(ms, along(ms), lane, { x: 0, y: 0 });
          const u = (ms - launch) / flyMs;
          if (u >= 1) return { x: on.x, y: on.y, scale: COIN };
          const p = bezier(button, bend, on, easeOut(u), { x: 0, y: 0 });
          return { x: p.x, y: p.y, scale: COIN };
        }
        // whipping back into its wisp
        const s =
          snapS + (side - snapS) * easeOut(clamp01((ms - snapAt) / recoilMs));
        const from = ropeAt(snapAt, s, lane, { x: 0, y: 0 });
        if (ms < leave) return { x: from.x, y: from.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        const hand = wispAt(side, leave, { x: 0, y: 0 });
        const p = bezier(
          hand,
          { x: hand.x, y: area.top },
          total,
          easeIn(clamp01((ms - leave) / flightMs)),
          {
            x: 0,
            y: 0,
          },
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    let tension = 0;
    const heaving = createBeats(
      heaves,
      (h) => h.at,
      (h, k) => {
        tension = (k + 1) / heaves.length;
        cover!.burst(
          ropeAt(h.at, 0.5, 0, { x: 0, y: 0 }),
          lerp(HEAVE_BURST, tension),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HEAVE_SHAKE, tension));
      },
    );
    const snap = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        cover!.burst(ropeAt(snapAt, 0.5, 0, { x: 0, y: 0 }), SNAP_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SNAP_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          heaving.tick(ms, now);
          snap.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size =
            Math.max(WISP_SIZE, width * lerp(WISP, tension)) *
            easeOutBack(clamp01(ms / POP_MS));
          for (const at of wisps)
            drawWispBetween(ctx, at, ms, now, size, tension, 0, travelMs);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);

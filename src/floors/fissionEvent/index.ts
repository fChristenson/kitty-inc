// the "Fission" event (explosion; levels): it covers its crit, whose click
// freezes the screen while fat bomb wisps, fuses fizzing, pop up over the
// bars in view like atoms of uranium; the clicked floor's button fires a
// neutron wisp into one and it splits in a big blast, its two halves flying
// apart and blowing in a cluster while it fires two more neutrons at two
// more bombs, which split and fire four, then eight: a chain reaction that
// doubles every generation, ever faster, every split landing free levels on
// the bar under it with a shake; it goes critical in a colossal blast on
// the clicked bar and every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "fission";
// four generations: 1, 2, 4 and 8 bombs
const GENERATIONS = 4;
const BOMB = WISP_SIZE * 1.25;
const NEUTRON = WISP_SIZE * 0.45;
// each generation's neutrons fly this long, quickening, give or take JITTER
const FLIGHT_MS = [380, 300, 230, 180];
const JITTER = 0.25;
const SPLIT_BLAST: [number, number] = [420, 240];
// the halves fly apart this far and this long, then blow
const HALF_REACH = 90;
const HALF_MS = 130;
const HALF_BLAST = 170;
const CRITICAL_BLAST = 850;
const CRITICAL_LAG = 220;
// bombs sit this far over their bar, MARGIN in from the screen's edges
const ABOVE: [number, number] = [40, 170];
const MARGIN = 90;
const SPLIT_SHAKE: [number, number] = [0.9, 1.4];
const HALF_SHAKE = 0.4;
const SOUND_GAP_MS = 55;

interface Nucleus {
  at: Point;
  bar: RewardBar;
  gen: number;
  // when its neutron leaves and when it lands, splitting it
  firedAt: number;
  splitAt: number;
  from: Point;
  neutron: (ms: number) => Point | null;
  bomb: () => Point;
}

interface Half {
  ms: number;
  at: (ms: number) => Point | null;
  to: Point;
}

export const forceFissionEvent = registerWispEvent(
  KEY,
  "Fission",
  () => CONFIG.fissionEvent.chance,
  (floor, context, area) => {
    const { growMs, holdMs, mergeMs, levelShare } = CONFIG.fissionEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    // a heap-ordered tree: bomb i's neutrons split bombs 2i+1 and 2i+2
    const count = 2 ** GENERATIONS - 1;
    const order = Array.from(
      { length: count },
      (_, i) => bars[i % bars.length],
    );
    order.sort(() => Math.random() - 0.5);
    const nuclei: Nucleus[] = [];
    for (let i = 0; i < count; i++) {
      const gen = Math.floor(Math.log2(i + 1));
      const bar = i === 0 ? clicked : order[i];
      const at: Point = {
        x: lerp([area.left + MARGIN, area.right - MARGIN], Math.random()),
        y: bar.box.y - lerp(ABOVE, Math.random()),
      };
      const parent = i === 0 ? null : nuclei[Math.floor((i - 1) / 2)];
      const from = parent ? parent.at : button;
      const firedAt = parent ? parent.splitAt : growMs;
      const splitAt =
        firedAt + FLIGHT_MS[gen] * (1 + JITTER * (Math.random() * 2 - 1));
      const spot: Point = { x: 0, y: 0 };
      nuclei.push({
        at,
        bar,
        gen,
        firedAt,
        splitAt,
        from,
        neutron: (ms) => {
          if (ms < firedAt || ms > splitAt) return null;
          const u = (ms - firedAt) / (splitAt - firedAt);
          spot.x = lerp([from.x, at.x], u);
          spot.y = lerp([from.y, at.y], u);
          return spot;
        },
        bomb: () => at,
      });
    }
    const halves: Half[] = nuclei.flatMap((n) => {
      const angle = Math.random() * Math.PI;
      return [angle, angle + Math.PI].map((a) => {
        const spot: Point = { x: 0, y: 0 };
        const to: Point = {
          x: n.at.x + Math.cos(a) * HALF_REACH,
          y: n.at.y + Math.sin(a) * HALF_REACH,
        };
        return {
          ms: n.splitAt + HALF_MS,
          to,
          at: (ms: number) => {
            if (ms < n.splitAt || ms >= n.splitAt + HALF_MS) return null;
            const u = (ms - n.splitAt) / HALF_MS;
            spot.x = lerp([n.at.x, to.x], u);
            spot.y = lerp([n.at.y, to.y], u);
            return spot;
          },
        };
      });
    });
    const lastSplit = Math.max(...nuclei.map((n) => n.splitAt));
    const criticalAt = lastSplit + CRITICAL_LAG;
    const endMs = criticalAt + DETONATION_MS;
    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };

    const firing = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const splitting = createBeats(
      nuclei,
      (n) => n.splitAt,
      (n, _, now) => {
        cover!.levels(n.bar, levels.get(n.bar)!, n.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(SPLIT_SHAKE, n.gen / (GENERATIONS - 1)));
        bang(now, n.gen === 0);
      },
    );
    const clustering = createBeats(
      halves,
      (h) => h.ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(HALF_SHAKE);
        bang(now);
      },
    );
    const critical = createBeats(
      [criticalAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(clicked.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: criticalAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          splitting.tick(ms, now);
          clustering.tick(ms, now);
          critical.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          for (const n of nuclei) {
            if (ms >= n.splitAt) continue;
            const burn = clamp01(ms / n.splitAt);
            drawLitFuse(ctx, n.at, burn, BOMB * 1.4 * pop, now);
            drawWisp(
              ctx,
              n.bomb,
              ms,
              now,
              BOMB * pop * (1 + 0.15 * burn),
              burn,
            );
          }
          for (const n of nuclei)
            drawWispBetween(
              ctx,
              n.neutron,
              ms,
              now,
              NEUTRON,
              1,
              n.firedAt,
              n.splitAt,
            );
          for (const h of halves)
            drawWispBetween(
              ctx,
              h.at,
              ms,
              now,
              BOMB * 0.6,
              0.8,
              h.ms - HALF_MS,
              h.ms,
            );
          for (const n of nuclei)
            drawDetonation(
              ctx,
              n.at,
              ms - n.splitAt,
              lerp(SPLIT_BLAST, n.gen / (GENERATIONS - 1)),
              now,
            );
          for (const h of halves)
            drawDetonation(ctx, h.to, ms - h.ms, HALF_BLAST, now);
          drawDetonation(
            ctx,
            clicked.center,
            ms - criticalAt,
            CRITICAL_BLAST,
            now,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

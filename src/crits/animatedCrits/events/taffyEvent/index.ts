// the "Taffy" event (money; cash): it covers its crit, whose click freezes
// the screen while a lump of cash bulges out of the clicked floor's button
// and two wisps grab it and pull it like taffy, stretching it into a long
// glossy rope across the screen, then folding it back on itself with a
// slap and a jolt, again and again, ever wider and faster, the rope
// twisting as it goes; on the last pull they fling it into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "taffy";
const REWARD = 4;
const COINS = 900;
const COIN = 0.45;
// the rope stretches to WIDE of the screen, folding to FOLD px across and
// sagging SAG px; it is THICK px round, twisting TWIST turns
const WIDE = 0.9;
const FOLD = 60;
const SAG = 160;
const THICK = 26;
const TWIST = 6;
const PULLER = 0.55;
const SLAP_COINS = 8;
const SLAP: [number, number] = [30, 110];
const SLAP_SHAKE: [number, number] = [0.5, 1.2];

export const forceTaffyEvent = registerWispEvent(
  KEY,
  "Taffy",
  () => CONFIG.taffyEvent.chance,
  (floor, context, area) => {
    const { lumpMs, pullsMs, flingMs, holdMs, mergeMs } = CONFIG.taffyEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const wide = (area.right - area.left) * WIDE;
    // each pull: out to a stretch and back to a fold
    let clock: number = lumpMs;
    const pulls = pullsMs.map((span, k) => {
      const starts = clock;
      clock += span;
      return {
        starts,
        span,
        width: lerp([wide * 0.6, wide], k / Math.max(1, pullsMs.length - 1)),
      };
    });
    const flingAt = clock;
    const endAt = flingAt + flingMs;
    const fold: Point = { x: cx, y: cy + SAG + 20 };
    // the rope's two ends and its sag at ms
    const rope = { half: FOLD / 2, sag: SAG, turn: 0 };
    const ropeAt = (ms: number) => {
      rope.half = FOLD / 2;
      rope.sag = SAG * clamp01(ms / lumpMs);
      for (const p of pulls) {
        const u = (ms - p.starts) / p.span;
        if (u < 0 || u >= 1) continue;
        const stretch = Math.sin(Math.PI * smoothstep(u));
        rope.half = lerp([FOLD / 2, p.width / 2], stretch);
        rope.sag = SAG * (1 - stretch) + 20;
      }
      if (ms >= flingAt) {
        rope.half = pulls[pulls.length - 1].width / 2;
        rope.sag = 20;
      }
      rope.turn = (ms / 1000) * TWIST * Math.PI * 2;
      return rope;
    };
    const ends = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > flingAt) return null;
        const r = ropeAt(ms);
        at.x = cx + side * r.half;
        at.y = cy;
        return at;
      };
    });

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const u = i / (COINS - 1);
      const offset = Math.random() * Math.PI * 2;
      const radius = (THICK / 2) * Math.sqrt(Math.random());
      const a: Point = { x: 0, y: 0 };
      const b: Point = { x: 0, y: 0 };
      const ctrl: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number) => {
        const r = ropeAt(ms);
        a.x = cx - r.half;
        a.y = cy;
        b.x = cx + r.half;
        b.y = cy;
        ctrl.x = cx;
        ctrl.y = cy + r.sag * 2;
        bezier(a, ctrl, b, u, at);
        const twist = Math.sin(u * TWIST * 8 + r.turn + offset) * radius;
        at.y += twist;
        return at;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < lumpMs) {
          const p = easeOut(clamp01(ms / lumpMs));
          place(lumpMs);
          return {
            x: lerp([button.x, at.x], p),
            y: lerp([button.y, at.y], p),
            scale: COIN * p,
          };
        }
        if (ms < flingAt) {
          place(ms);
          return { x: at.x, y: at.y, scale: COIN };
        }
        place(flingAt);
        const total = cover?.total() ?? fallback;
        // whipped in from one end to the other
        const p = easeIn(
          clamp01((ms - flingAt - u * flingMs * 0.4) / (flingMs * 0.6)),
        );
        return {
          x: lerp([at.x, total.x], p),
          y: lerp([at.y, total.y], p),
          scale: COIN,
        };
      };
    });

    const slapping = createBeats(
      pulls,
      (p) => p.starts + p.span,
      (_, k) => {
        if (k === pulls.length - 1) return;
        cover!.launchFrom(fold, ringTargets(fold, SLAP_COINS, SLAP));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SLAP_SHAKE, k / Math.max(1, pulls.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          slapping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const end of ends)
            drawWispBetween(
              ctx,
              end,
              ms,
              now,
              WISP_SIZE * PULLER,
              0.7,
              0,
              flingAt,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);

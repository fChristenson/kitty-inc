// the "Collapse" event (experiment: the frozen screen collapses like a
// building; cash): it covers its crit, whose click freezes the screen and
// it splits into storeys that give way from the bottom up, each dropping
// and slamming flat onto the pile with a thud, a jolt and a burst of coins,
// ever faster, until the whole screen lies crushed in a heap at the bottom;
// then it springs back up into place in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "collapse";
const REWARD = 4;
const BEHIND = "#0B0814";
const STOREYS = 6;
// a landed storey is crushed to CRUSH of its height, squashing over SQUASH_MS
const CRUSH = 0.3;
const SQUASH_MS = 90;
const LAND_COINS = 16;
const LAND_SHAKE: [number, number] = [0.8, 1.6];

export const forceCollapseEvent = registerWispEvent(
  KEY,
  "Collapse",
  () => CONFIG.collapseEvent.chance,
  (floor, context, area) => {
    const { gapsMs, fallMs, springMs, holdMs, mergeMs } = CONFIG.collapseEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const storey = height / STOREYS;
    // j counts up from the bottom storey, which gives way first
    let clock = 0;
    const storeys = Array.from({ length: STOREYS }, (_, j) => {
      const from = top + (STOREYS - 1 - j) * storey;
      const to = area.bottom - (j + 1) * storey * CRUSH;
      const drops = clock;
      clock += lerp(gapsMs, j / (STOREYS - 1));
      return { j, from, to, drops, lands: drops + fallMs };
    });
    const springAt = storeys[STOREYS - 1].lands + SQUASH_MS;
    const endAt = springAt + springMs;
    const centre = { x: left + width / 2, y: top + height / 2 };
    // a storey's top and height at ms
    const placed = { y: 0, h: 0 };
    const place = (s: (typeof storeys)[number], ms: number) => {
      if (ms >= springAt) {
        const u = easeOutBack(clamp01((ms - springAt) / springMs));
        placed.y = lerp([s.to, s.from], u);
        placed.h = lerp([storey * CRUSH, storey], u);
        return placed;
      }
      const fall = easeIn(clamp01((ms - s.drops) / fallMs));
      const squash = clamp01((ms - s.lands) / SQUASH_MS);
      placed.h = lerp([storey, storey * CRUSH], squash);
      // falling till its foot meets the pile, then squashing onto it
      const foot = lerp([s.from + storey, s.to + storey * CRUSH], fall);
      placed.y = foot - placed.h;
      return placed;
    };

    let shot: ScreenCopy | null = null;
    const landing = createBeats(
      storeys,
      (s) => s.lands,
      (s, k) => {
        const at = { x: centre.x, y: s.to + storey * CRUSH * 0.5 };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, LAND_COINS, [100, 300]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / (STOREYS - 1)));
      },
    );
    const springing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          springing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          for (const s of storeys) {
            const p = place(s, ms);
            drawScreenPart(
              ctx,
              shot,
              left,
              s.from,
              width,
              storey,
              left,
              p.y,
              width,
              p.h,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

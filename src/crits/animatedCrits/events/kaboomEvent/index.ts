// the "Kaboom" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a mad bomber wisp zigzags along the top of the
// screen dropping lit bombs, faster and faster, and a catcher wisp darts
// along the bottom to catch every one, each catch going off in a big blast,
// a bang, a jolt and a spray of cash, the catches rolling on quicker and
// quicker; then the bomber drops its whole load at once and five bombs land
// together in a row of blasts and a colossal one under them, the hardest
// shake, before the cash pours into the total. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";

const KEY = "kaboom";
const REWARD = 4;
const DROPS = 9;
const LOAD = 5;
const LOAD_SPREAD = 170;
const TOP = 170;
const BOTTOM = 190;
const SPAN = 0.38;
const MARGIN = 90;
const MOVE_MS = 260;
const BOMBER = 0.7;
const CATCHER = 0.75;
const BOMB = 0.4;
const FUSE = 13;
const CATCH_BLAST = 170;
const LOAD_BLAST = 230;
const COLOSSAL = 480;
const SPRAY = 14;
const CORE_DELAY_MS = 140;
const CATCH_SHAKE: [number, number] = [0.6, 1.3];
const LOAD_SHAKE = 2;

export const forceKaboomEvent = registerWispEvent(
  KEY,
  "Kaboom",
  () => CONFIG.kaboomEvent.chance,
  (floor, context, area) => {
    const { dropsMs, fallMs, loadGapMs, holdMs, mergeMs } = CONFIG.kaboomEvent;
    const mid = (area.left + area.right) / 2;
    const span = (area.right - area.left) * SPAN;
    const topY = area.top + TOP;
    const catchY = area.bottom - BOTTOM;
    // the bomber's zigzag, swinging ever faster
    const bomberX = (ms: number) =>
      mid + Math.sin(ms * 0.004 + ms * ms * 0.0000025) * span;
    let clock = 120;
    const drops = Array.from({ length: DROPS }, (_, i) => {
      const t = clock;
      clock += lerp(dropsMs, i / (DROPS - 1));
      return { drops: t, x: bomberX(t), lands: t + fallMs, size: CATCH_BLAST };
    });
    const loadAt = clock - lerp(dropsMs, 1) + loadGapMs;
    const lastX = Math.min(
      area.right - MARGIN - LOAD_SPREAD * 2,
      Math.max(area.left + MARGIN + LOAD_SPREAD * 2, bomberX(loadAt)),
    );
    const load = Array.from({ length: LOAD }, (_, i) => ({
      drops: loadAt,
      x: lastX + (i - (LOAD - 1) / 2) * LOAD_SPREAD,
      lands: loadAt + fallMs,
      size: LOAD_BLAST,
    }));
    const bombs = [...drops, ...load].map((b) => {
      const at: Point = { x: b.x, y: 0 };
      const spot: Point = { x: b.x, y: catchY };
      return {
        ...b,
        spot,
        at: (ms: number): Point => {
          at.y = lerp([topY, catchY], easeIn(clamp01((ms - b.drops) / fallMs)));
          return at;
        },
      };
    });
    const landsAt = loadAt + fallMs;
    const coreAt = landsAt + CORE_DELAY_MS;
    const core: Point = { x: lastX, y: catchY };
    const bomber: Point = { x: 0, y: topY };
    const catcher: Point = { x: 0, y: catchY };
    const bomberAt = (ms: number): Point => {
      bomber.x = bomberX(Math.min(ms, loadAt));
      return bomber;
    };
    // darting under each bomb just before it lands
    const catcherAt = (ms: number): Point => {
      let k = 0;
      while (k < DROPS - 1 && ms > drops[k].lands) k++;
      const from = k > 0 ? drops[k - 1].x : mid;
      const move =
        k > 0
          ? Math.min(MOVE_MS, drops[k].lands - drops[k - 1].lands)
          : MOVE_MS;
      const u = smoothstep(
        clamp01((ms - (drops[k].lands - move)) / (move * 0.8)),
      );
      catcher.x = lerp([from, drops[k].x], u);
      return catcher;
    };

    const landing = createBeats(
      bombs,
      (b) => b.lands,
      (b, i) => {
        cover!.launchFrom(
          b.spot,
          clampTargetsY(
            sprayTargets(b.spot, SPRAY, [90, 260], -Math.PI / 2, 1.6),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (i < DROPS) {
          playExplosion();
          shakeScreen(lerp(CATCH_SHAKE, i / (DROPS - 1)));
        } else if (i === DROPS) {
          playExplosion();
          shakeScreen(LOAD_SHAKE);
        }
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => cover!.blast(core),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const b of bombs) {
            drawDetonation(ctx, b.spot, ms - b.lands, b.size, now);
            if (ms < b.drops || ms >= b.lands) continue;
            drawLitFuse(ctx, b.at(ms), (ms - b.drops) / fallMs, FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              b.drops,
              b.lands,
            );
          }
          drawDetonation(ctx, core, ms - coreAt, COLOSSAL, now);
          drawWispBetween(
            ctx,
            bomberAt,
            ms,
            now,
            WISP_SIZE * BOMBER,
            0.8,
            0,
            loadAt + 200,
          );
          drawWispBetween(
            ctx,
            catcherAt,
            ms,
            now,
            WISP_SIZE * CATCHER,
            0.8,
            0,
            drops[DROPS - 1].lands,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

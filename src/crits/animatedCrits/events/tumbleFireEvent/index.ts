// the "Tumble Fire" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a gun wisp drops in from the
// top of the screen tumbling end over end, ever faster, and every time its
// muzzle swings round onto an income bar it rattles a burst into it, each
// hit a flash, a pop and a jolt landing free levels; it lands at the bottom
// and fires one last volley at every bar at once, which all slam in a huge
// blast and shake. Then the crit's tier pays out
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
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "tumbleFire";
const MAX_BARS = 4;
const TOP = 120;
const BOTTOM = 140;
const DRIFT = 180;
const TURNS = 4;
const STEP = 2;
const ROUNDS = 3;
const ROUND_GAP = 35;
const MAX_BURSTS = 3;
const SPEED = 2.6;
const FLASH_MS = 70;
const FLASH = 50;
const GUN = 0.6;
const HIT_SHAKE: [number, number] = [0.4, 1];

interface Burst {
  bar: RewardBar;
  at: number;
  rounds: Bullet[];
  angles: number[];
}

export const forceTumbleFireEvent = registerWispEvent(
  KEY,
  "Tumble Fire",
  () => CONFIG.tumbleFireEvent.chance,
  (floor, context, area) => {
    const { fallMs, levelShare, holdMs, mergeMs } = CONFIG.tumbleFireEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const midX = (area.left + area.right) / 2;
    const spot: Point = { x: 0, y: 0 };
    const gunAt = (ms: number, into: Point): Point => {
      const u = clamp01(ms / fallMs);
      into.x = midX + Math.sin(u * Math.PI * 1.5) * DRIFT;
      into.y = lerp([area.top + TOP, area.bottom - BOTTOM], easeIn(u));
      return into;
    };
    const turn = (ms: number) =>
      -Math.PI / 2 + TURNS * Math.PI * 2 * easeIn(clamp01(ms / fallMs));
    const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    // a burst every time the muzzle sweeps across a bar
    const bursts: Burst[] = [];
    const fired = new Map<RewardBar, number>();
    const previous = new Map<RewardBar, number>();
    for (let ms = 0; ms <= fallMs; ms += STEP) {
      gunAt(ms, spot);
      const a = turn(ms);
      for (const bar of bars) {
        const diff = wrap(
          a - Math.atan2(bar.center.y - spot.y, bar.center.x - spot.x),
        );
        const before = previous.get(bar);
        previous.set(bar, diff);
        if (before === undefined || before >= 0 || diff < 0 || diff > 0.5)
          continue;
        if ((fired.get(bar) ?? 0) >= MAX_BURSTS) continue;
        fired.set(bar, (fired.get(bar) ?? 0) + 1);
        const from = { x: spot.x, y: spot.y };
        const rounds = Array.from({ length: ROUNDS }, (_, r) =>
          aimBullet(from, bar.center, ms + r * ROUND_GAP, SPEED),
        );
        bursts.push({
          bar,
          at: ms,
          rounds,
          angles: rounds.map(() =>
            Math.atan2(bar.center.y - from.y, bar.center.x - from.x),
          ),
        });
      }
    }
    const landed: Point = { x: 0, y: 0 };
    gunAt(fallMs, landed);
    const volleyAt = fallMs + 120;
    const volley = bars.map((bar) =>
      aimBullet(landed, bar.center, volleyAt, SPEED * 1.3),
    );
    const endAt = Math.max(...volley.map((b) => b.hitAt));
    const bullets = [...bursts.flatMap((b) => b.rounds), ...volley];
    const hits = bursts.map((b) => ({ burst: b, ms: b.rounds[0].hitAt }));

    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        const { bar } = h.burst;
        cover!.levels(
          bar,
          levelsFor(bar.floor, levelShare, 1),
          h.burst.rounds[0].from,
        );
        cover!.burst(bar.center, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const volleying = createBeats(
      volley,
      (b) => b.hitAt,
      (b, k) => {
        const bar = bars[k];
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 2, 2), landed);
        if (b.hitAt === endAt) {
          for (const each of bars) cover!.slam(each);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.6);
        if (cover!.isLive()) playExplosion();
      },
    );
    const tumbler: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => gunAt(Math.max(0, ms), tumbler);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          volleying.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          // the muzzle's glint marks which way it's pointing as it tumbles
          if (ms < volleyAt) {
            const at = gun(ms);
            drawMuzzleFlash(ctx, at, turn(ms), 0.4, FLASH * 0.6);
          }
          for (const b of bursts)
            for (let r = 0; r < b.rounds.length; r++) {
              const t = (ms - b.rounds[r].firedAt) / FLASH_MS;
              if (t > 0 && t < 1)
                drawMuzzleFlash(ctx, b.rounds[r].from, b.angles[r], t, FLASH);
            }
          for (const b of volley) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(
                ctx,
                landed,
                Math.atan2(b.dy, b.dx),
                t,
                FLASH * 1.4,
              );
          }
          drawBullets(ctx, bullets, ms, now);
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

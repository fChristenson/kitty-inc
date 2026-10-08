// the "Spring Loaded" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of cash pours down into the bottom
// middle of the screen and coils into a tall spring of coins seen side-on;
// the spring is squeezed down in jerks, each a creak and a rumble harder
// than the last, its coils bunching ever tighter; then it lets go and the
// whole spring launches straight up the screen, uncoiling into a towering
// jet that slams into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "springLoaded";
const REWARD = 4;
const COINS = 1_000;
const COIN = 0.42;
// the spring winds TURNS coils RADIUS px round, standing HEIGHT px tall on a
// base BASE px off the bottom
const TURNS = 9;
const RADIUS = 90;
const HEIGHT = 400;
const BASE = 170;
const SOURCE = 100;
const FALL_MS = 260;
// each jerk squeezes off SQUEEZE more of its height over JERK_MS
const JERKS = 4;
const SQUEEZE = 0.13;
const JERK_MS = 80;
const DEPTH = 0.3;
const STAGGER = 220;
const UNCOIL = 0.6;
const JERK_SHAKE: [number, number] = [0.5, 1.5];
const RELEASE_SHAKE = 1.8;

export const forceSpringLoadedEvent = registerWispEvent(
  KEY,
  "Spring Loaded",
  () => CONFIG.springLoadedEvent.chance,
  (floor, context, area) => {
    const { formMs, jerksMs, launchMs, holdMs, mergeMs } =
      CONFIG.springLoadedEvent;
    const fallback = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const base: Point = { x: cx, y: area.bottom - BASE };
    const source: Point = { x: cx, y: area.top + SOURCE };
    let clock: number = formMs;
    const jerks = Array.from({ length: JERKS }, (_, k) => {
      clock += lerp(jerksMs, k / (JERKS - 1));
      return clock;
    });
    const releaseAt = clock + jerksMs[1] * 0.8;
    const endAt = releaseAt + STAGGER + launchMs;
    // the spring's height at ms, dropping a notch at each jerk
    const heightAt = (ms: number) => {
      let h = HEIGHT;
      for (let k = 0; k < JERKS; k++) {
        if (ms < jerks[k]) break;
        const target = HEIGHT * (1 - SQUEEZE * (k + 1));
        h = lerp([h, target], easeOutBack(clamp01((ms - jerks[k]) / JERK_MS)));
      }
      return h;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const s = i / (COINS - 1);
      const angle = Math.PI * 2 * TURNS * s;
      const sx = Math.sin(angle) * RADIUS;
      const scale = COIN * (1 + DEPTH * Math.cos(angle));
      const leaves = s * (formMs - FALL_MS);
      const lands = leaves + FALL_MS;
      const ups = releaseAt + (1 - s) * STAGGER;
      const coilAt = (ms: number) => base.y - s * heightAt(ms);
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: source.x, y: source.y, scale: 0 };
        if (ms < lands) {
          const e = easeIn((ms - leaves) / FALL_MS);
          return {
            x: lerp([source.x, cx + sx], e),
            y: lerp([source.y, coilAt(ms)], e),
            scale,
          };
        }
        if (ms < ups) return { x: cx + sx, y: coilAt(ms), scale };
        const total = cover?.total() ?? fallback;
        const t = clamp01((ms - ups) / launchMs);
        const from = coilAt(ups);
        // uncoiling: the coil's swing dies away as it shoots up
        const wave = sx * (1 - t) * (1 + UNCOIL * Math.sin(t * Math.PI * 3));
        return {
          x: lerp([cx, total.x], t) + wave,
          y: lerp([from, total.y], easeIn(t)),
          scale: COIN,
        };
      };
    });

    const squeezing = createBeats(
      jerks,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(JERK_SHAKE, k / (JERKS - 1)));
      },
    );
    const releasing = createBeats(
      [releaseAt],
      (ms) => ms,
      () => {
        cover!.burst(base, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(RELEASE_SHAKE);
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
          squeezing.tick(ms, now);
          releasing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);

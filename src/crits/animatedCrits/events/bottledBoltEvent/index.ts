// the "Bottled Bolt" event (lightning; crit tiers): it covers its crit,
// whose click freezes the screen while lightning gets trapped in a round
// bottle of light in the middle of it, bolts ricocheting wall to wall
// inside ever faster and thicker as its core glows hotter and the bottle
// rattles and the screen rumbles; then it uncorks and the bolts burst out
// one after another, each cracking down onto an income bar in a blinding
// strike and a jolt that jumps the bar a crit tier; the last blows the
// bottle in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "bottledBolt";
const MAX_BARS = 3;
const CHORDS = 14;
const RIM = 24;
// the bottle is BOTTLE px round; trapped bolts last ZAP_MS, coming ever
// faster; released bolts linger STRIKE_MS
const BOTTLE = 80;
const ZAP_MS = 90;
const STRIKE_MS = 260;
const RATTLE = 4;
const STRIKE_SHAKE: [number, number] = [1, 1.6];

export const forceBottledBoltEvent = registerWispEvent(
  KEY,
  "Bottled Bolt",
  () => CONFIG.bottledBoltEvent.chance,
  (floor, context, area) => {
    const { trapMs, releasesMs, holdMs, mergeMs } = CONFIG.bottledBoltEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const rimAt = (a: number) => ({
      x: center.x + Math.cos(a) * BOTTLE,
      y: center.y + Math.sin(a) * BOTTLE,
    });
    const chords = Array.from({ length: CHORDS }, () => {
      const a = Math.random() * Math.PI * 2;
      const b = a + Math.PI * (0.5 + Math.random());
      return createBolt(rimAt(a), rimAt(b), 1);
    });
    // trapped zaps crowd together toward the uncorking
    const zaps = Array.from({ length: 36 }, (_, i) => ({
      at: trapMs * Math.sqrt(i / 36),
      bolt: chords[i % CHORDS],
    }));
    let clock: number = trapMs;
    const releases = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(releasesMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        at,
        bolt: createBolt({ x: center.x, y: center.y - BOTTLE }, bar.center, 2),
      };
    });
    const last = releases[releases.length - 1];
    const endAt = last.at;
    const rim: Point[] = Array.from({ length: RIM }, () => ({ x: 0, y: 0 }));

    const rumbling = createBeats(
      [trapMs * 0.33, trapMs * 0.66],
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive()) shakeScreen(0.4 + 0.3 * k);
      },
    );
    const releasing = createBeats(
      releases,
      (r) => r.at,
      (r, k) => {
        cover!.tierUp(r.bar, center);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(center);
          return;
        }
        cover!.burst(r.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, releases.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          releasing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + STRIKE_MS) return;
          const charge = clamp01(ms / trapMs);
          if (ms <= endAt) {
            // the bottle's glass: a ring of short beams, rattling
            const jx = (Math.random() - 0.5) * RATTLE * charge;
            const jy = (Math.random() - 0.5) * RATTLE * charge;
            for (let i = 0; i < RIM; i++) {
              const a = (i / RIM) * Math.PI * 2;
              rim[i].x = center.x + jx + Math.cos(a) * BOTTLE;
              rim[i].y = center.y + jy + Math.sin(a) * BOTTLE;
            }
            for (let i = 0; i < RIM; i++)
              drawBeam(ctx, rim[i], rim[(i + 1) % RIM], 4, 0.5);
            drawStrike(ctx, center, 0.4 + 0.6 * charge, 0.6 + charge, now);
          }
          for (const z of zaps) {
            const t = (ms - z.at) / ZAP_MS;
            if (t >= 0 && t < 1 && ms < trapMs)
              drawBolt(ctx, z.bolt, 1 - t, 0.5);
          }
          for (const r of releases) {
            const t = (ms - r.at) / STRIKE_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, r.bolt, 1 - t, 1);
            drawStrike(ctx, r.bar.center, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

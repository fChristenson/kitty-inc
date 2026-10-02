// the "Dive Bomb" event: it covers its crit, whose click freezes the screen
// while wisps sweep in and circle high over it like vultures, the ring
// wheeling round; one after another they peel off and dive-bomb the clicked
// floor's button in a swooping plunge, each impact a flash, a slam, a jolt and
// a spray of coins, ever harder; the last impact blows the button in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutCubic, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "diveBomb";
const REWARD = 4;
// the ring: BOMBERS wisps circling RING of the screen's width round a point
// HIGH of its height down from its top, squashed to SQUASH tall, turning
// TURN_HZ times a second
const BOMBERS = 5;
const RING = 0.32;
const HIGH = 0.22;
const SQUASH = 0.4;
const TURN_HZ = 0.9;
// how they sweep in from off the screen's top
const ENTER_MS = 260;
const WISP = 0.055;
const HIT_COINS = [12, 16, 20, 24];
const HIT_REACH: [number, number] = [40, 120];
const HIT_SHAKE: [number, number] = [1.2, 2.2];
const HIT_BURST: [number, number] = [0.7, 1.2];

export const forceDiveBombEvent = registerWispEvent(
  KEY,
  "Dive Bomb",
  () => CONFIG.diveBombEvent.chance,
  (floor, context, area) => {
    const { circleMs, gapsMs, diveMs, holdMs, mergeMs } = CONFIG.diveBombEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const hub = { x: (area.left + area.right) / 2, y: area.top + height * HIGH };
    const r = width * RING;
    const way = Math.random() < 0.5 ? 1 : -1;
    const ring = (k: number, ms: number, into: Point): Point => {
      const a = way * Math.PI * 2 * TURN_HZ * (ms / 1000) + (k / BOMBERS) * Math.PI * 2;
      into.x = hub.x + Math.cos(a) * r;
      into.y = hub.y + Math.sin(a) * r * SQUASH;
      return into;
    };
    // each peels off in turn, quicker and quicker
    let at = circleMs;
    const dives = Array.from({ length: BOMBERS }, (_, k) => {
      const from = at;
      at += gapsMs[Math.min(k, gapsMs.length - 1)];
      return { from, hitAt: from + diveMs };
    });
    const lastHit = dives[BOMBERS - 1].hitAt;
    const bombers = dives.map((d, k) => {
      const into = { x: 0, y: 0 };
      const peel = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= d.hitAt) return null;
        if (ms < d.from) {
          ring(k, ms, into);
          // swept in from above the screen
          const u = easeOutCubic(clamp01(ms / ENTER_MS));
          into.y = area.top - 60 + (into.y - area.top + 60) * u;
          return into;
        }
        ring(k, d.from, peel);
        // a swooping plunge, bowing out past where it peeled off
        const bend = { x: peel.x + (peel.x - hub.x) * 0.6, y: button.y - height * 0.15 };
        return bezier(peel, bend, button, easeIn(clamp01((ms - d.from) / diveMs)), into);
      };
    });

    const peels = createBeats(dives, (d) => d.from, () => {
      if (cover?.isLive()) playSwoosh();
    });
    const hits = createBeats(dives, (d) => d.hitAt, (_, k) => {
      if (k === BOMBERS - 1) {
        cover!.blast(button);
        return;
      }
      const t = k / (BOMBERS - 2);
      cover!.burst(button, lerp(HIT_BURST, t));
      cover!.launchFrom(button, sprayTargets(button, HIT_COINS[k], HIT_REACH, -Math.PI / 2, Math.PI * 1.2));
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(lerp(HIT_SHAKE, t));
    });

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastHit + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          peels.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = Math.max(WISP_SIZE, width * WISP);
          bombers.forEach((at, k) =>
            drawWispBetween(ctx, at, ms, now, size, ms >= dives[k].from ? 1 : 0.3, 0, dives[k].hitAt),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

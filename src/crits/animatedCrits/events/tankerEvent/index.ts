// the "Tanker" event (mix; free upgrade levels and cash): it covers its crit,
// whose click freezes the screen while a big tanker wisp flies across the
// sky; receiver wisps slide in behind it in formation and hook on, and
// hoses of cash stream down to them as they drink, swelling; one after
// another they break away and dive onto an income bar, bursting open in a
// flash and a jolt of free levels that sprays their cash out over it, the
// last in a huge blast and shake; the cash then flows into the total. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawBeam } from "../../../../shared/beam";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "tanker";
const REWARD = 3;
const RECEIVERS = 3;
const MAX_BARS = 3;
const COINS = 160;
const COIN = 0.38;
const TANKER = 1.4;
// each receiver's slot behind the tanker, and when it hooks on and lets go
const SLOTS: Point[] = [
  { x: -170, y: 90 },
  { x: -60, y: 140 },
  { x: -290, y: 150 },
];
const HOOKS = [250, 380, 510];
const RELEASES = [880, 1080, 1280];
const JOIN_MS = 250;
const JOIN_FROM: Point = { x: -320, y: 70 };
const SAG = 34;
const SPRAY_MS = 300;
const REACH: [number, number] = [60, 200];
const DRINK: [number, number] = [0.45, 0.95];
const HOOK_SHAKE = 0.3;
const LAND_SHAKE: [number, number] = [0.8, 1.2];

export const forceTankerEvent = registerWispEvent(
  KEY,
  "Tanker",
  () => CONFIG.tankerEvent.chance,
  (floor, context, area) => {
    const { flyMs, hoseMs, diveMs, levelShare, holdMs, mergeMs } =
      CONFIG.tankerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const height = area.bottom - area.top;
    const skyY = area.top + height * 0.18;
    const tankerAt = (ms: number, into: Point) => {
      into.x = lerp([area.left - 120, area.right + 120], ms / flyMs);
      into.y = skyY + Math.sin(ms * 0.004) * 6;
      return into;
    };
    const receivers = Array.from({ length: RECEIVERS }, (_, j) => {
      const bar: RewardBar = bars[j % bars.length];
      const lands = RELEASES[j] + diveMs;
      const from = tankerAt(RELEASES[j], { x: 0, y: 0 });
      from.x += SLOTS[j].x;
      from.y += SLOTS[j].y;
      const bend: Point = { x: from.x + 120, y: bar.center.y - 140 };
      return { bar, hooks: HOOKS[j], releases: RELEASES[j], lands, from, bend };
    });
    const lastLand = Math.max(...receivers.map((r) => r.lands));
    const travel = lastLand + SPRAY_MS;
    // where receiver j is at ms, or false once it's landed
    const receiverAt = (j: number, ms: number, into: Point): boolean => {
      const r = receivers[j];
      if (ms > r.lands) return false;
      if (ms < r.releases) {
        tankerAt(ms, into);
        const join = 1 - easeOut(clamp01((ms - (r.hooks - JOIN_MS)) / JOIN_MS));
        into.x += SLOTS[j].x + JOIN_FROM.x * join;
        into.y += SLOTS[j].y + JOIN_FROM.y * join;
        return true;
      }
      bezier(
        r.from,
        r.bend,
        r.bar.center,
        easeIn(clamp01((ms - r.releases) / diveMs)),
        into,
      );
      return true;
    };

    const paths: CoinPath[] = [];
    receivers.forEach((r, j) => {
      const flowFor = r.releases - hoseMs - r.hooks;
      const targets = clampTargetsY(
        sprayTargets(r.bar.center, COINS, REACH),
        area.top + 40,
        area.bottom - 40,
      );
      for (let i = 0; i < COINS; i++) {
        const emits = r.hooks + (flowFor * i) / COINS;
        const target = targets[i];
        const a: Point = { x: 0, y: 0 };
        const b: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * travel;
          if (ms < emits) {
            tankerAt(Math.max(0, ms), a);
            return { x: a.x, y: a.y, scale: 0 };
          }
          if (ms < emits + hoseMs) {
            const u = (ms - emits) / hoseMs;
            tankerAt(ms, a);
            receiverAt(j, ms, b);
            return {
              x: lerp([a.x, b.x], u),
              y: lerp([a.y, b.y], u) + Math.sin(Math.PI * u) * SAG,
              scale: COIN,
            };
          }
          if (ms < r.lands) {
            receiverAt(j, ms, b);
            return { x: b.x, y: b.y, scale: 0 };
          }
          const u = easeOut(clamp01((ms - r.lands) / SPRAY_MS));
          return {
            x: lerp([r.bar.center.x, target.x], u),
            y: lerp([r.bar.center.y, target.y], u),
            scale: COIN,
          };
        });
      }
    });

    const tanker: Point = { x: 0, y: 0 };
    const tankerWisp = (ms: number): Point | null =>
      ms < 0 || ms > flyMs ? null : tankerAt(ms, tanker);
    const spots = receivers.map(() => ({ x: 0, y: 0 }));
    const receiverWisps = receivers.map(
      (r, j) =>
        (ms: number): Point | null =>
          ms < r.hooks - JOIN_MS || !receiverAt(j, ms, spots[j])
            ? null
            : spots[j],
    );
    const hoseA: Point = { x: 0, y: 0 };
    const hoseB: Point = { x: 0, y: 0 };

    const hooking = createBeats(
      receivers,
      (r) => r.hooks,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(HOOK_SHAKE);
      },
    );
    const releasing = createBeats(
      receivers,
      (r) => r.releases,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      receivers,
      (r) => r.lands,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), r.from);
        if (r.lands === lastLand) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center, 0);
          return;
        }
        cover!.burst(r.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, receivers.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          hooking.tick(ms, now);
          releasing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms > travel) return;
          for (let j = 0; j < receivers.length; j++) {
            const r = receivers[j];
            if (ms < r.hooks || ms > r.releases) continue;
            tankerAt(ms, hoseA);
            receiverAt(j, ms, hoseB);
            drawBeam(ctx, hoseA, hoseB, 6, 0.5);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > travel) return;
          drawWispBetween(
            ctx,
            tankerWisp,
            ms,
            now,
            WISP_SIZE * TANKER,
            0.4,
            0,
            flyMs,
          );
          for (let j = 0; j < receivers.length; j++) {
            const r = receivers[j];
            const drink = lerp(
              DRINK,
              clamp01((ms - r.hooks) / (r.releases - r.hooks)),
            );
            if (ms < r.releases)
              drawWispHead(
                ctx,
                receiverWisps[j],
                ms,
                now,
                WISP_SIZE * drink,
                0.6,
              );
            else
              drawWispBetween(
                ctx,
                receiverWisps[j],
                ms,
                now,
                WISP_SIZE * drink,
                0.9,
                r.releases,
                r.lands,
              );
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

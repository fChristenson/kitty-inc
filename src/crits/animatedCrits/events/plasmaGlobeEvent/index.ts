// the "Plasma Globe" event (lightning; cash): it covers its crit, whose
// click freezes the screen while a big wisp swells in the middle of the
// screen like a plasma globe, crackling tendrils of lightning reaching out
// of it and writhing round the screen, cash streaming in along every one of
// them into the core; it pulses, ever faster, every pulse the tendrils
// flaring with a crack, a jolt and sprays of coins off their tips; then every
// tendril whips round onto the total at once and the core fires into it in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { totalSpot } from "../../cashFlow";

const KEY = "plasmaGlobe";
const REWARD = 4;
const TENDRILS = 6;
const COINS = 1_000;
const COIN = 0.6;
const TIP_COINS = 6;
const FLARE_MS = 140;
const GROW_MS = 300;
const WHIP_MS = 220;
const CORE = 1.6;
const PULSE_SHAKE: [number, number] = [0.6, 1.4];

export const forcePlasmaGlobeEvent = registerWispEvent(
  KEY,
  "Plasma Globe",
  () => CONFIG.plasmaGlobeEvent.chance,
  (floor, context, area) => {
    const { writheMs, pulses, flowMs, holdMs, mergeMs } =
      CONFIG.plasmaGlobeEvent;
    const fallback = totalSpot(area);
    const core: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.55,
    };
    const reach =
      Math.min(area.right - area.left, area.bottom - area.top) * 0.46;
    const whipAt = writheMs;
    const endAt = writheMs + WHIP_MS;
    const tendrils = Array.from({ length: TENDRILS }, (_, j) => ({
      base: (j / TENDRILS) * Math.PI * 2 + Math.random() * 0.4,
      wobble: 0.0015 + Math.random() * 0.002,
      phase: Math.random() * Math.PI * 2,
    }));
    // where tendril j's tip writhes, ms in (on the total once whipped round)
    const tipAt = (j: number, ms: number, into: Point): Point => {
      const d = tendrils[j];
      const a = d.base + Math.sin(ms * d.wobble + d.phase) * 0.9;
      const r =
        reach *
        (0.75 + 0.25 * Math.sin(ms * d.wobble * 1.7 + d.phase)) *
        easeOut(clamp01(ms / GROW_MS));
      into.x = core.x + Math.cos(a) * r;
      into.y = core.y + Math.sin(a) * r;
      if (ms <= whipAt) return into;
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - whipAt) / WHIP_MS));
      into.x += (total.x - into.x) * u;
      into.y += (total.y - into.y) * u;
      return into;
    };
    const bolts = tendrils.map(() => createBolt(core, { x: 0, y: 0 }, 1));
    const coreAt = () => core;
    const flaring = (ms: number) => {
      for (const at of beats) if (ms >= at && ms < at + FLARE_MS) return true;
      return false;
    };
    // cash crawls in from each tip to the core
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const j = i % TENDRILS;
      const leaves = Math.random() * (whipAt - flowMs);
      const tip: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * whipAt;
        const u = (ms - leaves) / flowMs;
        if (u <= 0 || u >= 1) return { x: core.x, y: core.y, scale: 0 };
        tipAt(j, ms, tip);
        return {
          x: tip.x + (core.x - tip.x) * u,
          y: tip.y + (core.y - tip.y) * u,
          scale: COIN,
        };
      };
    });
    const beats = Array.from(
      { length: pulses },
      (_, k) => GROW_MS + (whipAt - GROW_MS) * Math.sqrt((k + 0.5) / pulses),
    );

    const pulsing = createBeats(
      beats,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, pulses - 1);
        for (let j = 0; j < TENDRILS; j++) {
          const at = tipAt(j, ms, { x: 0, y: 0 });
          cover!.launchFrom(
            at,
            clampTargetsY(
              sprayTargets(at, TIP_COINS, [60, 180]),
              area.top + 40,
              area.bottom - 20,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PULSE_SHAKE, t));
      },
    );
    const firing = createBeats(
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
          pulsing.tick(ms, now);
          firing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const flare = flaring(ms);
          const thick = flare || ms > whipAt ? 1 : 0.5;
          bolts.forEach((bolt, j) => {
            tipAt(j, ms, bolt.to);
            drawBolt(ctx, bolt, 0.6 + 0.4 * thick, thick);
            if (flare) drawStrike(ctx, bolt.to, 1, 0.8, now);
          });
          drawWisp(
            ctx,
            coreAt,
            ms,
            now,
            WISP_SIZE * CORE,
            clamp01(ms / whipAt),
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, whipAt);
    playBoostEventStream();
  },
);

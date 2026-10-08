// the "Railgun" event (beam; cash): it covers its crit, whose click freezes
// the screen while two blazing rails build up the middle of the screen from
// the bottom toward the total, section by section, ever faster, each a
// flare, a bang, a jolt and a spurt of coins; they crackle and brighten as
// the screen rumbles, then fire: a slug of cash rockets up between them in a
// blink and punches into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "railgun";
const REWARD = 4;
const SECTIONS = 6;
// the rails run GAUGE px apart
const GAUGE = 110;
const RAIL = 12;
const CORE = 40;
const SLUG_COINS = 800;
const SLUG_LENGTH = 220;
const COIN = 0.7;
const SECTION_COINS = 12;
const FLASH_MS = 160;
const RUMBLE_MS = 70;
const SECTION_SHAKE: [number, number] = [0.6, 1.3];

export const forceRailgunEvent = registerWispEvent(
  KEY,
  "Railgun",
  () => CONFIG.railgunEvent.chance,
  (floor, context, area) => {
    const { buildsMs, chargeMs, fireMs, holdMs, mergeMs } = CONFIG.railgunEvent;
    const fallback = totalSpot(area);
    const x = fallback.x;
    const bottom = area.bottom - 30;
    const top = fallback.y + 70;
    const sectionY = (k: number) => bottom + ((top - bottom) * k) / SECTIONS;
    const builds: number[] = [];
    let clock = 0;
    for (let k = 0; k < SECTIONS; k++) {
      clock += lerp(buildsMs, k / (SECTIONS - 1));
      builds.push(clock);
    }
    const fireAt = clock + chargeMs;
    const endAt = fireAt + fireMs;
    const rails: [Point, Point][] = [-1, 1].map((side) => [
      { x: x + (side * GAUGE) / 2, y: bottom },
      { x: x + (side * GAUGE) / 2, y: bottom },
    ]);
    const coreBase: Point = { x, y: bottom };
    const coreTip: Point = { x, y: bottom };
    const paths: CoinPath[] = Array.from({ length: SLUG_COINS }, () => {
      const dx = (Math.random() * 2 - 1) * GAUGE * 0.3;
      const back = Math.random() * SLUG_LENGTH;
      const from: Point = { x: x + dx, y: bottom + back };
      return (f) => {
        const ms = f * endAt;
        if (ms < fireAt) return { x: from.x, y: from.y, scale: 0 };
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - fireAt) / fireMs));
        return {
          x: from.x + (total.x - from.x) * u,
          y: from.y + (total.y - from.y) * u,
          scale: COIN,
        };
      };
    });

    let lastRumble = -Infinity;
    const building = createBeats(
      builds,
      (ms) => ms,
      (_, k) => {
        const at = { x, y: sectionY(k + 1) };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, SECTION_COINS, [80, 220]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SECTION_SHAKE, k / (SECTIONS - 1)));
      },
    );
    const firing = createBeats(
      [fireAt],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const punching = createBeats(
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
          building.tick(ms, now);
          firing.tick(ms, now);
          punching.tick(ms, now);
          if (
            ms > builds[SECTIONS - 1] &&
            ms < fireAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(0.9);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          let built = 0;
          while (built < SECTIONS && ms >= builds[built]) built++;
          if (built === 0) return;
          const charge = clamp01((ms - builds[SECTIONS - 1]) / chargeMs);
          const fade = ms > endAt ? 1 - (ms - endAt) / FLASH_MS : 1;
          const glow = (0.6 + 0.4 * charge) * fade;
          for (const [a, b] of rails) {
            b.y = sectionY(built);
            drawBeam(ctx, a, b, RAIL * (1 + charge), glow);
            drawBeamFlare(ctx, b, 18 + 12 * charge, glow, now);
          }
          // the newest section flaring as it locks in
          const since = ms - builds[built - 1];
          if (since < FLASH_MS && built <= SECTIONS)
            for (const [, b] of rails)
              drawBeamFlare(ctx, b, 36, 1 - since / FLASH_MS, now);
          if (ms >= fireAt) {
            coreTip.y = lerp([bottom, top], clamp01((ms - fireAt) / fireMs));
            drawBeam(ctx, coreBase, coreTip, CORE, fade);
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);

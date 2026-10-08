// the "Dam Burst" event (money): it covers its crit, whose click freezes the
// screen while the clicked floor's button gushes cash into one half of it,
// piling up against an unseen dam down its middle into a sheer cliff of
// cash, higher and higher, trembling as the screen rumbles; the dam bursts
// with a bang and a huge shake and the whole heap floods across to the far
// side in one wave and surges up the far wall into the total-income readout
// in a huge blast, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "damBurst";
const REWARD = 4;
// the heap fills the half from its wall to the dam, up to HIGH of the
// screen's height, its coins ARC px over the button's gush
const COINS = 1_400;
const HIGH = 0.5;
const FLOOR_GAP = 0.03;
const ARC = 160;
const POUR_MS = 260;
const COIN = 0.75;
const TREMBLE = 3;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.4];
// the dam bursts into BREACHES flashes up its face
const BREACHES = 5;
const BURST_SHAKE = 2.6;

export const forceDamBurstEvent = registerWispEvent(
  KEY,
  "Dam Burst",
  () => CONFIG.damBurstEvent.chance,
  (floor, context, area) => {
    const { fillMs, spreadMs, floodMs, holdMs, mergeMs } = CONFIG.damBurstEvent;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dam = (area.left + area.right) / 2;
    const wall = side < 0 ? area.left : area.right;
    const farWall = side < 0 ? area.right : area.left;
    const bottom = area.bottom - height * FLOOR_GAP;
    const burstAt = fillMs;
    const endAt = burstAt + spreadMs + floodMs;
    const corner = { x: farWall, y: bottom };
    const level = (ms: number) => height * HIGH * easeOut(clamp01(ms / fillMs));

    // the k-th coin to land settles a row higher than the ones before it
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, k) => {
      const lands = (k / COINS) * (fillMs - POUR_MS) + POUR_MS;
      const leaves = lands - POUR_MS;
      const across = Math.random();
      const slot = {
        x: dam + (wall - dam) * across,
        y: bottom - level(lands) * (0.85 + 0.15 * Math.random()),
      };
      const peak = {
        x: (button.x + slot.x) / 2,
        y: Math.min(button.y, slot.y) - ARC,
      };
      // the flood front breaks from the dam first
      const floods = burstAt + spreadMs * across;
      const spill = {
        x: farWall + (dam - farWall) * 0.15 * Math.random(),
        y: bottom - height * 0.05 * Math.random(),
      };
      const ledge = { x: spill.x, y: slot.y };
      const at = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: button.x, y: button.y, scale: 0 };
        if (ms < lands) {
          bezier(button, peak, slot, (ms - leaves) / POUR_MS, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (ms < floods) {
          const shiver = TREMBLE * clamp01((ms - fillMs * 0.5) / fillMs);
          return {
            x: slot.x + Math.sin(ms * 0.9 + k) * shiver,
            y: slot.y + Math.sin(ms * 1.3 + k) * shiver,
            scale: COIN,
          };
        }
        const total = cover?.total() ?? fallback;
        const u = clamp01((ms - floods) / (endAt - floods));
        // across the floor and on up the far wall
        if (u < 0.5) bezier(slot, ledge, spill, easeIn(u * 2), at);
        else bezier(spill, corner, total, (u - 0.5) * 2, at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    let lastRumble = -Infinity;
    const burst = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        for (let i = 0; i < BREACHES; i++)
          cover!.burst(
            { x: dam, y: bottom - (level(fillMs) * (i + 0.5)) / BREACHES },
            1.2,
          );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
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
          burst.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms > fillMs * 0.35 &&
            ms < burstAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / burstAt));
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);

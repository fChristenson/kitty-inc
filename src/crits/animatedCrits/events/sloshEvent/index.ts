// the "Slosh" event: it covers its crit, whose click freezes the screen while
// the clicked floor's button gushes cash down into a pool across its bottom,
// and the pool sloshes from side to side like water in a rocked tank, every
// slosh climbing the walls higher, each one slapping a wall with a splash and
// a jolt; the last surges right up a wall and over into the total-income
// readout in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../../../config";
import { playExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "slosh";
const REWARD = 4;
const COINS = 900;
// the pool: EDGE of the screen's width in from its sides, its floor FLOOR of
// its height up, DEPTH of its height deep when still
const EDGE = 0.04;
const FLOOR = 0.03;
const DEPTH = 0.2;
const COIN = 0.55;
// sloshing SLOSHES times, its surface tipping up to TIP of its depth at the
// walls (growing), with a ripple RIPPLE of its depth on top
const SLOSHES = 3;
const TIP: [number, number] = [0.7, 1.8];
const RIPPLE = 0.12;
// the gush: coins arc out of the button, bowed GUSH of the screen's height up
const GUSH = 0.15;
// the surge: up the high wall to CLIMB of the screen's height, then over into
// the total, each coin leaving SURGE_GAP_MS after the one ahead of it
const CLIMB = 0.35;
const SURGE_GAP_MS = 0.5;
// each wall slap: a burst, a bang and a jolt
const SLAP_BURST: [number, number] = [0.5, 0.9];
const SLAP_SHAKE: [number, number] = [0.8, 1.7];
const FINAL_COINS = 30;

export const forceSloshEvent = registerWispEvent(
  KEY,
  "Slosh",
  () => CONFIG.sloshEvent.chance,
  (floor, context, area) => {
    const { pourMs, fallMs, sloshMs, surgeMs, holdMs, mergeMs } =
      CONFIG.sloshEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const left = area.left + width * EDGE;
    const right = area.right - width * EDGE;
    const mid = (left + right) / 2;
    const half = (right - left) / 2;
    const bottom = area.bottom - height * FLOOR;
    const depth = height * DEPTH;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = { x: mid, y: area.top };
    const sloshFrom = pourMs + fallMs;
    // the surface peaks every half slosh, alternating walls; the last peak
    // surges up its wall
    const surgeFrom = sloshFrom + sloshMs * (SLOSHES - 0.5);
    const surgeSide = Math.sign(Math.sin(Math.PI * (SLOSHES - 0.5)));
    const travelMs = surgeFrom + COINS * SURGE_GAP_MS + surgeMs;

    // the surface's tip at the walls ms in: + raises the right wall
    const tipAt = (ms: number) => {
      if (ms < sloshFrom) return 0;
      const u = Math.min(SLOSHES - 0.5, (ms - sloshFrom) / sloshMs);
      return lerp(TIP, u / SLOSHES) * Math.sin(Math.PI * u);
    };
    // the pool's surface height above its floor at x, ms in
    const surfaceAt = (x: number, ms: number) => {
      const s = (x - mid) / half;
      const ripple = RIPPLE * Math.sin(s * 5 - ms / 90);
      return Math.max(depth * 0.15, depth * (1 + tipAt(ms) * s + ripple));
    };

    // a coin in the pool: across it at u, down it at v (0 the surface)
    const coins = Array.from({ length: COINS }, (_, i) => ({
      u: Math.random(),
      v: Math.random(),
      launch: (pourMs * i) / COINS,
      bob: Math.random() * Math.PI * 2,
    }));
    // the surge order: whoever's nearest the high wall and the surface first
    const order = coins
      .map((c, i) => ({ i, k: (surgeSide === 1 ? 1 - c.u : c.u) + c.v * 0.5 }))
      .sort((a, b) => a.k - b.k);
    const surgeAt: number[] = new Array(COINS);
    order.forEach((e, n) => (surgeAt[e.i] = surgeFrom + n * SURGE_GAP_MS));
    const wallX = surgeSide === 1 ? right : left;

    const poolSpot = (c: (typeof coins)[number], ms: number) => {
      const x = left + c.u * (right - left);
      const y =
        bottom - (1 - c.v) * surfaceAt(x, ms) + Math.sin(ms / 70 + c.bob) * 2;
      return { x, y };
    };
    const paths: CoinPath[] = coins.map((c, i) => (f) => {
      const ms = f * travelMs;
      if (ms < c.launch) return { ...button, scale: 0 };
      if (ms < c.launch + fallMs) {
        // gushing out of the button down into the pool
        const to = poolSpot(c, ms);
        const bend = {
          x: (button.x + to.x) / 2,
          y: Math.min(button.y, to.y) - height * GUSH,
        };
        const p = bezier(button, bend, to, (ms - c.launch) / fallMs, {
          x: 0,
          y: 0,
        });
        return { ...p, scale: COIN };
      }
      if (ms < surgeAt[i]) return { ...poolSpot(c, ms), scale: COIN };
      // up the wall and over into the total
      const from = poolSpot(c, surgeAt[i]);
      const total = cover?.total() ?? fallback;
      const top = { x: wallX, y: area.top + height * CLIMB };
      const u = easeIn(clamp01((ms - surgeAt[i]) / surgeMs));
      const p = bezier(from, { x: wallX, y: from.y }, top, Math.min(1, u * 2), {
        x: 0,
        y: 0,
      });
      if (u < 0.5) return { ...p, scale: COIN };
      const q = bezier(top, { x: wallX, y: total.y }, total, (u - 0.5) * 2, {
        x: 0,
        y: 0,
      });
      return { ...q, scale: COIN };
    });

    // each slosh but the last slaps the wall it's tipping up
    const slaps = createBeats(
      Array.from(
        { length: SLOSHES - 1 },
        (_, k) => sloshFrom + sloshMs * (k + 0.5),
      ),
      (ms) => ms,
      (ms, k) => {
        const tip = tipAt(ms);
        const x = tip > 0 ? right : left;
        const at = { x, y: bottom - surfaceAt(x, ms) };
        const t = k / Math.max(1, SLOSHES - 2);
        cover!.burst(at, lerp(SLAP_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(SLAP_SHAKE, t));
      },
    );
    const finale = createBeats(
      [surgeFrom + surgeMs],
      (ms) => ms,
      () => {
        const total = cover!.total();
        if (total) cover!.blast(total, FINAL_COINS);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          slaps.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
  },
);

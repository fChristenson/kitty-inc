// the "Storm Surge" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a fat river of cash surges in from the screen's
// side and snakes across it; bolt after bolt of lightning cracks down out of
// the sky onto the river's racing head, ever faster, each strike a blinding
// flash, a bang and a big jolt that blasts a geyser of coins up out of the
// river; the river swings up into the total, which goes off in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "stormSurge";
const REWARD = 4;
const STRIKES = 7;
// the river snakes WAVES times across, AMPLITUDE of the screen's height
const WAVES = 2;
const AMPLITUDE = 0.12;
const GEYSER_COINS = 16;
const STRIKE_MS = 180;
const STRIKE_SHAKE: [number, number] = [0.9, 1.9];

export const forceStormSurgeEvent = registerWispEvent(
  KEY,
  "Storm Surge",
  () => CONFIG.stormSurgeEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.stormSurgeEvent;
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const side = Math.random() < 0.5 ? 1 : -1;
    const base = area.top + height * 0.62;
    // across the screen in waves, then up into the total
    const route: Point[] = [];
    const points = WAVES * 4;
    for (let i = 0; i <= points; i++) {
      const u = i / points;
      const x =
        side > 0
          ? area.left - 60 + (width - 60) * u
          : area.right + 60 - (width - 60) * u;
      route.push({
        x,
        y: base + Math.sin(u * WAVES * Math.PI * 2) * height * AMPLITUDE,
      });
    }
    const turn = route[route.length - 1];
    route.push(
      { x: turn.x - side * 80, y: (turn.y + fallback.y) / 2 },
      fallback,
    );
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 160);
    const pour: Pour = { coinsAlong: 380, width: 34, streamMs, travelMs };
    const head = riverHead(line, travelMs);
    // strikes on the river's head, quickening
    const strikes: { at: number; spot: Point }[] = [];
    for (let k = 0; k < STRIKES; k++) {
      const s = k / (STRIKES - 1);
      const at = travelMs * (0.12 + 0.68 * (1 - (1 - s) ** 1.6));
      strikes.push({ at, spot: { ...head(at)! } });
    }
    const bolts = strikes.map(({ spot }) =>
      createBolt(
        { x: spot.x + (Math.random() - 0.5) * 260, y: area.top - 60 },
        spot,
        3,
      ),
    );

    const striking = createBeats(
      strikes,
      (s) => s.at,
      ({ spot }, k) => {
        const t = k / (STRIKES - 1);
        cover!.launchFrom(
          spot,
          clampTargetsY(
            sprayTargets(spot, GEYSER_COINS, [90, 280], -Math.PI / 2, 0.9),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        cover!.burst(spot, 0.7 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(0, pour),
          travelMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          strikes.forEach((s, k) => {
            const since = ms - s.at;
            if (since < 0 || since >= STRIKE_MS) return;
            const fade = 1 - since / STRIKE_MS;
            drawBolt(ctx, bolts[k], fade, 1.3);
            drawStrike(ctx, s.spot, fade, 1.3, now);
          });
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);

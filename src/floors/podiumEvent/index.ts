// the "Podium" event (spray; levels): it covers its crit, whose click freezes
// the screen while a nozzle wisp rises at the bottom of the screen like a
// winner's bottle and is shaken up hard, juddering wilder and wilder as the
// screen rumbles; the cork wisp pops off and rockets away with a bang, and
// a gushing spray of gold mist whips wildly up the screen bar by bar like
// champagne on a podium, raking each from end to end and coating it gold
// until it flashes for free levels; the top bar is soaked last and slams.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../shared/spray";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "podium";
const MAX_BARS = 5;
// px the bottle stands up from the screen's bottom, and how wildly it's
// shaken (px, either way) as the shaking builds
const BOTTOM = 160;
const SHAKE_PX: [number, number] = [6, 34];
const RUMBLE_MS = 110;
const BOTTLE = WISP_SIZE * 1.1;
const CORK = WISP_SIZE * 0.6;
const CORK_MS = 320;
// the spray's whip: rad either way, and how fast it lashes
const WHIP = 0.12;
const WHIP_HZ = 9;
const SPREAD = 0.3;
const DROPLET = WISP_SIZE * 1.6;
const MIST = 120;
const RUMBLE_SHAKE: [number, number] = [0.15, 0.5];
const POP_SHAKE = 1.1;
const COAT_SHAKE = 0.7;

export const forcePodiumEvent = registerWispEvent(
  KEY,
  "Podium",
  () => CONFIG.podiumEvent.chance,
  (floor, context, area) => {
    const { shakeMs, legMs, levelShare, holdMs, mergeMs } = CONFIG.podiumEvent;
    // the lowest bars first, soaking up the screen
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const bottle: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    const spot: Point = { x: 0, y: 0 };
    const bottleAt = (ms: number): Point => {
      const t = clamp01(ms / shakeMs);
      const a = ms < shakeMs ? lerp(SHAKE_PX, t * t) : 0;
      spot.x = bottle.x + a * Math.sin(ms * 0.11);
      spot.y = bottle.y + a * 0.4 * Math.cos(ms * 0.17);
      return spot;
    };
    const popAt = shakeMs;
    const corkSpot: Point = { x: 0, y: 0 };
    const corkAt = (ms: number): Point => {
      const u = easeIn(clamp01((ms - popAt) / CORK_MS));
      corkSpot.x = bottle.x;
      corkSpot.y = lerp([bottle.y, area.top - 200], 1 - (1 - u) * (1 - u));
      return corkSpot;
    };
    // one leg of spray per bar, raking it end to end with a wild whip
    const sprays: Spray[] = bars.map((bar, k) => {
      const startMs = popAt + k * legMs;
      const left: Point = { x: bar.box.x, y: bar.center.y };
      const right: Point = { x: bar.box.x + bar.box.width, y: bar.center.y };
      const [from, to] = k % 2 ? [right, left] : [left, right];
      const a0 = Math.atan2(from.y - bottle.y, from.x - bottle.x);
      const a1 = Math.atan2(to.y - bottle.y, to.x - bottle.x);
      return planSpray(
        bottle,
        (ms) =>
          lerp([a0, a1], clamp01((ms - startMs) / legMs)) +
          WHIP * Math.sin((ms / 1000) * WHIP_HZ * Math.PI * 2),
        {
          startMs,
          endMs: startMs + legMs,
          spread: SPREAD,
          reach: Math.hypot(bar.center.x - bottle.x, bar.center.y - bottle.y),
        },
      );
    });
    const coatedAt = sprays.map((s) => s.endMs + s.flightMs * 0.5);
    const endAt = coatedAt[coatedAt.length - 1];
    const rumbles: number[] = [];
    for (let ms = RUMBLE_MS; ms < shakeMs; ms += RUMBLE_MS) rumbles.push(ms);
    const lands: Point = { x: 0, y: 0 };

    const shaking = createBeats(
      rumbles,
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        if (ms === RUMBLE_MS) playSwoosh();
        shakeScreen(lerp(RUMBLE_SHAKE, ms / shakeMs));
      },
    );
    const popping = createBeats(
      [popAt],
      (ms) => ms,
      () => {
        cover!.burst(bottle, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );
    const coating = createBeats(
      coatedAt,
      (ms) => ms,
      (ms, k) => {
        const bar = bars[k];
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), bottle);
        if (ms >= endAt) {
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(COAT_SHAKE);
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
          shaking.tick(ms, now);
          popping.tick(ms, now);
          coating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 500) return;
          // the gold soaking into each bar, flashing as it's done
          bars.forEach((bar, k) => {
            const s = sprays[k];
            const coverage = clamp01(
              (ms - s.startMs - s.flightMs * 0.5) / (s.endMs - s.startMs),
            );
            const flash = 1 - clamp01((ms - coatedAt[k]) / 300);
            drawSprayCoat(
              ctx,
              bar.center,
              bar.box.width,
              bar.box.height * 1.6,
              coverage,
              ms >= coatedAt[k] ? flash : 0,
            );
          });
          for (const s of sprays) {
            drawSpray(ctx, s, ms, now, DROPLET);
            if (ms >= s.startMs && ms <= s.endMs)
              drawSprayMist(
                ctx,
                sprayLandsAt(s, ms, lands),
                ms - s.startMs,
                1,
                MIST,
                now,
              );
          }
          drawWispBetween(
            ctx,
            corkAt,
            ms,
            now,
            CORK,
            0.8,
            popAt,
            popAt + CORK_MS,
          );
          if (ms < endAt)
            drawWisp(
              ctx,
              bottleAt,
              ms,
              now,
              BOTTLE,
              ms < popAt ? clamp01(ms / shakeMs) : 1,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

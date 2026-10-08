// the "Thunder Egg" event (lightning; a crit tier): it covers its crit,
// whose click freezes the screen while a giant egg of light drops in over
// the clicked floor's bar; bolts crack down onto it from every side, ever
// faster, every strike a blinding flash, a crack and a jolt that leaves a
// glowing crack across its shell as it rocks harder; with the last it
// hatches in a blinding flash and a crackling ball of lightning slams down
// onto the bar in a huge blast and shake, and the bar jumps a crit tier.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";

const KEY = "thunderEgg";
const STRIKES = 7;
const ABOVE = 180;
const EGG = 2.6;
// the shell's radius, and its height over its width
const R = 70;
const TALL = 1.25;
const SHELL = 20;
const DROP_MS = 220;
const HATCH_MS = 200;
const FROM = 420;
const BOLT_MS = 200;
const BALL = 0.8;
const CRACKLES = 4;
const CRACKLE = 44;
const ROCK = 8;
const STRIKE_SHAKE: [number, number] = [0.8, 1.5];
const HATCH_SHAKE = 1.8;

interface Strike {
  ms: number;
  hit: Point;
  bolt: Bolt;
  crack: Bolt;
}

export const forceThunderEggEvent = registerWispEvent(
  KEY,
  "Thunder Egg",
  () => CONFIG.thunderEggEvent.chance,
  (floor, context, area) => {
    const { strikesMs, dropMs, holdMs, mergeMs } = CONFIG.thunderEggEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const egg: Point = {
      x: bar.center.x,
      y: Math.max(area.top + 140, bar.box.y - ABOVE),
    };
    const shell = (a: number, r = 1): Point => ({
      x: egg.x + Math.cos(a) * R * r,
      y: egg.y + Math.sin(a) * R * TALL * r,
    });
    // from round the upper half and the sides, turning round the egg
    const strikes: Strike[] = [];
    let clock: number = DROP_MS + 120;
    for (let k = 0; k < STRIKES; k++) {
      const a = -Math.PI / 2 + (k % 2 ? 1 : -1) * (0.3 + (k / STRIKES) * 1.6);
      const hit = shell(a);
      const from: Point = {
        x: Math.min(
          area.right - 20,
          Math.max(area.left + 20, egg.x + Math.cos(a) * FROM),
        ),
        y: Math.max(area.top - 40, egg.y + Math.sin(a) * FROM),
      };
      const across = a + Math.PI + (Math.random() - 0.5) * 1.2;
      strikes.push({
        ms: clock,
        hit,
        bolt: createBolt(from, hit, 2),
        crack: createBolt(hit, shell(across, 0.35), 1),
      });
      clock += lerp(strikesMs, k / (STRIKES - 1));
    }
    const last = strikes[strikes.length - 1];
    const hatchAt = last.ms + HATCH_MS;
    const landsAt = hatchAt + dropMs;
    const endAt = landsAt + 400;
    const landing: Point = { x: egg.x, y: bar.center.y };

    const shellAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= hatchAt) return null;
      const cracked = strikes.filter((s) => ms >= s.ms).length;
      const rock = (ROCK * cracked) / STRIKES;
      spot.x = egg.x + Math.sin(ms * 0.05) * rock;
      spot.y = lerp([area.top - 80, egg.y], easeIn(clamp01(ms / DROP_MS)));
      return spot;
    };
    const spot: Point = { x: 0, y: 0 };
    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < hatchAt || ms > landsAt) return null;
      ball.x = egg.x;
      ball.y = lerp([egg.y, landing.y], easeIn((ms - hatchAt) / dropMs));
      return ball;
    };
    const crackles = Array.from({ length: CRACKLES }, () =>
      createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
    );
    const tips = crackles.map(() => ({ x: 0, y: 0 }));
    const rim: Point = { x: 0, y: 0 };

    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        cover!.burst(s.hit, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (STRIKES - 1)));
      },
    );
    const hatching = createBeats(
      [hatchAt],
      (ms) => ms,
      () => {
        cover!.burst(egg, 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HATCH_SHAKE);
      },
    );
    const landingBeat = createBeats(
      [landsAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, egg);
        cover!.slam(bar);
        cover!.blast(landing);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          striking.tick(ms, now);
          hatching.tick(ms, now);
          landingBeat.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const at = shellAt(ms);
          if (at) {
            drawWispHead(ctx, shellAt, ms, now, WISP_SIZE * EGG, 0.2);
            for (let i = 0; i < SHELL; i++) {
              const a = (i / SHELL) * Math.PI * 2;
              rim.x = at.x + Math.cos(a) * R;
              rim.y = at.y + Math.sin(a) * R * TALL;
              drawGlitterLight(ctx, rim.x, rim.y, 9, i, 0.9, now);
            }
            for (const s of strikes)
              if (ms >= s.ms)
                drawBolt(ctx, s.crack, 0.75 + 0.25 * Math.random(), 0.45);
          }
          for (const s of strikes) {
            const t = (ms - s.ms) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t);
            drawStrike(ctx, s.hit, 1 - t, 1, now);
          }
          const h = (ms - hatchAt) / BOLT_MS;
          if (h >= 0 && h < 1) drawStrike(ctx, egg, 1 - h, 3, now);
          const b = ballAt(ms);
          if (b)
            for (let k = 0; k < CRACKLES; k++) {
              const a = (k / CRACKLES) * Math.PI * 2 + ms * 0.02;
              tips[k].x = b.x + Math.cos(a) * CRACKLE;
              tips[k].y = b.y + Math.sin(a) * CRACKLE;
              crackles[k].from = b;
              crackles[k].to = tips[k];
              drawBolt(ctx, crackles[k], 1, 0.4);
            }
          drawWisp(ctx, ballAt, ms, now, WISP_SIZE * BALL, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

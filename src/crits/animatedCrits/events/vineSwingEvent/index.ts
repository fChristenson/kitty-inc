// the "Vine Swing" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a bolt cracks down out of the sky beside the
// clicked floor's button and a wisp grabs it like a jungle vine, swinging
// up across the screen on the crackling bolt as cash streams off it; at the
// top of the swing it lets go and leaps for the next bolt cracking down,
// every grab a blinding strike, a crack and a jolt, zigzagging higher and
// faster up the screen; off the last vine it flings itself into the total
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "vineSwing";
const REWARD = 4;
const VINES = 4;
const VINE = 360;
// the swing runs from SWING rad behind the vine to SWING ahead
const SWING = 0.85;
const RISE = 170;
const SKY = 120;
const STRIKE_MS = 160;
const COINS = 12;
const WISP = 0.6;
const GRAB_SHAKE: [number, number] = [0.6, 1.4];

interface Vine {
  anchor: Point;
  grab: Point;
  dir: number;
  grabs: number;
  lets: number;
  strike: Bolt;
  line: Point[];
}

export const forceVineSwingEvent = registerWispEvent(
  KEY,
  "Vine Swing",
  () => CONFIG.vineSwingEvent.chance,
  (floor, context, area) => {
    const { swingsMs, leapMs, finalMs, holdMs, mergeMs } =
      CONFIG.vineSwingEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const across = VINE * Math.sin(SWING);
    const drop = VINE * Math.cos(SWING);
    const mid = (area.left + area.right) / 2;
    let dir = button.x > mid ? -1 : 1;
    let grab: Point = { x: button.x, y: button.y };
    let clock = 0;
    const vines: Vine[] = Array.from({ length: VINES }, (_, k) => {
      const anchor = { x: grab.x + dir * across, y: grab.y - drop };
      const grabs = clock;
      const lets = grabs + lerp(swingsMs, k / (VINES - 1));
      clock = lets + leapMs;
      const vine: Vine = {
        anchor,
        grab,
        dir,
        grabs,
        lets,
        strike: createBolt({ x: anchor.x, y: area.top - SKY }, anchor, 2),
        line: sampleLine((u) => {
          const a = dir * SWING * -Math.cos(Math.PI * u);
          return {
            x: anchor.x + Math.sin(a) * VINE,
            y: anchor.y + Math.cos(a) * VINE,
          };
        }, 24),
      };
      grab = { x: grab.x + 2 * dir * across, y: grab.y - RISE };
      dir = -dir;
      return vine;
    });
    const last = vines[VINES - 1];
    const releasedAt = last.lets;
    const endAt = releasedAt + finalMs;
    const swingPour = (v: Vine): Pour => ({
      coinsAlong: 150,
      width: 26,
      streamMs: (v.lets - v.grabs) * 0.8,
      travelMs: v.lets - v.grabs,
    });
    const release = last.line[last.line.length - 1];
    const finalLine = sampleLine(
      (u) => ({
        x: lerp([release.x, total.x], u),
        y: lerp([release.y, total.y], u) - Math.sin(Math.PI * u) * 80,
      }),
      30,
    );
    const finalPour: Pour = {
      coinsAlong: 260,
      width: 36,
      streamMs: finalMs * 0.6,
      travelMs: finalMs,
    };
    const durationMs = Math.max(
      pourDurationMs(releasedAt, finalPour),
      endAt + holdMs + mergeMs,
    );
    const vineAt = (ms: number) => {
      let current = vines[0];
      for (const v of vines) if (ms >= v.grabs) current = v;
      return current;
    };
    const at: Point = { x: 0, y: 0 };
    const swinger = (ms: number): Point | null => {
      if (ms > endAt) return null;
      if (ms >= releasedAt) {
        const u = easeIn(clamp01((ms - releasedAt) / finalMs));
        const aim = cover?.total() ?? total;
        at.x = lerp([release.x, aim.x], u);
        at.y = lerp([release.y, aim.y], u) - Math.sin(Math.PI * u) * 80;
        return at;
      }
      const v = vineAt(Math.max(0, ms));
      if (ms < v.lets) {
        const u = clamp01((ms - v.grabs) / (v.lets - v.grabs));
        const a = v.dir * SWING * -Math.cos(Math.PI * u);
        at.x = v.anchor.x + Math.sin(a) * VINE;
        at.y = v.anchor.y + Math.cos(a) * VINE;
        return at;
      }
      // leaping up from the top of the swing to the next vine
      const next = vines[vines.indexOf(v) + 1];
      const from = v.line[v.line.length - 1];
      const u = easeOut(clamp01((ms - v.lets) / leapMs));
      at.x = lerp([from.x, next.grab.x], u);
      at.y = lerp([from.y, next.grab.y], u);
      return at;
    };
    const vineBolt = createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0);

    const grabbing = createBeats(
      vines,
      (v) => v.grabs,
      (v, k) => {
        pourLine(cover!, v.line, swingPour(v));
        cover!.burst(v.anchor, 0.5);
        cover!.launchFrom(
          v.grab,
          clampTargetsY(
            sprayTargets(v.grab, COINS, [60, 180], -Math.PI / 2, 2),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GRAB_SHAKE, k / (VINES - 1)));
      },
    );
    const finale = createBeats(
      [releasedAt, endAt],
      (ms) => ms,
      (ms) => {
        if (ms === releasedAt) pourLine(cover!, finalLine, finalPour);
        else cover!.blast(cover!.total() ?? total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          grabbing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const v of vines) {
            const t = (ms - v.grabs) / STRIKE_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, v.strike, 1 - t, 0.8);
            drawStrike(ctx, v.anchor, 1 - t, 1, now);
          }
          if (ms < releasedAt) {
            const v = vineAt(ms);
            if (ms < v.lets) {
              const w = swinger(ms)!;
              vineBolt.from.x = v.anchor.x;
              vineBolt.from.y = v.anchor.y;
              vineBolt.to.x = w.x;
              vineBolt.to.y = w.y;
              drawBolt(ctx, vineBolt, 0.9, 0.45);
            }
          }
          drawWispBetween(
            ctx,
            swinger,
            ms,
            now,
            WISP_SIZE * WISP,
            0.8,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);

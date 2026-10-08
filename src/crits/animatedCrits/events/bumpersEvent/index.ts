// the "Bumpers" event: it covers its crit, whose click freezes the screen
// while three big wisps pop up in a triangle round its middle like pinball
// bumpers, and the button fires a small wisp in among them: it pings from
// bumper to bumper in dead straight shots, ever faster, every bumper it hits
// kicking back, flashing and swelling with a bang, a jolt and coins sprayed
// off it. Then the ball drifts to the middle as the swollen bumpers tremble
// and the screen rumbles, and all three blow at once in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import {
  clamp01,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "bumpers";
const REWARD = 4;
const HITS = 12;
// the bumpers: SPREAD of the screen's width (or height, if less) from its
// middle, each BUMPER of its width across, popping in over POP_MS and
// swelling SWELL more by the last hit
const SPREAD = 0.3;
const BUMPER = 0.13;
const POP_MS = 200;
const SWELL = 0.45;
// each hit kicks its bumper KICK bigger and KNOCK of its size back, settling
// over KICK_MS
const KICK = 0.35;
const KNOCK = 0.15;
const KICK_MS = 200;
// the ball, as a share of the screen's width
const BALL = 0.05;
// each hit: a burst, a jolt and coins sprayed off the bumper's face
const HIT_BURST: [number, number] = [0.3, 0.6];
const HIT_BURST_MS = 240;
const HIT_SHAKE: [number, number] = [0.5, 1.4];
const HIT_COINS: [number, number] = [2, 4];
const SPRAY: [number, number] = [70, 200];
const SPRAY_SPAN = 1.6;
// the charge: the bumpers trembling TREMBLE of their size, the screen
// rumbling ever harder
const TREMBLE = 0.08;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 0.8];
// the blast: every bumper bursts into BUMPER_COINS, the middle into a ring
const BUMPER_COINS = 9;
const BUMPER_RING: [number, number] = [90, 260];
const FINAL_COINS = 14;
const FINAL_RING: [number, number] = [140, 380];
const FINAL_SHAKE = 2.9;
const BUMPER_BURST = 1.1;
const BLAST_SCALE = 2;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;

interface Hit {
  at: number;
  // the bumper struck, null for the blast
  bumper: number | null;
  // where the ball meets it, and the way off its face
  contact: Point;
  normal: Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bumpersEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { launchMs, shotMs, chargeMs, holdMs, mergeMs } =
        CONFIG.bumpersEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const button = getButtonCenter(context.isGroundFloor);
      const middle = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const spread = Math.min(width, height) * SPREAD;
      const bumper = Math.max(WISP_SIZE * 1.6, width * BUMPER);
      const ball = Math.max(WISP_SIZE, width * BALL);
      // the ball touches a bumper this far from its middle
      const reach = (bumper * (1 + SWELL * 0.5) + ball) / 2;
      const turn = Math.random() * Math.PI * 2;
      const bumpers: Point[] = [0, 1, 2].map((k) => ({
        x: middle.x + Math.cos(turn + (k * Math.PI * 2) / 3) * spread,
        y: middle.y + Math.sin(turn + (k * Math.PI * 2) / 3) * spread,
      }));

      // the ball's shots: off the button, then bumper to bumper, never the
      // same twice running
      const hits: Hit[] = [];
      let from: Point = button;
      let target = Math.floor(Math.random() * 3);
      let at = launchMs;
      for (let k = 0; k < HITS; k++) {
        if (k > 0) {
          target = (target + 1 + Math.floor(Math.random() * 2)) % 3;
          at += lerp(shotMs, k / (HITS - 1));
        }
        const c = bumpers[target];
        const dx = from.x - c.x;
        const dy = from.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const normal = { x: dx / d, y: dy / d };
        const contact = {
          x: c.x + normal.x * reach,
          y: c.y + normal.y * reach,
        };
        hits.push({ at, bumper: target, contact, normal });
        from = contact;
      }
      const lastHit = hits[HITS - 1];
      const blastAt = lastHit.at + chargeMs;
      hits.push({
        at: blastAt,
        bumper: null,
        contact: middle,
        normal: { x: 0, y: 0 },
      });

      const ballAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms >= lastHit.at) {
          const u = easeOutCubic((ms - lastHit.at) / chargeMs);
          return {
            x: lastHit.contact.x + (middle.x - lastHit.contact.x) * u,
            y: lastHit.contact.y + (middle.y - lastHit.contact.y) * u,
          };
        }
        let start = button;
        let startAt = 0;
        for (const hit of hits) {
          if (ms < hit.at) {
            const u = (ms - startAt) / (hit.at - startAt);
            return {
              x: start.x + (hit.contact.x - start.x) * u,
              y: start.y + (hit.contact.y - start.y) * u,
            };
          }
          start = hit.contact;
          startAt = hit.at;
        }
        return null;
      };

      // each bumper's hits so far, its last and the way it was knocked
      const struck = bumpers.map(() => ({
        count: 0,
        at: -Infinity,
        normal: { x: 0, y: 0 },
      }));
      const startedAt = performance.now();
      let lastRumble = -Infinity;
      // a bumper's spot and size ms in, null once it's blown
      const poseOf = (k: number, ms: number) => {
        if (ms < 0 || ms >= blastAt) return null;
        const hit = struck[k];
        const kick = Math.max(0, 1 - (startedAt + ms - hit.at) / KICK_MS) ** 2;
        const size =
          bumper *
          easeOutBack(clamp01(ms / POP_MS)) *
          (1 + (SWELL * hit.count) / (HITS / 3)) *
          (1 + KICK * kick);
        const shake =
          ms > lastHit.at ? TREMBLE * size * ((ms - lastHit.at) / chargeMs) : 0;
        return {
          at: {
            x:
              bumpers[k].x -
              hit.normal.x * KNOCK * bumper * kick +
              Math.sin(ms * 0.13 + k * 2) * shake,
            y:
              bumpers[k].y -
              hit.normal.y * KNOCK * bumper * kick +
              Math.cos(ms * 0.11 + k * 3) * shake,
          },
          size,
        };
      };
      const bumperAt = bumpers.map(
        (_, k) => (ms: number) => poseOf(k, ms)?.at ?? null,
      );

      const beats = createBeats(
        hits,
        (hit) => hit.at,
        (hit, k, now) => struckBy(hit, k, now),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            if (
              ms >= lastHit.at &&
              ms < blastAt &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - lastHit.at) / chargeMs));
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < HITS; k++) {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) break;
              const t = (now - firedAt) / HIT_BURST_MS;
              if (t >= 1) continue;
              const { contact } = hits[k];
              drawWhiteBurst(
                ctx,
                contact.x,
                contact.y,
                t,
                lerp(HIT_BURST, k / (HITS - 1)),
              );
            }
            const blastedAt = beats.firedAt(HITS);
            if (blastedAt !== null) {
              const t = (now - blastedAt) / HIT_BURST_MS;
              if (t < 1)
                for (const b of bumpers)
                  drawWhiteBurst(ctx, b.x, b.y, t, BUMPER_BURST);
              drawExplosion(
                ctx,
                middle.x,
                middle.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            }
            ctx.restore();
          },
          // the wisps over the coins they spray
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / blastAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < 3; k++)
              drawWispBetween(
                ctx,
                bumperAt[k],
                ms,
                now,
                poseOf(k, ms)?.size ?? bumper,
                heat,
                0,
                blastAt,
              );
            drawWispBetween(ctx, ballAt, ms, now, ball, heat, 0, blastAt);
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the ball strikes a bumper, or everything blows
      function struckBy(hit: Hit, k: number, now: number): void {
        if (hit.bumper === null) {
          if (!cover?.isLive()) return;
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          for (const b of bumpers)
            cover.launchFrom(b, ringTargets(b, BUMPER_COINS, BUMPER_RING));
          cover.launchFrom(
            middle,
            ringTargets(middle, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        const s = struck[hit.bumper];
        s.count++;
        s.at = now;
        s.normal = hit.normal;
        if (!cover?.isLive()) return;
        const t = k / (HITS - 1);
        playBloop();
        if (k % 2 === 1) playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
        cover.launchFrom(
          hit.contact,
          sprayTargets(
            hit.contact,
            Math.round(lerp(HIT_COINS, t)),
            SPRAY,
            Math.atan2(hit.normal.y, hit.normal.x),
            SPRAY_SPAN,
          ),
        );
      }
    },
  },
  { label: "Bumpers", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bumpers
export function forceBumpersEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

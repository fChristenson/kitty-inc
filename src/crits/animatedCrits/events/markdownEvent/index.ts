// the "Markdown" event (gunfire; price cuts): it covers its crit, whose click
// freezes the screen while a wisp gun flies out of the clicked button and
// shoots the price on every button in view in quick fire; each price jolts
// with every hit, then flips over onto a cheaper one, its cut popping over
// it, the clicked floor's own last with the biggest cut in the huge blast
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { multiply } from "../../../../shared/bigNumber";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawMuzzleFlash } from "../../../../shared/animationStyles/bullets";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01 } from "../../../../shared/twinkle";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  BTN_H,
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../../../../floors/upgradeButton";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { findOnScreenButtons } from "../../onScreenButtons";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "markdown";
// the gun's spot, of the screen's width and height
const GUN_AT: Point = { x: 0.2, y: 0.5 };
const GUN_IN_MS = 200;
const GUN_LIFT = 0.12;
const GUN = WISP_SIZE * 2;
const BULLET = WISP_SIZE * 0.9;
const SHOTS = 3;
const OWN_SHOTS = 6;
// where a shot lands round its button's middle
const SPREAD: Point = { x: 160, y: 50 };
const KICK = 22;
const KICK_MS = 60;
const MUZZLE_MS = 90;
const MUZZLE = 140;
const HIT_BLAST = 70;
const OWN_BLAST = 240;
const HIT_SHAKE = 0.3;
const FLIP_SHAKE = 0.8;
const OWN_SHAKE = 3;
const JOLT = 16;
const JOLT_MS = 80;
const FLIP_MS = 180;
const LABEL_FONT = 56;
const SOUND_GAP_MS = 55;

interface Target {
  floor: Floor;
  isGroundFloor: boolean;
  at: Point;
  // how far its own floor's button sits below the clicked floor's
  offsetY: number;
  cut: number;
  label: string;
  lastHit: number;
  hits: number[];
  cutAt: number | null;
}

export const forceMarkdownEvent = registerWispEvent(
  KEY,
  "Markdown",
  () => CONFIG.markdownEvent.chance,
  (floor, context, area) => {
    const { firstShotMs, flyMs, gapMs, cut, ownCut, holdMs, mergeMs } =
      CONFIG.markdownEvent;
    const buttons = findOnScreenButtons(floor, context).filter(
      (b) => !isFloorMaxed(b.floor),
    );
    const own = buttons.find((b) => b.floor === floor);
    if (!own) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const gunSpot: Point = {
      x: area.left + width * GUN_AT.x,
      y: area.top + height * GUN_AT.y,
    };
    const start = getButtonCenter(context.isGroundFloor);
    // the others top first, the clicked floor's own last
    const ordered = [...buttons.filter((b) => b !== own), own];
    const targets: Target[] = ordered.map((b) => {
      const isGroundFloor = context.floors.indexOf(b.floor) === 0;
      const mine = b === own;
      return {
        floor: b.floor,
        isGroundFloor,
        at: { x: b.x, y: b.y },
        offsetY: b.y - getButtonCenter(isGroundFloor).y,
        cut: mine ? ownCut : cut,
        label: `-${Math.round((mine ? ownCut : cut) * 100)}%`,
        lastHit: 0,
        hits: [],
        cutAt: null,
      };
    });
    let clock: number = firstShotMs;
    const shots = targets.flatMap((target, t) => {
      const count = target.floor === floor ? OWN_SHOTS : SHOTS;
      return Array.from({ length: count }, (_, j) => {
        const fired = clock;
        clock += gapMs;
        const k = t * 10 + j;
        const to: Point = {
          x: target.at.x + (hash01(k, 6101) - 0.5) * SPREAD.x,
          y: target.at.y + (hash01(k, 6102) - 0.5) * SPREAD.y,
        };
        target.lastHit = fired + flyMs;
        target.hits.push(fired + flyMs);
        return {
          target,
          fired,
          hit: fired + flyMs,
          to,
          last: target.floor === floor && j === count - 1,
          path: (ms: number): Point | null => {
            const u = (ms - fired) / flyMs;
            return u < 0 || u > 1
              ? null
              : {
                  x: lerp([gunSpot.x, to.x], u),
                  y: lerp([gunSpot.y, to.y], u),
                };
          },
        };
      });
    });
    const finalAt = targets[targets.length - 1].lastHit;
    const flipMid = (t: Target) => t.lastHit + FLIP_MS / 2;

    // the gun: in off the clicked button, then kicking back with each shot
    // along its aim
    const aimAt = (ms: number) => {
      let shot = shots[0];
      for (const s of shots) if (ms >= s.fired) shot = s;
      return shot;
    };
    const gunAt = (ms: number): Point | null => {
      if (ms < 0 || ms > finalAt) return null;
      if (ms < GUN_IN_MS) {
        const u = ms / GUN_IN_MS;
        return {
          x: lerp([start.x, gunSpot.x], u),
          y: lerp([start.y, gunSpot.y], u) - 4 * u * (1 - u) * width * GUN_LIFT,
        };
      }
      const shot = aimAt(ms);
      const kick =
        ms >= shot.fired ? KICK * Math.exp(-(ms - shot.fired) / KICK_MS) : 0;
      const a = Math.atan2(shot.to.y - gunSpot.y, shot.to.x - gunSpot.x);
      return {
        x: gunSpot.x - kick * Math.cos(a),
        y: gunSpot.y - kick * Math.sin(a),
      };
    };

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const hits = createBeats(
      shots,
      (s) => s.hit,
      (s, _, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(s.last ? OWN_SHAKE : HIT_SHAKE);
        bang(now);
      },
    );
    const cuts = createBeats(targets, flipMid, (t, _, now) => {
      if (!cover!.isLive()) return;
      const m = 1 - t.cut;
      t.floor.upgradeCost = multiply(t.floor.upgradeCost, m);
      t.floor.priceDiscountMultiplier *= m;
      t.cutAt = now;
      if (t.floor !== floor) shakeScreen(FLIP_SHAKE);
    });

    setUpgradeButtonSpotlights(targets.map((t) => t.floor));
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finalAt + FLIP_MS + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          hits.tick(ms, now);
          cuts.tick(ms, now);
        },
        onEnd: clearUpgradeButtonSpotlights,
        drawUnder: (ctx, ms) => {
          for (const t of targets) {
            let jolt = 0;
            for (const hit of t.hits)
              if (ms >= hit) jolt = JOLT * Math.exp(-(ms - hit) / JOLT_MS);
            const u = clamp01((ms - t.lastHit) / FLIP_MS);
            const turn = Math.max(0.05, Math.abs(Math.cos(Math.PI * u)));
            ctx.save();
            ctx.translate(t.at.x, t.at.y + jolt);
            ctx.scale(turn, 1);
            ctx.translate(-t.at.x, -t.at.y + t.offsetY);
            drawUpgradeButtonSpotlight(ctx, t.floor, t.isGroundFloor, 0);
            ctx.restore();
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          drawWisp(ctx, gunAt, ms, now, GUN, 0.5);
          const gun = gunAt(ms);
          for (const s of shots) {
            if (gun)
              drawMuzzleFlash(
                ctx,
                gun,
                Math.atan2(s.to.y - gun.y, s.to.x - gun.x),
                (ms - s.fired) / MUZZLE_MS,
                MUZZLE,
              );
            drawWispBetween(ctx, s.path, ms, now, BULLET, 1, s.fired, s.hit);
            drawDetonation(
              ctx,
              s.to,
              ms - s.hit,
              s.last ? OWN_BLAST : HIT_BLAST,
              now,
            );
          }
          for (const t of targets)
            if (t.cutAt !== null)
              drawPoppingCritText(
                ctx,
                t.label,
                t.at.x,
                t.at.y - BTN_H * 0.8,
                COLOR.heavenlyGold,
                t.cutAt,
                now,
                {
                  fontSize: t.floor === floor ? LABEL_FONT * 1.4 : LABEL_FONT,
                  strokeWidth: 8,
                },
              );
        },
      },
    );
    if (!cover) {
      clearUpgradeButtonSpotlights();
      return;
    }
    playSwoosh();
    playBoostEventStream();
  },
  (floor, context) =>
    findOnScreenButtons(floor, context).some(
      (b) => b.floor === floor && !isFloorMaxed(b.floor),
    ),
);

// the "Ping Pong" event: it covers its crit, whose click freezes the screen
// while a wisp flies in from the screen's left or right side and smacks down
// onto that side of the clicked floor's income bar, then bounces up and down
// between the bar and the roof like a ping pong ball, 10 to 15 times, really
// fast and all over the place. The roof is the bar of the floor above when that floor's open
// and in view, and then it plays too. Every bar hit jolts the bar and knocks
// coins out of it; the rally ends with a hard smash into the clicked floor's
// bar, and the coins merge into the total. Pays floor income × floor number
// once per bar hit (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playExplosion, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { isFloorLocked } from "../../shared/detachedJob";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../incomePanel";
import {
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "pingPong";
// contacts in the rally, alternating bar and roof, starting and ending on
// the clicked floor's bar (so rounded up to an odd count)
const CONTACTS: [number, number] = [10, 15];
// each gap between hits varies by up to GAP_JITTER of itself
const GAP_JITTER = 0.35;
// the ball's radius, touching each surface as it hits
const BALL_R = WISP_SIZE * 0.35;
// it flies in from this far off the screen's side, at the rally's mid height
const OUT = 80;
// each hit lands anywhere along the bar, at least EDGE_IN of its width in
// from its ends
const EDGE_IN = 0.15;
// with no bar above, it bounces off this far below the floor's ceiling
const CEILING_IN = 20;
// each hit: a jolt away from the ball, a flash, a shake, a sound and (on a
// bar) coins knocked out of it
const JOLT = 14;
const JOLT_DECAY_MS = 100;
const JOLT_WOBBLE_MS = 120;
const HIT_BURST = 0.28;
const HIT_BURST_MS = 300;
const HIT_SHAKE = 0.4;
const CEILING_SHAKE = 0.3;
const HIT_COINS = 5;
const POP: [number, number] = [70, 260];
const POP_SIDE = 160;
// the smash: a bigger jolt, a blast and a burst of coins
const SMASH_JOLT = 32;
const SMASH_SHAKE = 2.3;
const SMASH_SCALE = 1.5;
const SPARK_REACH = 300;
const SPARK_SIZE = 20;
const SMASH_COINS = 24;

interface Paddle {
  floor: Floor;
  isGroundFloor: boolean;
  // its bar's top-left and size, local to the clicked floor
  box: { x: number; y: number; width: number; height: number };
}

interface Contact {
  at: number;
  point: Point;
  // the bar it hits, or null for the bare ceiling
  paddle: Paddle | null;
  // which way the hit knocks it: 1 down, -1 up
  push: number;
  landedAt: number | null;
}

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

// the clicked floor's bar, and the bar above it if that floor's open and in
// view, local to the clicked floor
function planPaddles(
  floor: Floor,
  context: EventProcContext,
): { bar: Paddle; above: Paddle | null } | null {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const own = onScreen.find((entry) => entry.floor === floor);
  if (!own) return null;
  const box = getIncomeBarBox(context.isGroundFloor);
  if (!isVisibleOnFloor(own, box.y + box.height / 2)) return null;
  const bar = { floor, isGroundFloor: context.isGroundFloor, box };
  const upper = context.floors[context.floors.indexOf(floor) + 1];
  const upperEntry = onScreen.find((entry) => entry.floor === upper);
  if (!upper || !upperEntry || !upper.unlocked || isFloorLocked(upper))
    return { bar, above: null };
  const upperBox = getIncomeBarBox(false);
  if (!isVisibleOnFloor(upperEntry, upperBox.y + upperBox.height / 2))
    return { bar, above: null };
  return {
    bar,
    above: {
      floor: upper,
      isGroundFloor: false,
      box: { ...upperBox, y: upperBox.y + upperEntry.top - own.top },
    },
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.pingPongEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) && planPaddles(floor, context) !== null,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      const paddles = planPaddles(floor, context);
      if (!area || !paddles) return;
      const { bar, above } = paddles;
      const { approachMs, firstRallyMs, lastRallyMs, holdMs, mergeMs } =
        CONFIG.pingPongEvent;
      const barY = bar.box.y - BALL_R;
      const roofY = above
        ? above.box.y + above.box.height + BALL_R
        : Math.max(area.top, 0) + CEILING_IN + BALL_R;
      const fromLeft = Math.random() < 0.5;
      // the first hit on the side it came in from, every other anywhere
      const spotX = (k: number) => {
        const t =
          k === 0
            ? fromLeft
              ? lerp([EDGE_IN, 0.35], Math.random())
              : lerp([0.65, 1 - EDGE_IN], Math.random())
            : lerp([EDGE_IN, 1 - EDGE_IN], Math.random());
        return bar.box.x + bar.box.width * t;
      };
      const rolled = Math.round(lerp(CONTACTS, Math.random()));
      const count = rolled % 2 === 0 ? rolled + 1 : rolled;
      const contacts: Contact[] = [];
      let at = approachMs;
      for (let k = 0; k < count; k++) {
        const onBar = k % 2 === 0;
        contacts.push({
          at,
          point: { x: spotX(k), y: onBar ? barY : roofY },
          paddle: onBar ? bar : above,
          push: onBar ? 1 : -1,
          landedAt: null,
        });
        at +=
          lerp([firstRallyMs, lastRallyMs], k / (count - 2)) *
          (1 + (Math.random() * 2 - 1) * GAP_JITTER);
      }
      const smashAt = contacts[contacts.length - 1].at;
      const from = {
        x: fromLeft ? area.left - OUT : area.right + OUT,
        y: (barY + roofY) / 2,
      };
      const ballAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= smashAt) return null;
        let prev = { at: 0, point: from };
        for (const contact of contacts) {
          if (ms < contact.at) {
            const u = (ms - prev.at) / (contact.at - prev.at);
            return {
              x: prev.point.x + (contact.point.x - prev.point.x) * u,
              y: prev.point.y + (contact.point.y - prev.point.y) * u,
            };
          }
          prev = contact;
        }
        return null;
      };
      const startedAt = performance.now();
      const paddleList = above ? [bar, above] : [bar];

      setIncomePanelsHidden(paddleList.map((p) => p.floor));
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: smashAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: contacts.filter((c) => c.paddle).length,
          onEnd: () => setIncomePanelsHidden([]),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            contacts.forEach((contact, k) => {
              if (contact.landedAt === null && ms >= contact.at)
                hit(contact, k === contacts.length - 1, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const paddle of paddleList) {
              const jolt = contacts.reduce((dy, c) => {
                if (c.paddle !== paddle || c.landedAt === null) return dy;
                const t = now - c.landedAt;
                const size =
                  c === contacts[contacts.length - 1] ? SMASH_JOLT : JOLT;
                return (
                  dy +
                  c.push *
                    size *
                    Math.exp(-t / JOLT_DECAY_MS) *
                    Math.cos((2 * Math.PI * t) / JOLT_WOBBLE_MS)
                );
              }, 0);
              ctx.save();
              // the paddle's own floor, offset into the clicked floor's space
              ctx.translate(
                0,
                paddle.box.y - getIncomeBarBox(paddle.isGroundFloor).y + jolt,
              );
              drawIncomePanel(ctx, paddle.floor, paddle.isGroundFloor, {
                whiteAlpha: 0,
                rotation: 0,
              });
              ctx.restore();
            }
            contacts.forEach((contact, k) => {
              if (contact.landedAt === null) return;
              if (k === contacts.length - 1)
                drawExplosion(
                  ctx,
                  contact.point.x,
                  contact.point.y,
                  now - contact.landedAt,
                  now,
                  SMASH_SCALE,
                  SPARK_REACH,
                  SPARK_SIZE,
                );
              else
                drawWhiteBurst(
                  ctx,
                  contact.point.x,
                  contact.point.y,
                  (now - contact.landedAt) / HIT_BURST_MS,
                  HIT_BURST,
                );
            });
            ctx.restore();
          },
          // the ball over the coins it knocks out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, ballAt, now - startedAt, now, WISP_SIZE, 1);
            ctx.restore();
          },
        },
      );
      if (!cover) {
        setIncomePanelsHidden([]);
        return;
      }

      // on the frame the ball touches each surface
      function hit(contact: Contact, smash: boolean, now: number): void {
        contact.landedAt = now;
        if (!cover?.isLive()) return;
        if (smash) {
          playSlamExplosion();
          shakeScreen(SMASH_SHAKE);
        } else if (contact.paddle) {
          playExplosion();
          shakeScreen(HIT_SHAKE);
        } else {
          playBloop();
          shakeScreen(CEILING_SHAKE);
        }
        if (!contact.paddle) return;
        // coins knocked out away from the ball: down off the roof bar, up off the floor's
        const away = -contact.push;
        const count = smash ? SMASH_COINS : HIT_COINS;
        cover.launchFrom(
          contact.point,
          Array.from({ length: count }, () => ({
            x:
              contact.point.x +
              (Math.random() * 2 - 1) * POP_SIDE * (smash ? 1.6 : 1),
            y:
              contact.point.y +
              away * lerp(POP, Math.random()) * (smash ? 1.3 : 1),
          })),
        );
      }
    },
  },
  { label: "Ping Pong", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ping Pong
export function forcePingPongEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

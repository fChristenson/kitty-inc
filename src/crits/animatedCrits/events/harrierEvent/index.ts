// the "Harrier" event (rail shooter; cash), a flight-stage event (see
// ../../flightStage) with its own way in, drawn with shared/animationStyles/railShooter's
// plain and pillars and shared/animationStyles/race's racer wisp in shared/animationStyles/fps's world: its crit's
// click splits the floors' screen into strips that slide apart onto a
// checkerboard plain racing at the view, the ship weaving low between
// towering pillars. Waves of wisps swirl in from the horizon and the ship's
// shots pop each in a blast and a spray of coins that pay into the total,
// quicker each wave; a wisp serpent last, blown apart head to tail in a chain
// of blasts and a big payout. A giant screen of the floors stands at the
// horizon and the ship flies into it, the view after it
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playCoinDrop, playSwoosh } from "../../../../sound";
import { rewardPayoutAmount } from "../../../../floors/incomePanel";
import { addTotalIncome } from "../../../../totalIncome";
import { multiply } from "../../../../shared/bigNumber";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  createFpsCoin,
  drawFpsCoins,
  drawFpsFace,
  drawFpsGround,
  drawFpsOpening,
  drawFpsSky,
  fpsOpeningLanding,
  fpsSight,
  type Fps,
  type FpsCoin,
  type FpsLens,
} from "../../../../shared/animationStyles/fps";
import { createRaceWisp } from "../../../../shared/animationStyles/race";
import {
  drawCheckerPlain,
  drawRailPillar,
  type RailPillar,
} from "../../../../shared/animationStyles/railShooter";
import { shakeScreen } from "../../../../shared/screenShake";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { hash01 } from "../../../../shared/twinkle";
import { drawScreenPart, type ScreenCopy } from "../../../../shared/screenCopy";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";

const KEY = "harrier";

// the view rides BEHIND the ship and RIDE above it, leaning after it by
// FOLLOW; the ship's speed over the plain (world units a second)
const FOCAL = 1.2;
const LENS: FpsLens = { focal: FOCAL, horizon: 0.45 };
const BEHIND = 1.6;
const RIDE = 0.45;
const FOLLOW = 0.5;
const SPEED = 6;
// the racer: its weave across and up and down, its wisp's size, where its
// shots leave from
const WEAVE_X = 0.45;
const WEAVE_X_RATE = 0.0021;
const HOVER = 0.5;
const WEAVE_Y = 0.15;
const WEAVE_Y_RATE = 0.0033;
const RACER = 0.08;
const NOSE = 0.6;
const NOSE_UP = 0.05;
// the plain and its pillars, one every PILLAR_EVERY along, alternating sides
const SKY = COLOR.revealSky;
const PLAIN = COLOR.shareholdersGreen;
const CHECK = COLOR.tideDeep;
const PLAIN_PAST = 6;
const PILLAR_EVERY = 2;
const PILLAR_FROM = 2;
const PILLAR_X: [number, number] = [1.4, 2.6];
const PILLAR_HIGH: [number, number] = [1.8, 3.4];
const PILLAR_HALF = 0.18;
const PILLAR_NEAREST = 0.3;
// the giant screen of the floors this far past where the ship is when the
// view starts after it, its width, sill and gold frame
const SCREEN_AHEAD = 5;
const SCREEN_W = 1.4;
const SCREEN_SILL = 0.3;
const SCREEN_FRAME = 0.08;
const PULL_AHEAD = 5;
// the waves: WAVES of WAVE wisps, a wave every WAVE_GAP and a wisp every
// FOE_GAP, each swirling in from FOE_FROM ahead of the ship at FOE_CLOSING
// a second, shot when SHOT_AT ahead
const WAVES = 3;
const WAVE = 4;
const FIRST = 100;
const WAVE_GAP = 650;
const FOE_GAP = 70;
const FOE_FROM = 9;
const FOE_CLOSING = 7;
const SHOT_AT = 4;
const SWIRL_X = 0.7;
const SWIRL_Y = 0.3;
const SWIRL_X_RATE = 0.004;
const SWIRL_Y_RATE = 0.005;
const FOE_Y = 0.75;
const FOE_LANES = 0.5;
const FOE = 0.16;
const FOE_HEAT = 0.6;
// the serpent: SERPENT wisps one path, each SEGMENT_LAG behind the one
// before; its head is shot, the rest blow head to tail CHAIN_GAP apart
const SERPENT = 9;
const SERPENT_AT = 2000;
const SEGMENT_LAG = 70;
const SEGMENT_PHASE = 0.4;
const CHAIN_GAP = 45;
const SERPENT_FOE = 0.2;
const SERPENT_HEAT = 1;
// a shot's flight and size, the blasts, coins out of each kill
const SHOT_MS = 120;
const SHOT = 1.2;
const KILL_BLAST = 0.4;
const SEGMENT_BLAST = 0.5;
const TAIL_BLAST = 0.9;
const KILL_COINS = 10;
const TAIL_COINS = 40;
const COIN_SPEED: [number, number] = [0.6, 1.6];
const COIN_LIFE_MS = 900;
// the screen's strips sliding apart
const STRIPS = 8;
const STRIP_SLIDE = 1.1;
const RUSH_LAG = 300;
const SHOT_SHAKE = 0.4;
const KILL_SHAKE = 1;
const SEGMENT_SHAKE = 1.2;
const TAIL_SHAKE = 3;
const SPLIT_SHAKE = 0.8;

interface Foe {
  born: number;
  kill: number;
  lane: number;
  phase: number;
  lag: number;
  serpent: boolean;
  // where it's killed
  dies: { x: number; y: number; z: number };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.harrierEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) => floor.unlocked && canStartFlightStage(context),
    arm: startHarrier,
  },
  { label: "Harrier", color: COLOR.shareholdersGreen },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Harrier
export function forceHarrierEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startHarrier(floor: Floor, context: EventProcContext): void {
  const area = context.getScreenAreaLocal?.(floor);
  if (!area) return;
  const aspect = (area.bottom - area.top) / (area.right - area.left);
  const { splitMs, flyMs, payoutsPerKill, payoutsSerpent } =
    CONFIG.harrierEvent;
  const { arriveMs } = CONFIG.flightStage;
  const tier = context.critTier ?? pickCritTierByOdds();

  // the ship's run, from the click: weaving, then pulling ahead into the
  // floors' screen once the view starts after it
  const flown = (ms: number) => (SPEED * Math.max(0, ms - splitMs)) / 1000;
  const serpentBorn = splitMs + SERPENT_AT;
  const serpentHit = serpentBorn + ((FOE_FROM - SHOT_AT) / FOE_CLOSING) * 1000;
  const enterMs = serpentHit + (SERPENT - 1) * CHAIN_GAP + RUSH_LAG;
  const rushMs = flyMs + arriveMs;
  const screenZ = flown(enterMs) + SCREEN_AHEAD;
  const land = fpsOpeningLanding(FOCAL, screenZ, SCREEN_W, SCREEN_SILL, aspect);
  const landing = (ms: number) => smoothstep(clamp01((ms - enterMs) / rushMs));
  const shipAt = (ms: number) => {
    const t = Math.max(0, ms - splitMs);
    const w = landing(ms);
    return {
      x: WEAVE_X * Math.sin(t * WEAVE_X_RATE) * (1 - w),
      z: flown(ms) + PULL_AHEAD * w * w,
      hover: HOVER + WEAVE_Y * Math.sin(t * WEAVE_Y_RATE),
    };
  };

  // the foes: the waves, then the serpent; each one's swirl in the world
  const foes: Foe[] = [];
  const swirlInto = (
    f: Foe,
    ms: number,
    out: { x: number; y: number; z: number },
  ) => {
    const age = ms - f.born - f.lag;
    out.x = f.lane + SWIRL_X * Math.sin(age * SWIRL_X_RATE + f.phase);
    out.y = FOE_Y + SWIRL_Y * Math.cos(age * SWIRL_Y_RATE + f.phase);
    out.z = flown(ms) + FOE_FROM - (FOE_CLOSING * age) / 1000;
    return out;
  };
  const swirl = (f: Foe, ms: number) => swirlInto(f, ms, { x: 0, y: 0, z: 0 });
  const approachMs = ((FOE_FROM - SHOT_AT) / FOE_CLOSING) * 1000;
  for (let w = 0; w < WAVES; w++)
    for (let i = 0; i < WAVE; i++) {
      const born = splitMs + FIRST + w * WAVE_GAP + i * FOE_GAP;
      foes.push({
        born,
        kill: born + approachMs,
        lane: (w - 1) * FOE_LANES,
        phase: i * 1.6,
        lag: 0,
        serpent: false,
        dies: { x: 0, y: 0, z: 0 },
      });
    }
  for (let i = 0; i < SERPENT; i++)
    foes.push({
      born: serpentBorn,
      kill: serpentHit + i * CHAIN_GAP,
      lane: 0,
      phase: -i * SEGMENT_PHASE,
      lag: i * SEGMENT_LAG,
      serpent: true,
      dies: { x: 0, y: 0, z: 0 },
    });
  for (const f of foes) f.dies = swirl(f, f.kill);
  const head = foes[WAVES * WAVE];
  const tail = foes[foes.length - 1];
  // a shot at every wave wisp and at the serpent's head
  const shots = foes
    .filter((f) => !f.serpent || f === head)
    .map((f) => {
      const ship = shipAt(f.kill - SHOT_MS);
      return {
        fire: f.kill - SHOT_MS,
        f,
        from: { x: ship.x, y: ship.hover + NOSE_UP, z: ship.z + NOSE },
      };
    });

  const pillars: RailPillar[] = [];
  for (
    let z = PILLAR_FROM, i = 0;
    z < screenZ - PILLAR_EVERY;
    z += PILLAR_EVERY, i++
  )
    pillars.push({
      x: (i % 2 ? 1 : -1) * lerp(PILLAR_X, hash01(i, 7801)),
      z,
      high: lerp(PILLAR_HIGH, hash01(i, 7802)),
      half: PILLAR_HALF,
    });

  const coins: FpsCoin[] = [];
  foes.forEach((f, k) => {
    if (f.serpent && f !== tail) return;
    const n = f === tail ? TAIL_COINS : KILL_COINS;
    for (let c = 0; c < n; c++) {
      const seed = k * 100 + c;
      const a = hash01(seed, 7803) * Math.PI * 2;
      const speed = lerp(COIN_SPEED, hash01(seed, 7804));
      coins.push(
        createFpsCoin(
          f.dies.x,
          f.dies.y,
          f.dies.z,
          Math.cos(a) * speed,
          Math.abs(Math.sin(a)) * speed,
          (hash01(seed, 7805) - 0.5) * speed,
          f.kill,
          seed,
          true,
        ),
      );
    }
  });

  // the frame of view the wisps' paths are seen through, set every frame
  const seen: { fps: Fps | null } = { fps: null };
  const racer = createRaceWisp((ms) => {
    const ship = shipAt(ms);
    return { x: ship.x, y: ship.hover, z: ship.z };
  });
  const onScreen = (x: number, y: number, z: number): Point | null =>
    seen.fps && fpsSight(seen.fps, x, y, z);
  // a foe's spot, read at once by every path
  const spot = { x: 0, y: 0, z: 0 };
  const foePaths = foes.map((f) => (ms: number) => {
    const at = swirlInto(f, ms, spot);
    return onScreen(at.x, at.y, at.z);
  });
  const shotPaths = shots.map((s) => (ms: number) => {
    const u = clamp01((ms - s.fire) / SHOT_MS);
    const to = s.f.dies;
    return onScreen(
      s.from.x + (to.x - s.from.x) * u,
      s.from.y + (to.y - s.from.y) * u,
      s.from.z + (to.z - s.from.z) * u,
    );
  });

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    view: FlightView,
    ms: number,
    now: number,
    floors: ScreenCopy,
  ): void => {
    const ship = shipAt(ms);
    const w = landing(ms);
    const fps: Fps = {
      view,
      lens: LENS,
      cam: {
        x: ship.x * FOLLOW,
        y: lerp([ship.hover + RIDE, land.y], w),
        z: lerp([flown(ms) - BEHIND, land.z], w),
        tip: 0,
      },
    };
    seen.fps = fps;
    const cz = fps.cam.z;
    drawFpsSky(ctx, fps, SKY);
    drawFpsGround(ctx, fps, PLAIN);
    drawCheckerPlain(ctx, fps, CHECK, screenZ + PLAIN_PAST);
    drawFpsFace(
      ctx,
      fps,
      screenZ + 0.01,
      -SCREEN_W / 2 - SCREEN_FRAME,
      SCREEN_W / 2 + SCREEN_FRAME,
      SCREEN_SILL - SCREEN_FRAME,
      SCREEN_SILL + SCREEN_W * aspect + SCREEN_FRAME,
      COLOR.heavenlyGold,
    );
    drawFpsOpening(ctx, fps, floors, screenZ, SCREEN_W, SCREEN_SILL, aspect);
    for (let i = pillars.length - 1; i >= 0; i--)
      if (pillars[i].z > cz + PILLAR_NEAREST)
        drawRailPillar(ctx, fps, pillars[i]);
    for (let i = 0; i < foes.length; i++) {
      const f = foes[i];
      if (ms < f.born || ms >= f.kill) continue;
      const at = swirlInto(f, ms, spot);
      const p = fpsSight(fps, at.x, at.y, at.z);
      if (!p) continue;
      drawWisp(
        ctx,
        foePaths[i],
        ms,
        now,
        (f.serpent ? SERPENT_FOE : FOE) * p.s,
        f.serpent ? SERPENT_HEAT : FOE_HEAT,
      );
    }
    if (ship.z < screenZ) racer(ctx, fps, ms, now, RACER);
    for (let i = 0; i < shots.length; i++)
      drawWispBetween(
        ctx,
        shotPaths[i],
        ms,
        now,
        WISP_SIZE * SHOT,
        1,
        shots[i].fire,
        shots[i].f.kill,
      );
    drawFpsCoins(ctx, fps, coins, ms, COIN_LIFE_MS);
    for (const f of foes) {
      const p = fpsSight(fps, f.dies.x, f.dies.y, f.dies.z);
      if (!p) continue;
      const size =
        f === tail ? TAIL_BLAST : f.serpent ? SEGMENT_BLAST : KILL_BLAST;
      drawDetonation(ctx, p, ms - f.kill, size * p.s, now);
    }
    // the floors' screen splitting into strips sliding apart
    if (ms < splitMs) {
      const u = clamp01(ms / splitMs);
      const sh = view.h / STRIPS;
      for (let i = 0; i < STRIPS; i++)
        drawScreenPart(
          ctx,
          floors,
          view.x,
          view.y + i * sh,
          view.w,
          sh,
          view.x + (i % 2 ? 1 : -1) * view.w * STRIP_SLIDE * u * u,
          view.y + i * sh,
          view.w,
          sh,
        );
    }
  };

  const pay = (payouts: number) => {
    addTotalIncome(multiply(rewardPayoutAmount(floor, Date.now()), payouts));
    pulseHudTotalFlash();
    playCoinDrop();
  };

  const beat = startFlightStage(
    KEY,
    floor,
    context,
    {
      flyMs,
      enter: { ms: enterMs, draw: drawScene },
      ownLanding: true,
      draw: (ctx, view, ms, now, floors) =>
        drawScene(ctx, view, enterMs + ms, now, floors),
      onEnd: () => {
        context.applyTierCrit?.(floor, tier);
        endEventProc(KEY);
      },
    },
    { spotlightTotal: true },
  );
  if (!beat) return;
  beat(-enterMs, playSwoosh);
  beat(splitMs - enterMs, () => shakeScreen(SPLIT_SHAKE));
  for (let w = 0; w < WAVES; w++)
    beat(splitMs + FIRST + w * WAVE_GAP - enterMs, playSwoosh);
  beat(serpentBorn - enterMs, playSwoosh);
  for (const s of shots) beat(s.fire - enterMs, () => shakeScreen(SHOT_SHAKE));
  for (const f of foes)
    beat(f.kill - enterMs, () => {
      if (f === tail) {
        playCritExplosion();
        shakeScreen(TAIL_SHAKE);
        pay(payoutsSerpent);
        return;
      }
      playExplosion();
      shakeScreen(f.serpent ? SEGMENT_SHAKE : KILL_SHAKE);
      if (!f.serpent) pay(payoutsPerKill);
    });
  beat(0, playSwoosh);
}

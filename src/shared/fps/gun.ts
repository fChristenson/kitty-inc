import { COLOR } from "../../palette";
import { drawMuzzleFlash } from "../bullets";
import type { FpsScreen } from "./world";

export interface FpsGunPose {
  // the walk's bob phase
  bob: number;
  // 0..1, 1 the instant it fires, kicking it back down
  recoil: number;
  // ms since it last fired, for its muzzle flash
  sinceShot: number;
  // 0 held up, 1 lowered out of sight
  lower?: number;
}

// how far it bobs and kicks, of the screen's width, and how long its flash
const BOB_X = 0.035;
const BOB_Y = 0.02;
const KICK = 0.07;
const LOWERED = 0.6;
const FLASH_MS = 120;
const FLASH_SIZE = 0.3;
const LINE = 3;
// how much wider than drawn below it stands
const WIDE = 1.3225;
// how far up the screen the barrel runs past the slide's back
const BARREL = 0.12;
// how far back from the barrel's tip the front sight stands
const SIGHT_BACK = 0.015;
const METAL = COLOR.cauldronIronDark;
const METAL_MID = COLOR.cauldronIron;
const METAL_LIGHT = COLOR.wallShadow;
const METAL_SHINE = COLOR.silverTicketGray;

// the player's pistol held up from the screen's bottom middle, seen from
// behind like an old shooter's: the back of its slide, domed and glossy;
// returns its muzzle
export function drawFpsGun(
  ctx: CanvasRenderingContext2D,
  view: FpsScreen,
  pose: FpsGunPose,
): { x: number; y: number } {
  const { w } = view;
  const ox = view.cx + Math.sin(pose.bob) * BOB_X * w;
  const oy =
    view.y +
    view.h +
    (Math.abs(Math.cos(pose.bob)) * BOB_Y +
      pose.recoil * KICK +
      (pose.lower ?? 0) * LOWERED) *
      w;
  // everything below in screen widths from the gun's bottom middle, y up
  const X = (x: number) => ox + x * WIDE * w;
  const Y = (y: number) => oy - y * w;
  const poly = (points: [number, number][], fill: string, outline = true) => {
    ctx.beginPath();
    ctx.moveTo(X(points[0][0]), Y(points[0][1]));
    for (let i = 1; i < points.length; i++)
      ctx.lineTo(X(points[i][0]), Y(points[i][1]));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) ctx.stroke();
  };
  const oval = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
    tilt = 0,
    outline = true,
  ) => {
    ctx.beginPath();
    ctx.ellipse(X(x), Y(y), rx * WIDE * w, ry * w, tilt, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) ctx.stroke();
  };
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = LINE;
  const top = 0.36;
  const foot = -0.05;
  // the slide's top and the barrel running away from the view past the rear
  // sight, narrowing to the muzzle with its front sight
  const tip = top + BARREL;
  poly(
    [
      [-0.07, top - 0.04],
      [-0.032, tip],
      [0.032, tip],
      [0.07, top - 0.04],
    ],
    METAL_MID,
  );
  poly(
    [
      [-0.045, top - 0.03],
      [-0.018, tip - 0.005],
      [-0.006, tip - 0.005],
      [-0.012, top - 0.03],
    ],
    METAL_LIGHT,
    false,
  );
  // the front sight, just back from the barrel's tip
  poly(
    [
      [-0.008, tip - SIGHT_BACK],
      [-0.006, tip - SIGHT_BACK + 0.03],
      [0.006, tip - SIGHT_BACK + 0.03],
      [0.008, tip - SIGHT_BACK],
    ],
    METAL,
  );
  // the slide's back: a glossy dome rising from below the screen, lit from
  // the left
  ctx.beginPath();
  ctx.moveTo(X(-0.075), Y(foot));
  ctx.lineTo(X(-0.085), Y(top - 0.07));
  ctx.quadraticCurveTo(X(-0.085), Y(top), X(0), Y(top));
  ctx.quadraticCurveTo(X(0.085), Y(top), X(0.085), Y(top - 0.07));
  ctx.lineTo(X(0.075), Y(foot));
  ctx.closePath();
  ctx.fillStyle = METAL;
  ctx.fill();
  ctx.stroke();
  poly(
    [
      [-0.07, foot],
      [-0.075, top - 0.07],
      [-0.045, top - 0.025],
      [-0.035, foot],
    ],
    METAL_MID,
    false,
  );
  poly(
    [
      [-0.06, foot],
      [-0.063, top - 0.075],
      [-0.048, top - 0.045],
      [-0.046, foot],
    ],
    METAL_LIGHT,
    false,
  );
  poly(
    [
      [-0.056, 0.04],
      [-0.058, top - 0.09],
      [-0.052, top - 0.07],
      [-0.051, 0.04],
    ],
    METAL_SHINE,
    false,
  );
  // a rim of light down its right edge
  poly(
    [
      [0.07, foot],
      [0.078, top - 0.07],
      [0.068, top - 0.05],
      [0.062, foot],
    ],
    METAL_MID,
    false,
  );
  // the rear sight on its crown, notched, and the hammer below
  poly(
    [
      [-0.04, top - 0.005],
      [-0.04, top + 0.03],
      [-0.012, top + 0.03],
      [-0.012, top + 0.012],
      [0.012, top + 0.012],
      [0.012, top + 0.03],
      [0.04, top + 0.03],
      [0.04, top - 0.005],
    ],
    METAL,
  );
  oval(0, 0.16, 0.028, 0.035, METAL_MID);
  oval(-0.008, 0.172, 0.008, 0.012, METAL_SHINE, 0, false);
  ctx.restore();
  const muzzle = { x: X(0), y: Y(top + BARREL) };
  if (pose.sinceShot >= 0 && pose.sinceShot < FLASH_MS)
    drawMuzzleFlash(
      ctx,
      muzzle,
      -Math.PI / 2,
      pose.sinceShot / FLASH_MS,
      FLASH_SIZE * w,
    );
  return muzzle;
}

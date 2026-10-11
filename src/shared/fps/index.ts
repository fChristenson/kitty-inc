// a first-person view into a simple 3D world drawn with flat quads, like an
// old shooter: the world's walls, faces and flats (./world), drawn far to
// near, enemies standing in it (./enemy) or floating heads (./head), the
// player's gun on top (./gun), its fights (./fight), coins flying through
// the world (./coins) and the floors seen through an opening (./opening)
export * from "./world";
export {
  drawFpsEnemy,
  FPS_GUARD,
  FPS_IMP,
  type FpsEnemyLook,
  type FpsEnemyPose,
} from "./enemy";
export {
  drawFpsHead,
  FPS_HEAD_RADIUS,
  type FpsHeadDrawn,
  type FpsHeadLook,
  type FpsHeadPose,
} from "./head";
export { drawFpsGun, type FpsGunPose } from "./gun";
export {
  createFpsShot,
  drawFpsShots,
  fpsEnemyPose,
  FPS_ROUND_MS,
  type FpsShot,
} from "./fight";
export { createFpsCoin, drawFpsCoins, type FpsCoin } from "./coins";
export { drawFpsOpening, fpsOpeningLanding } from "./opening";

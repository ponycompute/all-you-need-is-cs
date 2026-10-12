import { boxCorners, fitProjection, type Plan, type Point3, type Projection } from "../iso/iso-kit";
import { LEAVES, ROOT, SLOTS } from "./model";

// World units are about 1 px of the real file: x along the steps, y from the
// back step toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 60;
export const ELEVATION = 34;

export const SLOT = 12;
export const TRAY_W = SLOT * SLOTS + 6;
export const TRAY_D = 18;
export const TRAY_GAP = 6;
export const TRAY_PITCH = TRAY_W + TRAY_GAP;
export const TRAY_FLOOR = 1;
export const SIDE = 14;

export const BLOCK_W = TRAY_PITCH * LEAVES - TRAY_GAP + SIDE * 2;
export const UPPER_D = 44;
export const LOWER_D = 50;
export const UPPER_TOP = 46;
export const LOWER_TOP = 16;

export const BASE: Plan = { x: -12, y: -8, w: BLOCK_W + 24, d: UPPER_D + LOWER_D + 44, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

export const CARD_W = 10.5;
export const CARD_T = 1.6;
export const CARD_H = 13;

/** The floor plan of a page's tray: the root on the upper step, the leaves in a row on the lower one. */
export function trayOf(page: number): Plan & { z: number } {
  if (page === ROOT) return { x: BLOCK_W / 2 - TRAY_W / 2, y: 14, w: TRAY_W, d: TRAY_D, r: 1, z: UPPER_TOP };
  return { x: SIDE + page * TRAY_PITCH, y: UPPER_D + 18, w: TRAY_W, d: TRAY_D, r: 1, z: LOWER_TOP };
}

/** Where a card stands in a slot of a page: the centre of its foot. */
export function slotAt(page: number, slot: number): Point3 {
  const tray = trayOf(page);
  return [tray.x + 3 + SLOT * (slot + 0.5), tray.y + TRAY_D / 2, tray.z + TRAY_FLOOR];
}

/** Where a card is held while a page is read: over the tray, toward the reader. */
export function heldOver(page: number): Point3 {
  const tray = trayOf(page);
  return [tray.x + TRAY_W / 2, tray.y + TRAY_D + 5, tray.z + 22];
}

const FRONT_Y = UPPER_D + LOWER_D + 16;
export const FEED: Point3 = [SIDE + 40, FRONT_Y, 6];
export const BIN: Plan = { x: BLOCK_W - SIDE - 86, y: FRONT_Y - 8, w: 54, d: 16, r: 1 };
export const BIN_SLOTS = 4;
/** Discarded cards stack front to back in the bin, newest in front. */
export const binAt = (slot: number): Point3 => [BIN.x + 3 + (slot + 0.5) * SLOT, FRONT_Y, TRAY_FLOOR];

export const P: Projection = fitProjection(
  [...boxCorners(BASE, -BASE_H - FOOT_H, 0), [BLOCK_W / 2, 20, UPPER_TOP + 52], [0, 0, UPPER_TOP + 20]],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: AZIMUTH, elevation: ELEVATION },
);

const RADIANS = Math.PI / 180;
const COS_A = Math.cos(AZIMUTH * RADIANS);
const SIN_A = Math.sin(AZIMUTH * RADIANS);

/** Painter's key for upright parts: how near the reader their footprint is. */
export const nearness = ([x, y]: Point3) => x * COS_A + y * SIN_A;

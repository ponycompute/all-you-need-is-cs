import { fitProjection, boxCorners, iso, type Plan, type Point3, type Projection } from "../iso/iso-kit";
import { LEVELS, levelOf, type End } from "./model";

// World units are about 1 px of the real rack: x along the steps, y from the
// back step toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 470;
export const AZIMUTH = 60;
export const ELEVATION = 34;

export const PITCH = 34;
export const MARGIN = 20;
export const TREAD = 40;
export const RISE = 18;
export const RACK_W = PITCH * 8 + MARGIN * 2;
export const RACK_D = TREAD * LEVELS;

export const WEIGHT_R = 11.5;
export const SEAT_R = 13.5;
export const SEAT_H = 0.8;

export const BASE: Plan = { x: -12, y: -8, w: RACK_W + 24, d: RACK_D + 70, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

export const TRAY_Y = RACK_D + 8;
export const TRAY_W = 116;
export const TRAY_D = 38;
export const TRAY_FLOOR = 1;
export const TRAY_WALL = 2.5;
export const TRAY_SLOTS = 4;
export const TRAYS: Record<End, Plan> = {
  low: { x: 2, y: TRAY_Y, w: TRAY_W, d: TRAY_D, r: 0.8 },
  high: { x: RACK_W - 2 - TRAY_W, y: TRAY_Y, w: TRAY_W, d: TRAY_D, r: 0.8 },
};

export const PAD: Point3 = [RACK_W / 2, TRAY_Y + TRAY_D / 2, 3.4];

export const GAUGE_Y = TREAD / 2;
export const GAUGE_X: Record<End, number> = { low: 26, high: RACK_W - 26 };
export const GAUGE_H = 46;

export const tierTop = (level: number) => (LEVELS - level) * RISE;
export const TOP = tierTop(0);

/** Height of a weight: its key, at 0.3 units per count on an 8-unit foot. */
export const heightOf = (value: number) => 8 + value * 0.3;

/** Where a weight stands in a seat: the centre of its foot. */
export function seatAt(seat: number): Point3 {
  const level = levelOf(seat);
  const index = seat - (2 ** level - 1);
  const span = 8 / 2 ** level;
  return [MARGIN + PITCH * (index * span + span / 2), level * TREAD + TREAD / 2, tierTop(level) + SEAT_H];
}

/** Tray slots fill from the middle of the rack outward, newest first. */
export function trayAt(end: End, slot: number): Point3 {
  const tray = TRAYS[end];
  const pitch = (TRAY_W - TRAY_WALL * 2) / TRAY_SLOTS;
  const along = TRAY_WALL + pitch * (slot + 0.5);
  return [end === "low" ? tray.x + TRAY_W - along : tray.x + along, TRAY_Y + TRAY_D / 2, TRAY_FLOOR];
}

export const P: Projection = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [GAUGE_X.low, GAUGE_Y, TOP + GAUGE_H + 8],
    [GAUGE_X.high, GAUGE_Y, TOP + GAUGE_H + 8],
    [RACK_W / 2, GAUGE_Y, TOP + 70],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3) => iso(point, P);

const RADIANS = Math.PI / 180;
const COS_A = Math.cos(AZIMUTH * RADIANS);
const SIN_A = Math.sin(AZIMUTH * RADIANS);

/** Painter's key for upright parts: how near the reader their footprint is. */
export const nearness = ([x, y]: Point3) => x * COS_A + y * SIN_A;

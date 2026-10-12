import { boxCorners, fitProjection, type Plan, type Point3, type Projection } from "../iso/iso-kit";
import { NIL } from "./model";

// World units are about 1 px of the real board: x along it, y toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 60;
export const ELEVATION = 36;

export const COLS = 4;
export const PITCH_X = 78;
export const ROW_Y: [number, number] = [44, 112];
export const LEFT = 76;

export const BASE: Plan = { x: 0, y: 0, w: LEFT + PITCH_X * (COLS - 1) + 52, d: 156, r: 9 };
export const BASE_H = 9;
export const FOOT_H = 5;

export const BLOCK_W = 46;
export const BLOCK_D = 30;
export const SEAT_H = 1.2;
export const BLOCK_H = 11;
export const TOP = SEAT_H + BLOCK_H;
export const JACK_H = 2.2;

/** The post the `first` pointer's cord leaves from. */
export const POST: Point3 = [22, 78, 20];

/** The centre of a memory cell on the board; cells 1-4 are the back row, 5-8 the front. */
export function cellAt(address: number): [number, number] {
  const index = address - 1;
  return [LEFT + PITCH_X * (index % COLS), ROW_Y[Math.floor(index / COLS)]!];
}

export type Side = "next" | "back";

/** Where a block's own cord for this link leaves it. */
export function outJack(address: number, side: Side): Point3 {
  if (address === NIL) return POST;
  const [x, y] = cellAt(address);
  return side === "next" ? [x + 19, y + 11, TOP + JACK_H] : [x - 19, y - 11, TOP + JACK_H];
}

/** Where a cord pointing at this block plugs in. */
export function inJack(address: number, side: Side): Point3 {
  const [x, y] = cellAt(address);
  return side === "next" ? [x - 19, y + 11, TOP + JACK_H] : [x + 19, y - 11, TOP + JACK_H];
}

export const P: Projection = fitProjection(
  [...boxCorners(BASE, -BASE_H - FOOT_H, 0), [BASE.w / 2, ROW_Y[0], TOP + 44], [0, 0, TOP + 30]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION },
);

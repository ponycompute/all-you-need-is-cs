import { boxCorners, fitProjection, type Plan, type Point3, type Projection } from "../iso/iso-kit";
import { CAPACITY } from "./model";

// World units are about 1 px of the real gantry: x along the rail, y toward
// the reader, z up. The mobile hangs in the plane y = 0.

export const WIDTH = 640;
export const HEIGHT = 500;
export const AZIMUTH = 60;
export const ELEVATION = 30;

/** Half a lane: the rail's ruler has a tick every half lane, so odd and even counts both centre. */
export const HALF_LANE = 10.5;
export const LANE = HALF_LANE * 2;
export const CENTRE = HALF_LANE * 14;
export const LEVEL = 30;
export const LEVELS = 5;

export const BASE: Plan = { x: 0, y: -36, w: CENTRE * 2, d: 86, r: 9 };
export const BASE_H = 9;
export const FOOT_H = 5;

export const POST_X: [number, number] = [11, CENTRE * 2 - 11];
export const POST_R = 4;
export const RAIL_Z = 170;
export const RAIL_H = 7;
export const RAIL_D = 8;

export const COIN_R = 8.5;
export const COIN_T = 3;
export const EYE = 1.3;
/** Where a string leaves the rail: the point under it that sits on its front lower edge on screen. */
export const HOOK_Z = RAIL_Z - 2.7;
export const ROOT_Z = RAIL_Z - 26;

export const CRADLE: Point3 = [44, 26, 6.6 + COIN_R];
/** The plane a new key travels in while it is held against the keys on its path. */
export const FRONT = 17;

export const hubZ = (depth: number) => ROOT_Z - depth * LEVEL;
export const laneX = (rank: number, count: number) => CENTRE + (rank - (count - 1) / 2) * LANE;
export const SPAN = ((CAPACITY - 1) / 2) * LANE;

export const P: Projection = fitProjection(
  [...boxCorners(BASE, -BASE_H - FOOT_H, 0), [POST_X[0], 0, RAIL_Z + RAIL_H + 12], [POST_X[1], 0, RAIL_Z + RAIL_H + 12]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION },
);

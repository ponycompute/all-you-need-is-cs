import * as k from "../iso/iso-kit";
import * as G from "../iso/lathe.mjs";
import { partsFor } from "../iso/parts";
import { ELEMENTS } from "./model";

// World units are about 1 px of the real rack: x along the rail, y toward the reader, z up.
// The forest hangs in the plane y = 0.

export const WIDTH = 640;
export const HEIGHT = 470;

export const LANE = 26;
export const CENTRE = 150;
export const LEVEL = 30;
const BASE: k.Plan = { x: 0, y: -34, w: CENTRE * 2, d: 96, r: 9 };
const POST_X: [number, number] = [11, CENTRE * 2 - 11];
const POST_R = 4;
const RAIL_Z = 150;
const RAIL_H = 7;
const RAIL_D = 8;

export const COIN_R = 8.5;
const COIN_T = 3;
export const EYE = 1.3;
/** Where a root's string leaves the rail: the point under it that sits on its front lower edge on screen. */
export const HOOK_Z = RAIL_Z - 2.7;
const ROOT_Z = RAIL_Z - 24;

export const laneX = (lane: number) => CENTRE + (lane - (ELEMENTS - 1) / 2) * LANE;
export const levelZ = (depth: number) => ROOT_Z - depth * LEVEL;

export const P: k.Projection = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [POST_X[0], 0, RAIL_Z + RAIL_H + 8], [POST_X[1], 0, RAIL_Z + RAIL_H + 8]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 60, elevation: 30 },
);

const { S, L, D, base, counter, labelPlate } = partsFor(P);

function postArt(x: number) {
  const foot: k.Plan = { x: x - 10, y: -10, w: 20, d: 20, r: 2.5 };
  const seams = [40, 95, RAIL_Z - 8].map((z) => k.sideArc(x, 0, POST_R, z, P, 18)).join("");
  return [
    S(k.slabOf(foot, 0, 2, P, 4, 0.4), { tone: "lo" }),
    D(k.corners(foot, 3.2).map(([px, py]) => k.iso([px, py, 2], P)), { size: 0.42, tone: "mid" }),
    S(k.cylinder(x, 0, 6.4, 2, 3.4, P, 28, 0.4), { tone: "mid" }),
    S(k.cylinder(x, 0, POST_R, 5.4, RAIL_Z - 5.4, P, 24), { tone: "mid", crease: "none", inner: L(seams, { tone: "faint" }) }),
  ].join("");
}

function railArt() {
  const rail: k.Plan = { x: POST_X[0] - 7, y: -RAIL_D / 2, w: POST_X[1] - POST_X[0] + 14, d: RAIL_D, r: 1.2 };
  const top = RAIL_Z + RAIL_H;
  // One tick per lane, hanging from the rail's top edge.
  const ticks = Array.from({ length: ELEMENTS }, (_, lane) => k.segment([laneX(lane), RAIL_D / 2, top], [laneX(lane), RAIL_D / 2, top - 3], P)).join("");
  const bolts = POST_X.flatMap((x) => [k.iso([x - 3, 0, top], P), k.iso([x + 3, 0, top], P)]);
  return [S(k.slabOf(rail, RAIL_Z, RAIL_H, P, 3, 0.6), { tone: "mid" }), L(ticks, { tone: "mid" }), D(bolts, { size: 0.5, tone: "mid" })].join("");
}

/**
 * The parent array, as a strip of windows along the front of the base: window i shows parent[i],
 * which is minus the set's size when i is a root. The index is engraved in front of each window.
 */
function arrayArt() {
  const cell = 24;
  const x0 = CENTRE - (cell * ELEMENTS) / 2;
  const y = 26;
  const strip: k.Plan = { x: x0 - 4, y: y - 3, w: cell * ELEMENTS + 8, d: 27, r: 2 };
  const parts: string[] = [S(k.slabOf(strip, 0, 2, P, 4, 0.5), { tone: "mid" })];
  for (let element = 0; element < ELEMENTS; element++) {
    const window: k.Plan = { x: x0 + element * cell + 2, y, w: cell - 4, d: 11, r: 1 };
    const cx = window.x + window.w / 2;
    parts.push(`<path class="fig-window tf-cell" data-cell-box="${element}" d="${k.planOutline(window, 2, P, 3)}"/>`);
    parts.push(L(k.planOutline(window, 2, P, 3), { tone: "lo" }));
    parts.push(`<text class="iso-face-text tf-cell-text" data-cell="${element}" transform="${k.topMatrix([cx, y + 8.6], 2, P)}" font-size="7" text-anchor="middle"></text>`);
    parts.push(k.faceTextSvg(k.topMatrix([cx, y + 19], 2, P), String(element), { size: 4.8, tone: "lo", anchor: "middle" }));
  }
  return parts.join("");
}

/** Everything the forest hangs from or above. */
export const BACK = [
  base(BASE),
  counter(BASE.w - 62, -30, 0, "followed"),
  postArt(POST_X[0]),
  postArt(POST_X[1]),
  railArt(),
  labelPlate({ x: 10, y: -28, w: 30, d: 10, r: 1.4 }, 0, [16, 22, 12]),
  arrayArt(),
].join("");

const FACING = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const COIN = G.disc(-COIN_T / 2, COIN_T / 2, COIN_R, FACING, P) as k.SolidPaths;
const COIN_RING = G.circleOf(FACING, COIN_T / 2, COIN_R - 1.9, P) as string;
const COIN_RIM = G.circleOf(FACING, COIN_T / 2, COIN_R + 1.6, P) as string;
const COIN_HIT = G.disc(-COIN_T / 2, COIN_T / 2, COIN_R + 2, FACING, P) as k.SolidPaths;
const EYE_BALL = S(G.sphereOf([0, 0, COIN_R + EYE], EYE, P) as k.SolidPaths, { tone: "mid" });

/** An element's tag at the world origin, facing the reader; the live code moves it with a translate. */
export function coinSvg(element: number) {
  return [
    EYE_BALL,
    `<path class="iso-line fig-rim" d="${COIN_RIM}"/>`,
    S(COIN, { tone: "hi", crease: "lo", className: "tf-body" }),
    L(COIN_RING, { tone: "lo" }),
    `<text class="iso-face-text fig-key" transform="${k.sideMatrix([0, COIN_T / 2], -2.9, P, "left")}" font-size="8.4" text-anchor="middle">${element}</text>`,
    `<path class="fig-hit" data-element="${element}" d="${COIN_HIT.fill}"/>`,
  ].join("");
}

/** A string from a hook, or from the bottom of the tag above, down to the eye of a tag. */
export function stringSvg(from: k.Point3, coin: k.Point3) {
  return L(k.segment(from, [coin[0], coin[1], coin[2] + COIN_R + EYE], P), { tone: "mid", className: "tf-string" });
}

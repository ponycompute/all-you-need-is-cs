import * as k from "../iso/iso-kit";
import * as G from "../iso/lathe.mjs";
import {
  BASE,
  BASE_H,
  CENTRE,
  COIN_R,
  COIN_T,
  CRADLE,
  EYE,
  FOOT_H,
  HALF_LANE,
  LANE,
  LEVEL,
  LEVELS,
  P,
  POST_R,
  POST_X,
  RAIL_D,
  RAIL_H,
  RAIL_Z,
  SPAN,
  hubZ,
} from "./view";

const S = k.solidSvg;
const L = k.lineSvg;
const D = k.dotsSvg;

const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const smooth = (lo: number, hi: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** A grip band on an upright cylinder: ribs that fade toward both limbs instead of stopping. */
function ribs(cx: number, cy: number, radius: number, z0: number, z1: number, count: number) {
  const [vx, vy] = k.towardViewer(P);
  const list: k.Faded[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const alpha = smooth(0.04, 0.55, nx * vx + ny * vy);
    if (alpha <= 0.02) continue;
    list.push({ d: k.segment([cx + radius * nx, cy + radius * ny, z0], [cx + radius * nx, cy + radius * ny, z1], P), alpha });
  }
  return k.fadedSvg(list, { tone: "lo" });
}

/** A closed outline on a face of constant y, in (x, z) points. */
const onFront = (points: Array<[number, number]>, y: number) => k.pathOf(points.map(([x, z]) => k.iso([x, y, z], P)), true);

function baseArt() {
  const parts: string[] = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 18))) {
    parts.push(S(k.cylinder(x, y, 7.5, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 5.6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  parts.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.5), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 3, P, 8), { tone: "faint" }) }));
  parts.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 9);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 1.9, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5, tone: "mid" }));

  // The floor plate under the mobile: one lane line per half lane, edge to edge.
  const floor: k.Plan = { x: CENTRE - SPAN - 14, y: -11, w: SPAN * 2 + 28, d: 22, r: 2 };
  const lanes: string[] = [];
  for (let x = CENTRE - SPAN; x <= CENTRE + SPAN + 1e-6; x += LANE) lanes.push(k.lineOnTop([x, floor.y], [x, floor.y + floor.d], 0.6, P));
  parts.push(S(k.slabOf(floor, 0, 0.6, P, 4), { tone: "lo", crease: "none" }));
  parts.push(L(lanes.join(""), { tone: "faint" }));
  parts.push(D(k.corners(floor, 3).map(([x, y]) => k.iso([x, y, 0.6], P)), { size: 0.42, tone: "mid" }));
  return parts.join("");
}

/** A post with its foot plate, gusset, collar and seams, and the level ruler clamped to its front. */
function postArt(x: number) {
  const foot: k.Plan = { x: x - 10, y: -10, w: 20, d: 20, r: 2.5 };
  const strip: k.Plan = { x: x - 3.5, y: POST_R, w: 7, d: 1.6, r: 0.5 };
  const face = strip.y + strip.d;
  const stripZ = hubZ(LEVELS - 1) - 12;
  const stripTop = hubZ(0) + 22;
  const minor: string[] = [];
  const major: string[] = [];
  for (let step = 0; step <= (LEVELS - 1) * 3; step++) {
    const z = hubZ(0) - (step * LEVEL) / 3;
    const big = step % 3 === 0;
    (big ? major : minor).push(k.segment([strip.x + 0.2, face, z], [strip.x + 0.2 + (big ? 4 : 2.4), face, z], P));
  }
  const seams = [40, 100, RAIL_Z - 8].map((z) => k.sideArc(x, 0, POST_R, z, P, 18)).join("");
  return [
    S(k.slabOf(foot, 0, 2, P, 4, 0.4), { tone: "lo" }),
    D(k.corners(foot, 3.2).map(([px, py]) => k.iso([px, py, 2], P)), { size: 0.42, tone: "mid" }),
    S(k.cylinder(x, 0, 6.4, 2, 3.4, P, 28, 0.4), { tone: "mid" }),
    S(k.cylinder(x, 0, POST_R, 5.4, RAIL_Z - 5.4, P, 24), { tone: "mid", crease: "none", inner: L(seams, { tone: "faint" }) }),
    S(k.slabOf(strip, stripZ, stripTop - stripZ, P, 2), { tone: "mid", crease: "none" }),
    L(minor.join(""), { tone: "lo" }),
    L(major.join(""), { tone: "mid" }),
  ].join("");
}

/** A ruler's slider, built at the top of its travel; the live code lowers it. */
function riderArt(side: "now" | "limit") {
  const x = side === "now" ? POST_X[0] : POST_X[1];
  const y = POST_R + 1.6;
  const z = RIDER_REST - 4;
  const inward = side === "now" ? 1 : -1;
  const block = S(k.slabOf({ x: x - 6, y, w: 12, d: 4.4, r: 1.2 }, z, 4, P, 3, 0.5), { tone: "hi", crease: "lo" });
  const index = L(k.lineOnTop([x - 5.8, y + 2.2], [x + 5.8, y + 2.2], z + 4, P), { tone: "hi" });
  const knobX = x - inward * 3.3;
  const knob = S(k.cylinder(knobX, y + 2.2, 1.9, z + 4, 2.6, P, 16), { tone: "mid" }) + ribs(knobX, y + 2.2, 1.9, z + 4, z + 6.6, 16);
  const arm = S(k.slabOf({ x: inward > 0 ? x + 6 : x - 18, y: y + 1.2, w: 12, d: 2, r: 0.8 }, z + 2.2, 1.4, P, 2), { tone: "hi", crease: "none" });
  const order = inward > 0 ? [block, index, knob, arm] : [arm, block, index, knob];
  return `<g data-part="rider-${side}">${order.join("")}</g>`;
}

function railArt() {
  const rail: k.Plan = { x: POST_X[0] - 7, y: -RAIL_D / 2, w: POST_X[1] - POST_X[0] + 14, d: RAIL_D, r: 1.2 };
  const top = RAIL_Z + RAIL_H;
  const ticks = k.sideTicks(CENTRE - SPAN, CENTRE + SPAN, HALF_LANE, 2, RAIL_D / 2, top, [1.8, 3.4], P);
  const stop = (x: number) => S(k.slabOf({ x: x - 2.5, y: -RAIL_D / 2 - 1, w: 5, d: RAIL_D + 2, r: 1 }, top, 4, P, 2, 0.4), { tone: "mid" });
  const bolts = POST_X.flatMap((x) => [k.iso([x - 3, 0, top], P), k.iso([x + 3, 0, top], P)]);
  return [
    S(k.slabOf(rail, RAIL_Z, RAIL_H, P, 3, 0.6), { tone: "mid" }),
    L(ticks.minor, { tone: "lo" }),
    L(ticks.major, { tone: "mid" }),
    D(bolts, { size: 0.5, tone: "mid" }),
    stop(CENTRE - SPAN - 14),
    `<g data-part="trolley">${trolleyArt()}</g>`,
    stop(CENTRE + SPAN + 14),
  ].join("");
}

/** The trolley the root hangs from, built at the centre of the rail. */
function trolleyArt() {
  const top = RAIL_Z + RAIL_H;
  const body: k.Plan = { x: CENTRE - 8, y: -RAIL_D / 2 - 1.2, w: 16, d: RAIL_D + 2.4, r: 1.6 };
  const wheels = [-4.4, 4.4].map((dx) => S(k.cylinder(CENTRE + dx, 0, 2.3, top + 4.6, 1.8, P, 16), { tone: "mid" })).join("");
  const apron = S(k.slabOf({ x: CENTRE - 5, y: RAIL_D / 2, w: 10, d: 1.4, r: 0.5 }, RAIL_Z, RAIL_H, P, 2), { tone: "hi", crease: "none" });
  return [
    S(k.slabOf(body, top, 4.6, P, 3, 0.5), { tone: "hi", crease: "lo" }),
    wheels,
    apron,
    L(k.rise([CENTRE, RAIL_D / 2 + 1.4], RAIL_Z, top, P), { tone: "hi" }),
  ].join("");
}

function cradleArt() {
  const [x, y] = CRADLE;
  const block: k.Plan = { x: x - 13, y: y - 5, w: 26, d: 10, r: 1.6 };
  const slot: k.Plan = { x: x - 9.5, y: y - 1.9, w: 19, d: 3.8, r: 1.2 };
  return {
    back: [
      S(k.slabOf(block, 0, 6.6, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 1.6, P, 3), { tone: "faint" }) }),
      L(k.planOutline(slot, 6.6, P, 4), { tone: "lo" }),
      D([k.iso([x - 11, y - 3.2, 6.6], P), k.iso([x + 11, y + 3.2, 6.6], P)], { size: 0.42, tone: "mid" }),
    ].join(""),
    hit: `<path class="am-hit" data-act="load" d="${k.slabOf({ x: x - 16, y: y - 8, w: 32, d: 16, r: 2 }, 0, 26, P, 3).fill}"/>`,
  };
}

function counterArt() {
  const box: k.Plan = { x: CENTRE * 2 - 76, y: 16, w: 40, d: 20, r: 2 };
  const face = box.y + box.d;
  const top = 12;
  const [wx0, wx1, wz0, wz1] = [box.x + 12.5, box.x + 27.5, 2.9, 9.6];
  const window = onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face);
  return [
    S(k.slabOf(box, 0, top, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(box, 1.6, P, 4), { tone: "faint" }) }),
    L(k.planOutline(k.insetPlan(box, 1.8), top, P, 4), { tone: "faint" }),
    D([k.iso([box.x + 4.5, box.y + 4.5, top], P), k.iso([box.x + 4.5, face - 4.5, top], P)], { size: 0.42, tone: "mid" }),
    S(k.cylinder(box.x + 30, box.y + 10, 3.2, top, 2.4, P, 20, 0.3), { tone: "mid" }),
    ribs(box.x + 30, box.y + 10, 3.2, top, top + 2.4, 22),
    L(k.lineOnTop([box.x + 30, box.y + 10], [box.x + 30, box.y + 13], top + 2.4, P), { tone: "hi" }),
    `<path class="am-window" d="${window}"/>`,
    L(window, { tone: "lo" }),
    `<text class="iso-face-text am-digits" data-part="turns" transform="${k.sideMatrix([(wx0 + wx1) / 2, face], 4.3, P, "left")}" font-size="5.4" text-anchor="middle">00</text>`,
  ].join("");
}

function stripArt() {
  const strip: k.Plan = { x: CENTRE - SPAN - 6, y: 38.5, w: SPAN * 2 + 12, d: 6, r: 1 };
  const ticks = k.topTicks(CENTRE - SPAN, CENTRE + SPAN, HALF_LANE, 2, strip.y + 0.5, 0.6, [2, 3.6], P);
  const plate: k.Plan = { x: CENTRE - 20, y: 20, w: 40, d: 10, r: 1.4 };
  const rules = [20, 28, 14]
    .map((length, row) => k.lineOnTop([plate.x + 3, plate.y + 2.6 + row * 2.3], [plate.x + 3 + length, plate.y + 2.6 + row * 2.3], 0.8, P))
    .join("");
  return [
    S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 4), { tone: "faint" }),
    L(rules, { tone: "lo", free: true }),
    D([k.iso([plate.x + plate.w - 2.6, plate.y + 2.6, 0.8], P), k.iso([plate.x + plate.w - 2.6, plate.y + plate.d - 2.6, 0.8], P)], { size: 0.42, tone: "mid" }),
    S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }),
    L(ticks.minor, { tone: "lo" }),
    L(ticks.major, { tone: "mid" }),
  ].join("");
}

// ---------------------------------------------------------------------------

/** Where a rider's index line sits at the top of its travel. */
export const RIDER_REST = hubZ(0) + 16;
/** How far a rider drops from its rest to mark a tree of this height. */
export const riderDrop = (height: number) => (height ? RIDER_REST - hubZ(height - 1) : 0);

const cradle = cradleArt();

/** Everything the mobile hangs in front of or above. */
export const BACK = [baseArt(), postArt(POST_X[0]), postArt(POST_X[1]), riderArt("now"), riderArt("limit"), railArt(), cradle.back, stripArt(), counterArt()].join("");
export const FRONT_ART = cradle.hit;

// ---------------------------------------------------------------------------
// The moving parts
// ---------------------------------------------------------------------------

const FACING = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const COIN = G.disc(-COIN_T / 2, COIN_T / 2, COIN_R, FACING, P) as k.SolidPaths;
const COIN_RING = G.circleOf(FACING, COIN_T / 2, COIN_R - 1.9, P) as string;
const COIN_RIM = G.circleOf(FACING, COIN_T / 2, COIN_R - 0.2, P) as string;
const EYE_BALL = S(G.sphereOf([0, 0, COIN_R + EYE], EYE, P) as k.SolidPaths, { tone: "mid" });
const END_BALL = S(G.sphereOf([0, 0, 0], 1.8, P) as k.SolidPaths, { tone: "mid" });

/** A key tag standing at the world origin, facing the reader; the live code moves it with a translate. */
export function coinSvg(key: number) {
  return [
    EYE_BALL,
    S(COIN, { tone: "hi", crease: "lo", className: "am-body" }),
    L(COIN_RING, { tone: "lo" }),
    `<path class="iso-line am-rim" d="${COIN_RIM}"/>`,
    `<text class="iso-face-text am-key" transform="${k.sideMatrix([0, COIN_T / 2], -2.7, P, "left")}" font-size="7.8" text-anchor="middle">${key}</text>`,
  ].join("");
}

/** One arm of a node's beam with the string to its child: rebuilt whenever either end moves. */
export function armSvg(hub: k.Point3, end: k.Point3, child: k.Point3) {
  const along: k.Point3 = [end[0] - hub[0], 0, end[2] - hub[2]];
  const length = Math.hypot(along[0], along[2]);
  const rod = length > 0.5 ? S(G.disc(0, length, 1, G.frameAlong(hub, along), P) as k.SolidPaths, { tone: "mid", crease: "none" }) : "";
  return [
    stringSvg(end, child),
    rod,
    `<g transform="${k.translateAlong(P, end)}">${END_BALL}</g>`,
  ].join("");
}

/** A string from a hook down to the eye of the tag below it. */
export function stringSvg(from: k.Point3, coin: k.Point3) {
  return L(k.segment(from, [coin[0], coin[1], coin[2] + COIN_R + EYE], P), { tone: "mid", className: "am-string" });
}

/** The slope of a beam that reads `notches` of balance, for arms of the given lengths. */
export function slopeOf(notches: number, longest: number) {
  return notches * Math.min(Math.tan((12 * Math.PI) / 180), 9 / Math.max(longest, LANE));
}

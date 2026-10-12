import * as k from "../iso/iso-kit";
import * as G from "../iso/lathe.mjs";
import { partsFor } from "../iso/parts";
import type { TreeFrame, TreeNode } from "./types";

// World units are about 1 px of the real gantry: x along the rail, y toward the reader, z up.
// The trees hang in the plane y = 0.

export const WIDTH = 640;
export const HEIGHT = 480;

const CENTRE = 160;
/** The widest a tree may spread, and the deepest it may hang; wider or deeper trees are drawn closer together. */
const SPAN = 268;
const LANE = 25;
const LEVEL = 30;
const DROP = 128;
const BASE: k.Plan = { x: 0, y: -34, w: CENTRE * 2, d: 82, r: 9 };
const POST_X: [number, number] = [11, CENTRE * 2 - 11];
const POST_R = 4;
const RAIL_Z = 172;
const RAIL_H = 7;
const RAIL_D = 8;
/** Where a root's string leaves the rail: the point under it that sits on its front lower edge on screen. */
export const HOOK_Z = RAIL_Z - 2.7;
const ROOT_Z = RAIL_Z - 22;

const COIN_R = 10;
const BEAD_R = 6.4;
const TAG_T = 3;
const PLATE_H = 14;
const CELL = 14;
const EYE = 1.2;

export const P: k.Projection = k.fitProjection(
  [...k.boxCorners(BASE, -14, 0), [POST_X[0], 0, RAIL_Z + RAIL_H + 12], [POST_X[1], 0, RAIL_Z + RAIL_H + 12]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 60, elevation: 30 },
);

const { S, L, D, base, counter, labelPlate } = partsFor(P);

function postArt(x: number) {
  const foot: k.Plan = { x: x - 10, y: -10, w: 20, d: 20, r: 2.5 };
  const seams = [42, 104, RAIL_Z - 8].map((z) => k.sideArc(x, 0, POST_R, z, P, 18)).join("");
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
  const ticks = k.sideTicks(CENTRE - SPAN / 2, CENTRE + SPAN / 2, LANE / 2, 2, RAIL_D / 2, top, [1.8, 3.4], P);
  const bolts = POST_X.flatMap((x) => [k.iso([x - 3, 0, top], P), k.iso([x + 3, 0, top], P)]);
  return [S(k.slabOf(rail, RAIL_Z, RAIL_H, P, 3, 0.6), { tone: "mid" }), L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }), D(bolts, { size: 0.5, tone: "mid" })].join("");
}

/** The pointer that rides the rail, built at its centre: the live code slides it over one root. */
function pointerArt() {
  const top = RAIL_Z + RAIL_H;
  const body: k.Plan = { x: CENTRE - 7, y: -RAIL_D / 2 - 1.2, w: 14, d: RAIL_D + 2.4, r: 1.6 };
  return [
    S(k.slabOf(body, top, 4.2, P, 3, 0.5), { tone: "hi", crease: "lo" }),
    S(k.cylinder(CENTRE, 0, 2.4, top + 4.2, 2, P, 16), { tone: "mid" }),
    S(k.slabOf({ x: CENTRE - 4, y: RAIL_D / 2, w: 8, d: 1.4, r: 0.5 }, RAIL_Z, RAIL_H, P, 2), { tone: "hi", crease: "none" }),
  ].join("");
}

function floorArt() {
  const floor: k.Plan = { x: CENTRE - SPAN / 2 - 8, y: -11, w: SPAN + 16, d: 22, r: 2 };
  const lines: string[] = [];
  for (let x = CENTRE - SPAN / 2 + 2.5; x <= CENTRE + SPAN / 2; x += LANE) lines.push(k.lineOnTop([x, floor.y], [x, floor.y + floor.d], 0.6, P));
  return [
    S(k.slabOf(floor, 0, 0.6, P, 4), { tone: "lo", crease: "none" }),
    L(lines.join(""), { tone: "faint" }),
    D(k.corners(floor, 3).map(([x, y]) => k.iso([x, y, 0.6], P)), { size: 0.42, tone: "mid" }),
  ].join("");
}

/** Everything the trees hang from or above. */
export const BACK = [
  base(BASE),
  postArt(POST_X[0]),
  postArt(POST_X[1]),
  railArt(),
  `<g data-part="pointer">${pointerArt()}</g>`,
  floorArt(),
  labelPlate({ x: CENTRE - 20, y: 24, w: 40, d: 10, r: 1.4 }, 0, [20, 28, 14]),
  counter(BASE.w - 54, 20, 0, "count"),
].join("");

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface Seat {
  x: number;
  z: number;
  /** Half the tag's width and height, for where strings meet it. */
  halfW: number;
  halfH: number;
}

/** A plate is as wide as its cells; a plate with one long word is as wide as the word. */
const plateWidth = (node: TreeNode) => (node.cells.length === 1 ? Math.max(CELL, node.cells[0]!.length * 5 + 4) : CELL * node.cells.length);
const halfWidthOf = (node: TreeNode) => (node.kind === "coin" ? COIN_R : node.kind === "bead" ? BEAD_R : plateWidth(node) / 2 + 1.5);
const halfHeightOf = (node: TreeNode) => (node.kind === "coin" ? COIN_R : node.kind === "bead" ? BEAD_R : PLATE_H / 2);

/**
 * Where every node of a frame hangs. Leaves take lanes left to right, a parent sits over the span of its
 * ports (an empty port keeps its room, so a lone left child still hangs to the left), and a forest wider
 * or deeper than the gantry is drawn closer together rather than cut off.
 */
export function layout(frame: TreeFrame): Map<string, Seat> {
  const byParent = new Map<string | null, TreeNode[]>();
  for (const node of frame.nodes) {
    const list = byParent.get(node.parent) ?? [];
    list.push(node);
    byParent.set(node.parent, list);
  }
  const raw = new Map<string, { x: number; depth: number }>();
  let cursor = 0;
  let deepest = 0;
  const place = (node: TreeNode, depth: number): [number, number] => {
    deepest = Math.max(deepest, depth);
    const kids = (byParent.get(node.id) ?? []).sort((a, b) => a.port - b.port);
    const own = Math.max(LANE, halfWidthOf(node) * 2 + 5);
    if (!kids.length) {
      const x = cursor + own / 2;
      cursor += own;
      raw.set(node.id, { x, depth });
      return [x - own / 2, x + own / 2];
    }
    const start = cursor;
    const centres: number[] = [];
    let next = 0;
    for (let port = 0; port < Math.max(node.ports, kids.length); port++) {
      const kid = kids[next]?.port === port ? kids[next++] : undefined;
      if (kid) {
        const [left, right] = place(kid, depth + 1);
        centres[port] = (left + right) / 2;
      } else {
        centres[port] = cursor + LANE * 0.3;
        cursor += LANE * 0.6;
      }
    }
    while (next < kids.length) place(kids[next++]!, depth + 1);
    if (cursor - start < own) cursor = start + own;
    const x = (centres[0]! + centres[centres.length - 1]!) / 2;
    raw.set(node.id, { x, depth });
    return [start, cursor];
  };
  for (const root of byParent.get(null) ?? []) {
    place(root, 0);
    cursor += LANE * 0.5;
  }
  const total = Math.max(1, cursor - LANE * 0.5);
  const squeeze = Math.min(1, SPAN / total);
  const level = Math.min(LEVEL, DROP / Math.max(1, deepest));
  const seats = new Map<string, Seat>();
  for (const node of frame.nodes) {
    const { x, depth } = raw.get(node.id)!;
    seats.set(node.id, { x: CENTRE + (x - total / 2) * squeeze, z: ROOT_Z - depth * level, halfW: halfWidthOf(node), halfH: halfHeightOf(node) });
  }
  return seats;
}

// ---------------------------------------------------------------------------
// The moving parts
// ---------------------------------------------------------------------------

const FACING = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const disc = (radius: number) => G.disc(-TAG_T / 2, TAG_T / 2, radius, FACING, P) as k.SolidPaths;
const COIN = disc(COIN_R);
const BEAD = disc(BEAD_R);
const circle = (radius: number) => G.circleOf(FACING, TAG_T / 2, radius, P) as string;
const eye = (z: number) => S(G.sphereOf([0, 0, z + EYE], EYE, P) as k.SolidPaths, { tone: "mid" });
const text = (value: string, x: number, z: number, size: number, className = "fig-key") =>
  `<text class="iso-face-text ${className}" transform="${k.sideMatrix([x, TAG_T / 2], z, P, "left")}" font-size="${size}" text-anchor="middle">${value}</text>`;
const frontLine = (points: Array<[number, number]>, closed = true) => k.pathOf(points.map(([x, z]) => k.iso([x, TAG_T / 2, z], P)), closed);

/** A node's tag at the world origin, facing the reader; the live code moves it with a translate. */
export function tagSvg(node: TreeNode) {
  const sub = node.sub ? text(node.sub, 0, -halfHeightOf(node) - 6.2, 4.6, "tg-sub") : "";
  const mark = (x: number, z: number) => (node.marked ? `<circle class="tg-mark" cx="${k.iso([x, TAG_T / 2, z], P)[0].toFixed(1)}" cy="${k.iso([x, TAG_T / 2, z], P)[1].toFixed(1)}" r="2"/>` : "");
  if (node.kind === "plate") {
    const half = halfWidthOf(node);
    const plan: k.Plan = { x: -half, y: -TAG_T / 2, w: half * 2, d: TAG_T, r: 1 };
    const rim: Array<[number, number]> = [[-half - 1.8, -PLATE_H / 2 - 1.8], [half + 1.8, -PLATE_H / 2 - 1.8], [half + 1.8, PLATE_H / 2 + 1.8], [-half - 1.8, PLATE_H / 2 + 1.8]];
    const size = Math.min(8.6, (CELL * 1.5) / Math.max(1, ...node.cells.map((cell) => cell.length)));
    const single = node.cells.length === 1;
    const width = single ? half * 2 - 3 : CELL;
    const fit = single ? Math.min(8.6, (width * 1.6) / node.cells[0]!.length) : size;
    const dividers = node.cells.slice(1).map((_, at) => frontLine([[-half + 1.5 + CELL * (at + 1), -PLATE_H / 2], [-half + 1.5 + CELL * (at + 1), PLATE_H / 2]], false));
    return [
      eye(PLATE_H / 2),
      `<path class="iso-line fig-rim" d="${frontLine(rim)}"/>`,
      S(k.slabOf(plan, -PLATE_H / 2, PLATE_H, P, 2), { tone: "hi", crease: "lo", className: "tg-body" }),
      L(dividers.join(""), { tone: "lo" }),
      ...node.cells.map((cell, at) => text(cell, single ? 0 : -half + 1.5 + CELL * (at + 0.5), -fit * 0.36, fit)),
      mark(half - 2.6, PLATE_H / 2 - 2.6),
      sub,
    ].join("");
  }
  const bead = node.kind === "bead";
  const radius = bead ? BEAD_R : COIN_R;
  const label = node.cells[0] ?? "";
  const size = bead ? 5 : label.length > 3 ? 6.2 : label.length > 2 ? 7.6 : 9.4;
  return [
    eye(radius),
    `<path class="iso-line fig-rim" d="${circle(radius + 1.6)}"/>`,
    S(bead ? BEAD : COIN, { tone: bead ? "mid" : "hi", crease: "lo", className: "tg-body" }),
    bead ? "" : L(circle(radius - 1.9), { tone: "lo" }),
    text(label, 0, -size * 0.36, size, bead ? "tg-bead" : "fig-key"),
    mark(radius * 0.62, radius * 0.62),
    sub,
  ].join("");
}

/** The string a node hangs by: from the rail, or from its port on the parent's lower edge, to the eye on top of it. */
export function stringSvg(node: TreeNode, seat: Seat, parent: Seat | null, parentPorts: number) {
  const to: k.Point3 = [seat.x, 0, seat.z + seat.halfH + EYE];
  let from: k.Point3 = [seat.x, 0, HOOK_Z];
  if (parent) {
    // Ports are spread along the parent's lower edge; a round tag keeps them close to its foot.
    const spread = Math.min(parent.halfW - 1.5, parentPorts > 2 ? parent.halfW - 1.5 : 4.5);
    const along = parentPorts > 1 ? -spread + (2 * spread * node.port) / (parentPorts - 1) : 0;
    const lift = parent.halfW === parent.halfH ? Math.sqrt(Math.max(0, parent.halfH ** 2 - along ** 2)) : parent.halfH;
    from = [parent.x + along, 0, parent.z - lift];
  }
  const line = L(k.segment(from, to, P), { tone: node.heavy ? "hi" : "mid", className: node.heavy ? "tg-string tg-heavy" : "tg-string" });
  if (!node.via) return line;
  const [mx, , mz] = [(from[0] + to[0]) / 2, 0, (from[2] + to[2]) / 2];
  const side = to[0] < from[0] ? -4.6 : 4.6;
  return line + `<text class="iso-face-text tg-via" transform="${k.sideMatrix([mx + side, 0], mz - 1.6, P, "left")}" font-size="5.8" text-anchor="middle">${node.via}</text>`;
}

export const POINTER_X = CENTRE;

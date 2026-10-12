import * as k from "../iso/iso-kit";
import { CELLS } from "./model";
import { BASE, BASE_H, BLOCK_D, BLOCK_H, BLOCK_W, FOOT_H, JACK_H, P, POST, SEAT_H, TOP, cellAt, type Side } from "./view";

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

const onFront = (points: Array<[number, number]>, y: number) => k.pathOf(points.map(([x, z]) => k.iso([x, y, z], P)), true);

function baseArt() {
  const parts: string[] = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    parts.push(S(k.cylinder(x, y, 7.5, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 5.6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  parts.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.5), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 3, P, 8), { tone: "faint" }) }));
  parts.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 9);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 1.9, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5, tone: "mid" }));
  return parts.join("");
}

/** A memory cell: the seat a block stands on, its locating pins, and its address on a plate in front. */
function cellArt(address: number) {
  const [x, y] = cellAt(address);
  const seat: k.Plan = { x: x - BLOCK_W / 2 - 3, y: y - BLOCK_D / 2 - 3, w: BLOCK_W + 6, d: BLOCK_D + 6, r: 3 };
  const plate: k.Plan = { x: x - 6, y: y + BLOCK_D / 2 + 5.5, w: 12, d: 9, r: 1.4 };
  return [
    S(k.slabOf(seat, 0, SEAT_H, P, 3), { tone: "lo", crease: "none" }),
    L(k.planOutline({ x: x - BLOCK_W / 2, y: y - BLOCK_D / 2, w: BLOCK_W, d: BLOCK_D, r: 2 }, SEAT_H, P, 3), { tone: "faint" }),
    D(k.corners(seat, 2.4).map(([px, py]) => k.iso([px, py, SEAT_H], P)), { size: 0.4, tone: "mid" }),
    S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "mid", crease: "none" }),
    k.faceTextSvg(k.topMatrix([x, plate.y + 6.9], 0.8, P), String(address), { size: 6.4, tone: "mid", anchor: "middle" }),
  ].join("");
}

/** The post the `first` pointer hangs from, with its one engraved label. */
function postArt() {
  const [x, y, top] = POST;
  const foot: k.Plan = { x: x - 9, y: y - 9, w: 18, d: 18, r: 2.5 };
  const plate: k.Plan = { x: x - 11, y: y + 13, w: 22, d: 9, r: 1.4 };
  return [
    S(k.slabOf(foot, 0, 1.6, P, 4, 0.4), { tone: "lo" }),
    D(k.corners(foot, 2.8).map(([px, py]) => k.iso([px, py, 1.6], P)), { size: 0.4, tone: "mid" }),
    S(k.cylinder(x, y, 5.4, 1.6, 2.6, P, 24, 0.4), { tone: "mid" }),
    S(k.cylinder(x, y, 3.4, 4.2, top - JACK_H - 4.2, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 3.4, 10, P, 14), { tone: "faint" }) }),
    S(k.cylinder(x, y, 2.4, top - JACK_H, JACK_H, P, 16), { tone: "hi" }),
    S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "mid", crease: "none" }),
    k.faceTextSvg(k.topMatrix([x, plate.y + 6.7], 0.8, P), "first", { size: 5.6, tone: "mid", anchor: "middle" }),
  ].join("");
}

function counterArt() {
  const box: k.Plan = { x: 8, y: 116, w: 34, d: 22, r: 2 };
  const face = box.y + box.d;
  const top = 12;
  const [wx0, wx1, wz0, wz1] = [box.x + 9.5, box.x + 24.5, 2.9, 9.6];
  const window = onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face);
  return [
    S(k.slabOf(box, 0, top, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(box, 1.6, P, 4), { tone: "faint" }) }),
    L(k.planOutline(k.insetPlan(box, 1.8), top, P, 4), { tone: "faint" }),
    D([k.iso([box.x + 4.5, box.y + 4.5, top], P), k.iso([box.x + 4.5, face - 4.5, top], P)], { size: 0.42, tone: "mid" }),
    S(k.cylinder(box.x + 24, box.y + 9, 3.2, top, 2.4, P, 20, 0.3), { tone: "mid" }),
    ribs(box.x + 24, box.y + 9, 3.2, top, top + 2.4, 22),
    L(k.lineOnTop([box.x + 24, box.y + 9], [box.x + 24, box.y + 12], top + 2.4, P), { tone: "hi" }),
    `<path class="pb-window" d="${window}"/>`,
    L(window, { tone: "lo" }),
    `<text class="iso-face-text pb-digits" data-part="updates" transform="${k.sideMatrix([(wx0 + wx1) / 2, face], 4.3, P, "left")}" font-size="5.4" text-anchor="middle">00</text>`,
  ].join("");
}

function labelPlate() {
  const plate: k.Plan = { x: BASE.w / 2 - 20, y: BASE.d - 14, w: 40, d: 8, r: 1.4 };
  const rules = [20, 28].map((length, row) => k.lineOnTop([plate.x + 3, plate.y + 2.6 + row * 2.4], [plate.x + 3 + length, plate.y + 2.6 + row * 2.4], 0.8, P)).join("");
  return [
    S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 4), { tone: "faint" }),
    L(rules, { tone: "lo", free: true }),
    D([k.iso([plate.x + plate.w - 2.6, plate.y + 2.6, 0.8], P), k.iso([plate.x + plate.w - 2.6, plate.y + plate.d - 2.6, 0.8], P)], { size: 0.42, tone: "mid" }),
  ].join("");
}

/** Cells in painter's order: back row first, and within a row from the far end. */
export const CELL_ORDER = Array.from({ length: CELLS }, (_, index) => index + 1).sort((a, b) => {
  const [ax, ay] = cellAt(a);
  const [bx, by] = cellAt(b);
  return k.depthOf([ax, ay, 0], P) - k.depthOf([bx, by, 0], P);
});

/** Everything the blocks stand on. */
export const BACK = [baseArt(), postArt(), ...CELL_ORDER.map(cellArt), labelPlate(), counterArt()].join("");

/**
 * A node block in its cell: a data plate with the word, a window showing the address it links to,
 * and a jack at each corner it uses. The word and the address are filled in by the live code.
 */
export function blockSvg(address: number, doubly: boolean) {
  const [x, y] = cellAt(address);
  const plan: k.Plan = { x: x - BLOCK_W / 2, y: y - BLOCK_D / 2, w: BLOCK_W, d: BLOCK_D, r: 2 };
  const jack = (dx: number, dy: number, tone: k.Tone) => S(k.cylinder(x + dx, y + dy, 2.4, TOP, JACK_H, P, 14), { tone });
  const window: k.Plan = { x: x + 9, y: y - 7, w: 11, d: 8.4, r: 1 };
  const corners: Array<[number, number, k.Tone]> = doubly
    ? [
        [-19, -11, "hi"],
        [19, -11, "mid"],
        [-19, 11, "mid"],
        [19, 11, "hi"],
      ]
    : [
        [-19, 11, "mid"],
        [19, 11, "hi"],
      ];
  return [
    `<path class="iso-line pb-rim" d="${k.planOutline(k.insetPlan(plan, -2.2), SEAT_H, P, 3)}"/>`,
    S(k.slabOf(plan, SEAT_H, BLOCK_H, P, 3, 0.7), { tone: "hi", crease: "lo", className: "pb-body", inner: L(k.sideSeam(plan, SEAT_H + 2, P, 3), { tone: "faint" }) }),
    L(k.lineOnTop([x + 6, plan.y], [x + 6, plan.y + BLOCK_D], TOP, P), { tone: "faint" }),
    `<path class="pb-window" d="${k.planOutline(window, TOP, P, 3)}"/>`,
    L(k.planOutline(window, TOP, P, 3), { tone: "lo" }),
    `<text class="iso-face-text pb-word" data-part="word" transform="${k.topMatrix([x - 7, y + 1.6], TOP, P)}" font-size="8.4" text-anchor="middle"></text>`,
    `<text class="iso-face-text pb-link" data-part="link" transform="${k.topMatrix([x + 14.5, y - 0.2], TOP, P)}" font-size="6.6" text-anchor="middle"></text>`,
    ...corners.map(([dx, dy, tone]) => jack(dx, dy, tone)),
    `<path class="pb-hit" data-word="" d="${k.slabOf(plan, SEAT_H, BLOCK_H + JACK_H, P, 3).fill}"/>`,
  ].join("");
}

/** A patch cord from a jack to wherever its far plug is now: it rises, sags a little, and comes down. */
export function cordSvg(from: k.Point3, to: k.Point3, side: Side) {
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  if (distance < 0.5) return "";
  const lift = 9 + distance * 0.1;
  // Back links arch away from the reader and forward links toward, so a pair between two blocks does not overlap.
  const lean = side === "next" ? 7 : -7;
  const points: k.Flat[] = [];
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const bulge = 4 * t * (1 - t);
    points.push(k.iso([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + lean * bulge, from[2] + (to[2] - from[2]) * t + lift * bulge], P));
  }
  const [sx, sy] = points[0]!;
  const [ex, ey] = points[points.length - 1]!;
  return `<path class="iso-line pb-cord" data-side="${side}" d="${k.pathOf(points)}"/><circle class="pb-plug" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.9"/><circle class="pb-plug" data-end="" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.3"/>`;
}

import * as k from "../iso/iso-kit";
import { LEVELS, SEATS, levelOf, type End, type RackKind } from "./model";
import {
  BASE,
  BASE_H,
  FOOT_H,
  GAUGE_H,
  GAUGE_X,
  GAUGE_Y,
  P,
  PAD,
  RACK_D,
  RACK_W,
  RISE,
  SEAT_H,
  SEAT_R,
  TOP,
  TRAYS,
  TRAY_FLOOR,
  TRAY_SLOTS,
  TRAY_WALL,
  TREAD,
  WEIGHT_R,
  heightOf,
  seatAt,
  tierTop,
  trayAt,
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
function ribs(cx: number, cy: number, radius: number, z0: number, z1: number, count: number, tone: k.LineTone = "lo") {
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
  return k.fadedSvg(list, { tone });
}

/** A closed outline on a face of constant y, in (x, z) points. */
const onFront = (points: Array<[number, number]>, y: number) => k.pathOf(points.map(([x, z]) => k.iso([x, y, z], P)), true);

// ---------------------------------------------------------------------------
// Base plate on feet
// ---------------------------------------------------------------------------

function baseArt() {
  const parts: string[] = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 24))) {
    parts.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    parts.push(S(k.cylinder(x, y, 6, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  parts.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 3, P, 8), { tone: "faint" }) }));
  parts.push(L(k.planOutline(k.insetPlan(BASE, 4.5), 0, P), { tone: "lo" }));
  const screws = k.corners(BASE, 9);
  parts.push(L(screws.map(([x, y]) => k.ring(x, y, 1.9, 0, P, 16)).join(""), { tone: "lo" }));
  parts.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5, tone: "mid" }));
  return parts.join("");
}

// ---------------------------------------------------------------------------
// The step block: four tiers, their seats, tracks, role plates and fasteners
// ---------------------------------------------------------------------------

type Role = "min" | "max" | "none";

function roleOf(kind: RackKind, level: number, side: "left" | "right"): Role {
  if (kind === "max") return "max";
  if (kind === "minmax") return level % 2 === 0 ? "min" : "max";
  if (level === 0) return "none";
  return side === "left" ? "min" : "max";
}

/** An engraved mark: apex toward the reader for the low end, away for the high end, a slot for neither. */
function glyph(role: Role, cx: number, cy: number, z: number, size: number) {
  if (role === "none") return L(k.planOutline({ x: cx - size, y: cy - 0.9, w: size * 2, d: 1.8, r: 0.9 }, z, P, 4), { tone: "lo" });
  const turn = role === "min" ? 1 : -1;
  const points: k.Plane[] = [
    [cx - size, cy - size * 1.15 * turn],
    [cx + size, cy - size * 1.15 * turn],
    [cx, cy + size * 1.25 * turn],
  ];
  return L(k.onTop(points, z, P, true), { tone: "hi" });
}

function rolePlate(role: Role, x: number, cy: number, z: number) {
  const plan: k.Plan = { x, y: cy - 8, w: 12, d: 16, r: 1.5 };
  return [
    S(k.slabOf(plan, z, 1, P, 3), { tone: "mid", crease: "none" }),
    L(k.planOutline(k.insetPlan(plan, 1.2), z + 1, P, 3), { tone: "faint" }),
    glyph(role, x + 6, cy, z + 1, 2.9),
    D([k.iso([x + 6, cy - 6.3, z + 1], P), k.iso([x + 6, cy + 6.3, z + 1], P)], { size: 0.42, tone: "mid" }),
  ].join("");
}

function seatArt(seat: number) {
  const [x, y, top] = seatAt(seat);
  const pins: k.Flat[] = [30, 150, 270].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return k.iso([x + (SEAT_R - 1.1) * Math.cos(angle), y + (SEAT_R - 1.1) * Math.sin(angle), top], P);
  });
  return [
    S(k.cylinder(x, y, SEAT_R, top - SEAT_H, SEAT_H, P, 40), { tone: "lo", crease: "none" }),
    L(k.ring(x, y, WEIGHT_R, top, P, 40), { tone: "faint" }),
    `<path class="iso-line hr-seat" data-seat="${seat}" d="${k.ring(x, y, SEAT_R - 0.2, top, P, 40)}"/>`,
    D(pins, { size: 0.4, tone: "mid" }),
  ].join("");
}

/** The inlaid track from a seat to its two children: down its tread, down the riser, along a bus to each child. */
function trackOf(seat: number) {
  const [px, py, top] = seatAt(seat);
  const [leftX, childY, below] = seatAt(2 * seat + 1);
  const [rightX] = seatAt(2 * seat + 2);
  const level = levelOf(seat);
  const edge = (level + 1) * TREAD;
  const z = top - SEAT_H;
  const lower = below - SEAT_H;
  const bus = edge + 4.5;
  const reach = childY - SEAT_R;
  return {
    upper: k.onTop([[px, py + SEAT_R], [px, edge]], z, P),
    drop: k.rise([px, edge], lower, z, P),
    lower:
      k.onTop([[px, edge], [px, bus]], lower, P) +
      k.onTop([[leftX, reach], [leftX, bus], [rightX, bus], [rightX, reach]], lower, P),
  };
}

/** A lifting handle on the end face of the top step. */
function handleArt() {
  const z = TOP - 26;
  const post = (y: number) => S(k.slabOf({ x: RACK_W, y, w: 4.6, d: 3, r: 0.8 }, z, 3, P, 2), { tone: "mid", crease: "none" });
  return [post(9), S(k.slabOf({ x: RACK_W + 3, y: 7, w: 3, d: 26, r: 1.4 }, z - 0.4, 3.8, P, 3, 0.4), { tone: "mid" }), post(28)].join("");
}

function gaugeArt(end: End) {
  const x = GAUGE_X[end];
  const y = GAUGE_Y;
  const post: k.Plan = { x: x - 3.4, y: y - 3, w: 6.8, d: 6, r: 0.6 };
  const face = y + 3;
  const minor: string[] = [];
  const major: string[] = [];
  for (let count = 0; count <= 100; count += 10) {
    const z = TOP + SEAT_H + heightOf(count);
    const big = count % 50 === 0;
    (big ? major : minor).push(k.segment([x - 3.3, face, z], [x - 3.3 + (big ? 4.6 : 2.6), face, z], P));
  }
  return [
    S(k.cylinder(x, y, 5.6, TOP, 2, P, 28, 0.4), { tone: "mid" }),
    S(k.slabOf(post, TOP + 2, GAUGE_H, P, 2), { tone: "mid", crease: "none" }),
    L(minor.join(""), { tone: "lo" }),
    L(major.join(""), { tone: "mid" }),
    S(k.cylinder(x, y, 4.3, TOP + 2 + GAUGE_H, 1.6, P, 24, 0.4), { tone: "mid" }),
  ].join("");
}

/** The slider of a height gauge, built resting on the post's collar; the live code lifts it. */
function riderArt(end: End) {
  const x = GAUGE_X[end];
  const y = GAUGE_Y + 3;
  const z = TOP + 2;
  const block = S(k.slabOf({ x: x - 6, y, w: 12, d: 5, r: 1.2 }, z, 4, P, 3, 0.5), { tone: "hi", crease: "lo" });
  const index = L(k.lineOnTop([x - 5.8, y + 2.5], [x + 5.8, y + 2.5], z + 4, P), { tone: "hi" });
  const knobX = end === "low" ? x - 3.3 : x + 3.3;
  const knob = S(k.cylinder(knobX, y + 2.5, 1.9, z + 4, 2.6, P, 16), { tone: "mid" }) + ribs(knobX, y + 2.5, 1.9, z + 4, z + 6.6, 16);
  const arm = S(k.slabOf({ x: end === "low" ? x + 6 : x - 17, y: y + 1.5, w: 11, d: 2, r: 0.8 }, z + 2.2, 1.4, P, 2), { tone: "hi", crease: "none" });
  const order = end === "low" ? [block, index, knob, arm] : [arm, block, index, knob];
  return `<g data-part="rider-${end}">${order.join("")}</g>`;
}

function counterArt() {
  const box: k.Plan = { x: 62, y: 9, w: 40, d: 22, r: 2 };
  const face = box.y + box.d;
  const top = TOP + 13;
  const [wx0, wx1, wz0, wz1] = [74.5, 89.5, TOP + 3.2, TOP + 10];
  const text = `<text class="iso-face-text hr-digits" data-part="hops" transform="${k.sideMatrix([(wx0 + wx1) / 2, face], TOP + 4.7, P, "left")}" font-size="5.4" text-anchor="middle">00</text>`;
  return [
    S(k.slabOf(box, TOP, 13, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(box, TOP + 1.6, P, 4), { tone: "faint" }) }),
    L(k.planOutline(k.insetPlan(box, 1.8), top, P, 4), { tone: "faint" }),
    D([k.iso([box.x + 4.5, box.y + 4.5, top], P), k.iso([box.x + 4.5, face - 4.5, top], P)], { size: 0.42, tone: "mid" }),
    S(k.cylinder(92, 20, 3.2, top, 2.4, P, 20, 0.3), { tone: "mid" }),
    ribs(92, 20, 3.2, top, top + 2.4, 22),
    L(k.lineOnTop([92, 20], [92, 23], top + 2.4, P), { tone: "hi" }),
    `<path class="hr-window" d="${onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face)}"/>`,
    L(onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face), { tone: "lo" }),
    text,
  ].join("");
}

function labelPlate(plan: k.Plan, z: number, rules: number[]) {
  const lines = rules
    .map((length, row) => k.lineOnTop([plan.x + 3, plan.y + 2.6 + row * 2.1], [plan.x + 3 + length, plan.y + 2.6 + row * 2.1], z + 0.8, P))
    .join("");
  return [
    S(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 4), { tone: "faint" }),
    L(lines, { tone: "lo", free: true }),
    D([k.iso([plan.x + plan.w - 2.6, plan.y + 2.6, z + 0.8], P), k.iso([plan.x + plan.w - 2.6, plan.y + plan.d - 2.6, z + 0.8], P)], { size: 0.42, tone: "mid" }),
  ].join("");
}

function rackArt(kind: RackKind) {
  const tracks = Array.from({ length: (SEATS - 1) / 2 }, (_, seat) => ({ level: levelOf(seat), ...trackOf(seat) }));
  const parts: string[] = [];
  for (let level = 0; level < LEVELS; level++) {
    const plan: k.Plan = { x: 0, y: level * TREAD, w: RACK_W, d: TREAD, r: 1.2 };
    const top = tierTop(level);
    const front = plan.y + TREAD;
    const mid = plan.y + TREAD / 2;
    const seams = k.sideSeam(plan, 3, P, 2) + k.sideSeam(plan, top - 2.6, P, 2);
    parts.push(S(k.slabOf(plan, 0, top, P, 2, 0.8), { tone: "mid", inner: L(seams, { tone: "faint" }) }));
    if (level === 0) parts.push(handleArt());

    // Tread: tracks first, so seats and plates sit on them.
    parts.push(L(tracks.filter((track) => track.level === level - 1).map((track) => track.lower).join(""), { tone: "mid", className: "hr-track" }));
    parts.push(L(tracks.filter((track) => track.level === level).map((track) => track.upper).join(""), { tone: "mid", className: "hr-track" }));
    for (let seat = 2 ** level - 1; seat < 2 ** (level + 1) - 1; seat++) parts.push(seatArt(seat));
    parts.push(rolePlate(roleOf(kind, level, "left"), 4, mid, top));
    parts.push(rolePlate(roleOf(kind, level, "right"), RACK_W - 16, mid, top));

    if (level === 0) {
      parts.push(gaugeArt("low"), riderArt("low"));
      parts.push(counterArt());
      parts.push(labelPlate({ x: 198, y: 13, w: 40, d: 14, r: 1.5 }, top, [22, 30, 16, 26]));
      parts.push(gaugeArt("high"), riderArt("high"));
      if (kind === "deap") {
        const [x, y, z] = seatAt(0);
        parts.push(S(k.cylinder(x, y, WEIGHT_R, z, 2.4, P, 40, 0.7), { tone: "mid" }));
        parts.push(ribs(x, y, WEIGHT_R, z, z + 2.4, 44));
        parts.push(L(k.ring(x, y, 7.4, z + 2.4, P, 32), { tone: "lo" }));
        parts.push(L(k.lineOnTop([x - 7.4, y], [x + 7.4, y], z + 2.4, P), { tone: "mid" }));
      }
    }

    // Riser: the drops of this tier's tracks, and a countersunk screw at each end.
    parts.push(L(tracks.filter((track) => track.level === level).map((track) => track.drop).join(""), { tone: "mid", className: "hr-track" }));
    for (let seat = 2 ** level - 1; seat < 2 ** (level + 1) - 1; seat++) {
      const [x] = seatAt(seat);
      parts.push(k.faceTextSvg(k.sideMatrix([x + 2.4, front], top - 11.4, P, "left"), String(seat + 1), { size: 4.6, tone: "lo" }));
    }
    const screwZ = top - RISE / 2;
    const screws: k.Point3[] = [
      [7, front, screwZ],
      [RACK_W - 7, front, screwZ],
    ];
    parts.push(L(screws.map((point) => k.sideRing(point, 1.7, "y", P, 14)).join(""), { tone: "lo" }));
    parts.push(D(k.pointsAt(screws, P), { size: 0.45, tone: "mid" }));

    // End face: a dowel pin.
    const pin: k.Point3 = [RACK_W, mid, top - RISE / 2];
    parts.push(L(k.sideRing(pin, 2.3, "x", P, 16), { tone: "lo" }));
    parts.push(D([k.iso(pin, P)], { size: 0.5, tone: "mid" }));
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Trays, the loading pad and the plates on the base's front strip
// ---------------------------------------------------------------------------

const WALL_H = 5.5;

function trayWalls(end: End) {
  const tray = TRAYS[end];
  const wall = (plan: k.Plan) => S(k.slabOf(plan, 0, WALL_H, P, 2, 0.3), { tone: "mid" });
  return {
    back: wall({ x: tray.x, y: tray.y, w: tray.w, d: TRAY_WALL, r: 0.6 }),
    left: wall({ x: tray.x, y: tray.y, w: TRAY_WALL, d: tray.d, r: 0.6 }),
    right: wall({ x: tray.x + tray.w - TRAY_WALL, y: tray.y, w: TRAY_WALL, d: tray.d, r: 0.6 }),
    front: wall({ x: tray.x, y: tray.y + tray.d - TRAY_WALL, w: tray.w, d: TRAY_WALL, r: 0.6 }),
  };
}

function trayBack(end: End) {
  const tray = TRAYS[end];
  const walls = trayWalls(end);
  const slots = Array.from({ length: TRAY_SLOTS }, (_, slot) => trayAt(end, slot));
  return [
    S(k.slabOf(tray, 0, TRAY_FLOOR, P, 2), { tone: "lo", crease: "none" }),
    L(slots.map(([x, y, z]) => k.ring(x, y, WEIGHT_R + 0.6, z, P, 36)).join(""), { tone: "faint" }),
    D(slots.map((slot) => k.iso(slot, P)), { size: 0.4, tone: "lo" }),
    walls.back,
    walls.left,
  ].join("");
}

function trayFront(end: End) {
  const walls = trayWalls(end);
  return walls.right + walls.front;
}

function padArt() {
  const [x, y] = PAD;
  const ticks = k.radialTicks(x, y, 15.7, 36, 3, 2, [1.1, 2.1], P);
  return [
    S(k.cylinder(x, y, 16, 0, 2, P, 48, 0.3), { tone: "lo" }),
    ribs(x, y, 16, 0, 2, 64),
    L(ticks.minor, { tone: "lo" }),
    L(ticks.major, { tone: "mid" }),
    S(k.cylinder(x, y, 13.3, 2, 1.4, P, 44, 0.5), { tone: "mid" }),
    L(k.ring(x, y, WEIGHT_R, 3.4, P, 40), { tone: "faint" }),
    D([k.iso([x, y, 3.4], P)], { size: 0.5, tone: "mid" }),
  ].join("");
}

function stripArt() {
  const y = TRAYS.low.y + TRAYS.low.d + 2.6;
  const mark = (role: Role, x: number) => {
    const plan: k.Plan = { x, y, w: 14, d: 8, r: 1.4 };
    return [
      S(k.slabOf(plan, 0, 0.8, P, 3), { tone: "mid", crease: "none" }),
      L(k.planOutline(k.insetPlan(plan, 1.1), 0.8, P, 3), { tone: "faint" }),
      glyph(role, x + 7, y + 4, 0.8, 2.1),
      D([k.iso([x + 2.2, y + 4, 0.8], P), k.iso([x + 11.8, y + 4, 0.8], P)], { size: 0.4, tone: "mid" }),
    ].join("");
  };
  const lowX = TRAYS.low.x + TRAYS.low.w / 2 - 7;
  const highX = TRAYS.high.x + TRAYS.high.w / 2 - 7;
  return [mark("min", lowX), labelPlate({ x: PAD[0] - 20, y, w: 40, d: 8, r: 1.4 }, 0, [20, 28]), mark("max", highX)].join("");
}

function hitArt() {
  const area = (act: string, d: string) => `<path class="hr-hit" data-act="${act}" d="${d}"/>`;
  return [
    area("low", k.slabOf(TRAYS.low, 0, WALL_H, P, 2).fill),
    area("high", k.slabOf(TRAYS.high, 0, WALL_H, P, 2).fill),
    area("load", k.cylinder(PAD[0], PAD[1], 17, 0, 6, P, 24).fill),
  ].join("");
}

// ---------------------------------------------------------------------------

export interface RackArt {
  /** Everything the weights stand on or in front of. */
  back: string;
  /** Tray walls nearer than the weights, and the pointer targets. */
  front: string;
}

/**
 * The array the tree is stored in, as a strip of fifteen windows along the front of the base:
 * window i shows the key in seat i, and its index is engraved in front of it.
 */
function arrayArt() {
  const cell = 19.6;
  const x0 = (RACK_W - cell * SEATS) / 2;
  const y = RACK_D + 20;
  const strip: k.Plan = { x: x0 - 4, y: y - 3, w: cell * SEATS + 8, d: 26, r: 2 };
  const parts: string[] = [S(k.slabOf(strip, 0, 2, P, 4, 0.5), { tone: "mid" })];
  for (let seat = 0; seat < SEATS; seat++) {
    const window: k.Plan = { x: x0 + seat * cell + 1.6, y, w: cell - 3.2, d: 11, r: 1 };
    const cx = window.x + window.w / 2;
    parts.push(`<path class="fig-window hr-cell" data-cell-box="${seat}" d="${k.planOutline(window, 2, P, 3)}"/>`);
    parts.push(L(k.planOutline(window, 2, P, 3), { tone: "lo" }));
    parts.push(`<text class="iso-face-text hr-cell-text" data-cell="${seat}" transform="${k.topMatrix([cx, y + 8.6], 2, P)}" font-size="7" text-anchor="middle"></text>`);
    parts.push(k.faceTextSvg(k.topMatrix([cx, y + 18.6], 2, P), String(seat + 1), { size: 4.6, tone: "lo", anchor: "middle" }));
  }
  return parts.join("");
}

const CACHE = new Map<RackKind, RackArt>();

export function artOf(kind: RackKind): RackArt {
  let art = CACHE.get(kind);
  if (!art) {
    // Heap sort draws from neither end, so its base carries the array strip where the trays would be.
    art =
      kind === "max"
        ? { back: [baseArt(), rackArt(kind), arrayArt()].join(""), front: "" }
        : {
            back: [baseArt(), rackArt(kind), trayBack("low"), trayBack("high"), padArt(), stripArt()].join(""),
            front: [trayFront("low"), trayFront("high"), hitArt()].join(""),
          };
    CACHE.set(kind, art);
  }
  return art;
}

/** A turned test weight standing at the world origin; the live code moves it with a translate. */
export function weightSvg(value: number) {
  const height = heightOf(value);
  const body = k.cylinder(0, 0, WEIGHT_R, 0, height, P, 44, 0.9);
  const inner = L(k.sideArc(0, 0, WEIGHT_R, 2, P, 28) + k.sideArc(0, 0, WEIGHT_R, height - 2.6, P, 28), { tone: "faint" });
  return [
    S(body, { tone: "hi", crease: "lo", className: "hr-body", inner: inner + ribs(0, 0, WEIGHT_R, height - 2.6, height, 40) }),
    L(k.ring(0, 0, WEIGHT_R - 2.4, height, P, 36), { tone: "lo" }),
    `<text class="iso-face-text hr-key" transform="${k.topMatrix([0, 2.9], height, P)}" font-size="8.6" text-anchor="middle">${value}</text>`,
  ].join("");
}

/** How far a gauge's slider rises above its rest on the collar to read a key. */
export const riderLift = (value: number | null) => (value === null ? 0 : SEAT_H + heightOf(value) - 6);

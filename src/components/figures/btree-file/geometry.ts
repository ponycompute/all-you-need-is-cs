import * as k from "../iso/iso-kit";
import { LEAST, LEAVES, MOST, ROOT, SLOTS } from "./model";
import {
  BASE,
  BASE_H,
  BIN,
  BIN_SLOTS,
  BLOCK_W,
  CARD_H,
  CARD_T,
  CARD_W,
  FEED,
  FOOT_H,
  LOWER_D,
  LOWER_TOP,
  P,
  SLOT,
  TRAY_D,
  TRAY_FLOOR,
  TRAY_W,
  UPPER_D,
  UPPER_TOP,
  binAt,
  slotAt,
  trayOf,
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
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
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

const WALL = 2;
const WALL_H = 5;
const LIP_H = 3.2;

function trayWalls(plan: k.Plan, z: number) {
  const wall = (part: k.Plan, height: number) => S(k.slabOf(part, z, height, P, 2, 0.3), { tone: "mid" });
  return {
    back: wall({ x: plan.x, y: plan.y, w: plan.w, d: WALL, r: 0.5 }, WALL_H),
    left: wall({ x: plan.x, y: plan.y, w: WALL, d: plan.d, r: 0.5 }, WALL_H),
    right: wall({ x: plan.x + plan.w - WALL, y: plan.y, w: WALL, d: plan.d, r: 0.5 }, LIP_H),
    front: wall({ x: plan.x, y: plan.y + plan.d - WALL, w: plan.w, d: WALL, r: 0.5 }, LIP_H),
  };
}

/** A page's tray: its floor with one slot per card, the overflow slot ringed, and the least-fill mark. */
function trayBack(page: number) {
  const tray = trayOf(page);
  const walls = trayWalls(tray, tray.z);
  const top = tray.z + TRAY_FLOOR;
  const slots: string[] = [];
  for (let slot = 0; slot < SLOTS; slot++) {
    const [x, y] = slotAt(page, slot);
    slots.push(k.planOutline({ x: x - CARD_W / 2 - 0.4, y: y - CARD_T / 2 - 0.5, w: CARD_W + 0.8, d: CARD_T + 1, r: 0.5 }, top, P, 2));
  }
  const [ox, oy] = slotAt(page, MOST);
  const overflow = k.planOutline({ x: ox - CARD_W / 2 - 1.4, y: oy - 5.2, w: CARD_W + 2.8, d: 10.4, r: 1.2 }, top, P, 3);
  // The floor line a page other than the root must stay filled up to.
  const least = page === ROOT ? "" : L(k.lineOnTop([tray.x + 3 + SLOT * LEAST, tray.y + WALL], [tray.x + 3 + SLOT * LEAST, tray.y + TRAY_D - WALL], top, P), { tone: "mid" });
  return [
    S(k.slabOf(tray, tray.z, TRAY_FLOOR, P, 2), { tone: "lo", crease: "none" }),
    L(slots.slice(0, MOST).join(""), { tone: "faint" }),
    L(overflow, { tone: "lo", dashed: true }),
    least,
    walls.back,
    walls.left,
  ].join("");
}

function trayFront(page: number) {
  const tray = trayOf(page);
  const walls = trayWalls(tray, tray.z);
  const rim = k.planOutline({ ...k.insetPlan(tray, -1.2), r: 1.6 }, tray.z, P, 3);
  return `${walls.right}${walls.front}<path class="iso-line bf-tray" data-page="${page}" d="${rim}"/>`;
}

/** The inlaid track from each child port on the root's tray to its leaf tray. */
function trackOf(child: number) {
  const root = trayOf(ROOT);
  const leaf = trayOf(child);
  const port = root.x + 3 + SLOT * child;
  const lane = root.y + TRAY_D + 3 + 3 * (2 - Math.abs(child - 2));
  const x = leaf.x + TRAY_W / 2;
  return {
    upper: k.onTop([[port, root.y + TRAY_D], [port, lane], [x, lane], [x, UPPER_D]], UPPER_TOP, P),
    drop: k.rise([x, UPPER_D], LOWER_TOP, UPPER_TOP, P),
    lower: k.onTop([[x, UPPER_D], [x, leaf.y]], LOWER_TOP, P),
    port: k.iso([port, root.y + TRAY_D + 1.2, UPPER_TOP], P),
  };
}

function counterArt() {
  const box: k.Plan = { x: 34, y: 10, w: 40, d: 22, r: 2 };
  const face = box.y + box.d;
  const top = UPPER_TOP + 13;
  const [wx0, wx1, wz0, wz1] = [box.x + 12.5, box.x + 27.5, UPPER_TOP + 3.2, UPPER_TOP + 10];
  const window = onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face);
  return [
    S(k.slabOf(box, UPPER_TOP, 13, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(box, UPPER_TOP + 1.6, P, 4), { tone: "faint" }) }),
    L(k.planOutline(k.insetPlan(box, 1.8), top, P, 4), { tone: "faint" }),
    D([k.iso([box.x + 4.5, box.y + 4.5, top], P), k.iso([box.x + 4.5, face - 4.5, top], P)], { size: 0.42, tone: "mid" }),
    S(k.cylinder(box.x + 30, box.y + 11, 3.2, top, 2.4, P, 20, 0.3), { tone: "mid" }),
    ribs(box.x + 30, box.y + 11, 3.2, top, top + 2.4, 22),
    L(k.lineOnTop([box.x + 30, box.y + 11], [box.x + 30, box.y + 14], top + 2.4, P), { tone: "hi" }),
    `<path class="bf-window" d="${window}"/>`,
    L(window, { tone: "lo" }),
    `<text class="iso-face-text bf-digits" data-part="reads" transform="${k.sideMatrix([(wx0 + wx1) / 2, face], UPPER_TOP + 4.7, P, "left")}" font-size="5.4" text-anchor="middle">00</text>`,
  ].join("");
}

function labelPlate(plan: k.Plan, z: number, rules: number[]) {
  const lines = rules
    .map((length, row) => k.lineOnTop([plan.x + 3, plan.y + 2.6 + row * 2.2], [plan.x + 3 + length, plan.y + 2.6 + row * 2.2], z + 0.8, P))
    .join("");
  return [
    S(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 4), { tone: "faint" }),
    L(lines, { tone: "lo", free: true }),
    D([k.iso([plan.x + plan.w - 2.6, plan.y + 2.6, z + 0.8], P), k.iso([plan.x + plan.w - 2.6, plan.y + plan.d - 2.6, z + 0.8], P)], { size: 0.42, tone: "mid" }),
  ].join("");
}

function blockArt() {
  const tracks = Array.from({ length: LEAVES }, (_, child) => trackOf(child));
  const upper: k.Plan = { x: 0, y: 0, w: BLOCK_W, d: UPPER_D, r: 1.2 };
  const lower: k.Plan = { x: 0, y: UPPER_D, w: BLOCK_W, d: LOWER_D, r: 1.2 };
  const tier = (plan: k.Plan, top: number) =>
    S(k.slabOf(plan, 0, top, P, 2, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, 3, P, 2) + k.sideSeam(plan, top - 2.6, P, 2), { tone: "faint" }) });
  const fasteners = (y: number, z: number, x: number) => {
    const screws: k.Point3[] = [
      [7, y, z],
      [BLOCK_W - 7, y, z],
    ];
    const pin: k.Point3 = [BLOCK_W, x, z];
    return [
      L(screws.map((point) => k.sideRing(point, 1.7, "y", P, 14)).join(""), { tone: "lo" }),
      D(k.pointsAt(screws, P), { size: 0.45, tone: "mid" }),
      L(k.sideRing(pin, 2.3, "x", P, 16), { tone: "lo" }),
      D([k.iso(pin, P)], { size: 0.5, tone: "mid" }),
    ].join("");
  };
  const handleZ = UPPER_TOP - 20;
  const post = (y: number) => S(k.slabOf({ x: BLOCK_W, y, w: 4.6, d: 3, r: 0.8 }, handleZ, 3, P, 2), { tone: "mid", crease: "none" });
  return [
    tier(upper, UPPER_TOP),
    post(10),
    S(k.slabOf({ x: BLOCK_W + 3, y: 8, w: 3, d: 26, r: 1.4 }, handleZ - 0.4, 3.8, P, 3, 0.4), { tone: "mid" }),
    post(29),
    L(tracks.map((track) => track.upper).join(""), { tone: "mid", className: "bf-track" }),
    D(tracks.map((track) => track.port), { size: 0.6, tone: "hi" }),
    counterArt(),
    trayBack(ROOT),
    labelPlate({ x: BLOCK_W - 78, y: 14, w: 40, d: 14, r: 1.5 }, UPPER_TOP, [22, 30, 16, 26]),
    L(tracks.map((track) => track.drop).join(""), { tone: "mid", className: "bf-track" }),
    fasteners(UPPER_D, (UPPER_TOP + LOWER_TOP) / 2, UPPER_D / 2),
    tier(lower, LOWER_TOP),
    L(tracks.map((track) => track.lower).join(""), { tone: "mid", className: "bf-track" }),
    ...Array.from({ length: LEAVES }, (_, page) => trayBack(page)),
    ...Array.from({ length: LEAVES }, (_, page) =>
      k.faceTextSvg(k.sideMatrix([trayOf(page).x + 2, UPPER_D + LOWER_D], LOWER_TOP - 10.6, P, "left"), String(page + 1), { size: 4.6, tone: "lo" }),
    ),
    fasteners(UPPER_D + LOWER_D, LOWER_TOP / 2, UPPER_D + LOWER_D / 2),
  ].join("");
}

/** The feed a new card stands in, and the bin discarded cards go to, on the base's front strip. */
function stripArt() {
  const [fx, fy] = FEED;
  const block: k.Plan = { x: fx - 9, y: fy - 5, w: 18, d: 10, r: 1.6 };
  const slot: k.Plan = { x: fx - CARD_W / 2 - 0.6, y: fy - CARD_T / 2 - 0.6, w: CARD_W + 1.2, d: CARD_T + 1.2, r: 0.6 };
  const bin = trayWalls(BIN, 0);
  const slots = Array.from({ length: BIN_SLOTS }, (_, at) => binAt(at));
  return {
    back: [
      S(k.slabOf(block, 0, 6, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 1.6, P, 3), { tone: "faint" }) }),
      L(k.planOutline(slot, 6, P, 3), { tone: "lo" }),
      labelPlate({ x: BLOCK_W / 2 - 20, y: fy - 4, w: 40, d: 8, r: 1.4 }, 0, [20, 28]),
      S(k.slabOf(BIN, 0, TRAY_FLOOR, P, 2), { tone: "lo", crease: "none" }),
      L(slots.map(([x, y]) => k.planOutline({ x: x - CARD_W / 2 - 0.4, y: y - CARD_T / 2 - 0.5, w: CARD_W + 0.8, d: CARD_T + 1, r: 0.5 }, TRAY_FLOOR, P, 2)).join(""), { tone: "faint" }),
      bin.back,
      bin.left,
    ].join(""),
    front: bin.right + bin.front,
    hit: `<path class="bf-hit" data-act="load" d="${k.slabOf({ x: fx - 13, y: fy - 9, w: 26, d: 18, r: 2 }, 0, 22, P, 3).fill}"/>`,
  };
}

const strip = stripArt();
const pages = [ROOT, ...Array.from({ length: LEAVES }, (_, page) => page)];

/** Everything the cards stand in or in front of. */
export const BACK = [baseArt(), blockArt(), strip.back].join("");
/** Tray walls nearer than the cards, the trays' rims, and the pointer target. */
export const FRONT_ART = [...pages.map(trayFront), strip.front, strip.hit].join("");

/** A key card standing at the world origin, facing the reader; the live code moves it with a translate. */
export function cardSvg(key: number) {
  const plan: k.Plan = { x: -CARD_W / 2, y: -CARD_T / 2, w: CARD_W, d: CARD_T, r: 0.5 };
  const face = CARD_T / 2;
  const edge = onFront(
    [
      [-CARD_W / 2 + 1.1, 1.2],
      [CARD_W / 2 - 1.1, 1.2],
      [CARD_W / 2 - 1.1, CARD_H - 1.2],
      [-CARD_W / 2 + 1.1, CARD_H - 1.2],
    ],
    face,
  );
  return [
    S(k.slabOf(plan, 0, CARD_H, P, 2), { tone: "hi", crease: "lo", className: "bf-body" }),
    L(edge, { tone: "faint" }),
    `<text class="iso-face-text bf-key" transform="${k.sideMatrix([0, face], 4.1, P, "left")}" font-size="6.6" text-anchor="middle">${key}</text>`,
  ].join("");
}

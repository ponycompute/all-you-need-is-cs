import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";
import { RUNS, type Gate } from "./model";

// World units are about 1 px of the real yard: x across the lanes, y toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 480;

const BASE: k.Plan = { x: 0, y: 14, w: 300, d: 270, r: 10 };
const LANE_X = [60, 120, 180, 240];
const HEAD_Y = 112;
const STEP_Y = 26;
export const LANE_SEATS = 3;
const PUCK_R = 10.5;
export const PUCK_H = 8;
const GATES: Record<Gate, [number, number]> = { 0: [90, 152], 1: [210, 152], 2: [150, 200] };
const GATE_H = 9;
const TRAY: k.Plan = { x: 26, y: 240, w: 248, d: 30, r: 0.8 };
export const TRAY_SLOTS = 8;

/** Where the j-th remaining key of a run stands; j = 0 is the head, at the mouth of the lane. */
export const laneAt = (run: number, place: number): k.Point3 => [LANE_X[run]!, HEAD_Y - STEP_Y * place, 0.8];
/** Output slots fill from the left, in the order the keys come out. */
export const trayAt = (slot: number): k.Point3 => [TRAY.x + 17 + slot * 30.5, TRAY.y + TRAY.d / 2, 1];

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [150, 60, 46]], WIDTH, HEIGHT, { pad: 22, azimuth: 52, elevation: 38 });

const { S, L, D, base, counter, labelPlate, tag, onFront } = partsFor(P);

function laneArt(run: number) {
  const x = LANE_X[run]!;
  const back = HEAD_Y - STEP_Y * (LANE_SEATS - 1) - 16;
  const rail = (dx: number) => S(k.slabOf({ x: x + dx - 1.2, y: back, w: 2.4, d: HEAD_Y + 6 - back, r: 0.8 }, 0, 3.2, P, 2), { tone: "mid", crease: "none" });
  const seats = Array.from({ length: LANE_SEATS }, (_, place) => laneAt(run, place));
  return {
    back: [
      S(k.slabOf({ x: x - 15, y: back - 4, w: 30, d: 4, r: 1 }, 0, 6, P, 2, 0.3), { tone: "mid" }),
      rail(-14.2),
      ...seats.map(([sx, sy]) => S(k.cylinder(sx, sy, PUCK_R + 1.6, 0, 0.8, P, 36), { tone: "lo", crease: "none" })),
      L(seats.map(([sx, sy, sz]) => k.ring(sx, sy, PUCK_R, sz, P, 36)).join(""), { tone: "faint" }),
      tag(x, back - 16, 0, String(run + 1)),
    ].join(""),
    // The rail on the reader's side of the lane is drawn over the keys standing in it.
    front: rail(14.2),
  };
}

/** The inlaid lines that carry each lane's head to its gate, and each gate's winner on to the next. */
function tracksArt() {
  const lines: string[] = [];
  LANE_X.forEach((x, run) => {
    const [gx, gy] = GATES[run < 2 ? 0 : 1];
    lines.push(k.onTop([[x, HEAD_Y + PUCK_R + 1.6], [x, gy], [gx + (x < gx ? -17 : 17), gy]], 0, P));
  });
  for (const gate of [0, 1] as Gate[]) {
    const [gx, gy] = GATES[gate];
    const [fx, fy] = GATES[2];
    lines.push(k.onTop([[gx, gy + 8], [gx, fy], [fx + (gx < fx ? -17 : 17), fy]], 0, P));
  }
  lines.push(k.onTop([[GATES[2][0], GATES[2][1] + 8], [GATES[2][0], TRAY.y]], 0, P));
  return L(lines.join(""), { tone: "mid", className: "my-track" });
}

/** A comparator: a block with a window on its front showing the key that won, and room on top for its pointer. */
function gateArt(gate: Gate) {
  const [x, y] = GATES[gate];
  const box: k.Plan = { x: x - 17, y: y - 8, w: 34, d: 16, r: 2 };
  const face = y + 8;
  const window = onFront([[x - 8, 1.8], [x + 8, 1.8], [x + 8, 7.4], [x - 8, 7.4]], face);
  return [
    `<path class="iso-line fig-rim" data-gate="${gate}" d="${k.planOutline(k.insetPlan(box, -2.4), 0, P, 3)}"/>`,
    S(k.slabOf(box, 0, GATE_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 1.4, P, 4), { tone: "faint" }) }),
    L(k.ring(x, y, 5.4, GATE_H, P, 24), { tone: "lo" }),
    D([k.iso([x - 13.5, y - 5, GATE_H], P), k.iso([x + 13.5, y - 5, GATE_H], P)], { size: 0.42, tone: "mid" }),
    `<path class="fig-window" d="${window}"/>`,
    L(window, { tone: "lo" }),
    `<text class="iso-face-text fig-digits" data-window="${gate}" transform="${k.sideMatrix([x, face], 2.8, P, "left")}" font-size="5" text-anchor="middle"></text>`,
  ].join("");
}

/**
 * A gate's pointer: a bar on a pivot that swings toward the side whose key won.
 * `lean` runs from -1 (the left input) through 0 (no winner) to 1 (the right input).
 */
export function pointerSvg(gate: Gate, lean: number) {
  const [x, y] = GATES[gate];
  const angle = lean * 0.95;
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)];
  const [nx, ny] = [-dy, dx];
  const at = (along: number, across: number): k.Plane => [x + dx * along + nx * across, y + dy * along + ny * across];
  const bar = k.extrude([at(-3, -1.8), at(9, -1.8), at(12, 0), at(9, 1.8), at(-3, 1.8)], GATE_H, 1.8, P);
  return S(bar, { tone: "hi", crease: "none" }) + D([k.iso([x, y, GATE_H + 1.8], P)], { size: 0.7, tone: "hi" });
}

const wall = (plan: k.Plan, height: number) => S(k.slabOf(plan, 0, height, P, 2, 0.3), { tone: "mid" });

const lanes = Array.from({ length: RUNS }, (_, run) => laneArt(run));
const slots = Array.from({ length: TRAY_SLOTS }, (_, slot) => trayAt(slot));

/** Everything the keys stand on, and the gates. */
export const BACK = [
  base(BASE, 9, 5, 22),
  tracksArt(),
  ...lanes.map((lane) => lane.back),
  counter(14, 172, 0, "compares"),
  labelPlate({ x: 246, y: 184, w: 40, d: 10, r: 1.4 }, 0, [20, 28, 14]),
  S(k.slabOf(TRAY, 0, 1, P, 2), { tone: "lo", crease: "none" }),
  L(slots.map(([x, y, z]) => k.ring(x, y, PUCK_R + 0.6, z, P, 36)).join(""), { tone: "faint" }),
  wall({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2.5, r: 0.6 }, 5.5),
  wall({ x: TRAY.x, y: TRAY.y, w: 2.5, d: TRAY.d, r: 0.6 }, 5.5),
].join("");

export const LANE_FRONT = lanes.map((lane) => lane.front).join("");
export const GATE_ART = ([0, 1, 2] as Gate[]).map(gateArt);
export const FRONT = [
  wall({ x: TRAY.x + TRAY.w - 2.5, y: TRAY.y, w: 2.5, d: TRAY.d, r: 0.6 }, 5.5),
  wall({ x: TRAY.x, y: TRAY.y + TRAY.d - 2.5, w: TRAY.w, d: 2.5, r: 0.6 }, 5.5),
  `<path class="fig-hit" data-act="next" d="${k.slabOf(TRAY, 0, 6, P, 2).fill}"/>`,
].join("");

/** A key standing at the world origin; the live code moves it with a translate. */
export function puckSvg(key: number) {
  const body = k.cylinder(0, 0, PUCK_R, 0, PUCK_H, P, 44, 0.8);
  return [
    S(body, { tone: "hi", crease: "lo", className: "my-body", inner: L(k.sideArc(0, 0, PUCK_R, 2, P, 28), { tone: "faint" }) }),
    L(k.ring(0, 0, PUCK_R - 2.4, PUCK_H, P, 36), { tone: "lo" }),
    `<text class="iso-face-text fig-key" transform="${k.topMatrix([0, 2.8], PUCK_H, P)}" font-size="8" text-anchor="middle">${key}</text>`,
  ].join("");
}

const [vx, vy] = k.towardViewer(P);
export const nearness = ([x, y]: k.Point3) => x * vx + y * vy;

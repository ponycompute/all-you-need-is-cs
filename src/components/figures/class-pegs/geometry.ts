import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";
import { ELEMENTS } from "./model";

// World units are about 1 px of the real bench: x across the lanes, y toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 440;

const BASE: k.Plan = { x: -6, y: 26, w: 352, d: 190, r: 10 };
const PITCH = 24;
const FRONT_Y = 92;
const STEP_Y = 20;
const SEATS = 3;
const TOKEN_R = 9;
export const TOKEN_H = 5;
const STACK_X = 316;
const FLAG_Y = 127;
const ROW_Y = [152, 173, 194];
const ROW_X = 44;

const laneX = (lane: number) => 20 + PITCH * lane;
/** Where the node at a place of seq[lane] stands; place 0 is the front of the list. */
export const laneAt = (lane: number, place: number): k.Point3 => [laneX(lane), FRONT_Y - STEP_Y * place, 0.8];
/** Where a node on the stack stands; place 0 is the top. */
export const stackAt = (place: number): k.Point3 => [STACK_X, FRONT_Y - STEP_Y * place, 0.8];
/** Where an element is printed: the row of its class, in the order it came out. */
export const printAt = (row: number, place: number): k.Point3 => [ROW_X + 22 * place, ROW_Y[row]!, 1];
export const flagAt = (element: number): k.Point3 => [laneX(element), FLAG_Y, 0.8];

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [170, 60, 40]], WIDTH, HEIGHT, { pad: 22, azimuth: 60, elevation: 40 });

const { S, L, base, labelPlate, tag } = partsFor(P);

/** A lane: the strip a list lies on, with a seat for each node, front seat nearest the reader. */
function laneArt(x: number, id: string) {
  const back = FRONT_Y - STEP_Y * (SEATS - 1) - 12;
  const strip: k.Plan = { x: x - 10.5, y: back, w: 21, d: FRONT_Y + 12 - back, r: 3 };
  const seats = Array.from({ length: SEATS }, (_, place) => FRONT_Y - STEP_Y * place);
  return [
    `<path class="iso-line fig-rim" ${id} d="${k.planOutline(k.insetPlan(strip, -1.6), 0, P, 3)}"/>`,
    S(k.slabOf(strip, 0, 0.8, P, 3), { tone: "lo", crease: "none" }),
    L(seats.map((y) => k.ring(x, y, TOKEN_R - 0.6, 0.8, P, 28)).join(""), { tone: "faint" }),
  ].join("");
}

/** The out[] flag of an element: a seat, and a button that the live code raises once the element is printed. */
function flagArt(element: number) {
  const [x, y] = flagAt(element);
  return [
    S(k.cylinder(x, y, 5.6, 0, 0.8, P, 24), { tone: "lo", crease: "none" }),
    L(k.ring(x, y, 3.6, 0.8, P, 20), { tone: "lo" }),
    `<g data-flag="${element}" opacity="0">${S(k.cylinder(x, y, 3.6, 0.8, 3, P, 20, 0.3), { tone: "hi", lit: true })}</g>`,
  ].join("");
}

function printArt() {
  const floor: k.Plan = { x: ROW_X - 16, y: ROW_Y[0]! - 12, w: 22 * 5 + 10, d: ROW_Y[2]! - ROW_Y[0]! + 24, r: 3 };
  const rings: string[] = [];
  ROW_Y.forEach((_, row) => {
    for (let place = 0; place < 5; place++) {
      const [x, y, z] = printAt(row, place);
      rings.push(k.ring(x, y, TOKEN_R - 0.6, z, P, 28));
    }
  });
  return [
    S(k.slabOf(floor, 0, 1, P, 3), { tone: "lo", crease: "none" }),
    L(rings.join(""), { tone: "faint" }),
    // A rule between the rows: each row is one class.
    L(k.lineOnTop([floor.x, (ROW_Y[0]! + ROW_Y[1]!) / 2], [floor.x + floor.w, (ROW_Y[0]! + ROW_Y[1]!) / 2], 1, P) + k.lineOnTop([floor.x, (ROW_Y[1]! + ROW_Y[2]!) / 2], [floor.x + floor.w, (ROW_Y[1]! + ROW_Y[2]!) / 2], 1, P), { tone: "lo" }),
  ].join("");
}

/** Everything the nodes stand on. */
export const BACK = [
  base(BASE, 9, 5, 22),
  ...Array.from({ length: ELEMENTS }, (_, lane) => laneArt(laneX(lane), `data-lane="${lane}"`)),
  laneArt(STACK_X, 'data-lane="stack"'),
  ...Array.from({ length: ELEMENTS }, (_, lane) => tag(laneX(lane), FRONT_Y + 14, 0, String(lane), 14)),
  tag(STACK_X, FRONT_Y + 14, 0, "top", 16),
  ...Array.from({ length: ELEMENTS }, (_, element) => flagArt(element)),
  printArt(),
  labelPlate({ x: 190, y: 176, w: 44, d: 12, r: 1.4 }, 0, [22, 32, 16, 26]),
].join("");

/** A numbered token standing at the world origin; the live code moves it with a translate. */
export function tokenSvg(value: number, printed: boolean) {
  const body = k.cylinder(0, 0, TOKEN_R - (printed ? 0 : 1), 0, TOKEN_H, P, 36, 0.6);
  return [
    S(body, { tone: printed ? "hi" : "mid", crease: "lo", className: "cp-body" }),
    printed ? L(k.ring(0, 0, TOKEN_R - 2.4, TOKEN_H, P, 28), { tone: "lo" }) : "",
    `<text class="iso-face-text fig-key" transform="${k.topMatrix([0, 2.7], TOKEN_H, P)}" font-size="${value > 9 ? 7 : 7.8}" text-anchor="middle">${value}</text>`,
  ].join("");
}

const [vx, vy] = k.towardViewer(P);
export const nearness = ([x, y]: k.Point3) => x * vx + y * vy;

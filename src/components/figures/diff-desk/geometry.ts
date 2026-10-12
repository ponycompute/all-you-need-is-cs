import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";
import { BITS, MASTER, SLOTS, type Station } from "./model";

// World units are about 1 px of the real desk: x across, y toward the reader, z up.
// From the back: the master file, its index, the differential file, its index, the filter.

export const WIDTH = 640;
export const HEIGHT = 410;

const BASE: k.Plan = { x: 0, y: 0, w: 300, d: 204, r: 10 };
const PITCH = 30;
const FILE_Y = { master: 30, diff: 108 };
const INDEX_Y = { master: 62, diff: 138 };
const FILE_H = { master: 16, diff: 12 };
const INDEX_H = 4;
const BAR: k.Plan = { x: 14, y: 168, w: 176, d: 14, r: 2 };
const BAR_H = 5;
const PEG_H = 5;
const HEAD_Z = 30;

const columnX = (at: number) => 30 + PITCH * at;
const bitX = (bit: number) => 25 + 14 * bit;

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [150, 30, HEAD_Z + 10]], WIDTH, HEIGHT, { pad: 22, azimuth: 60, elevation: 38 });

const { S, L, D, base, counter, labelPlate, tag } = partsFor(P);

type Row = "master" | "diff";

/** A record in a file: a block with a window on top for its version. */
function recordArt(row: Row, at: number) {
  const x = columnX(at);
  const y = FILE_Y[row];
  const h = FILE_H[row];
  const box: k.Plan = { x: x - 11, y: y - 9, w: 22, d: 18, r: 2 };
  const window: k.Plan = { x: x - 8, y: y - 5, w: 16, d: 9, r: 1 };
  const id = `${row === "master" ? "mf" : "df"}${at}`;
  return `<g data-st="${id}">${[
    `<path class="iso-line fig-rim" d="${k.planOutline(k.insetPlan(box, -2.2), 0, P, 3)}"/>`,
    S(k.slabOf(box, 0, h, P, 3, 0.6), { tone: "hi", crease: "lo", className: "dd-body", inner: L(k.sideSeam(box, 1.6, P, 3) + k.sideSeam(box, h - 2.4, P, 3), { tone: "faint" }) }),
    `<path class="fig-window" d="${k.planOutline(window, h, P, 3)}"/>`,
    L(k.planOutline(window, h, P, 3), { tone: "lo" }),
    `<text class="iso-face-text fig-key" data-text="${id}" transform="${k.topMatrix([x, y + 2.2], h, P)}" font-size="6.4" text-anchor="middle"></text>`,
    D([k.iso([x - 8.4, y + 6.6, h], P), k.iso([x + 8.4, y + 6.6, h], P)], { size: 0.4, tone: "mid" }),
  ].join("")}</g>`;
}

/** An index entry: a low tile with a key on it, and the line that stands for its pointer to the record behind. */
function entryArt(row: Row, at: number) {
  const x = columnX(at);
  const y = INDEX_Y[row];
  const tile: k.Plan = { x: x - 11, y: y - 7, w: 22, d: 14, r: 1.6 };
  const id = `${row === "master" ? "mi" : "di"}${at}`;
  const pointer = k.lineOnTop([x, FILE_Y[row] + 9], [x, y - 7], 0, P);
  return `<g data-st="${id}">${[
    L(pointer, { tone: "mid" }),
    `<path class="iso-line fig-rim" d="${k.planOutline(k.insetPlan(tile, -2), 0, P, 3)}"/>`,
    S(k.slabOf(tile, 0, INDEX_H, P, 3, 0.5), { tone: "mid", className: "dd-body" }),
    L(k.planOutline(k.insetPlan(tile, 1.6), INDEX_H, P, 3), { tone: "faint" }),
    `<text class="iso-face-text fig-key" data-text="${id}" transform="${k.topMatrix([x, y + 2.3], INDEX_H, P)}" font-size="6.4" text-anchor="middle">${row === "master" ? MASTER[at] : ""}</text>`,
  ].join("")}</g>`;
}

/** Where an empty differential slot will be filled: outlines on the base. */
function slotArt(at: number) {
  const x = columnX(at);
  const file: k.Plan = { x: x - 11, y: FILE_Y.diff - 9, w: 22, d: 18, r: 2 };
  const tile: k.Plan = { x: x - 11, y: INDEX_Y.diff - 7, w: 22, d: 14, r: 1.6 };
  return L(k.planOutline(file, 0, P, 3) + k.planOutline(tile, 0, P, 3), { tone: "faint" });
}

/** The filter: a bar with one peg per bit. A peg that is down is flush with the bar; one that is up stands for a 1. */
function barArt() {
  const top = BAR_H;
  const face = BAR.y + BAR.d;
  const numbers = Array.from({ length: BITS }, (_, bit) =>
    `<text class="iso-face-text dd-bit" transform="${k.sideMatrix([bitX(bit), face], 0.9, P, "left")}" font-size="3.6" text-anchor="middle">${bit}</text>`,
  ).join("");
  const pegs = Array.from({ length: BITS }, (_, bit) => {
    const x = bitX(bit);
    const y = BAR.y + BAR.d / 2;
    return `<g data-st="f${bit}">${[
      `<path class="iso-line fig-rim" d="${k.ring(x, y, 5.6, top, P, 20)}"/>`,
      L(k.ring(x, y, 4.2, top, P, 20), { tone: "lo" }),
      `<g data-peg="down">${S(k.cylinder(x, y, 3.2, top, 0.7, P, 18), { tone: "mid", crease: "none" })}</g>`,
      `<g data-peg="up" display="none">${S(k.cylinder(x, y, 3.2, top, PEG_H, P, 18, 0.4), { tone: "hi", crease: "lo", lit: true })}</g>`,
    ].join("")}</g>`;
  });
  return [S(k.slabOf(BAR, 0, BAR_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BAR, BAR_H - 1.2, P, 4), { tone: "faint" }) }), numbers, D([k.iso([BAR.x + 4, BAR.y + 3.4, top], P), k.iso([BAR.x + BAR.w - 4, BAR.y + 3.4, top], P)], { size: 0.42, tone: "mid" }), ...pegs].join("");
}

const order = <T,>(items: T[], xOf: (item: T) => number) => [...items].sort((a, b) => xOf(a) - xOf(b));
const columns = (count: number) => order(Array.from({ length: count }, (_, at) => at), columnX);

/** The whole desk, back to front. Text, pegs and rims are written to by the live code. */
export const DESK = [
  base(BASE, 9, 5, 22),
  ...columns(MASTER.length).map((at) => recordArt("master", at)),
  tag(274, 26, 0, "FILE", 24),
  ...columns(MASTER.length).map((at) => entryArt("master", at)),
  tag(274, 56, 0, "INDEX", 26),
  L(k.lineOnTop([14, 86], [286, 86], 0, P), { tone: "lo" }),
  D([k.iso([14, 86, 0], P), k.iso([286, 86, 0], P)], { size: 0.5, tone: "mid" }),
  ...columns(SLOTS).map(slotArt),
  ...columns(SLOTS).map((at) => `<g data-slot="${at}" opacity="0">${recordArt("diff", at)}</g>`),
  tag(196, 104, 0, "FILE", 24),
  ...columns(SLOTS).map((at) => `<g data-slot="${at}" opacity="0">${entryArt("diff", at)}</g>`),
  tag(196, 132, 0, "INDEX", 26),
  `<path class="iso-line fig-rim" data-st="di" d="${k.planOutline({ x: columnX(0) - 15, y: INDEX_Y.diff - 11, w: PITCH * (SLOTS - 1) + 30, d: 22, r: 3 }, 0, P, 4)}"/>`,
  barArt(),
  tag(212, 171, 0, "FILTER", 30),
  labelPlate({ x: 232, y: 112, w: 40, d: 10, r: 1.4 }, 0, [22, 30, 16]),
  counter(252, 164, 0, "count"),
].join("");

/** Where the read head hovers over a station. */
export function headAt(station: Station): k.Point3 {
  const at = Number(station.slice(2));
  if (station === "di") return [columnX((SLOTS - 1) / 2), INDEX_Y.diff, HEAD_Z];
  if (station.startsWith("f")) return [bitX(Number(station.slice(1))), BAR.y + BAR.d / 2, HEAD_Z - 8];
  if (station.startsWith("mf")) return [columnX(at), FILE_Y.master, HEAD_Z + 6];
  if (station.startsWith("mi")) return [columnX(at), INDEX_Y.master, HEAD_Z];
  if (station.startsWith("df")) return [columnX(at), FILE_Y.diff, HEAD_Z];
  return [columnX(at), INDEX_Y.diff, HEAD_Z - 4];
}

export const HOME: k.Point3 = [246, 128, HEAD_Z - 12];

/** The read head at the world origin: a small lit bob with a point underneath. */
export const HEAD = [
  S(k.cylinder(0, 0, 3.4, 0, 2.2, P, 20, 0.4), { tone: "hi", lit: true }),
  S(k.cylinder(0, 0, 1.1, -3, 3, P, 10), { tone: "hi", crease: "none" }),
  D([k.iso([0, 0, 2.2], P)], { size: 0.5, tone: "hi" }),
].join("");

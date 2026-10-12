import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";
import { ENTRIES, PAGES, PAGE_SIZE } from "./model";

// World units are about 1 px of the real bench: x across, y toward the reader, z up.

export const WIDTH = 640;
export const HEIGHT = 450;

const BASE: k.Plan = { x: 0, y: 10, w: 300, d: 224, r: 10 };
const ENTRY_Y = 44;
const ENTRY_H = 10;
const JACK_H = 2.2;
const TRAY_Y = 150;
const TRAY_W = 42;
const TRAY_D = 18;
const SLOT = 12.5;
const CARD_W = 10.5;
const CARD_T = 1.6;
const CARD_H = 13;
const SLOTS = PAGE_SIZE + 1;

const entryX = (entry: number) => 24 + 36 * entry;
const trayX = (page: number) => 30 + 48 * page;

/** Where a directory entry's cord leaves it. */
export const outJack = (entry: number): k.Point3 => [entryX(entry), ENTRY_Y + 5.5, ENTRY_H + JACK_H];
/** Where cords pointing at a page plug in: a post behind its tray. */
export const inJack = (page: number): k.Point3 => [trayX(page), TRAY_Y - 9, 7 + JACK_H];
/** Where a card stands in a slot of a page's tray. */
export const slotAt = (page: number, slot: number): k.Point3 => [trayX(page) - SLOT + SLOT * slot, TRAY_Y + TRAY_D / 2, 1];
export const heldOver = (page: number): k.Point3 => [trayX(page), TRAY_Y + TRAY_D + 4, 24];
export const FEED: k.Point3 = [36, 208, 6];

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [150, ENTRY_Y, 52]], WIDTH, HEIGHT, { pad: 22, azimuth: 60, elevation: 38 });

const { S, L, D, base, counter, labelPlate } = partsFor(P);

/**
 * A directory entry: a block with a window for the bit pattern it stands for and a jack for its cord.
 * Entries beyond the directory's current size are drawn but dimmed by the live code.
 */
function entryArt(entry: number) {
  const x = entryX(entry);
  const box: k.Plan = { x: x - 14, y: ENTRY_Y - 9, w: 28, d: 18, r: 2 };
  const window: k.Plan = { x: x - 10.5, y: ENTRY_Y - 6.4, w: 21, d: 8.4, r: 1 };
  return `<g data-entry="${entry}">${[
    `<path class="iso-line fig-rim" d="${k.planOutline(k.insetPlan(box, -2.2), 0, P, 3)}"/>`,
    S(k.slabOf(box, 0, ENTRY_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(box, 1.4, P, 3), { tone: "faint" }) }),
    `<path class="fig-window" d="${k.planOutline(window, ENTRY_H, P, 3)}"/>`,
    L(k.planOutline(window, ENTRY_H, P, 3), { tone: "lo" }),
    `<text class="iso-face-text hd-bits" data-label="${entry}" transform="${k.topMatrix([x, ENTRY_Y + 0.4], ENTRY_H, P)}" font-size="6.4" text-anchor="middle"></text>`,
    S(k.cylinder(x, ENTRY_Y + 5.5, 2.3, ENTRY_H, JACK_H, P, 14), { tone: "hi" }),
  ].join("")}</g>`;
}

const wall = (plan: k.Plan, height: number) => S(k.slabOf(plan, 0, height, P, 2, 0.3), { tone: "mid" });

/** A page: a tray of card slots (the last one ringed, for an overflow), the post its cords plug into, and a plate with its number and depth. */
function trayArt(page: number) {
  const x = trayX(page);
  const tray: k.Plan = { x: x - TRAY_W / 2, y: TRAY_Y, w: TRAY_W, d: TRAY_D, r: 1 };
  const slots = Array.from({ length: SLOTS }, (_, slot) => slotAt(page, slot));
  const outline = ([sx, sy]: k.Point3, grow: number) => k.planOutline({ x: sx - CARD_W / 2 - grow, y: sy - CARD_T / 2 - grow - 0.2, w: CARD_W + grow * 2, d: CARD_T + grow * 2 + 0.4, r: 0.5 }, 1, P, 2);
  const plate: k.Plan = { x: x - 17, y: TRAY_Y + TRAY_D + 4, w: 34, d: 10, r: 1.4 };
  const window: k.Plan = { x: x + 1, y: plate.y + 1.4, w: 13, d: 7.2, r: 1 };
  return {
    back: [
      S(k.cylinder(x, TRAY_Y - 9, 4.4, 0, 2, P, 20, 0.3), { tone: "lo" }),
      S(k.cylinder(x, TRAY_Y - 9, 2.6, 2, 5, P, 16), { tone: "mid", crease: "none" }),
      S(k.cylinder(x, TRAY_Y - 9, 2.3, 7, JACK_H, P, 14), { tone: "hi" }),
      S(k.slabOf(tray, 0, 1, P, 2), { tone: "lo", crease: "none" }),
      L(slots.slice(0, PAGE_SIZE).map((slot) => outline(slot, 0.4)).join(""), { tone: "faint" }),
      L(outline(slots[PAGE_SIZE]!, 1.3), { tone: "lo", dashed: true }),
      wall({ x: tray.x, y: tray.y, w: tray.w, d: 2, r: 0.5 }, 5),
      wall({ x: tray.x, y: tray.y, w: 2, d: tray.d, r: 0.5 }, 5),
      S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "mid", crease: "none" }),
      k.faceTextSvg(k.topMatrix([x - 9, plate.y + 7.3], 0.8, P), String(page + 1), { size: 6.4, tone: "mid", anchor: "middle" }),
      `<path class="fig-window" d="${k.planOutline(window, 0.8, P, 3)}"/>`,
      L(k.planOutline(window, 0.8, P, 3), { tone: "lo" }),
      `<text class="iso-face-text hd-bits" data-depth="${page}" transform="${k.topMatrix([x + 7.5, plate.y + 7.2], 0.8, P)}" font-size="5.6" text-anchor="middle"></text>`,
    ].join(""),
    front: `${wall({ x: tray.x + tray.w - 2, y: tray.y, w: 2, d: tray.d, r: 0.5 }, 3.2)}${wall({ x: tray.x, y: tray.y + tray.d - 2, w: tray.w, d: 2, r: 0.5 }, 3.2)}<path class="iso-line fig-rim" data-page="${page}" d="${k.planOutline({ ...k.insetPlan(tray, -1.2), r: 1.6 }, 0, P, 3)}"/>`,
  };
}

function feedArt() {
  const [x, y] = FEED;
  const block: k.Plan = { x: x - 9, y: y - 5, w: 18, d: 10, r: 1.6 };
  return [
    S(k.slabOf(block, 0, 6, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 1.6, P, 3), { tone: "faint" }) }),
    L(k.planOutline({ x: x - CARD_W / 2 - 0.6, y: y - CARD_T / 2 - 0.6, w: CARD_W + 1.2, d: CARD_T + 1.2, r: 0.6 }, 6, P, 3), { tone: "lo" }),
  ].join("");
}

const trays = Array.from({ length: PAGES }, (_, page) => trayArt(page));

/** Everything behind the cords. */
export const BACK = [
  base(BASE, 9, 5, 22),
  ...Array.from({ length: ENTRIES }, (_, entry) => entryArt(entry)),
  ...trays.map((tray) => tray.back),
  feedArt(),
  labelPlate({ x: 130, y: 204, w: 40, d: 10, r: 1.4 }, 0, [20, 28, 14]),
  counter(252, 196, 0, "bits"),
].join("");
/** Tray walls nearer than the cards, the trays' rims, and the pointer target. */
export const FRONT = [...trays.map((tray) => tray.front), `<path class="fig-hit" data-act="load" d="${k.slabOf({ x: FEED[0] - 13, y: FEED[1] - 9, w: 26, d: 18, r: 2 }, 0, 22, P, 3).fill}"/>`].join("");

/** A key card standing at the world origin, facing the reader: the identifier, and the low half of its code under it. */
export function cardSvg(key: string, bits: string) {
  const plan: k.Plan = { x: -CARD_W / 2, y: -CARD_T / 2, w: CARD_W, d: CARD_T, r: 0.5 };
  const face = CARD_T / 2;
  return [
    S(k.slabOf(plan, 0, CARD_H, P, 2), { tone: "hi", crease: "lo", className: "hd-body" }),
    `<text class="iso-face-text fig-key" transform="${k.sideMatrix([0, face], 6.2, P, "left")}" font-size="5.8" text-anchor="middle">${key}</text>`,
    `<text class="iso-face-text hd-code" transform="${k.sideMatrix([0, face], 1.9, P, "left")}" font-size="3.5" text-anchor="middle">${bits.slice(3)}</text>`,
  ].join("");
}

/** A cord from a directory entry to wherever its far plug is now. */
export function cordSvg(from: k.Point3, to: k.Point3) {
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  if (distance < 0.5) return "";
  const lift = 8 + distance * 0.08;
  const points: k.Flat[] = [];
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    points.push(k.iso([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t + lift * 4 * t * (1 - t)], P));
  }
  const [sx, sy] = points[0]!;
  const [ex, ey] = points[points.length - 1]!;
  return `<path class="iso-line hd-cord" d="${k.pathOf(points)}"/><circle class="hd-plug" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.8"/><circle class="hd-plug" data-end="" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.1"/>`;
}

const [vx, vy] = k.towardViewer(P);
export const nearness = ([x, y]: k.Point3) => x * vx + y * vy;

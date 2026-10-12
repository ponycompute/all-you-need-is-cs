import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";
import { SLOTS } from "./model";

// World units are about 1 px of the real turntable: x and y on the bench, z up.

export const WIDTH = 640;
export const HEIGHT = 470;

const BASE: k.Plan = { x: 0, y: 0, w: 300, d: 262, r: 10 };
export const HUB: [number, number] = [150, 104];
const DISC_R = 90;
const DISC_H = 4;
export const TOP = DISC_H;
const SEAT_R = 64;
const PUCK_R = 11;
export const PUCK_H = 9;
const ARM_R = 46;

export const FEED: k.Point3 = [44, 222, 3.4];
const TRAY: k.Plan = { x: 176, y: 204, w: 96, d: 34, r: 0.8 };
export const TRAY_SLOTS = 3;
export const trayAt = (slot: number): k.Point3 => [TRAY.x + 18 + slot * 30, TRAY.y + TRAY.d / 2, 1];

/** The angle of a slot, clockwise from the back of the turntable as seen from above. */
export const angleOf = (slot: number) => (slot / SLOTS) * Math.PI * 2;
const polar = (angle: number, radius: number): k.Plane => [HUB[0] + radius * Math.sin(angle), HUB[1] - radius * Math.cos(angle)];

/** Where an item stands in a slot: the centre of its foot. */
export function slotAt(slot: number): k.Point3 {
  const [x, y] = polar(angleOf(slot), SEAT_R);
  return [x, y, TOP + 0.8];
}

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [HUB[0], HUB[1], TOP + 60]], WIDTH, HEIGHT, { pad: 22, azimuth: 52, elevation: 38 });

const { S, L, D, base, ribs, labelPlate } = partsFor(P);

function discArt() {
  const [cx, cy] = HUB;
  const ticks = k.radialTicks(cx, cy, DISC_R - 1, SLOTS * 4, 4, TOP, [2.2, 4.4], P);
  const parts: string[] = [
    S(k.cylinder(cx, cy, DISC_R + 6, 0, 1.6, P, 96, 0.4), { tone: "lo" }),
    S(k.cylinder(cx, cy, DISC_R, 1.6, DISC_H - 1.6, P, 96, 0.8), { tone: "mid" }),
    L(ticks.minor, { tone: "lo" }),
    L(ticks.major, { tone: "mid" }),
    L(k.ring(cx, cy, SEAT_R - PUCK_R - 5, TOP, P, 72), { tone: "faint" }),
  ];
  for (let slot = 0; slot < SLOTS; slot++) {
    const [x, y] = polar(angleOf(slot), SEAT_R);
    const [lx, ly] = polar(angleOf(slot) + 0.36, DISC_R - 9);
    parts.push(S(k.cylinder(x, y, PUCK_R + 2, TOP, 0.8, P, 36), { tone: "lo", crease: "none" }));
    parts.push(L(k.ring(x, y, PUCK_R, TOP + 0.8, P, 36), { tone: "faint" }));
    parts.push(`<path class="iso-line fig-rim" data-slot="${slot}" d="${k.ring(x, y, PUCK_R + 1.8, TOP + 0.8, P, 36)}"/>`);
    parts.push(k.faceTextSvg(k.topMatrix([lx, ly + 2.2], TOP, P), String(slot), { size: 6.4, tone: "mid", anchor: "middle" }));
  }
  return parts.join("");
}

/** The hub the two arms turn on, drawn over them. */
function hubArt() {
  const [cx, cy] = HUB;
  return [
    S(k.cylinder(cx, cy, 11, TOP, 9, P, 36, 0.6), { tone: "mid" }),
    ribs(cx, cy, 11, TOP + 5, TOP + 9, 40),
    L(k.sideArc(cx, cy, 11, TOP + 5, P, 24), { tone: "faint" }),
    L(k.ring(cx, cy, 6, TOP + 9, P, 28), { tone: "lo" }),
    D([k.iso([cx, cy, TOP + 9], P)], { size: 0.6, tone: "mid" }),
  ].join("");
}

/**
 * One of the two index arms at a given angle: a bar from the hub ending in a pointer block.
 * The front arm rides low and carries an open ring; the rear arm rides above it and carries a dot.
 */
export function armSvg(which: "front" | "rear", angle: number) {
  const z = which === "front" ? TOP + 0.6 : TOP + 3.4;
  const [dx, dy] = [Math.sin(angle), -Math.cos(angle)];
  const [nx, ny] = [-dy, dx];
  const at = (along: number, across: number): k.Plane => [HUB[0] + dx * along + nx * across, HUB[1] + dy * along + ny * across];
  const bar = k.extrude([at(4, -2.2), at(ARM_R - 6, -2.2), at(ARM_R - 6, 2.2), at(4, 2.2)], z, 1.6, P);
  const head = k.extrude([at(ARM_R - 8, -4.4), at(ARM_R, -4.4), at(ARM_R + 4, 0), at(ARM_R, 4.4), at(ARM_R - 8, 4.4)], z, 2.2, P);
  const [mx, my] = at(ARM_R - 3, 0);
  const mark =
    which === "front"
      ? L(k.ring(mx, my, 2.3, z + 2.2, P, 16), { tone: "hi" })
      : `<g class="iso-dots" data-tone="hi"><circle cx="${k.iso([mx, my, z + 2.2], P)[0].toFixed(1)}" cy="${k.iso([mx, my, z + 2.2], P)[1].toFixed(1)}" r="2.2"/></g>`;
  const [tx, ty] = at(ARM_R * 0.52, 0);
  return [
    S(bar, { tone: "hi", crease: "none" }),
    S(head, { tone: "hi", crease: "lo" }),
    mark,
    k.faceTextSvg(k.topMatrix([tx, ty + 6.5], z + 1.6, P), which === "front" ? "F" : "R", { size: 6, tone: "hi", anchor: "middle" }),
  ].join("");
}

function feedArt() {
  const [x, y] = FEED;
  const ticks = k.radialTicks(x, y, 15.7, 36, 3, 2, [1.1, 2.1], P);
  return [
    S(k.cylinder(x, y, 16, 0, 2, P, 48, 0.3), { tone: "lo" }),
    ribs(x, y, 16, 0, 2, 64),
    L(ticks.minor, { tone: "lo" }),
    L(ticks.major, { tone: "mid" }),
    S(k.cylinder(x, y, 13.3, 2, 1.4, P, 44, 0.5), { tone: "mid" }),
    L(k.ring(x, y, PUCK_R, 3.4, P, 40), { tone: "faint" }),
  ].join("");
}

const wall = (plan: k.Plan, height: number) => S(k.slabOf(plan, 0, height, P, 2, 0.3), { tone: "mid" });

function trayArt() {
  const slots = Array.from({ length: TRAY_SLOTS }, (_, slot) => trayAt(slot));
  return {
    back: [
      S(k.slabOf(TRAY, 0, 1, P, 2), { tone: "lo", crease: "none" }),
      L(slots.map(([x, y, z]) => k.ring(x, y, PUCK_R + 0.6, z, P, 36)).join(""), { tone: "faint" }),
      wall({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 2.5, r: 0.6 }, 5.5),
      wall({ x: TRAY.x, y: TRAY.y, w: 2.5, d: TRAY.d, r: 0.6 }, 5.5),
    ].join(""),
    front: wall({ x: TRAY.x + TRAY.w - 2.5, y: TRAY.y, w: 2.5, d: TRAY.d, r: 0.6 }, 5.5) + wall({ x: TRAY.x, y: TRAY.y + TRAY.d - 2.5, w: TRAY.w, d: 2.5, r: 0.6 }, 5.5),
  };
}

const tray = trayArt();
const hit = (act: string, d: string) => `<path class="fig-hit" data-act="${act}" d="${d}"/>`;

/** Everything under the arms. */
export const BACK = [base(BASE, 9, 5, 22), discArt(), feedArt(), labelPlate({ x: 96, y: 216, w: 40, d: 10, r: 1.4 }, 0, [20, 28, 14]), tray.back].join("");
export const HUB_ART = hubArt();
export const FRONT = [tray.front, hit("add", k.cylinder(FEED[0], FEED[1], 17, 0, 6, P, 24).fill), hit("delete", k.slabOf(TRAY, 0, 6, P, 2).fill)].join("");

/** An item standing at the world origin; the live code moves it with a translate. */
export function puckSvg(value: number) {
  const body = k.cylinder(0, 0, PUCK_R, 0, PUCK_H, P, 44, 0.8);
  return [
    S(body, { tone: "hi", crease: "lo", className: "rq-body", inner: L(k.sideArc(0, 0, PUCK_R, 2, P, 28), { tone: "faint" }) + ribs(0, 0, PUCK_R, PUCK_H - 2.6, PUCK_H, 40) }),
    L(k.ring(0, 0, PUCK_R - 2.4, PUCK_H, P, 36), { tone: "lo" }),
    `<text class="iso-face-text fig-key" transform="${k.topMatrix([0, 2.9], PUCK_H, P)}" font-size="8.4" text-anchor="middle">${value}</text>`,
  ].join("");
}

const [vx, vy] = k.towardViewer(P);
/** Painter's key for upright parts: how near the reader their footprint is. */
export const nearness = ([x, y]: k.Point3) => x * vx + y * vy;

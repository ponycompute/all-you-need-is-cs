import * as k from "../iso/iso-kit";
import { partsFor } from "../iso/parts";

// One small undirected graph shown three ways on a bench: as an adjacency matrix
// (a board of holes with a pin wherever there is an edge), as a model with a post
// for each vertex and a wire for each edge, and as adjacency lists (a row of
// tokens for each vertex). World units are about 1 px; x across, y toward the reader.

export const WIDTH = 640;
export const HEIGHT = 440;
export const VERTICES = 6;

/** An edge as "i-j" with i < j. */
export const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const neighboursOf = (edges: Set<string>, vertex: number) => Array.from({ length: VERTICES }, (_, other) => other).filter((other) => other !== vertex && edges.has(edgeKey(vertex, other)));

/** What the scan is looking at: a cell of the matrix row, or a node of the list. */
export type Probe = { vertex: number; phase: "matrix" | "list"; index: number } | null;

const BASE: k.Plan = { x: 0, y: 22, w: 356, d: 196, r: 10 };
const CELL = 17;
const BOARD: k.Plan = { x: 22, y: 62, w: CELL * VERTICES + 6, d: CELL * VERTICES + 6, r: 3 };
const BOARD_H = 3;
const HUB: [number, number] = [196, 114];
const POST_R = 8;
const POST_H = 13;
const LIST_X = 262;
const TOKEN = 11;
const LINK = 14.5;

const cellAt = (row: number, col: number): [number, number] => [BOARD.x + 3 + CELL * (col + 0.5), BOARD.y + 3 + CELL * (row + 0.5)];
const postAt = (vertex: number): [number, number] => {
  const angle = (vertex / VERTICES) * Math.PI * 2 - Math.PI / 2;
  return [HUB[0] + 46 * Math.cos(angle), HUB[1] + 40 * Math.sin(angle)];
};
const rowY = (vertex: number) => BOARD.y + 3 + CELL * (vertex + 0.5);
const tokenAt = (vertex: number, place: number): [number, number] => [LIST_X + 16 + LINK * place, rowY(vertex)];

export const P: k.Projection = k.fitProjection([...k.boxCorners(BASE, -14, 0), [HUB[0], HUB[1], 40]], WIDTH, HEIGHT, { pad: 22, azimuth: 60, elevation: 40 });

const { S, L, D, base, counter, labelPlate, byDepth } = partsFor(P);
const order = <T,>(items: T[], at: (item: T) => [number, number]) => [...items].sort((a, b) => k.depthOf([...at(a), 0], P) - k.depthOf([...at(b), 0], P));
const numeral = (x: number, y: number, z: number, text: string, size = 5.6, tone: k.Tone = "mid") => k.faceTextSvg(k.topMatrix([x, y + size * 0.36], z, P), text, { size, tone, anchor: "middle" });

function boardArt() {
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < VERTICES; row++) for (let col = 0; col < VERTICES; col++) cells.push([row, col]);
  const parts: string[] = [
    S(k.slabOf(BOARD, 0, BOARD_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BOARD, 1.2, P, 4), { tone: "faint" }) }),
    L(cells.map(([row, col]) => k.ring(...cellAt(row, col), 4.2, BOARD_H, P, 20)).join(""), { tone: "lo" }),
    // The diagonal holds no pins: a vertex is not its own neighbour.
    D(Array.from({ length: VERTICES }, (_, at) => k.iso([...cellAt(at, at), BOARD_H], P)), { size: 0.9, tone: "lo" }),
  ];
  for (let at = 0; at < VERTICES; at++) {
    parts.push(numeral(cellAt(0, at)[0], BOARD.y - 7, 0, String(at)));
    parts.push(numeral(BOARD.x - 7, cellAt(at, 0)[1], 0, String(at)));
  }
  return parts.join("");
}

function listRailArt() {
  const parts: string[] = [];
  for (let vertex = 0; vertex < VERTICES; vertex++) {
    const y = rowY(vertex);
    const head: k.Plan = { x: LIST_X - 6, y: y - 6, w: 12, d: 12, r: 1.4 };
    parts.push(S(k.slabOf(head, 0, 2, P, 3), { tone: "mid", crease: "none" }));
    parts.push(numeral(LIST_X, y, 2, String(vertex), 6));
  }
  return parts.join("");
}

/** Everything that does not depend on the graph. */
export const BACK = [
  base(BASE, 9, 5, 22),
  boardArt(),
  ...byDepth(Array.from({ length: VERTICES }, (_, vertex) => postAt(vertex))).map(([x, y]) => S(k.cylinder(x, y, POST_R + 2.4, 0, 1.2, P, 28), { tone: "lo", crease: "none" })),
  listRailArt(),
  counter(56, 180, 0, "matrix"),
  labelPlate({ x: 176, y: 190, w: 40, d: 10, r: 1.4 }, 0, [20, 28, 14]),
  counter(292, 180, 0, "list"),
].join("");

/** The pins, wires and list nodes for one graph, with whatever the scan is looking at ringed or lit. */
export function graphArt(edges: Set<string>, probe: Probe, fresh: string | null) {
  const parts: string[] = [];
  const born = (key: string) => (key === fresh ? ' data-new=""' : "");

  // Matrix: the row being scanned, the cell under the probe, and a pin at every edge, both ways round.
  if (probe?.phase === "matrix") {
    const [x, y] = cellAt(probe.vertex, probe.index);
    parts.push(`<path class="iso-line fig-rim" data-on="" d="${k.ring(x, y, 6.6, BOARD_H, P, 24)}"/>`);
  }
  const pins: Array<[number, number]> = [];
  for (let row = 0; row < VERTICES; row++) for (let col = 0; col < VERTICES; col++) if (row !== col && edges.has(edgeKey(row, col))) pins.push([row, col]);
  for (const [row, col] of order(pins, ([r, c]) => cellAt(r, c))) {
    const [x, y] = cellAt(row, col);
    const found = probe?.phase === "matrix" && probe.vertex === row && col <= probe.index;
    parts.push(`<g class="pn-pin"${born(edgeKey(row, col))}${found ? ' data-lit=""' : ""}>${S(k.cylinder(x, y, 3.3, BOARD_H, 5.5, P, 16, 0.3), { tone: "hi", lit: found })}</g>`);
  }

  // Model: wires from rim to rim, then the posts over them.
  for (const key of edges) {
    const [a, b] = key.split("-").map(Number) as [number, number];
    const [ax, ay] = postAt(a);
    const [bx, by] = postAt(b);
    const length = Math.hypot(bx - ax, by - ay);
    const [ux, uy] = [(bx - ax) / length, (by - ay) / length];
    const on = probe !== null && (a === probe.vertex || b === probe.vertex);
    parts.push(`<g${born(key)}>${L(k.segment([ax + ux * POST_R, ay + uy * POST_R, POST_H - 2], [bx - ux * POST_R, by - uy * POST_R, POST_H - 2], P), { tone: on ? "lit" : "hi", className: "pn-wire" })}</g>`);
  }
  for (const vertex of order(Array.from({ length: VERTICES }, (_, at) => at), postAt)) {
    const [x, y] = postAt(vertex);
    const on = probe?.vertex === vertex;
    parts.push(
      `<g class="pn-post"${on ? ' data-lit=""' : ""}>${S(k.cylinder(x, y, POST_R, 1.2, POST_H - 1.2, P, 32, 0.6), { tone: "hi", lit: on, inner: L(k.sideArc(x, y, POST_R, 3.4, P, 20), { tone: "faint" }) })}<text class="iso-face-text fig-key" transform="${k.topMatrix([x, y + 2.9], POST_H, P)}" font-size="8.2" text-anchor="middle">${vertex}</text><path class="fig-hit" data-vertex="${vertex}" d="${k.cylinder(x, y, POST_R + 2, 0, POST_H, P, 20).fill}"/></g>`,
    );
  }

  // Lists: one node per neighbour, linked from the head plate, ending in a terminal dot.
  for (let vertex = 0; vertex < VERTICES; vertex++) {
    const near = neighboursOf(edges, vertex);
    const y = rowY(vertex);
    const end = near.length ? tokenAt(vertex, near.length - 1)[0] + TOKEN / 2 + 5 : LIST_X + 11;
    parts.push(k.wireSvg(k.iso([LIST_X + 6, y, 0], P), k.iso([end, y, 0], P), { tone: "mid", ends: "to", size: 1.3 }));
    near.forEach((other, place) => {
      const [x] = tokenAt(vertex, place);
      const plan: k.Plan = { x: x - TOKEN / 2, y: y - TOKEN / 2, w: TOKEN, d: TOKEN, r: 1.6 };
      const on = probe?.phase === "list" && probe.vertex === vertex && place <= probe.index;
      parts.push(`<g class="pn-node"${born(edgeKey(vertex, other))}${on ? ' data-lit=""' : ""}>${S(k.slabOf(plan, 0, 4.4, P, 3, 0.4), { tone: "hi", lit: on })}<text class="iso-face-text fig-key" transform="${k.topMatrix([x, y + 2.3], 4.4, P)}" font-size="6.4" text-anchor="middle">${other}</text></g>`);
    });
  }
  return parts.join("");
}

/** A pointer target over every cell above the diagonal: clicking one adds or removes that edge. */
export const HITS = (() => {
  const parts: string[] = [];
  for (let row = 0; row < VERTICES; row++) {
    for (let col = 0; col < VERTICES; col++) {
      if (row === col) continue;
      const [x, y] = cellAt(row, col);
      parts.push(`<path class="fig-hit" data-edge="${edgeKey(row, col)}" d="${k.cylinder(x, y, 7.5, BOARD_H, 6, P, 12).fill}"/>`);
    }
  }
  return parts.join("");
})();

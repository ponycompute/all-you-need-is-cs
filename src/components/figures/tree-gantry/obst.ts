// Pure model for the optimal binary search tree (Horowitz §10.1). Keys a1 < … < an are sought
// with weights p1 … pn, and searches that fail between them with weights q0 … qn. The table
// c(i, j) = w(i, j) + min over i < k <= j of c(i, k-1) + c(k, j) gives the cheapest tree.

import type { TreeFrame, TreeNode } from "./types";

export interface Table {
  /** w[i][j], c[i][j] and r[i][j] for 0 <= i <= j <= n; r is 0 where i = j. */
  w: number[][];
  c: number[][];
  r: number[][];
}

export interface Shape {
  /** 1-based index of the key at the root, or 0 for a failure node. */
  key: number;
  /** For a failure node, which gap it stands for. */
  gap: number;
  left: Shape | null;
  right: Shape | null;
}

export function solve(p: number[], q: number[]): Table {
  const n = p.length;
  const grid = () => Array.from({ length: n + 1 }, () => Array<number>(n + 1).fill(0));
  const [w, c, r] = [grid(), grid(), grid()];
  for (let i = 0; i <= n; i++) w[i]![i] = q[i]!;
  for (let span = 1; span <= n; span++) {
    for (let i = 0; i + span <= n; i++) {
      const j = i + span;
      w[i]![j] = w[i]![j - 1]! + p[j - 1]! + q[j]!;
      let best = Infinity;
      for (let k = i + 1; k <= j; k++) {
        const cost = c[i]![k - 1]! + c[k]![j]!;
        // Ties go to the smaller root, as in the book's tables.
        if (cost < best) {
          best = cost;
          r[i]![j] = k;
        }
      }
      c[i]![j] = w[i]![j]! + best;
    }
  }
  return { w, c, r };
}

/** The optimal tree for keys i+1 … j, or the best one whose root is forced to be `root`. */
export function shapeOf(table: Table, i: number, j: number, root?: number): Shape {
  if (i === j) return { key: 0, gap: i, left: null, right: null };
  const k = root ?? table.r[i]![j]!;
  return { key: k, gap: -1, left: shapeOf(table, i, k - 1), right: shapeOf(table, k, j) };
}

/** Cost of a tree by the definition: each key's weight times its level, each failure's weight times its level less one. */
export function costOf(shape: Shape, p: number[], q: number[], level = 1): number {
  if (!shape.key) return q[shape.gap]! * (level - 1);
  return p[shape.key - 1]! * level + costOf(shape.left!, p, q, level + 1) + costOf(shape.right!, p, q, level + 1);
}

/** The cheapest cost of a tree over all the keys whose root is key k. */
export const costWithRoot = (table: Table, k: number) => {
  const n = table.w.length - 1;
  return table.w[0]![n]! + table.c[0]![k - 1]! + table.c[k]![n]!;
};

export function frameOf(shape: Shape, names: string[], p: number[], q: number[], extra: Partial<TreeFrame> & { note: string }): TreeFrame {
  const nodes: TreeNode[] = [];
  const visit = (at: Shape, parent: string | null, port: number) => {
    if (!at.key) {
      nodes.push({ id: `e${at.gap}`, kind: "bead", cells: [`E${at.gap}`], parent, port, ports: 0, sub: `q ${q[at.gap]}` });
      return;
    }
    const id = `a${at.key}`;
    nodes.push({ id, kind: "plate", cells: [names[at.key - 1]!], parent, port, ports: 2, sub: `p ${p[at.key - 1]}` });
    visit(at.left!, id, 0);
    visit(at.right!, id, 1);
  };
  visit(shape, null, 0);
  return { nodes, pointer: null, ...extra };
}

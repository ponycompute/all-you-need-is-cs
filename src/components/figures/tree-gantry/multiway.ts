// Pure model for 2-3 trees and 2-3-4 trees (Horowitz §10.3, §10.4): balanced search trees
// whose nodes hold one to m - 1 keys. A 2-3 tree splits an overfull node on the way back
// up; a 2-3-4 tree splits every full node it meets on the way down. The same 2-3-4 tree
// can be drawn as a red-black tree (§10.5), which `redBlack` does.

import type { TreeFrame, TreeNode } from "./types";

export const CAPACITY = 14;

export interface Node {
  id: number;
  keys: number[];
  kids: Node[];
}

let nextId = 1;
const make = (keys: number[], kids: Node[] = []): Node => ({ id: nextId++, keys, kids });
const clone = (node: Node): Node => ({ id: node.id, keys: [...node.keys], kids: node.kids.map(clone) });
export const keysOf = (node: Node | null): number[] => (node ? (node.kids.length ? node.kids.flatMap((kid, at) => [...keysOf(kid), ...(at < node.keys.length ? [node.keys[at]!] : [])]) : [...node.keys]) : []);
export const heightOf = (node: Node | null): number => (node ? 1 + (node.kids.length ? heightOf(node.kids[0]!) : 0) : 0);

const plate = (node: Node) => `p${node.id}`;

/** The multiway tree itself: one plate per node, a cell per key. */
export function frameOf(root: Node | null, extra: Omit<TreeFrame, "nodes">): TreeFrame {
  const nodes: TreeNode[] = [];
  const visit = (node: Node, parent: string | null, port: number) => {
    nodes.push({ id: plate(node), kind: "plate", cells: node.keys.map(String), parent, port, ports: Math.max(1, node.kids.length) });
    node.kids.forEach((kid, at) => visit(kid, plate(node), at));
  };
  if (root) visit(root, null, 0);
  return { nodes, pointer: root ? plate(root) : null, ...extra };
}

/**
 * The same tree as a red-black tree: a 2-node is one black node, a 3-node is a black node with
 * a red left child, and a 4-node is a black node with two red children. Red links are drawn heavy.
 */
export function redBlack(root: Node | null, extra: Omit<TreeFrame, "nodes">, touched: number[] = []): TreeFrame {
  const nodes: TreeNode[] = [];
  const coin = (key: number) => `k${key}`;
  const add = (key: number, parent: string | null, port: number, red: boolean) => nodes.push({ id: coin(key), kind: "coin", cells: [String(key)], parent, port, ports: 2, heavy: red });
  const visit = (node: Node, parent: string | null, port: number) => {
    const [a, b, c] = node.keys;
    const kid = (at: number, above: number, side: number) => {
      if (node.kids[at]) visit(node.kids[at]!, coin(above), side);
    };
    if (node.keys.length === 1) {
      add(a!, parent, port, false);
      kid(0, a!, 0);
      kid(1, a!, 1);
    } else if (node.keys.length === 2) {
      add(b!, parent, port, false);
      add(a!, coin(b!), 0, true);
      kid(0, a!, 0);
      kid(1, a!, 1);
      kid(2, b!, 1);
    } else {
      add(b!, parent, port, false);
      add(a!, coin(b!), 0, true);
      add(c!, coin(b!), 1, true);
      kid(0, a!, 0);
      kid(1, a!, 1);
      kid(2, c!, 0);
      kid(3, c!, 1);
    }
  };
  if (root) visit(root, null, 0);
  const lit = extra.lit && touched.length ? coin(touched[0]!) : extra.lit;
  return { nodes, pointer: root ? coin(root.keys[root.keys.length === 1 ? 0 : 1]!) : null, ...extra, lit, on: touched.map(coin) };
}

export interface Shot {
  root: Node | null;
  /** The node the step is about, and the keys it concerns. */
  at: number | null;
  keys: number[];
  note: string;
  count: number;
  hold?: number;
}

export interface Played {
  shots: Shot[];
  root: Node | null;
  note: string;
}

const childFor = (node: Node, key: number) => node.keys.filter((other) => other < key).length;

/** Splits the full child at `at` of `parent` (or the root, when parent is null): its middle key moves up. */
function split(parent: Node | null, at: number, node: Node): Node {
  // Either way round, the node being split holds three keys: the middle one moves up.
  const middle = 1;
  const up = node.keys[middle]!;
  const right = make(node.keys.slice(middle + 1), node.kids.slice(middle + 1));
  node.keys = node.keys.slice(0, middle);
  node.kids = node.kids.slice(0, middle + 1);
  if (!parent) return make([up], [node, right]);
  parent.keys.splice(at, 0, up);
  parent.kids.splice(at + 1, 0, right);
  return parent;
}

/** Inserts into a tree of the given order: 3 for a 2-3 tree (split going up), 4 for a 2-3-4 tree (split going down). */
export function insert(from: Node | null, key: number, order: 3 | 4): Played {
  if (keysOf(from).includes(key)) return { shots: [], root: from, note: `${key} is already in the tree.` };
  if (keysOf(from).length >= CAPACITY) return { shots: [], root: from, note: `The gantry holds ${CAPACITY} keys.` };
  let root = from ? clone(from) : null;
  const shots: Shot[] = [];
  let splits = 0;
  const shot = (at: Node | null, keys: number[], note: string, hold?: number) => shots.push({ root: root ? clone(root) : null, at: at?.id ?? null, keys, note, count: splits, hold });
  if (!root) {
    root = make([key]);
    shot(root, [key], `${key} is the first key`);
    return { shots, root, note: `Inserted ${key} into an empty tree.` };
  }

  if (order === 4) {
    // Top-down: a full node met on the way is split before going further, so the leaf always has room.
    if (root.keys.length === 3) {
      shot(root, root.keys, `the root is a 4-node: split it first`, 0.6);
      root = split(null, 0, root);
      splits++;
      shot(root, root.keys, `${root.keys[0]} moves up into a new root: the tree is one level taller`);
    }
    let at = root;
    while (at.kids.length) {
      const index = childFor(at, key);
      const kid = at.kids[index]!;
      if (kid.keys.length === 3) {
        shot(kid, kid.keys, `the next node down is a 4-node: split it first`, 0.6);
        split(at, index, kid);
        splits++;
        shot(at, [at.keys[index]!], `${at.keys[index]} moves up into its parent`);
        at = at.kids[childFor(at, key)]!;
      } else {
        shot(at, [], `${key} belongs in subtree ${index + 1} of this node`, 0.5);
        at = kid;
      }
    }
    at.keys.splice(childFor(at, key), 0, key);
    shot(at, [key], `${key} goes into the leaf, which has room`);
    return { shots, root, note: `Inserted ${key}${splits ? `, splitting ${splits} full ${splits === 1 ? "node" : "nodes"} on the way down` : ""}.` };
  }

  // Bottom-up: put the key in its leaf, then split upward while a node holds three keys.
  const path: Node[] = [];
  let at = root;
  for (;;) {
    path.push(at);
    if (!at.kids.length) break;
    shot(at, [], `${key} belongs in subtree ${childFor(at, key) + 1} of this node`, 0.5);
    at = at.kids[childFor(at, key)]!;
  }
  at.keys.splice(childFor(at, key), 0, key);
  shot(at, [key], at.keys.length === 3 ? `${key} goes into the leaf, which now holds three keys: one too many` : `${key} goes into the leaf, which has room`);
  for (let level = path.length - 1; level >= 0 && path[level]!.keys.length === 3; level--) {
    const node = path[level]!;
    const parent = level ? path[level - 1]! : null;
    const up = node.keys[1]!;
    if (parent) split(parent, parent.kids.indexOf(node), node);
    else root = split(null, 0, node);
    splits++;
    shot(parent ?? root, [up], parent ? `split: ${up} moves up into the parent${parent.keys.length === 3 ? ", which is now overfull too" : ""}` : `split: ${up} moves up into a new root, and the tree is one level taller`);
  }
  return { shots, root, note: `Inserted ${key}${splits ? ` with ${splits} ${splits === 1 ? "split" : "splits"}` : ""}.` };
}

export function search(from: Node | null, key: number): Played {
  const shots: Shot[] = [];
  let reads = 0;
  for (let at = from; at; at = at.kids[childFor(at, key)] ?? null) {
    reads++;
    const found = at.keys.includes(key);
    shots.push({ root: from, at: at.id, keys: found ? [key] : [], note: found ? `${key} is in this node` : at.kids.length ? `not here: ${key} belongs in subtree ${childFor(at, key) + 1}` : `${key} is not in the tree`, count: reads, hold: 0.6 });
    if (found) return { shots, root: from, note: `Found ${key} after reading ${reads} ${reads === 1 ? "node" : "nodes"}.` };
  }
  return { shots, root: from, note: `${key} is not in the tree: ${reads} nodes read, one per level.` };
}

export function build(keys: number[], order: 3 | 4): Node | null {
  let root: Node | null = null;
  for (const key of keys) root = insert(root, key, order).root;
  return root;
}

/** True when the keys are in order, every node holds 1 to order - 1 keys, and every leaf is on the same level. */
export function holds(root: Node | null, order: number): boolean {
  if (!root) return true;
  const keys = keysOf(root);
  if (keys.some((key, at) => at > 0 && keys[at - 1]! >= key)) return false;
  let leafLevel = -1;
  const visit = (node: Node, level: number): boolean => {
    if (node.keys.length < 1 || node.keys.length > order - 1) return false;
    if (!node.kids.length) {
      if (leafLevel < 0) leafLevel = level;
      return leafLevel === level;
    }
    return node.kids.length === node.keys.length + 1 && node.kids.every((kid) => visit(kid, level + 1));
  };
  return visit(root, 0);
}

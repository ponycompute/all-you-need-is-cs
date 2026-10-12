// Pure model for min-leftist trees (Horowitz §9.3). Combining two trees is played the way
// it is done by hand: merge the two right paths by key, then walk back up swapping the
// children of every node whose right side has become the deeper one.

import type { TreeFrame, TreeNode } from "./types";

export const CAPACITY = 10;

export interface Node {
  key: number;
  left: Node | null;
  right: Node | null;
}

const id = (key: number) => `k${key}`;
const clone = (node: Node | null): Node | null => (node ? { key: node.key, left: clone(node.left), right: clone(node.right) } : null);
/** shortest(x): the length of the shortest path from x to a missing child. */
export const shortest = (node: Node | null): number => (node ? 1 + Math.min(shortest(node.left), shortest(node.right)) : 0);
export const keysOf = (node: Node | null): number[] => (node ? [node.key, ...keysOf(node.left), ...keysOf(node.right)] : []);

/** Several trees side by side on the gantry, each node showing its shortest(). */
export function frameOf(trees: Array<Node | null>, extra: Omit<TreeFrame, "nodes">): TreeFrame {
  const nodes: TreeNode[] = [];
  const visit = (node: Node | null, parent: string | null, port: number) => {
    if (!node) return;
    nodes.push({ id: id(node.key), kind: "coin", cells: [String(node.key)], parent, port, ports: 2, sub: `s ${shortest(node)}` });
    visit(node.left, id(node.key), 0);
    visit(node.right, id(node.key), 1);
  };
  for (const tree of trees) visit(tree, null, 0);
  const first = trees.find((tree) => tree !== null);
  return { nodes, pointer: first ? id(first.key) : null, ...extra };
}

export interface Played {
  frames: TreeFrame[];
  tree: Node | null;
  note: string;
}

/** Combines two min-leftist trees; `frames` receives one frame per link and per swap. */
function combine(a: Node | null, b: Node | null, frames: TreeFrame[], count: { steps: number }): Node | null {
  if (!a || !b) return a ?? b;
  // Phase one: the two right paths are merged into one, smallest root first.
  let [restA, restB]: Array<Node | null> = [a, b];
  let result: Node | null = null;
  const path: Node[] = [];
  while (restA || restB) {
    const takeA: boolean = !restB || (restA !== null && restA.key <= restB.key);
    const taken: Node = takeA ? restA! : restB!;
    const rest = taken.right;
    taken.right = null;
    if (takeA) restA = rest;
    else restB = rest;
    if (path.length) path[path.length - 1]!.right = taken;
    else result = taken;
    path.push(taken);
    count.steps++;
    frames.push(
      frameOf([result, restA, restB], {
        lit: id(taken.key),
        count: count.steps,
        note: path.length === 1 ? `${taken.key} is the smaller root: it heads the merged right path` : `${taken.key} is the next smallest: it goes on the right of ${path[path.length - 2]!.key}`,
      }),
    );
  }
  // Phase two: back up the merged path, swapping children wherever the right side is now deeper.
  for (let at = path.length - 1; at >= 0; at--) {
    const node = path[at]!;
    if (shortest(node.left) >= shortest(node.right)) continue;
    [node.left, node.right] = [node.right, node.left];
    count.steps++;
    frames.push(frameOf([result], { lit: id(node.key), count: count.steps, note: `at ${node.key} the right side was deeper: swap its children` }));
  }
  return result;
}

export function insert(from: Node | null, key: number): Played {
  if (keysOf(from).includes(key)) return { frames: [], tree: from, note: `${key} is already in the tree.` };
  if (keysOf(from).length >= CAPACITY) return { frames: [], tree: from, note: `The gantry holds ${CAPACITY} keys.` };
  const tree = clone(from);
  const single: Node = { key, left: null, right: null };
  const frames: TreeFrame[] = [frameOf([tree, single], { lit: id(key), count: 0, note: `insert ${key}: a one-node tree to combine with the first` })];
  const count = { steps: 0 };
  const result = combine(tree, single, frames, count);
  frames.push(frameOf([result], { count: count.steps, note: `min ${result!.key}`, hold: 0.2 }));
  return { frames, tree: result, note: `Inserted ${key} by combining it with the tree: ${count.steps} steps along the right paths.` };
}

export function deleteMin(from: Node | null): Played {
  if (!from) return { frames: [], tree: null, note: "The tree is empty." };
  const tree = clone(from)!;
  const frames: TreeFrame[] = [frameOf([tree], { lit: id(tree.key), count: 0, note: `delete-min: remove the root ${tree.key}`, hold: 0.6 })];
  frames.push(frameOf([tree.left, tree.right], { count: 0, note: "its two subtrees are left: combine them" }));
  const count = { steps: 0 };
  const result = combine(tree.left, tree.right, frames, count);
  frames.push(frameOf([result], { count: count.steps, note: result ? `min ${result.key}` : "empty", hold: 0.2 }));
  return { frames, tree: result, note: `Deleted the minimum, ${tree.key}; its two subtrees were combined in ${count.steps} steps.` };
}

/** Combines the tree with a second one, shown beside it first. */
export function meld(from: Node | null, other: Node | null): Played {
  const tree = clone(from);
  const second = clone(other);
  const frames: TreeFrame[] = [frameOf([tree, second], { count: 0, note: "two min-leftist trees", hold: 1 })];
  const count = { steps: 0 };
  const result = combine(tree, second, frames, count);
  frames.push(frameOf([result], { count: count.steps, note: result ? `min ${result.key}` : "empty", hold: 0.2 }));
  return { frames, tree: result, note: `Combined the two trees in ${count.steps} steps: only their right paths were walked.` };
}

export function build(keys: number[]): Node | null {
  let tree: Node | null = null;
  for (const key of keys) tree = insert(tree, key).tree;
  return tree;
}

/** True when the tree is a min tree and at every node the left side is at least as deep (by shortest) as the right. */
export function holds(node: Node | null): boolean {
  if (!node) return true;
  for (const child of [node.left, node.right]) if (child && child.key < node.key) return false;
  return shortest(node.left) >= shortest(node.right) && holds(node.left) && holds(node.right);
}

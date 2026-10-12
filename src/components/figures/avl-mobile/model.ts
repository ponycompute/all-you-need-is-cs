// Pure model for the AVL mobile (Horowitz §10.2). An insertion returns the
// frames the mobile plays back: the search path, the unbalanced tree, and each
// single rotation of the repair, so the drawing never invents a move.

export type RotationKind = "LL" | "RR" | "LR" | "RL";

export interface Hung {
  key: number;
  /** In-order position, 0 for the smallest key. A rotation never changes it. */
  rank: number;
  /** Level below the root, 0 for the root. */
  depth: number;
  /** Height of the subtree hanging here; a leaf is 1. */
  height: number;
  /** Left height minus right height. */
  balance: number;
  parent: number | null;
  left: number | null;
  right: number | null;
}

export type Tree = Hung[];

export type FrameKind = "seek" | "hang" | "tip" | "turn" | "settle";

export interface Frame {
  kind: FrameKind;
  tree: Tree;
  /** The key being inserted. */
  key: number;
  /** seek: the key it is held against. tip and turn: the node whose balance broke. */
  at: number | null;
  /** The repair this insertion needs, once known. */
  rotation: RotationKind | null;
}

export const CAPACITY = 11;

interface Node {
  key: number;
  left: Node | null;
  right: Node | null;
}

const heightOf = (node: Node | null): number => (node ? 1 + Math.max(heightOf(node.left), heightOf(node.right)) : 0);

const clone = (node: Node | null): Node | null => (node ? { key: node.key, left: clone(node.left), right: clone(node.right) } : null);

function snapshot(root: Node | null): Tree {
  const tree: Tree = [];
  let rank = 0;
  const visit = (node: Node | null, depth: number, parent: number | null) => {
    if (!node) return;
    visit(node.left, depth + 1, node.key);
    const left = heightOf(node.left);
    const right = heightOf(node.right);
    tree.push({
      key: node.key,
      rank: rank++,
      depth,
      height: 1 + Math.max(left, right),
      balance: left - right,
      parent,
      left: node.left?.key ?? null,
      right: node.right?.key ?? null,
    });
    visit(node.right, depth + 1, node.key);
  };
  visit(root, 0, null);
  return tree;
}

function rebuild(tree: Tree): Node | null {
  const byKey = new Map(tree.map((hung) => [hung.key, hung]));
  const make = (key: number | null): Node | null => {
    if (key === null) return null;
    const hung = byKey.get(key)!;
    return { key, left: make(hung.left), right: make(hung.right) };
  };
  return make(tree.find((hung) => hung.parent === null)?.key ?? null);
}

function rotateRight(top: Node): Node {
  const pivot = top.left!;
  top.left = pivot.right;
  pivot.right = top;
  return pivot;
}

function rotateLeft(top: Node): Node {
  const pivot = top.right!;
  top.right = pivot.left;
  pivot.left = top;
  return pivot;
}

/** Replaces `old` under its parent (or as the root) and returns the root. */
function graft(root: Node, old: Node, next: Node): Node {
  if (root === old) return next;
  let at: Node | null = root;
  while (at) {
    if (at.left === old) at.left = next;
    else if (at.right === old) at.right = next;
    else {
      at = old.key < at.key ? at.left : at.right;
      continue;
    }
    break;
  }
  return root;
}

export const rootOf = (tree: Tree) => tree.find((hung) => hung.parent === null) ?? null;
export const has = (tree: Tree, key: number) => tree.some((hung) => hung.key === key);

/** The worst height an AVL tree of n keys can reach: the largest h with N(h) <= n, N(h) = N(h-1) + N(h-2) + 1. */
export function heightLimit(count: number) {
  let [small, large, height] = [0, 1, 0];
  while (large <= count) {
    [small, large] = [large, small + large + 1];
    height++;
  }
  return height;
}

export function insert(tree: Tree, key: number): Frame[] {
  if (has(tree, key) || tree.length >= CAPACITY) return [];
  const frames: Frame[] = [];
  let root = rebuild(tree);
  const path: Node[] = [];
  for (let at = root; at; at = key < at.key ? at.left : at.right) {
    path.push(at);
    frames.push({ kind: "seek", tree, key, at: at.key, rotation: null });
  }
  const leaf: Node = { key, left: null, right: null };
  const last = path[path.length - 1];
  if (!last) root = leaf;
  else if (key < last.key) last.left = leaf;
  else last.right = leaf;
  const hung = snapshot(root);
  frames.push({ kind: "hang", tree: hung, key, at: null, rotation: null });

  // The lowest ancestor whose balance is now ±2 is the only node that needs repair.
  const broken = [...path].reverse().find((node) => Math.abs(heightOf(node.left) - heightOf(node.right)) > 1);
  if (!broken) return frames;
  const leftHeavy = heightOf(broken.left) > heightOf(broken.right);
  const child = leftHeavy ? broken.left! : broken.right!;
  const inner = leftHeavy ? key > child.key : key < child.key;
  const rotation: RotationKind = leftHeavy ? (inner ? "LR" : "LL") : inner ? "RL" : "RR";
  frames.push({ kind: "tip", tree: hung, key, at: broken.key, rotation });
  if (inner) {
    if (leftHeavy) broken.left = rotateLeft(child);
    else broken.right = rotateRight(child);
    frames.push({ kind: "turn", tree: snapshot(clone(root)), key, at: broken.key, rotation });
  }
  root = graft(root!, broken, leftHeavy ? rotateRight(broken) : rotateLeft(broken));
  frames.push({ kind: "turn", tree: snapshot(root), key, at: broken.key, rotation });
  frames.push({ kind: "settle", tree: snapshot(root), key, at: null, rotation });
  return frames;
}

export function build(keys: number[]): Tree {
  let tree: Tree = [];
  for (const key of keys) {
    const frames = insert(tree, key);
    if (frames.length) tree = frames[frames.length - 1]!.tree;
  }
  return tree;
}

/** True when the tree is a search tree in which every balance is -1, 0 or 1; used by the checks. */
export function holds(tree: Tree) {
  const sorted = [...tree].sort((a, b) => a.rank - b.rank);
  for (let index = 1; index < sorted.length; index++) if (sorted[index - 1]!.key >= sorted[index]!.key) return false;
  return tree.every((hung) => Math.abs(hung.balance) <= 1);
}

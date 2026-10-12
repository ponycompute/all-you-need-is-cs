// Pure model for the splay tree (Horowitz §10.7): an ordinary binary search tree in which
// every access ends by rotating the accessed node to the root. Each operation returns the
// frames the gantry plays back.

import type { TreeFrame, TreeNode } from "./types";

export const CAPACITY = 9;

export interface Node {
  key: number;
  left: Node | null;
  right: Node | null;
}

const clone = (node: Node | null): Node | null => (node ? { key: node.key, left: clone(node.left), right: clone(node.right) } : null);
const id = (key: number) => `k${key}`;

export function keysOf(root: Node | null): number[] {
  return root ? [...keysOf(root.left), root.key, ...keysOf(root.right)] : [];
}

export function heightOf(root: Node | null): number {
  return root ? 1 + Math.max(heightOf(root.left), heightOf(root.right)) : 0;
}

/** The tree as tags on the gantry. */
export function frameOf(root: Node | null, extra: Omit<TreeFrame, "nodes">): TreeFrame {
  const nodes: TreeNode[] = [];
  const visit = (node: Node | null, parent: string | null, port: number) => {
    if (!node) return;
    nodes.push({ id: id(node.key), kind: "coin", cells: [String(node.key)], parent, port, ports: 2 });
    visit(node.left, id(node.key), 0);
    visit(node.right, id(node.key), 1);
  };
  visit(root, null, 0);
  return { nodes, pointer: root ? id(root.key) : null, ...extra };
}

/** The nodes from the root down to `key`, or down to where the search for it falls off. */
function pathTo(root: Node | null, key: number): Node[] {
  const path: Node[] = [];
  for (let at = root; at; at = key < at.key ? at.left : at.right) {
    path.push(at);
    if (at.key === key) break;
  }
  return path;
}

/** Rotates `child` up over `parent`; `above` is the parent's own parent, or null when the parent is the root. */
function rotate(child: Node, parent: Node, above: Node | null): void {
  if (parent.left === child) {
    parent.left = child.right;
    child.right = parent;
  } else {
    parent.right = child.left;
    child.left = parent;
  }
  if (above) {
    if (above.left === parent) above.left = child;
    else above.right = child;
  }
}

/** Splays the node with `key` to the root, one zig, zig-zig or zig-zag at a time; returns the new root. */
function splay(root: Node, key: number, frames: TreeFrame[], count: { rotations: number }): Node {
  let top = root;
  for (;;) {
    const path = pathTo(top, key);
    const at = path[path.length - 1]!;
    if (path.length === 1) return top;
    const parent = path[path.length - 2]!;
    const grand = path[path.length - 3] ?? null;
    const great = path[path.length - 4] ?? null;
    let name: string;
    if (!grand) {
      rotate(at, parent, null);
      count.rotations += 1;
      name = `zig: ${at.key} is a child of the root, one rotation`;
    } else {
      const straight = (grand.left === parent) === (parent.left === at);
      if (straight) {
        // Same side twice: turn the parent over the grandparent first, then the node over the parent.
        rotate(parent, grand, great);
        rotate(at, parent, great);
        name = `zig-zig: ${at.key}, ${parent.key}, ${grand.key} lie in a line`;
      } else {
        rotate(at, parent, grand);
        rotate(at, grand, great);
        name = `zig-zag: ${at.key} lies inside ${parent.key} and ${grand.key}`;
      }
      count.rotations += 2;
    }
    // A step that reached the top of the tree makes the node the new root.
    if (!grand || !great) top = at;
    frames.push(frameOf(top, { lit: id(key), note: name, count: count.rotations }));
  }
}

export interface Played {
  frames: TreeFrame[];
  root: Node | null;
  /** What happened, for the line under the figure. */
  note: string;
}

function descend(root: Node | null, key: number, frames: TreeFrame[], verb: string) {
  for (const node of pathTo(root, key)) {
    const where = key === node.key ? `found ${key}` : `${key} ${key < node.key ? "<" : ">"} ${node.key}: go ${key < node.key ? "left" : "right"}`;
    frames.push(frameOf(root, { on: [id(node.key)], note: `${verb} ${key}: ${where}`, count: 0, hold: 0.5 }));
  }
}

/** Searches for a key, then splays it (or the last node the search touched) to the root. */
export function search(from: Node | null, key: number): Played {
  const root = clone(from);
  if (!root) return { frames: [], root, note: "The tree is empty." };
  const frames: TreeFrame[] = [];
  descend(root, key, frames, "search");
  const path = pathTo(root, key);
  const last = path[path.length - 1]!;
  const count = { rotations: 0 };
  const top = splay(root, last.key, frames, count);
  const found = last.key === key;
  const note = found ? `Found ${key}; ${count.rotations} rotations brought it to the root.` : `${key} is not in the tree; the last key reached, ${last.key}, was splayed instead.`;
  frames.push(frameOf(top, { note: found ? `${key} is the root` : `${last.key} is the root`, count: count.rotations, hold: 0.2 }));
  return { frames, root: top, note };
}

/** Inserts a key as in any binary search tree, then splays it to the root. */
export function insert(from: Node | null, key: number): Played {
  const root = clone(from);
  if (keysOf(root).includes(key)) return { frames: [], root, note: `${key} is already in the tree.` };
  if (keysOf(root).length >= CAPACITY) return { frames: [], root, note: `The gantry holds ${CAPACITY} keys.` };
  const frames: TreeFrame[] = [];
  const fresh: Node = { key, left: null, right: null };
  if (!root) {
    frames.push(frameOf(fresh, { lit: id(key), note: `${key} is the root`, count: 0 }));
    return { frames, root: fresh, note: `Inserted ${key} as the root.` };
  }
  descend(root, key, frames, "insert");
  const path = pathTo(root, key);
  const last = path[path.length - 1]!;
  if (key < last.key) last.left = fresh;
  else last.right = fresh;
  frames.push(frameOf(root, { lit: id(key), note: `${key} hangs under ${last.key}`, count: 0 }));
  const count = { rotations: 0 };
  const top = splay(root, key, frames, count);
  frames.push(frameOf(top, { note: `${key} is the root`, count: count.rotations, hold: 0.2 }));
  return { frames, root: top, note: `Inserted ${key}; ${count.rotations} rotations brought it to the root.` };
}

/** An ordinary binary search tree of the keys, inserted in the order given and not splayed: a starting point. */
export function plain(keys: number[]): Node | null {
  let root: Node | null = null;
  for (const key of keys) {
    const fresh: Node = { key, left: null, right: null };
    const path = pathTo(root, key);
    const last = path[path.length - 1];
    if (!last) root = fresh;
    else if (key < last.key) last.left = fresh;
    else if (key > last.key) last.right = fresh;
  }
  return root;
}

// Pure model for the digital search structures (Horowitz §10.8): the same set of four-bit
// keys as a digital search tree, a binary trie, and that trie with its one-child branches
// compressed away. Each view returns the frames the gantry plays back.

import type { TreeFrame, TreeNode } from "./types";

export const BITS = 4;
export const CAPACITY = 7;
export type View = "digital" | "trie" | "compressed";

export const bitsOf = (key: number) => key.toString(2).padStart(BITS, "0");
/** Bit i of a key, counting from 1 at the left. */
const bit = (key: number, index: number) => (key >> (BITS - index)) & 1;
const leaf = (key: number) => `k${key}`;

// ---------------------------------------------------------------------------
// Digital search tree: a key in every node; level i branches on bit i.
// ---------------------------------------------------------------------------

interface Slot {
  key: number;
  parent: number | null;
  side: number;
  depth: number;
}

/** Where each key sits, given the order the keys were inserted in. */
function digitalSlots(order: number[]): Slot[] {
  const slots: Slot[] = [];
  const children = new Map<string, number>();
  for (const key of order) {
    let parent: number | null = null;
    let side = 0;
    let depth = 0;
    let at: number | undefined = slots[0]?.key;
    while (at !== undefined) {
      parent = at;
      depth++;
      side = bit(key, depth);
      at = children.get(`${parent}/${side}`);
    }
    if (parent !== null) children.set(`${parent}/${side}`, key);
    slots.push({ key, parent, side, depth });
  }
  return slots;
}

function digitalNodes(order: number[]): TreeNode[] {
  return digitalSlots(order).map((slot) => ({
    id: leaf(slot.key),
    kind: "coin",
    cells: [bitsOf(slot.key)],
    parent: slot.parent === null ? null : leaf(slot.parent),
    port: slot.side,
    ports: 2,
    via: slot.parent === null ? undefined : String(slot.side),
  }));
}

/** The keys a search for `key` is compared with, root first. */
function digitalPath(order: number[], key: number): number[] {
  const slots = digitalSlots(order);
  const path: number[] = [];
  let at: Slot | undefined = slots[0];
  let depth = 0;
  while (at) {
    path.push(at.key);
    if (at.key === key) break;
    depth++;
    const side = bit(key, depth);
    const here: number = at.key;
    at = slots.find((slot) => slot.parent === here && slot.side === side);
  }
  return path;
}

// ---------------------------------------------------------------------------
// Binary trie: branch nodes only test a bit; keys sit in the leaves.
// ---------------------------------------------------------------------------

/** The trie of a key set, as nodes: a branch for every prefix shared by two or more keys, a leaf where one key is left. */
function trieNodes(keys: number[], compressed: boolean): TreeNode[] {
  const nodes: TreeNode[] = [];
  const grow = (group: number[], depth: number, parent: string | null, side: number, prefix: string) => {
    if (!group.length) return;
    const via = parent === null ? undefined : String(side);
    if (group.length === 1) {
      nodes.push({ id: leaf(group[0]!), kind: "coin", cells: [bitsOf(group[0]!)], parent, port: side, ports: 2, via });
      return;
    }
    const zeros = group.filter((key) => !bit(key, depth + 1));
    const ones = group.filter((key) => bit(key, depth + 1));
    // A branch that every key leaves the same way separates nothing: the compressed trie skips it.
    if (compressed && (!zeros.length || !ones.length)) {
      grow(group, depth + 1, parent, side, prefix + (zeros.length ? "0" : "1"));
      return;
    }
    const id = `b${prefix}`;
    nodes.push({ id, kind: "bead", cells: [String(depth + 1)], parent, port: side, ports: 2, via });
    grow(zeros, depth + 1, id, 0, prefix + "0");
    grow(ones, depth + 1, id, 1, prefix + "1");
  };
  grow([...keys].sort((a, b) => a - b), 0, null, 0, "");
  return nodes;
}

/** The nodes a search for `key` visits in a trie, top first. */
function triePath(nodes: TreeNode[], key: number): TreeNode[] {
  const path: TreeNode[] = [];
  let at = nodes.find((node) => node.parent === null);
  while (at) {
    path.push(at);
    if (at.kind !== "bead") break;
    const side = bit(key, Number(at.cells[0]));
    const here: string = at.id;
    at = nodes.find((node) => node.parent === here && node.port === side);
  }
  return path;
}

// ---------------------------------------------------------------------------

export const nodesOf = (view: View, order: number[]): TreeNode[] => (view === "digital" ? digitalNodes(order) : trieNodes(order, view === "compressed"));

const NAMES: Record<View, string> = { digital: "digital search tree", trie: "binary trie", compressed: "compressed trie" };

export function restOf(view: View, order: number[]): TreeFrame {
  return { nodes: nodesOf(view, order), note: `${NAMES[view]} · ${order.length} keys`, count: 0, pointer: null };
}

/** Searches for a key in the given view; the counter counts whole-key comparisons. */
export function search(view: View, order: number[], key: number): { frames: TreeFrame[]; note: string } {
  const nodes = nodesOf(view, order);
  const frames: TreeFrame[] = [];
  const text = bitsOf(key);
  let compares = 0;
  if (view === "digital") {
    const path = digitalPath(order, key);
    path.forEach((at, depth) => {
      compares++;
      const found = at === key;
      const next = depth + 1;
      frames.push({
        nodes,
        on: [leaf(at)],
        lit: found ? leaf(at) : null,
        count: compares,
        note: found ? `${text} = ${bitsOf(at)}: found` : `${text} ≠ ${bitsOf(at)}; bit ${next} is ${bit(key, next)}: go ${bit(key, next) ? "right" : "left"}`,
      });
    });
    const found = path[path.length - 1] === key;
    return { frames, note: found ? `Found ${text} after comparing ${compares} whole ${compares === 1 ? "key" : "keys"}.` : `${text} is not there: ${compares} whole keys compared before the search fell off.` };
  }
  const path = triePath(nodes, key);
  for (const at of path) {
    if (at.kind === "bead") {
      const index = Number(at.cells[0]);
      frames.push({ nodes, on: [at.id], count: 0, note: `bit ${index} of ${text} is ${bit(key, index)}: go ${bit(key, index) ? "right" : "left"}`, hold: 0.55 });
    } else {
      compares = 1;
      const found = at.id === leaf(key);
      frames.push({ nodes, on: [at.id], lit: found ? at.id : null, count: 1, note: found ? `${text} = ${at.cells[0]}: found` : `${text} ≠ ${at.cells[0]}: not there` });
    }
  }
  const last = path[path.length - 1];
  const found = last?.id === leaf(key);
  if (last?.kind === "bead" || !last) return { frames, note: `${text} is not there: the search ran off the trie without comparing a single whole key.` };
  return { frames, note: found ? `Found ${text}: ${path.length - 1} bit tests, then one whole-key comparison.` : `${text} is not there: one whole-key comparison, at the leaf, settled it.` };
}

/** Adds a key and shows where it ends up in the given view. */
export function insert(view: View, order: number[], key: number): { frames: TreeFrame[]; order: number[]; note: string } {
  const text = bitsOf(key);
  if (order.includes(key)) return { frames: [], order, note: `${text} is already there.` };
  if (order.length >= CAPACITY) return { frames: [], order, note: `The gantry holds ${CAPACITY} keys.` };
  const next = [...order, key];
  const nodes = nodesOf(view, next);
  const frames: TreeFrame[] = [];
  if (view === "digital") {
    const path = digitalPath(next, key);
    path.slice(0, -1).forEach((at, depth) => frames.push({ nodes: nodesOf(view, order), on: [leaf(at)], count: depth + 1, note: `${text} ≠ ${bitsOf(at)}; bit ${depth + 1} is ${bit(key, depth + 1)}: go ${bit(key, depth + 1) ? "right" : "left"}`, hold: 0.55 }));
    frames.push({ nodes, lit: leaf(key), count: path.length - 1, note: `${text} takes the empty place` });
    return { frames, order: next, note: `Inserted ${text} at level ${path.length}; ${path.length - 1} whole keys were compared on the way.` };
  }
  frames.push({ nodes, lit: leaf(key), count: 0, note: `${text} is a new leaf` });
  for (const at of triePath(nodes, key)) if (at.kind === "bead") frames.push({ nodes, on: [at.id], lit: leaf(key), count: 0, note: `bit ${at.cells[0]} of ${text} is ${bit(key, Number(at.cells[0]))}`, hold: 0.5 });
  const depth = triePath(nodes, key).length - 1;
  return { frames, order: next, note: `Inserted ${text}: it hangs under ${depth} bit ${depth === 1 ? "test" : "tests"}.` };
}

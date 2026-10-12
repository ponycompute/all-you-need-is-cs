// Pure model for the two lazy mergeable heaps of Horowitz §9.4 and §9.5: a binomial heap
// and a Fibonacci heap are both a list of min-trees with a pointer to the smallest root.
// Insert and combine only add to the list; delete-min pays for the tidying, by linking
// trees of equal degree. A Fibonacci heap adds decrease-key, with cuts and marks.

import type { TreeFrame, TreeNode } from "./types";

export const CAPACITY = 12;

export interface Tree {
  id: number;
  key: number;
  kids: Tree[];
  /** Fibonacci heaps only: this node has lost a child since it last became a child itself. */
  marked: boolean;
}

export interface Heap {
  roots: Tree[];
  /** Index of the smallest root, or -1 when the heap is empty. */
  min: number;
}

const tag = (tree: Tree) => `n${tree.id}`;
const cloneTree = (tree: Tree): Tree => ({ ...tree, kids: tree.kids.map(cloneTree) });
const clone = (heap: Heap): Heap => ({ roots: heap.roots.map(cloneTree), min: heap.min });
const smallest = (roots: Tree[]) => roots.reduce((best, tree, at) => (best < 0 || tree.key < roots[best]!.key ? at : best), -1);
const sizeOf = (tree: Tree): number => 1 + tree.kids.reduce((sum, kid) => sum + sizeOf(kid), 0);

export const empty = (): Heap => ({ roots: [], min: -1 });
export const countOf = (heap: Heap) => heap.roots.reduce((sum, tree) => sum + sizeOf(tree), 0);
export function keysOf(heap: Heap): number[] {
  const keys: number[] = [];
  const visit = (tree: Tree) => {
    keys.push(tree.key);
    tree.kids.forEach(visit);
  };
  heap.roots.forEach(visit);
  return keys;
}

/** The root list on the gantry: every root hangs from the rail, the pointer stands over the minimum, roots show their degree. */
export function frameOf(heap: Heap, extra: Omit<TreeFrame, "nodes" | "pointer">, marks: boolean): TreeFrame {
  const nodes: TreeNode[] = [];
  const visit = (tree: Tree, parent: string | null, port: number) => {
    nodes.push({ id: tag(tree), kind: "coin", cells: [String(tree.key)], parent, port, ports: Math.max(1, tree.kids.length), sub: parent === null ? `d ${tree.kids.length}` : undefined, marked: marks && tree.marked });
    tree.kids.forEach((kid, at) => visit(kid, tag(tree), at));
  };
  heap.roots.forEach((tree) => visit(tree, null, 0));
  return { nodes, pointer: heap.min >= 0 ? tag(heap.roots[heap.min]!) : null, ...extra };
}

export interface Played {
  frames: TreeFrame[];
  heap: Heap;
  note: string;
}

let nextId = 1;
const fresh = (key: number): Tree => ({ id: nextId++, key, kids: [], marked: false });

export function insert(from: Heap, key: number, marks: boolean): Played {
  if (keysOf(from).includes(key)) return { frames: [], heap: from, note: `${key} is already in the heap.` };
  if (countOf(from) >= CAPACITY) return { frames: [], heap: from, note: `The gantry holds ${CAPACITY} keys.` };
  const heap = clone(from);
  const tree = fresh(key);
  heap.roots.push(tree);
  heap.min = smallest(heap.roots);
  const moved = heap.roots[heap.min] === tree;
  const frames = [frameOf(heap, { lit: tag(tree), count: 0, note: `${key} joins the root list as a one-node tree${moved ? "; it is the new minimum" : ""}` }, marks)];
  return { frames, heap, note: `Inserted ${key}: one tree added to the root list, nothing linked.` };
}

/** Joins a second heap's root list onto the first. */
export function combine(from: Heap, keys: number[], marks: boolean): Played {
  const heap = clone(from);
  let other = empty();
  for (const key of keys) other = insert(other, key, marks).heap;
  if (keys.length > 1) other = deleteMin(insert(other, -1, marks).heap, marks).heap;
  const before = frameOf({ roots: [...heap.roots, ...other.roots], min: heap.min }, { on: other.roots.map(tag), count: 0, note: "a second heap, beside the first", hold: 1 }, marks);
  heap.roots.push(...other.roots);
  heap.min = smallest(heap.roots);
  const frames = [before, frameOf(heap, { count: 0, note: "combine: the two root lists are joined, and the smaller minimum kept" }, marks)];
  return { frames, heap, note: "Combined the two heaps by joining their root lists: O(1), no tree was linked." };
}

/** Links trees of equal degree until every root has a different degree; one frame per link. */
function consolidate(heap: Heap, frames: TreeFrame[], marks: boolean, count: { links: number }) {
  for (;;) {
    const seen = new Map<number, number>();
    let pair: [number, number] | null = null;
    heap.roots.some((tree, at) => {
      const other = seen.get(tree.kids.length);
      if (other !== undefined) pair = [other, at];
      else seen.set(tree.kids.length, at);
      return pair !== null;
    });
    if (!pair) return;
    const [a, b] = pair as [number, number];
    const [top, under] = heap.roots[a]!.key < heap.roots[b]!.key ? [heap.roots[a]!, heap.roots[b]!] : [heap.roots[b]!, heap.roots[a]!];
    const degree = top.kids.length;
    under.marked = false;
    top.kids.push(under);
    heap.roots = heap.roots.filter((tree) => tree !== under);
    heap.min = -1;
    count.links++;
    frames.push(frameOf(heap, { lit: tag(under), on: [tag(top)], count: count.links, note: `two roots of degree ${degree}: ${under.key} goes under ${top.key}` }, marks));
  }
}

export function deleteMin(from: Heap, marks: boolean): Played {
  if (from.min < 0) return { frames: [], heap: from, note: "The heap is empty." };
  const heap = clone(from);
  const gone = heap.roots[heap.min]!;
  const frames: TreeFrame[] = [frameOf(heap, { lit: tag(gone), count: 0, note: `delete-min: remove the smallest root, ${gone.key}`, hold: 0.6 }, marks)];
  heap.roots.splice(heap.min, 1, ...gone.kids.map((kid) => ({ ...kid, marked: false })));
  heap.min = -1;
  if (gone.kids.length) frames.push(frameOf(heap, { count: 0, note: `its ${gone.kids.length} ${gone.kids.length === 1 ? "child joins" : "children join"} the root list` }, marks));
  const count = { links: 0 };
  consolidate(heap, frames, marks, count);
  heap.min = smallest(heap.roots);
  frames.push(frameOf(heap, { count: count.links, note: heap.min >= 0 ? `every root has a different degree; the minimum is ${heap.roots[heap.min]!.key}` : "the heap is empty", hold: 0.3 }, marks));
  return { frames, heap, note: `Deleted the minimum, ${gone.key}; ${count.links} ${count.links === 1 ? "link" : "links"} tidied the root list.` };
}

/** Fibonacci heaps: lowers a key; if that breaks heap order the node is cut to the root list, and marked ancestors follow. */
export function decreaseKey(from: Heap, key: number, to: number): Played {
  const heap = clone(from);
  const path: Tree[] = [];
  const find = (tree: Tree, trail: Tree[]): boolean => {
    if (tree.key === key) {
      path.push(...trail, tree);
      return true;
    }
    return tree.kids.some((kid) => find(kid, [...trail, tree]));
  };
  if (!heap.roots.some((tree) => find(tree, []))) return { frames: [], heap: from, note: `${key} is not in the heap.` };
  if (to >= key || keysOf(from).includes(to)) return { frames: [], heap: from, note: `Choose a new key smaller than ${key} that is not already in the heap.` };
  const node = path[path.length - 1]!;
  node.key = to;
  const frames: TreeFrame[] = [];
  const parent = path[path.length - 2];
  let cuts = 0;
  if (!parent || parent.key < to) {
    heap.min = smallest(heap.roots);
    frames.push(frameOf(heap, { lit: tag(node), count: 0, note: parent ? `${key} becomes ${to}: still larger than its parent ${parent.key}, nothing to do` : `${key} becomes ${to}: it is a root, nothing to cut` }, true));
    return { frames, heap, note: `Decreased ${key} to ${to}; heap order still held, so nothing was cut.` };
  }
  frames.push(frameOf(heap, { lit: tag(node), on: [tag(parent)], count: 0, note: `${key} becomes ${to}: smaller than its parent ${parent.key}`, hold: 0.8 }, true));
  // Cut the node, then keep cutting upward while the parent just left behind was already marked.
  for (let at = path.length - 1; at >= 1; at--) {
    const child = path[at]!;
    const above = path[at - 1]!;
    above.kids = above.kids.filter((kid) => kid !== child);
    child.marked = false;
    heap.roots.push(child);
    cuts++;
    const first = at === path.length - 1;
    const isRoot = at - 1 === 0;
    const wasMarked = above.marked;
    if (!isRoot && !wasMarked) above.marked = true;
    heap.min = smallest(heap.roots);
    frames.push(
      frameOf(
        heap,
        {
          lit: tag(child),
          on: [tag(above)],
          count: cuts,
          note: `${first ? "cut" : "cascading cut"}: ${child.key} moves to the root list${isRoot ? "" : wasMarked ? `; ${above.key} was already marked, so it is cut next` : `; ${above.key} is marked`}`,
        },
        true,
      ),
    );
    if (isRoot || !wasMarked) break;
  }
  return { frames, heap, note: `Decreased ${key} to ${to} with ${cuts} ${cuts === 1 ? "cut" : "cuts"}; no tree was linked.` };
}

export function build(keys: number[], marks: boolean): Heap {
  let heap = empty();
  for (const key of keys) heap = insert(heap, key, marks).heap;
  return heap;
}

/** True when every tree is a min-tree and the pointer is on the smallest root. */
export function holds(heap: Heap): boolean {
  const ordered = (tree: Tree): boolean => tree.kids.every((kid) => kid.key > tree.key && ordered(kid));
  if (!heap.roots.every(ordered)) return false;
  return heap.roots.length ? heap.min === smallest(heap.roots) : heap.min === -1;
}

/** True when every tree is a binomial tree: a root of degree d over trees of degrees 0 to d - 1. */
export function binomial(heap: Heap): boolean {
  const shaped = (tree: Tree): boolean => {
    const degrees = tree.kids.map((kid) => kid.kids.length).sort((a, b) => a - b);
    return degrees.every((degree, at) => degree === at) && tree.kids.every(shaped);
  };
  return heap.roots.every(shaped);
}

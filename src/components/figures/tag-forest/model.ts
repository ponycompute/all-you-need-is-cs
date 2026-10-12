// Pure model for the tag forest: disjoint sets as trees in a parent array
// (Horowitz §5.10), with weighted union and collapsing find. Every operation
// returns the steps the forest plays back.

export const ELEMENTS = 10;

/** parent[i] is i's parent, or minus the size of the set when i is a root. */
export type Forest = number[];

export type StepKind = "walk" | "root" | "link" | "lift" | "same";

export interface Step {
  kind: StepKind;
  parent: Forest;
  /** The element the walk is standing on. */
  trail: number | null;
  /** The element whose link was just changed. */
  focus: number | null;
  /** Parent links followed so far in this operation. */
  followed: number;
  note: string;
}

export const fresh = (): Forest => Array.from({ length: ELEMENTS }, () => -1);
export const isRoot = (parent: Forest, element: number) => parent[element]! < 0;
export const setsOf = (parent: Forest) => parent.filter((value) => value < 0).length;

export function rootOf(parent: Forest, element: number) {
  let at = element;
  while (parent[at]! >= 0) at = parent[at]!;
  return at;
}

export function depthOf(parent: Forest, element: number) {
  let depth = 0;
  for (let at = element; parent[at]! >= 0; at = parent[at]!) depth++;
  return depth;
}

class Tape {
  readonly steps: Step[] = [];
  readonly parent: Forest;
  followed = 0;

  constructor(parent: Forest) {
    this.parent = [...parent];
  }

  record(kind: StepKind, note: string, trail: number | null, focus: number | null) {
    this.steps.push({ kind, parent: [...this.parent], trail, focus, followed: this.followed, note });
  }

  /** Follows parent links from `element` to its root, one step per link; returns the path, root last. */
  climb(element: number) {
    const path = [element];
    let at = element;
    while (this.parent[at]! >= 0) {
      this.record("walk", `parent[${at}] = ${this.parent[at]}: go up`, at, null);
      at = this.parent[at]!;
      this.followed++;
      path.push(at);
    }
    this.record("root", `parent[${at}] = ${this.parent[at]}: root, size ${-this.parent[at]!}`, at, null);
    return path;
  }
}

/** Weighted union of the sets holding a and b: the root of the smaller tree is hung under the root of the larger. */
export function union(parent: Forest, a: number, b: number): Step[] {
  const tape = new Tape(parent);
  const rootA = tape.climb(a).pop()!;
  const rootB = tape.climb(b).pop()!;
  if (rootA === rootB) {
    tape.record("same", `${a} and ${b}: same root`, rootA, null);
    return tape.steps;
  }
  const sizeA = -tape.parent[rootA]!;
  const sizeB = -tape.parent[rootB]!;
  const [top, under] = sizeA >= sizeB ? [rootA, rootB] : [rootB, rootA];
  tape.parent[top] = -(sizeA + sizeB);
  tape.parent[under] = top;
  tape.record("link", `parent[${under}] = ${top}, parent[${top}] = ${-(sizeA + sizeB)}`, top, under);
  return tape.steps;
}

/** Collapsing find: find the root, then point every element on the path straight at it. */
export function find(parent: Forest, element: number): Step[] {
  const tape = new Tape(parent);
  const path = tape.climb(element);
  const root = path.pop()!;
  for (const at of path) {
    if (tape.parent[at] === root) continue;
    tape.parent[at] = root;
    tape.record("lift", `collapse: parent[${at}] = ${root}`, root, at);
  }
  return tape.steps;
}

/** Where every element hangs: its lane across the rail and its level below it. */
export function layout(parent: Forest): Array<{ lane: number; depth: number }> {
  const kids: number[][] = Array.from({ length: ELEMENTS }, () => []);
  parent.forEach((above, element) => {
    if (above >= 0) kids[above]!.push(element);
  });
  const placed: Array<{ lane: number; depth: number }> = Array.from({ length: ELEMENTS }, () => ({ lane: 0, depth: 0 }));
  let next = 0;
  const place = (element: number, depth: number): number => {
    const lanes = kids[element]!.map((kid) => place(kid, depth + 1));
    const lane = lanes.length ? (lanes[0]! + lanes[lanes.length - 1]!) / 2 : next++;
    placed[element] = { lane, depth };
    return lane;
  };
  parent.forEach((above, element) => {
    if (above < 0) place(element, 0);
  });
  return placed;
}

/** True when the array is a forest whose roots carry their true sizes and no tree is taller than weighted union allows. */
export function holds(parent: Forest) {
  const sizes = new Map<number, number>();
  for (let element = 0; element < ELEMENTS; element++) {
    let at = element;
    let depth = 0;
    while (parent[at]! >= 0) {
      at = parent[at]!;
      if (++depth > ELEMENTS) return false;
    }
    sizes.set(at, (sizes.get(at) ?? 0) + 1);
    if (depth > Math.floor(Math.log2(-parent[at]!))) return false;
  }
  return [...sizes].every(([root, size]) => parent[root] === -size);
}

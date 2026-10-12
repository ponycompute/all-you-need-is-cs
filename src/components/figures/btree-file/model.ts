// Pure model for the card file: a B-tree of order 5 (Horowitz §10.6) kept to
// two levels, a root page over at most five leaf pages. Every operation returns
// the steps the card file plays back, so the drawing never invents a move.

/** Order of the tree: a page has at most ORDER children and ORDER - 1 keys. */
export const ORDER = 5;
export const MOST = ORDER - 1;
/** A page other than the root keeps at least ⌈ORDER / 2⌉ - 1 keys. */
export const LEAST = Math.ceil(ORDER / 2) - 1;
/** Card slots in a tray: one more than a page may hold, so an overflow can be seen before the split. */
export const SLOTS = ORDER;
export const LEAVES = ORDER;

/** The root page is page -1; leaf pages are 0 to 4, left to right. */
export const ROOT = -1;

export interface Layout {
  root: number[];
  /** null while the root is the only page. */
  leaves: number[][] | null;
}

export type StepKind = "enter" | "read" | "place" | "shift" | "split" | "promote" | "remove" | "replace" | "rotate" | "merge" | "collapse" | "found" | "miss";

export interface Step {
  kind: StepKind;
  layout: Layout;
  /** The page being read, if any. */
  reading: number | null;
  /** The card the reader should watch. */
  focus: number | null;
  /** A card held over a page while that page is read. */
  held?: { key: number; over: number };
  /** A new card set down in the feed. */
  enter?: number;
  /** A card leaving the file. */
  out?: number;
  /** Pages read so far in this operation. */
  reads: number;
}

export interface Played {
  steps: Step[];
  /** Why nothing was played, when `steps` is empty. */
  refused?: "duplicate" | "full" | "empty";
}

const copy = (layout: Layout): Layout => ({ root: [...layout.root], leaves: layout.leaves ? layout.leaves.map((leaf) => [...leaf]) : null });

export const keysOf = (layout: Layout) => [...layout.root, ...(layout.leaves ?? []).flat()].sort((a, b) => a - b);
export const pagesOf = (layout: Layout) => 1 + (layout.leaves?.length ?? 0);
export const has = (layout: Layout, key: number) => layout.root.includes(key) || Boolean(layout.leaves?.some((leaf) => leaf.includes(key)));

/** The child a search for `key` follows from the root: the number of root keys smaller than it. */
const childFor = (root: number[], key: number) => root.filter((separator) => separator < key).length;

function insertSorted(keys: number[], key: number) {
  const at = keys.filter((other) => other < key).length;
  keys.splice(at, 0, key);
}

class Tape {
  readonly steps: Step[] = [];
  readonly layout: Layout;
  reads = 0;

  constructor(layout: Layout) {
    this.layout = copy(layout);
  }

  record(kind: StepKind, reading: number | null, focus: number | null, extra: Partial<Step> = {}) {
    this.steps.push({ kind, layout: copy(this.layout), reading, focus, reads: this.reads, ...extra });
  }

  read(page: number, focus: number | null, held?: number) {
    this.reads++;
    this.record("read", page, focus, held === undefined ? {} : { held: { key: held, over: page } });
  }
}

export function insert(layout: Layout, key: number): Played {
  if (has(layout, key)) return { steps: [], refused: "duplicate" };
  const target = layout.leaves ? childFor(layout.root, key) : ROOT;
  // A sixth leaf would need a third level, which this file does not have.
  if (layout.leaves && layout.leaves.length === LEAVES && layout.leaves[target]!.length === MOST) return { steps: [], refused: "full" };

  const tape = new Tape(layout);
  const { root } = tape.layout;
  tape.record("enter", null, key, { enter: key });
  tape.read(ROOT, key, key);
  if (!tape.layout.leaves) {
    insertSorted(root, key);
    tape.record("place", ROOT, key);
    if (root.length > MOST) {
      // The root splits: the tree grows a level at the top, the only place a B-tree ever grows.
      const middle = Math.floor(root.length / 2);
      tape.layout.leaves = [root.slice(0, middle), root.slice(middle + 1)];
      tape.layout.root = [root[middle]!];
      tape.record("split", ROOT, tape.layout.root[0]!);
    }
    return { steps: tape.steps };
  }

  const leaves = tape.layout.leaves;
  tape.read(target, key, key);
  insertSorted(leaves[target]!, key);
  tape.record("place", target, key);
  if (leaves[target]!.length > MOST) {
    const full = leaves[target]!;
    const middle = Math.floor(full.length / 2);
    const median = full[middle]!;
    if (target < leaves.length - 1) {
      leaves.splice(target + 1, 0, []);
      tape.record("shift", target, median);
    } else leaves.push([]);
    leaves[target + 1] = full.slice(middle + 1);
    leaves[target] = full.slice(0, middle + 1);
    tape.record("split", target, median);
    leaves[target] = full.slice(0, middle);
    root.splice(target, 0, median);
    tape.record("promote", ROOT, median);
  }
  return { steps: tape.steps };
}

export function remove(layout: Layout, key: number): Played {
  if (!keysOf(layout).length) return { steps: [], refused: "empty" };
  const tape = new Tape(layout);
  const { root } = tape.layout;
  tape.read(ROOT, has(layout, key) ? key : null);
  if (!tape.layout.leaves) {
    if (!root.includes(key)) {
      tape.record("miss", ROOT, null);
      return { steps: tape.steps };
    }
    root.splice(root.indexOf(key), 1);
    tape.record("remove", ROOT, key, { out: key });
    return { steps: tape.steps };
  }

  const leaves = tape.layout.leaves;
  let short: number;
  if (root.includes(key)) {
    // A key in the root is replaced by its predecessor, the largest key of the leaf to its left.
    short = root.indexOf(key);
    tape.read(short, key);
    const predecessor = leaves[short]!.pop()!;
    root[short] = predecessor;
    tape.record("replace", ROOT, predecessor, { out: key });
  } else {
    short = childFor(root, key);
    tape.read(short, has(layout, key) ? key : null);
    if (!leaves[short]!.includes(key)) {
      tape.record("miss", short, null);
      return { steps: tape.steps };
    }
    leaves[short]!.splice(leaves[short]!.indexOf(key), 1);
    tape.record("remove", short, key, { out: key });
  }
  if (leaves[short]!.length >= LEAST) return { steps: tape.steps };

  // The leaf is deficient: borrow through the root from a sibling that can spare a key, else combine.
  const right = short + 1 < leaves.length ? short + 1 : null;
  const left = short > 0 ? short - 1 : null;
  if (right !== null) {
    tape.read(right, null);
    if (leaves[right]!.length > LEAST) {
      leaves[short]!.push(root[short]!);
      root[short] = leaves[right]!.shift()!;
      tape.record("rotate", ROOT, root[short]!);
      return { steps: tape.steps };
    }
  }
  if (left !== null) {
    tape.read(left, null);
    if (leaves[left]!.length > LEAST) {
      leaves[short]!.unshift(root[left]!);
      root[left] = leaves[left]!.pop()!;
      tape.record("rotate", ROOT, root[left]!);
      return { steps: tape.steps };
    }
  }
  const into = right !== null ? short : left!;
  const separator = root[into]!;
  leaves[into] = [...leaves[into]!, separator, ...leaves[into + 1]!];
  root.splice(into, 1);
  if (into + 2 < leaves.length) {
    // Pages to the right close the gap, as their pointers do in the root.
    leaves[into + 1] = [];
    tape.record("merge", into, separator);
    leaves.splice(into + 1, 1);
    tape.record("shift", into, separator);
  } else {
    leaves.splice(into + 1, 1);
    tape.record("merge", into, separator);
  }
  if (!root.length) {
    // The root has no key left: its one child becomes the root and the tree loses a level.
    tape.layout.root = leaves[0]!;
    tape.layout.leaves = null;
    tape.record("collapse", ROOT, null);
  }
  return { steps: tape.steps };
}

export function search(layout: Layout, key: number): Played {
  const tape = new Tape(layout);
  const found = has(layout, key) ? key : null;
  tape.read(ROOT, found);
  if (layout.root.includes(key)) tape.record("found", ROOT, key);
  else if (!layout.leaves) tape.record("miss", ROOT, null);
  else {
    const child = childFor(layout.root, key);
    tape.read(child, found);
    tape.record(found === null ? "miss" : "found", child, found);
  }
  return { steps: tape.steps };
}

export function build(keys: number[]): Layout {
  let layout: Layout = { root: [], leaves: null };
  for (const key of keys) {
    const { steps } = insert(layout, key);
    if (steps.length) layout = steps[steps.length - 1]!.layout;
  }
  return layout;
}

/** True when the layout is a B-tree of this order; used by the checks. */
export function holds(layout: Layout) {
  const sorted = (keys: number[]) => keys.every((key, at) => at === 0 || keys[at - 1]! < key);
  if (!sorted(layout.root) || layout.root.length > MOST) return false;
  if (!layout.leaves) return true;
  if (!layout.root.length || layout.leaves.length !== layout.root.length + 1 || layout.leaves.length > LEAVES) return false;
  return layout.leaves.every((leaf, at) => {
    if (leaf.length < LEAST || leaf.length > MOST || !sorted(leaf)) return false;
    const above = at > 0 ? layout.root[at - 1]! : -Infinity;
    const below = at < layout.root.length ? layout.root[at]! : Infinity;
    return leaf[0]! > above && leaf[leaf.length - 1]! < below;
  });
}

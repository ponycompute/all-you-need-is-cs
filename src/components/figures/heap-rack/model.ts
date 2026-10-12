// Pure model for the step rack: a min-max heap and a deap (Horowitz §9.1, §9.2),
// both stored in the seats of one complete binary tree. Every operation returns
// the list of steps the rack plays back, so the drawing never invents a move.

export type HeapKind = "minmax" | "deap";
/** What the rack is set up as: one of the two double-ended heaps, or a plain max-heap for heap sort. */
export type RackKind = HeapKind | "max";
export type End = "low" | "high";

export interface Weight {
  id: number;
  value: number;
}

export type StepKind = "enter" | "place" | "compare" | "swap" | "draw";

export interface Step {
  kind: StepKind;
  /** Weight in each seat once this step has played. */
  seats: Array<Weight | null>;
  /** The weight the reader should watch. */
  focus: number | null;
  /** Seats whose weights are being compared. */
  compared: number[];
  /** A weight set down on the loading pad. */
  enter?: Weight;
  /** A weight leaving for a tray. */
  out?: { weight: Weight; end: End };
  /** Seats whose weights are in their final sorted place (heap sort). */
  settled?: number[];
}

export const SEATS = 15;
export const LEVELS = 4;

export const capacityOf = (kind: RackKind) => (kind === "deap" ? SEATS - 1 : SEATS);
export const firstSeatOf = (kind: HeapKind) => (kind === "deap" ? 1 : 0);

export const levelOf = (seat: number) => Math.floor(Math.log2(seat + 1));
const parentOf = (seat: number) => (seat - 1) >> 1;

export function countOf(seats: Array<Weight | null>) {
  return seats.reduce((count, weight) => count + (weight ? 1 : 0), 0);
}

/** What the rack answers for find-min and find-max, read from fixed seats in O(1). */
export function extremesOf(kind: RackKind, seats: Array<Weight | null>): { low: Weight | null; high: Weight | null } {
  // A max-heap answers for one end only: the largest key is at the root.
  if (kind === "max") return { low: null, high: seats[0] ?? null };
  if (kind === "minmax") {
    const low = seats[0] ?? null;
    const left = seats[1] ?? null;
    const right = seats[2] ?? null;
    const high = left && right ? (left.value >= right.value ? left : right) : left ?? low;
    return { low, high };
  }
  const low = seats[1] ?? null;
  return { low, high: seats[2] ?? low };
}

class Tape {
  readonly steps: Step[] = [];
  readonly seats: Array<Weight | null>;

  constructor(seats: Array<Weight | null>) {
    this.seats = [...seats];
  }

  value(seat: number) {
    return this.seats[seat]!.value;
  }

  record(kind: StepKind, focus: number | null, compared: number[] = [], extra: Partial<Step> = {}) {
    this.steps.push({ kind, seats: [...this.seats], focus, compared, ...extra });
  }

  compare(a: number, b: number, focus: number | null) {
    this.record("compare", focus, [a, b]);
  }

  swap(a: number, b: number, focus: number | null) {
    [this.seats[a], this.seats[b]] = [this.seats[b]!, this.seats[a]!];
    this.record("swap", focus, [a, b]);
  }

  /** Moves a weight into an empty seat. */
  move(from: number, to: number) {
    const weight = this.seats[from]!;
    this.seats[to] = weight;
    this.seats[from] = null;
    this.record("place", weight.id, [to]);
  }
}

// ---------------------------------------------------------------------------
// Min-max heap: seat i is heap index i. Even levels are min levels.
// ---------------------------------------------------------------------------

const onMinLevel = (seat: number) => levelOf(seat) % 2 === 0;
const grandparentOf = (seat: number) => (seat < 3 ? -1 : parentOf(parentOf(seat)));

function bubbleUp(tape: Tape, start: number, min: boolean) {
  let at = start;
  const id = tape.seats[at]!.id;
  for (let above = grandparentOf(at); above >= 0; above = grandparentOf(at)) {
    tape.compare(at, above, id);
    const wrong = min ? tape.value(at) < tape.value(above) : tape.value(at) > tape.value(above);
    if (!wrong) break;
    tape.swap(at, above, id);
    at = above;
  }
}

function pushDown(tape: Tape, start: number, size: number, min: boolean) {
  const better = (a: number, b: number) => (min ? tape.value(a) < tape.value(b) : tape.value(a) > tape.value(b));
  let at = start;
  for (;;) {
    const below: number[] = [];
    for (const child of [2 * at + 1, 2 * at + 2]) {
      if (child >= size) continue;
      below.push(child);
      for (const grandchild of [2 * child + 1, 2 * child + 2]) if (grandchild < size) below.push(grandchild);
    }
    if (!below.length) return;
    const best = below.reduce((a, b) => (better(b, a) ? b : a));
    const id = tape.seats[at]!.id;
    tape.compare(at, best, id);
    if (!better(best, at)) return;
    tape.swap(at, best, id);
    if (parentOf(best) === at) return;
    const between = parentOf(best);
    tape.compare(best, between, id);
    if (better(between, best)) tape.swap(best, between, tape.seats[best]!.id);
    at = best;
  }
}

function minMaxInsert(tape: Tape, weight: Weight, size: number) {
  tape.seats[size] = weight;
  tape.record("place", weight.id, [size]);
  if (size === 0) return;
  const parent = parentOf(size);
  tape.compare(size, parent, weight.id);
  if (onMinLevel(size)) {
    if (tape.value(size) > tape.value(parent)) {
      tape.swap(size, parent, weight.id);
      bubbleUp(tape, parent, false);
    } else bubbleUp(tape, size, true);
  } else if (tape.value(size) < tape.value(parent)) {
    tape.swap(size, parent, weight.id);
    bubbleUp(tape, parent, true);
  } else bubbleUp(tape, size, false);
}

function minMaxDraw(tape: Tape, end: End, size: number) {
  let hole = 0;
  if (end === "high" && size > 1) {
    hole = 1;
    if (size > 2) {
      tape.compare(1, 2, null);
      if (tape.value(2) > tape.value(1)) hole = 2;
    }
  }
  const weight = tape.seats[hole]!;
  tape.seats[hole] = null;
  tape.record("draw", weight.id, [hole], { out: { weight, end } });
  const last = size - 1;
  if (hole === last) return;
  tape.move(last, hole);
  pushDown(tape, hole, last, onMinLevel(hole));
}

// ---------------------------------------------------------------------------
// Deap: seat s holds position p = s + 1 of the book; position 1 (seat 0) stays
// empty, position 2 roots the min-heap and position 3 the max-heap.
// ---------------------------------------------------------------------------

const seatAt = (position: number) => position - 1;
const halfLevel = (position: number) => 2 ** (Math.floor(Math.log2(position)) - 1);
const inMaxHeap = (position: number) => position >= 2 ** Math.floor(Math.log2(position)) + halfLevel(position);
const minPartner = (position: number) => position - halfLevel(position);

function maxPartner(position: number, last: number) {
  const partner = position + halfLevel(position);
  return partner > last ? partner >> 1 : partner;
}

function heapInsert(tape: Tape, start: number, min: boolean) {
  let at = start;
  const id = tape.seats[seatAt(at)]!.id;
  for (let above = at >> 1; above >= 2; above = at >> 1) {
    tape.compare(seatAt(at), seatAt(above), id);
    const wrong = min ? tape.value(seatAt(at)) < tape.value(seatAt(above)) : tape.value(seatAt(at)) > tape.value(seatAt(above));
    if (!wrong) break;
    tape.swap(seatAt(at), seatAt(above), id);
    at = above;
  }
}

/** Restores the deap once a weight has been set into `position`; `last` is the last filled position. */
function deapSettle(tape: Tape, position: number, last: number) {
  const id = tape.seats[seatAt(position)]!.id;
  if (inMaxHeap(position)) {
    let partner = minPartner(position);
    // A max-side leaf may face a min-side node that still has children: the larger child stands in.
    const children = [2 * partner, 2 * partner + 1].filter((child) => child <= last);
    if (children.length) partner = children.reduce((a, b) => (tape.value(seatAt(b)) > tape.value(seatAt(a)) ? b : a));
    tape.compare(seatAt(position), seatAt(partner), id);
    if (tape.value(seatAt(position)) < tape.value(seatAt(partner))) {
      tape.swap(seatAt(position), seatAt(partner), id);
      heapInsert(tape, partner, true);
    } else heapInsert(tape, position, false);
    return;
  }
  const partner = maxPartner(position, last);
  if (partner < 2) return;
  tape.compare(seatAt(position), seatAt(partner), id);
  if (tape.value(seatAt(position)) > tape.value(seatAt(partner))) {
    tape.swap(seatAt(position), seatAt(partner), id);
    heapInsert(tape, partner, false);
  } else heapInsert(tape, position, true);
}

function deapInsert(tape: Tape, weight: Weight, size: number) {
  const position = size + 2;
  tape.seats[seatAt(position)] = weight;
  tape.record("place", weight.id, [seatAt(position)]);
  deapSettle(tape, position, position);
}

function deapDraw(tape: Tape, end: End, size: number) {
  const top = end === "high" && size > 1 ? 3 : 2;
  const weight = tape.seats[seatAt(top)]!;
  tape.seats[seatAt(top)] = null;
  tape.record("draw", weight.id, [seatAt(top)], { out: { weight, end } });
  const old = size + 1;
  if (old === top) return;
  const last = old - 1;
  const min = top === 2;
  let hole = top;
  for (;;) {
    const children = [2 * hole, 2 * hole + 1].filter((child) => child <= last);
    if (!children.length) break;
    const best = children.reduce((a, b) => {
      const ahead = min ? tape.value(seatAt(b)) < tape.value(seatAt(a)) : tape.value(seatAt(b)) > tape.value(seatAt(a));
      return ahead ? b : a;
    });
    if (children.length > 1) tape.compare(seatAt(children[0]!), seatAt(children[1]!), null);
    tape.move(seatAt(best), seatAt(hole));
    hole = best;
  }
  tape.move(seatAt(old), seatAt(hole));
  deapSettle(tape, hole, last);
}

// ---------------------------------------------------------------------------

export function insert(kind: HeapKind, seats: Array<Weight | null>, weight: Weight): Step[] {
  const size = countOf(seats);
  if (size >= capacityOf(kind)) return [];
  const tape = new Tape(seats);
  tape.record("enter", weight.id, [], { enter: weight });
  if (kind === "minmax") minMaxInsert(tape, weight, size);
  else deapInsert(tape, weight, size);
  return tape.steps;
}

export function draw(kind: HeapKind, seats: Array<Weight | null>, end: End): Step[] {
  const size = countOf(seats);
  if (!size) return [];
  const tape = new Tape(seats);
  if (kind === "minmax") minMaxDraw(tape, end, size);
  else deapDraw(tape, end, size);
  return tape.steps;
}

/** Number of weights that changed seat while an operation repaired the rack. */
export const hopsOf = (steps: Step[]) => steps.filter((step) => step.kind === "swap" || step.kind === "place").length;

export function build(kind: HeapKind, values: number[], firstId = 1): Array<Weight | null> {
  let seats: Array<Weight | null> = Array.from({ length: SEATS }, () => null);
  values.forEach((value, index) => {
    const steps = insert(kind, seats, { id: firstId + index, value });
    if (steps.length) seats = steps[steps.length - 1]!.seats;
  });
  return seats;
}

/** True when the seats satisfy the structure's definition; used by the checks. */
export function holds(kind: HeapKind, seats: Array<Weight | null>) {
  const size = countOf(seats);
  const first = firstSeatOf(kind);
  for (let seat = 0; seat < SEATS; seat++) {
    const filled = seat >= first && seat < first + size;
    if (Boolean(seats[seat]) !== filled) return false;
  }
  const value = (seat: number) => seats[seat]!.value;
  if (kind === "minmax") {
    for (let seat = 0; seat < size; seat++) {
      const stack = [2 * seat + 1, 2 * seat + 2];
      while (stack.length) {
        const below = stack.pop()!;
        if (below >= size) continue;
        if (onMinLevel(seat) ? value(below) < value(seat) : value(below) > value(seat)) return false;
        stack.push(2 * below + 1, 2 * below + 2);
      }
    }
    return true;
  }
  const last = size + 1;
  for (let position = 4; position <= last; position++) {
    const above = position >> 1;
    const max = inMaxHeap(position);
    if (max ? value(seatAt(position)) > value(seatAt(above)) : value(seatAt(position)) < value(seatAt(above))) return false;
  }
  for (let position = 2; position <= last; position++) {
    if (inMaxHeap(position)) continue;
    const partner = maxPartner(position, last);
    if (partner >= 2 && value(seatAt(position)) > value(seatAt(partner))) return false;
  }
  return true;
}

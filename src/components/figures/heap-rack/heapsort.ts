// Heap sort on the step rack (Horowitz §7.7): the file is the array the complete tree is
// stored in. Every function returns the steps the rack plays back.

import type { Step, StepKind, Weight } from "./model";

class Tape {
  readonly steps: Step[] = [];
  readonly seats: Array<Weight | null>;
  private settled: number[];

  constructor(seats: Array<Weight | null>, settled: number[]) {
    this.seats = [...seats];
    this.settled = settled;
  }

  value(seat: number) {
    return this.seats[seat]!.value;
  }

  record(kind: StepKind, focus: number | null, compared: number[]) {
    this.steps.push({ kind, seats: [...this.seats], focus, compared, settled: [...this.settled] });
  }

  swap(a: number, b: number, focus: number | null) {
    [this.seats[a], this.seats[b]] = [this.seats[b]!, this.seats[a]!];
    this.record("swap", focus, [a, b]);
  }

  settle(seat: number) {
    this.settled = [...this.settled, seat];
  }
}

/** ADJUST: the subtrees under `root` are heaps already; move the root's key down until the whole subtree is one. */
function adjust(tape: Tape, root: number, size: number) {
  let at = root;
  const id = tape.seats[at]!.id;
  for (;;) {
    let child = 2 * at + 1;
    if (child >= size) return;
    if (child + 1 < size) {
      tape.record("compare", id, [child, child + 1]);
      if (tape.value(child + 1) > tape.value(child)) child++;
    }
    tape.record("compare", id, [at, child]);
    if (tape.value(at) >= tape.value(child)) return;
    tape.swap(at, child, id);
    at = child;
  }
}

/** Phase one: make the whole file a max-heap by adjusting every internal node, last one first. */
export function heapify(seats: Array<Weight | null>, size: number): Step[] {
  const tape = new Tape(seats, []);
  for (let root = Math.floor(size / 2) - 1; root >= 0; root--) adjust(tape, root, size);
  if (!tape.steps.length) tape.record("compare", null, []);
  return tape.steps;
}

/** Phase two, one round: swap the largest key into the last place of the heap, then repair the smaller heap. */
export function extract(seats: Array<Weight | null>, heap: number, settled: number[]): Step[] {
  const tape = new Tape(seats, settled);
  if (heap <= 1) {
    tape.settle(0);
    tape.record("compare", null, []);
    return tape.steps;
  }
  const last = heap - 1;
  const id = tape.seats[0]!.id;
  tape.settle(last);
  tape.swap(0, last, id);
  adjust(tape, 0, last);
  return tape.steps;
}

/** True when the first `size` seats form a max-heap. */
export function isHeap(seats: Array<Weight | null>, size: number) {
  for (let seat = 1; seat < size; seat++) if (seats[seat]!.value > seats[(seat - 1) >> 1]!.value) return false;
  return true;
}

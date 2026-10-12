// Pure model for the class lanes: finding equivalence classes with linked lists and a
// stack (Horowitz §4.6, Program 4.22). The whole program is scripted in advance as the
// list of steps the bench plays back, one pair or one list node at a time.

export const ELEMENTS = 12;

/** The book's nine pairs. */
export const PAIRS: Array<[number, number]> = [
  [0, 4],
  [3, 1],
  [6, 10],
  [8, 9],
  [7, 4],
  [6, 8],
  [3, 5],
  [2, 11],
  [11, 0],
];

/** A list node: it lives on seq[i] until phase two moves it to the stack. */
export interface Token {
  id: number;
  data: number;
}

export interface Bench {
  /** seq[i]: the nodes of element i's list, front first. */
  lanes: Token[][];
  /** The stack of nodes, top first. */
  stack: Token[];
  out: boolean[];
  /** The classes printed so far, each in the order its members were printed. */
  classes: number[][];
}

export type StepKind = "pair" | "new" | "print" | "skip" | "pop" | "done";

export interface Step {
  kind: StepKind;
  bench: Bench;
  /** How many pairs have been read. */
  read: number;
  /** The lane being scanned. */
  lane: number | null;
  /** The node under the scan, or just moved. */
  focus: number | null;
  /** The element just printed. */
  printed: number | null;
  note: string;
}

const copy = (bench: Bench): Bench => ({ lanes: bench.lanes.map((lane) => [...lane]), stack: [...bench.stack], out: [...bench.out], classes: bench.classes.map((members) => [...members]) });

export const empty = (): Bench => ({ lanes: Array.from({ length: ELEMENTS }, () => []), stack: [], out: Array.from({ length: ELEMENTS }, () => false), classes: [] });

/** The whole of Program 4.22 on the given pairs, as steps. */
export function script(pairs: Array<[number, number]>): Step[] {
  const bench = empty();
  const steps: Step[] = [];
  let nextId = 1;
  let read = 0;
  const record = (kind: StepKind, note: string, lane: number | null, focus: number | null, printed: number | null = null) =>
    steps.push({ kind, bench: copy(bench), read, lane, focus, printed, note });

  // Phase one: each pair i ≡ j puts a node for j at the front of seq[i] and a node for i at the front of seq[j].
  for (const [i, j] of pairs) {
    bench.lanes[i]!.unshift({ id: nextId++, data: j });
    bench.lanes[j]!.unshift({ id: nextId++, data: i });
    read++;
    record("pair", `read ${i} ≡ ${j}: ${j} onto seq[${i}], ${i} onto seq[${j}]`, null, null);
  }

  // Phase two: for each element not yet output, print everything reachable from it.
  for (let start = 0; start < ELEMENTS; start++) {
    if (bench.out[start]) continue;
    bench.out[start] = true;
    bench.classes.push([start]);
    record("new", `new class: ${start}`, start, null, start);
    let lane = start;
    for (;;) {
      // Scan the lane front to back. A node whose element is new is printed and moved to the stack.
      let place = 0;
      while (place < bench.lanes[lane]!.length) {
        const node = bench.lanes[lane]![place]!;
        if (bench.out[node.data]) {
          record("skip", `seq[${lane}]: ${node.data} is already out`, lane, node.id);
          place++;
          continue;
        }
        bench.out[node.data] = true;
        bench.classes[bench.classes.length - 1]!.push(node.data);
        bench.lanes[lane]!.splice(place, 1);
        bench.stack.unshift(node);
        record("print", `seq[${lane}]: print ${node.data}, push its node`, lane, node.id, node.data);
      }
      const top = bench.stack.shift();
      if (!top) break;
      lane = top.data;
      record("pop", `pop ${top.data}: scan seq[${top.data}]`, lane, null);
    }
  }
  record("done", `${bench.classes.length} classes`, null, null);
  return steps;
}

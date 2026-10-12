// Pure model for the merge yard: a k-way merge of sorted runs driven by a
// winner tree (Horowitz §5.8, §7.11.2). Every output returns the steps the
// yard plays back.

export const RUNS = 4;

/** The two semifinal comparators (0, 1) and the final (2). */
export type Gate = 0 | 1 | 2;

export interface Yard {
  /** What is left of each run, smallest key first. */
  runs: number[][];
  /** The run that wins at each gate, or null when both sides are exhausted. */
  winners: [number | null, number | null, number | null];
  output: number[];
}

export type StepKind = "compare" | "out" | "advance" | "done";

export interface Step {
  kind: StepKind;
  yard: Yard;
  /** The gate that has just compared its two sides. */
  gate: Gate | null;
  /** The key being moved. */
  focus: number | null;
  /** Key comparisons made so far in this operation. */
  compares: number;
  note: string;
}

const copy = (yard: Yard): Yard => ({ runs: yard.runs.map((run) => [...run]), winners: [...yard.winners], output: [...yard.output] });
const headOf = (yard: Yard, run: number | null) => (run === null ? undefined : yard.runs[run]![0]);

/** The winner of two runs: the one with the smaller head; an exhausted run always loses. */
function better(yard: Yard, a: number | null, b: number | null): number | null {
  const [x, y] = [headOf(yard, a), headOf(yard, b)];
  if (x === undefined) return y === undefined ? null : b;
  if (y === undefined) return a;
  return x <= y ? a : b;
}

const sidesOf = (yard: Yard, gate: Gate): [number | null, number | null] => (gate === 0 ? [0, 1] : gate === 1 ? [2, 3] : [yard.winners[0], yard.winners[1]]);

function play(yard: Yard, gate: Gate, steps: Step[], compares: { count: number }) {
  const [a, b] = sidesOf(yard, gate);
  const [x, y] = [headOf(yard, a), headOf(yard, b)];
  yard.winners[gate] = better(yard, a, b);
  const both = x !== undefined && y !== undefined;
  if (both) compares.count++;
  const where = gate === 2 ? "final" : `gate ${gate + 1}`;
  const note = both ? `${where}: ${Math.min(x, y)} beats ${Math.max(x, y)}` : x === undefined && y === undefined ? `${where}: both sides are empty` : `${where}: ${x ?? y} is unopposed`;
  steps.push({ kind: "compare", yard: copy(yard), gate, focus: null, compares: compares.count, note });
}

/** Sets the runs up and plays every gate once: k - 1 comparisons. */
export function build(runs: number[][]): { yard: Yard; steps: Step[] } {
  const yard: Yard = { runs: runs.map((run) => [...run]), winners: [null, null, null], output: [] };
  const steps: Step[] = [];
  const compares = { count: 0 };
  for (const gate of [0, 1, 2] as Gate[]) play(yard, gate, steps, compares);
  return { yard, steps };
}

/** Sends the overall winner to the output, then replays only the gates on its path. */
export function output(from: Yard): Step[] {
  const yard = copy(from);
  const steps: Step[] = [];
  const compares = { count: 0 };
  const run = yard.winners[2];
  if (run === null) return steps;
  const key = yard.runs[run]!.shift()!;
  yard.output.push(key);
  steps.push({ kind: "out", yard: copy(yard), gate: null, focus: key, compares: 0, note: `output ${key}, the head of run ${run + 1}` });
  if (yard.runs[run]!.length) steps.push({ kind: "advance", yard: copy(yard), gate: null, focus: yard.runs[run]![0]!, compares: 0, note: `run ${run + 1} moves up: its head is now ${yard.runs[run]![0]}` });
  play(yard, run < 2 ? 0 : 1, steps, compares);
  play(yard, 2, steps, compares);
  if (yard.winners[2] === null) steps.push({ kind: "done", yard: copy(yard), gate: null, focus: null, compares: compares.count, note: "every run is empty: the merge is complete" });
  return steps;
}

export const leftOf = (yard: Yard) => yard.runs.reduce((sum, run) => sum + run.length, 0);

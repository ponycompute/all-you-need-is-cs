// Pure model for the patch board: a sorted linked list kept in eight numbered
// memory cells (Horowitz §4.1, §4.8). Every operation returns the steps the
// board plays back, one link assignment at a time, so the drawing never
// invents a move.

export const CELLS = 8;
/** The null link. Cell addresses run from 1 to CELLS. */
export const NIL = 0;

export interface Cell {
  word: string;
  /** Address of the next node, or NIL. */
  next: number;
  /** Address of the previous node, or NIL. Only kept when the list is doubly linked. */
  back: number;
}

export interface Memory {
  /** cells[address]; index 0 is unused, null is a free cell. */
  cells: Array<Cell | null>;
  first: number;
  /** The free cells, as a stack: get_node pops, ret_node pushes. */
  avail: number[];
}

export type StepKind = "walk" | "stop" | "allocate" | "data" | "link" | "free" | "miss";

export interface Step {
  kind: StepKind;
  memory: Memory;
  /** The node the search is standing on. */
  trail: number | null;
  /** The node being added or removed. */
  focus: number | null;
  /** The cord that was just re-plugged: its owner (NIL for `first`) and which link. */
  moved?: { from: number; side: "next" | "back" };
  /** Link assignments made so far in this operation. */
  updates: number;
  /** The assignment or test this step performs, in the book's terms. */
  note: string;
}

export interface Played {
  steps: Step[];
  refused?: "duplicate" | "full" | "empty";
}

const copy = (memory: Memory): Memory => ({ cells: memory.cells.map((cell) => (cell ? { ...cell } : null)), first: memory.first, avail: [...memory.avail] });

export function wordsOf(memory: Memory): string[] {
  const words: string[] = [];
  for (let at = memory.first, guard = 0; at !== NIL && guard <= CELLS; at = memory.cells[at]!.next, guard++) words.push(memory.cells[at]!.word);
  return words;
}

class Tape {
  readonly steps: Step[] = [];
  readonly memory: Memory;
  updates = 0;

  constructor(memory: Memory) {
    this.memory = copy(memory);
  }

  record(kind: StepKind, note: string, trail: number | null, focus: number | null, moved?: Step["moved"]) {
    if (moved) this.updates++;
    this.steps.push({ kind, memory: copy(this.memory), trail, focus, moved, updates: this.updates, note });
  }

  name(address: number) {
    return address === NIL ? "NULL" : this.memory.cells[address]!.word || "new";
  }
}

/** Walks to where `word` belongs: returns the node before it (NIL at the head) and the node at or after it. */
function seek(tape: Tape, word: string, focus: number | null) {
  const { cells } = tape.memory;
  let trail = NIL;
  let at = tape.memory.first;
  while (at !== NIL && cells[at]!.word < word) {
    tape.record("walk", `${cells[at]!.word} < ${word}: move on`, at, focus);
    trail = at;
    at = cells[at]!.next;
  }
  return { trail, at };
}

export function insert(memory: Memory, word: string, doubly: boolean): Played {
  if (wordsOf(memory).includes(word)) return { steps: [], refused: "duplicate" };
  if (!memory.avail.length) return { steps: [], refused: "full" };
  const tape = new Tape(memory);
  const { cells } = tape.memory;
  const { trail, at } = seek(tape, word, null);
  tape.record("stop", at === NIL ? `end of list: ${word} goes last` : `${cells[at]!.word} > ${word}: insert before it`, at === NIL ? trail || null : at, null);

  const fresh = tape.memory.avail.pop()!;
  cells[fresh] = { word: "", next: NIL, back: NIL };
  tape.record("allocate", `new = get_node()  (cell ${fresh})`, trail || null, fresh);
  cells[fresh]!.word = word;
  tape.record("data", `new.data = ${word}`, trail || null, fresh);

  // The order matters: the new node must point at the rest of the list before anything stops pointing there.
  if (doubly) {
    cells[fresh]!.back = trail;
    tape.record("link", `new.llink = ${tape.name(trail)}`, trail || null, fresh, { from: fresh, side: "back" });
  }
  cells[fresh]!.next = at;
  tape.record("link", `new.${doubly ? "rlink" : "link"} = ${tape.name(at)}`, trail || null, fresh, { from: fresh, side: "next" });
  if (doubly && at !== NIL) {
    cells[at]!.back = fresh;
    tape.record("link", `${tape.name(at)}.llink = new`, trail || null, fresh, { from: at, side: "back" });
  }
  if (trail === NIL) {
    tape.memory.first = fresh;
    tape.record("link", "first = new", null, fresh, { from: NIL, side: "next" });
  } else {
    cells[trail]!.next = fresh;
    tape.record("link", `${tape.name(trail)}.${doubly ? "rlink" : "link"} = new`, trail, fresh, { from: trail, side: "next" });
  }
  return { steps: tape.steps };
}

export function remove(memory: Memory, word: string, doubly: boolean): Played {
  if (memory.first === NIL) return { steps: [], refused: "empty" };
  const tape = new Tape(memory);
  const { cells } = tape.memory;
  const { trail, at } = seek(tape, word, null);
  if (at === NIL || cells[at]!.word !== word) {
    tape.record("miss", `${word} is not in the list`, at === NIL ? trail || null : at, null);
    return { steps: tape.steps };
  }
  tape.record("stop", `found ${word}; trail = ${tape.name(trail)}`, trail || null, at);
  const after = cells[at]!.next;
  if (trail === NIL) {
    tape.memory.first = after;
    tape.record("link", `first = ${word}.${doubly ? "rlink" : "link"}`, null, at, { from: NIL, side: "next" });
  } else {
    cells[trail]!.next = after;
    tape.record("link", `${tape.name(trail)}.${doubly ? "rlink" : "link"} = ${word}.${doubly ? "rlink" : "link"}`, trail, at, { from: trail, side: "next" });
  }
  if (doubly && after !== NIL) {
    cells[after]!.back = trail;
    tape.record("link", `${tape.name(after)}.llink = ${word}.llink`, trail || null, at, { from: after, side: "back" });
  }
  cells[at] = null;
  tape.memory.avail.push(at);
  tape.record("free", `ret_node(${word})  (cell ${at} is free again)`, trail || null, null);
  return { steps: tape.steps };
}

/** A list of the given words, placed in the given cells so that neighbours in the list are not neighbours in memory. */
export function build(words: string[], addresses: number[], doubly: boolean): Memory {
  const cells: Array<Cell | null> = Array.from({ length: CELLS + 1 }, () => null);
  const sorted = [...words].sort();
  sorted.forEach((word, index) => {
    cells[addresses[index]!] = { word, next: addresses[index + 1] ?? NIL, back: doubly ? addresses[index - 1] ?? NIL : NIL };
  });
  const used = new Set(addresses.slice(0, sorted.length));
  const avail = Array.from({ length: CELLS }, (_, index) => CELLS - index).filter((address) => !used.has(address));
  return { cells, first: addresses[0] ?? NIL, avail };
}

/** True when the memory holds one sorted chain, every other cell is on the free stack, and back links mirror next links. */
export function holds(memory: Memory, doubly: boolean) {
  const seen = new Set<number>();
  let previous = NIL;
  let last = "";
  for (let at = memory.first; at !== NIL; at = memory.cells[at]!.next) {
    const cell = memory.cells[at];
    if (!cell || seen.has(at) || cell.word <= last) return false;
    if (doubly && cell.back !== previous) return false;
    seen.add(at);
    last = cell.word;
    previous = at;
  }
  for (let address = 1; address <= CELLS; address++) {
    const used = memory.cells[address] !== null;
    if (used !== seen.has(address) || used === memory.avail.includes(address)) return false;
  }
  return memory.avail.length + seen.size === CELLS;
}

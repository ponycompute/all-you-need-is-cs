// Pure model for the ring queue: a queue in a circular array (Horowitz §3.3).
// `front` is the slot just before the first item, `rear` the slot of the last,
// so the queue is empty when they are equal and full when rear is one step
// behind front: one slot always stays empty.

export const SLOTS = 8;
export const CAPACITY = SLOTS - 1;

export interface Item {
  id: number;
  value: number;
}

export interface Ring {
  slots: Array<Item | null>;
  front: number;
  rear: number;
}

export type StepKind = "rear" | "store" | "front" | "take";

export interface Step {
  kind: StepKind;
  ring: Ring;
  /** The item being stored or taken. */
  focus: number | null;
  /** An item set down in the feed, about to be stored. */
  enter?: Item;
  /** An item leaving the ring. */
  out?: Item;
  note: string;
}

export interface Played {
  steps: Step[];
  refused?: "full" | "empty";
}

const copy = (ring: Ring): Ring => ({ slots: [...ring.slots], front: ring.front, rear: ring.rear });

export const empty = (): Ring => ({ slots: Array.from({ length: SLOTS }, () => null), front: 0, rear: 0 });
export const sizeOf = (ring: Ring) => (ring.rear - ring.front + SLOTS) % SLOTS;
export const isFull = (ring: Ring) => (ring.rear + 1) % SLOTS === ring.front;
export const isEmpty = (ring: Ring) => ring.front === ring.rear;

/** The items in queue order, oldest first. */
export function itemsOf(ring: Ring): Item[] {
  const items: Item[] = [];
  for (let at = ring.front; at !== ring.rear; ) {
    at = (at + 1) % SLOTS;
    items.push(ring.slots[at]!);
  }
  return items;
}

export function add(ring: Ring, item: Item): Played {
  if (isFull(ring)) return { steps: [], refused: "full" };
  const next = copy(ring);
  const steps: Step[] = [];
  next.rear = (next.rear + 1) % SLOTS;
  steps.push({ kind: "rear", ring: copy(next), focus: item.id, enter: item, note: `rear = (rear + 1) % ${SLOTS} = ${next.rear}` });
  next.slots[next.rear] = item;
  steps.push({ kind: "store", ring: copy(next), focus: item.id, note: `queue[${next.rear}] = ${item.value}` });
  return { steps };
}

export function remove(ring: Ring): Played {
  if (isEmpty(ring)) return { steps: [], refused: "empty" };
  const next = copy(ring);
  const steps: Step[] = [];
  next.front = (next.front + 1) % SLOTS;
  const item = next.slots[next.front]!;
  steps.push({ kind: "front", ring: copy(next), focus: item.id, note: `front = (front + 1) % ${SLOTS} = ${next.front}` });
  next.slots[next.front] = null;
  steps.push({ kind: "take", ring: copy(next), focus: item.id, out: item, note: `return queue[${next.front}] = ${item.value}` });
  return { steps };
}

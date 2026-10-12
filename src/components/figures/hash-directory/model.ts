// Pure model for the hash directory: dynamic hashing with a directory
// (Horowitz §8.3.1). Keys are the book's identifiers, a letter and a digit,
// each with a six-bit code; the directory is indexed by the low bits of that
// code. Every operation returns the steps the bench plays back.

/** The directory never grows past this many bits here, so it has at most eight entries. */
export const MOST_BITS = 3;
export const ENTRIES = 2 ** MOST_BITS;
export const PAGES = 6;
/** Keys a page holds. Its tray has one more slot, so an overflow can be seen before the split. */
export const PAGE_SIZE = 2;

const LETTERS: Record<string, number> = { a: 0b100, b: 0b101, c: 0b110 };

export const isKey = (text: string) => /^[abc][0-7]$/.test(text);
/** The book's coding: three bits for the letter, then three for the digit. */
export const codeOf = (key: string) => (LETTERS[key[0]!]! << 3) | Number(key[1]);
export const bitsOf = (key: string) => codeOf(key).toString(2).padStart(6, "0");
const low = (key: string, bits: number) => codeOf(key) & (2 ** bits - 1);
export const labelOf = (entry: number, bits: number) => entry.toString(2).padStart(bits, "0");

export interface Page {
  /** How many low bits every key on this page shares. */
  depth: number;
  keys: string[];
}

export interface Table {
  /** Directory depth: the directory has 2^bits entries. */
  bits: number;
  /** directory[i] is the page that holds the keys whose low `bits` bits are i. */
  directory: number[];
  pages: Page[];
}

export type StepKind = "enter" | "entry" | "page" | "place" | "double" | "split" | "repoint" | "found" | "miss";

export interface Step {
  kind: StepKind;
  table: Table;
  /** The directory entry being read or re-pointed. */
  entry: number | null;
  /** The page being read. */
  page: number | null;
  focus: string | null;
  /** A key held over a page while that page is read. */
  held?: { key: string; over: number };
  enter?: string;
  /** Pages read so far, counting the directory as one. */
  reads: number;
  note: string;
}

export interface Played {
  steps: Step[];
  refused?: "duplicate" | "bits" | "pages";
}

const copy = (table: Table): Table => ({ bits: table.bits, directory: [...table.directory], pages: table.pages.map((page) => ({ depth: page.depth, keys: [...page.keys] })) });

export const keysOf = (table: Table) => table.pages.flatMap((page) => page.keys).sort();
export const empty = (): Table => ({ bits: 1, directory: [0, 1], pages: [{ depth: 1, keys: [] }, { depth: 1, keys: [] }] });

export function insert(from: Table, key: string): Played {
  if (keysOf(from).includes(key)) return { steps: [], refused: "duplicate" };
  const table = copy(from);
  const steps: Step[] = [];
  let reads = 0;
  const record = (kind: StepKind, note: string, entry: number | null, page: number | null, extra: Partial<Step> = {}) =>
    steps.push({ kind, table: copy(table), entry, page, focus: key, reads, note, ...extra });

  record("enter", `${key} = ${bitsOf(key)}`, null, null, { enter: key });
  let entry = low(key, table.bits);
  let at = table.directory[entry]!;
  reads++;
  record("entry", `low ${table.bits} bits: directory[${labelOf(entry, table.bits)}]`, entry, null, { held: { key, over: at } });
  reads++;
  record("page", `read page ${at + 1}`, entry, at, { held: { key, over: at } });
  table.pages[at]!.keys.push(key);
  record("place", `${key} onto page ${at + 1}`, entry, at);

  while (table.pages[at]!.keys.length > PAGE_SIZE) {
    const page = table.pages[at]!;
    if (page.depth === table.bits) {
      if (table.bits === MOST_BITS) return { steps: [], refused: "bits" };
      // Every entry gains a twin that points at the same page.
      table.directory = [...table.directory, ...table.directory];
      table.bits++;
      record("double", `page ${at + 1} overflows: directory doubles to ${table.bits} bits`, null, at);
    }
    if (table.pages.length === PAGES) return { steps: [], refused: "pages" };
    // The page splits on its next bit: keys with that bit set move to a new page.
    const bit = 2 ** page.depth;
    const fresh = table.pages.length;
    const all = page.keys;
    page.depth++;
    page.keys = all.filter((other) => !(codeOf(other) & bit));
    table.pages.push({ depth: page.depth, keys: all.filter((other) => codeOf(other) & bit) });
    record("split", `split page ${at + 1} on bit ${page.depth} into page ${fresh + 1}`, null, at);
    table.directory.forEach((target, index) => {
      if (target !== at || !(index & bit)) return;
      table.directory[index] = fresh;
      record("repoint", `directory[${labelOf(index, table.bits)}] = page ${fresh + 1}`, index, fresh);
    });
    entry = low(key, table.bits);
    at = table.directory[entry]!;
  }
  return { steps };
}

export function search(from: Table, key: string): Step[] {
  const table = copy(from);
  const entry = low(key, table.bits);
  const at = table.directory[entry]!;
  const found = table.pages[at]!.keys.includes(key);
  const base = { table, focus: found ? key : null };
  return [
    { ...base, kind: "entry", entry, page: null, reads: 1, note: `${key} = ${bitsOf(key)}: directory[${labelOf(entry, table.bits)}]` },
    { ...base, kind: "page", entry, page: at, reads: 2, note: `read page ${at + 1}` },
    { ...base, kind: found ? "found" : "miss", entry, page: at, reads: 2, note: found ? `${key} is on page ${at + 1}` : `${key} is not on page ${at + 1}` },
  ];
}

export function build(keys: string[]): Table {
  let table = empty();
  for (const key of keys) {
    const { steps } = insert(table, key);
    if (steps.length) table = steps[steps.length - 1]!.table;
  }
  return table;
}

/** True when every key sits on the page its low bits lead to and every page is pointed at by exactly the entries that share its bits. */
export function holds(table: Table) {
  if (table.directory.length !== 2 ** table.bits || table.pages.length > PAGES) return false;
  return table.pages.every((page, at) => {
    if (page.depth > table.bits || page.keys.length > PAGE_SIZE) return false;
    const entries = table.directory.map((target, index) => (target === at ? index : -1)).filter((index) => index >= 0);
    if (entries.length !== 2 ** (table.bits - page.depth)) return false;
    const mask = 2 ** page.depth - 1;
    return entries.every((index) => (index & mask) === (entries[0]! & mask)) && page.keys.every((key) => table.directory[low(key, table.bits)] === at && (codeOf(key) & mask) === (entries[0]! & mask));
  });
}

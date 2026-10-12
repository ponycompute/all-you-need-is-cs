// Pure model for differential files (Horowitz §10.10). A large master file and its index are
// never rewritten; changed records go to a small differential file with its own index, and a
// Bloom filter kept in memory says when a key is certainly not in the differential file.
// Each operation returns the steps the desk plays back, with the disk accesses counted.

export const MASTER = [12, 25, 31, 47, 58, 63, 76, 89];
export const SLOTS = 5;
export const BITS = 12;

export interface Desk {
  /** The version of each record in the master file, in the order of MASTER. */
  master: number[];
  /** The differential file: the records changed since the last merge, in the order they were first written. */
  diff: Array<{ key: number; version: number }>;
}

/** A part of the desk: f3 is filter bit 3, mi2 and mf2 the third master index entry and record, di0 and df0 the first differential ones, di the whole differential index. */
export type Station = string;

export interface Step {
  desk: Desk;
  /** Parts being read. */
  on: Station[];
  /** The record that answers the lookup, or the one just written. */
  lit: Station | null;
  /** Where the read head stands. */
  head: Station | null;
  note: string;
  /** Disk accesses so far in this operation. */
  count: number;
  hold?: number;
}

export interface Played {
  steps: Step[];
  desk: Desk;
  note: string;
  accesses: number;
}

export const fresh = (): Desk => ({ master: MASTER.map(() => 1), diff: [] });

/** The two filter bits a key sets. */
export const bitsOf = (key: number): number[] => [...new Set([key % BITS, (key * 7 + 5) % BITS])];

export const filterOf = (desk: Desk) => {
  const bits = Array<boolean>(BITS).fill(false);
  for (const record of desk.diff) for (const bit of bitsOf(record.key)) bits[bit] = true;
  return bits;
};

/** The current version of a record: the differential file's if it has one, the master file's otherwise. */
export const latest = (desk: Desk, key: number) => desk.diff.find((record) => record.key === key)?.version ?? desk.master[MASTER.indexOf(key)]!;

export const rest = (desk: Desk): Step => ({
  desk,
  on: [],
  lit: null,
  head: null,
  count: 0,
  note: desk.diff.length ? `${desk.diff.length} of ${MASTER.length} records changed since the last merge` : "no changes since the last merge",
});

export function lookup(desk: Desk, key: number, useFilter: boolean): Played {
  const steps: Step[] = [];
  const step = (part: Omit<Step, "desk">) => steps.push({ desk, ...part });
  let count = 0;
  const slot = desk.diff.findIndex((record) => record.key === key);
  let consult = true;
  if (useFilter) {
    const bits = bitsOf(key);
    const filter = filterOf(desk);
    const clear = bits.find((bit) => !filter[bit]);
    consult = clear === undefined;
    step({
      on: bits.map((bit) => `f${bit}`),
      lit: null,
      head: `f${bits[0]}`,
      count,
      note: consult ? `filter bits ${bits.join(" and ")} are set: ${key} may have changed` : `filter bit ${clear} is 0: ${key} has not changed`,
    });
  }
  if (consult) {
    count++;
    if (slot >= 0) {
      step({ on: [`di${slot}`], lit: null, head: `di${slot}`, count, note: `differential index: ${key} is there` });
      count++;
      step({ on: [`df${slot}`], lit: `df${slot}`, head: `df${slot}`, count, note: `differential file: version ${desk.diff[slot]!.version} of ${key}` });
      return { steps, desk, accesses: count, note: `${key}: version ${desk.diff[slot]!.version}, from the differential file, in ${count} disk accesses.` };
    }
    step({ on: ["di"], lit: null, head: "di", count, note: `differential index: ${key} is not there` });
  }
  const at = MASTER.indexOf(key);
  count++;
  step({ on: [`mi${at}`], lit: null, head: `mi${at}`, count, note: `master index: ${key} is record ${at + 1}` });
  count++;
  step({ on: [`mf${at}`], lit: `mf${at}`, head: `mf${at}`, count, note: `master file: version ${desk.master[at]} of ${key}` });
  const wasted = consult ? (useFilter ? " The filter said maybe and was wrong, which cost one extra access." : " Without the filter, the differential index had to be read first.") : "";
  return { steps, desk, accesses: count, note: `${key}: version ${desk.master[at]}, from the master file, in ${count} disk accesses.${wasted}` };
}

export function update(desk: Desk, key: number): Played {
  const had = desk.diff.findIndex((record) => record.key === key);
  if (had < 0 && desk.diff.length >= SLOTS) return { steps: [], desk, accesses: 0, note: "The differential file is full: merge it into the master file first." };
  const version = latest(desk, key) + 1;
  const diff = had < 0 ? [...desk.diff, { key, version }] : desk.diff.map((record, index) => (index === had ? { key, version } : record));
  const next: Desk = { master: desk.master, diff };
  const slot = had < 0 ? diff.length - 1 : had;
  const bits = bitsOf(key);
  const steps: Step[] = [
    { desk: { master: desk.master, diff }, on: [`df${slot}`], lit: `df${slot}`, head: `df${slot}`, count: 1, note: `version ${version} of ${key} is written to the differential file` },
    { desk: next, on: [`di${slot}`], lit: `df${slot}`, head: `di${slot}`, count: 2, note: `the differential index now points to it` },
    { desk: next, on: bits.map((bit) => `f${bit}`), lit: `df${slot}`, head: `f${bits[0]}`, count: 2, note: `filter bits ${bits.join(" and ")} are set`, hold: 0.9 },
  ];
  return { steps, desk: next, accesses: 2, note: `Updated ${key} to version ${version} in 2 disk accesses. The master file and its index were not touched.` };
}

export function merge(desk: Desk): Played {
  if (!desk.diff.length) return { steps: [], desk, accesses: 0, note: "Nothing to merge: the differential file is empty." };
  const master = desk.master.map((version, at) => desk.diff.find((record) => record.key === MASTER[at])?.version ?? version);
  const moved = desk.diff.map((record) => MASTER.indexOf(record.key));
  const next: Desk = { master, diff: [] };
  const steps: Step[] = [
    { desk, on: desk.diff.map((_, slot) => `df${slot}`), lit: null, head: "di", count: 0, note: "every changed record is read from the differential file", hold: 0.9 },
    { desk: { master, diff: desk.diff }, on: moved.map((at) => `mf${at}`), lit: null, head: `mf${moved[0]}`, count: 0, note: "and written into a new master file", hold: 0.9 },
    { desk: next, on: [], lit: null, head: null, count: 0, note: "the differential file, its index and the filter start again empty", hold: 0.9 },
  ];
  return { steps, desk: next, accesses: 0, note: `Merged ${desk.diff.length} changed ${desk.diff.length === 1 ? "record" : "records"} into a new master file. This is the one time the whole file is rewritten.` };
}

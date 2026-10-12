"use client";

import { useMemo, useState } from "react";

type Mode = "adt" | "table" | "functions" | "overflow" | "theory" | "dynamic";

type HashTableVizProps = {
  sectionId?: string;
};

const LIBRARY_KEYS = ["acos", "define", "float", "exp", "char", "atan", "ceil", "floor", "clock", "ctime"];
const LINEAR_KEYS = ["for", "do", "while", "if", "else", "function"];
const CLUSTER_KEYS = ["acos", "atoi", "char", "define", "exp", "ceil", "cos", "float", "atol", "floor", "ctime"];

const modeForSection = (sectionId?: string): Mode => {
  if (sectionId === "8-1") return "adt";
  if (sectionId === "8-2") return "table";
  if (sectionId === "8-2-1") return "table";
  if (sectionId === "8-2-2") return "functions";
  if (sectionId === "8-2-3") return "overflow";
  if (sectionId === "8-2-4") return "theory";
  if (sectionId?.startsWith("8-3")) return "dynamic";
  if (sectionId === "8-4") return "theory";
  return "table";
};

const firstCharBucket = (key: string) => key.charCodeAt(0) - "a".charCodeAt(0);

const additiveTransform = (key: string) =>
  [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);

const hashMod = (key: string, size: number) => additiveTransform(key) % size;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildBucketSlots(keys: string[], bucketCount: number, slotCount: number) {
  const buckets = Array.from({ length: bucketCount }, () => ({
    slots: Array<string | null>(slotCount).fill(null),
    overflow: [] as string[],
  }));

  for (const key of keys) {
    const bucket = firstCharBucket(key);
    const row = buckets[bucket];
    const emptyIndex = row.slots.findIndex((slot) => slot === null);
    if (emptyIndex >= 0) row.slots[emptyIndex] = key;
    else row.overflow.push(key);
  }

  return buckets;
}

function buildLinearInsertTrace(keys: string[], tableSize: number) {
  const table = Array<string | null>(tableSize).fill(null);
  return keys.map((key) => {
    const home = hashMod(key, tableSize);
    const probes: number[] = [];
    let index = home;

    while (table[index] !== null && table[index] !== key) {
      probes.push(index);
      index = (index + 1) % tableSize;
    }

    probes.push(index);
    table[index] = key;

    return {
      key,
      home,
      placed: index,
      probes,
      table: [...table],
      additive: additiveTransform(key),
    };
  });
}

function buildClusterTable(keys: string[], tableSize: number) {
  const table = Array<string | null>(tableSize).fill(null);
  const searched = new Map<string, number>();

  for (const key of keys) {
    const home = firstCharBucket(key);
    let index = home;
    let probes = 1;

    while (table[index] !== null) {
      index = (index + 1) % tableSize;
      probes += 1;
    }

    table[index] = key;
    searched.set(key, probes);
  }

  return { table, searched };
}

function buildChains(keys: string[], bucketCount: number) {
  const buckets = Array.from({ length: bucketCount }, () => [] as string[]);
  for (const key of keys) buckets[firstCharBucket(key)].push(key);
  return buckets;
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mx-auto max-w-[620px] text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">{eyebrow}</p>
      <h3 className="mt-2 font-display text-[20px] font-medium leading-snug text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-body">{copy}</p>
    </div>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-9 rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-black bg-black text-white"
          : "border-hairline-strong bg-white text-ink hover:border-black"
      )}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-white p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">{label}</p>
      <p className="mt-2 font-mono text-lg text-ink">{value}</p>
      <p className="mt-2 text-sm leading-5 text-body">{note}</p>
    </div>
  );
}

function AdtPanel() {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Structure 8.1"
        title="Symbol table operations"
        copy="Hashing is introduced as an implementation technique for the symbol-table ADT: compute where the identifier should live, then resolve any collision at that address."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Search" value="lookup(id)" note="Find the attributes associated with an identifier." />
        <MetricCard label="Insert" value="enter(id)" note="Add a new identifier and its attributes to the table." />
        <MetricCard label="Delete" value="remove(id)" note="Remove an identifier while preserving later searches." />
      </div>
      <div className="rounded-lg border border-hairline bg-surface-soft p-4 font-mono text-sm leading-6 text-charcoal">
        identifier -&gt; hash function -&gt; home bucket -&gt; search bucket or overflow structure
      </div>
    </div>
  );
}

function StaticTablePanel() {
  const buckets = useMemo(() => buildBucketSlots(LIBRARY_KEYS, 26, 2), []);
  const visible = [0, 2, 3, 4, 5];
  const alpha = LIBRARY_KEYS.length / (26 * 2);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Example 8.1"
        title="26 buckets, two slots per bucket"
        copy="The textbook hashes C library names by first character. The example is intentionally simple so synonyms and overflow are visible."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Buckets" value="b = 26" note="Addresses 0 through 25, one for each first letter." />
        <MetricCard label="Slots" value="s = 2" note="Each bucket can hold two identifiers before overflow." />
        <MetricCard label="Loading" value={`alpha = ${alpha.toFixed(2)}`} note="n / (s * b) = 10 / 52 for this example." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {visible.map((bucket) => {
          const row = buckets[bucket];
          const isOverflow = row.overflow.length > 0;
          return (
            <div
              key={bucket}
              className={cx(
                "rounded-lg border bg-white p-3",
                isOverflow ? "border-black" : "border-hairline"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-mute">ht[{bucket}]</span>
                <span className="font-mono text-xs text-charcoal">{String.fromCharCode(97 + bucket)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {row.slots.map((slot, index) => (
                  <div
                    key={index}
                    className={cx(
                      "flex h-10 items-center justify-center rounded-md border font-mono text-sm",
                      slot ? "border-hairline-strong bg-surface-soft text-ink" : "border-hairline bg-white text-mute"
                    )}
                  >
                    {slot ?? "empty"}
                  </div>
                ))}
              </div>
              {isOverflow ? (
                <p className="mt-3 rounded-md border border-black bg-black px-2 py-1 text-center font-mono text-xs text-white">
                  overflow: {row.overflow.join(", ")}
                </p>
              ) : (
                <p className="mt-3 text-center font-mono text-xs text-mute">no overflow</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunctionsPanel() {
  const [key, setKey] = useState("function");
  const transformed = additiveTransform(key);
  const division = transformed % 13;
  const chunks = key.match(/.{1,3}/g) ?? [key];
  // Shift folding: read each three-letter partition as one number (two digits per letter), add the partitions.
  const parts = chunks.map((chunk) => Number([...chunk].map((char) => String(char.charCodeAt(0) % 100).padStart(2, "0")).join("")));
  const foldedSum = parts.reduce((sum, part) => sum + part, 0);
  const folded = foldedSum % 13;

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="§8.2.2"
        title="A hash function should be uniform"
        copy="The book compares mid-square, division, folding, and digit analysis. This panel works division and folding on one key, next to the first-character function from §8.2.1. The table size M is 13."
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {["for", "while", "function", "clock", "ctime"].map((item) => (
          <ModeButton key={item} active={key === item} onClick={() => setKey(item)}>
            {item}
          </ModeButton>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Transform" value={`${transformed}`} note="Sum of character codes, used in Program 8.2." />
        <MetricCard label="Division" value={`${transformed} % 13 = ${division}`} note="The preferred general-purpose family when M is chosen carefully." />
        <MetricCard label="Folding" value={`${foldedSum} % 13 = ${folded}`} note={`Partitions ${chunks.join(" | ")} read as numbers (${parts.join(" + ")}), added, then % 13.`} />
        <MetricCard label="First char" value={`${firstCharBucket(key)}`} note="Easy to compute, but biased because identifiers cluster by prefixes." />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-mute">Avoid</p>
          <p className="mt-2 text-sm leading-6 text-body">
            Division by a power of two depends mainly on low-order bits, so similar suffixes can cluster.
          </p>
        </div>
        <div className="rounded-lg border border-hairline bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-mute">Prefer</p>
          <p className="mt-2 text-sm leading-6 text-body">
            Choose M so it has no small prime factors; the text says this is usually enough in practice.
          </p>
        </div>
      </div>
    </div>
  );
}

function OverflowPanel() {
  const linearTrace = useMemo(() => buildLinearInsertTrace(LINEAR_KEYS, 13), []);
  const [step, setStep] = useState(linearTrace.length - 1);
  const current = linearTrace[step];
  const { table: clusterTable, searched } = useMemo(() => buildClusterTable(CLUSTER_KEYS, 26), []);
  const chains = useMemo(() => buildChains(CLUSTER_KEYS, 26), []);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="§8.2.3"
        title="Linear probing creates a visible probe path"
        copy="The book's 13-bucket example inserts function at ht[0] because it hashes to bucket 12, collides with if, then wraps around."
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {linearTrace.map((entry, index) => (
          <ModeButton key={entry.key} active={step === index} onClick={() => setStep(index)}>
            {entry.key}
          </ModeButton>
        ))}
      </div>

      <div className="rounded-lg border border-hairline bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-sm text-charcoal">
            {current.key}: additive {current.additive}, hash {current.home}, placed {current.placed}
          </p>
          <p className="font-mono text-xs text-mute">probe path: {current.probes.join(" -> ")}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-13">
          {current.table.map((value, index) => {
            const isProbe = current.probes.includes(index);
            const isPlaced = current.placed === index;
            return (
              <div
                key={index}
                className={cx(
                  "min-h-14 rounded-md border p-2 text-center",
                  isPlaced
                    ? "border-black bg-black text-white"
                    : isProbe
                      ? "border-black bg-surface-soft text-ink"
                      : "border-hairline bg-white text-charcoal"
                )}
              >
                <div className="font-mono text-[11px] opacity-70">[{index}]</div>
                <div className="mt-1 truncate font-mono text-xs">{value ?? "-"}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-mute">Linear probing cluster</p>
          <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-9 md:grid-cols-13">
            {clusterTable.map((value, index) => (
              <div key={index} className="rounded-md border border-hairline bg-surface-soft p-2 text-center">
                <p className="font-mono text-[10px] text-mute">[{index}]</p>
                <p className="mt-1 truncate font-mono text-[11px] text-ink">{value ?? "-"}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-5 text-body">
            `atol` needs {searched.get("atol")} probes and `ctime` needs {searched.get("ctime")} probes in the textbook-style cluster.
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-white p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-mute">Chaining avoids unrelated scans</p>
          <div className="mt-3 space-y-2">
            {[0, 2, 3, 4, 5].map((bucket) => (
              <div key={bucket} className="rounded-md border border-hairline bg-surface-soft px-3 py-2 font-mono text-xs text-charcoal">
                [{bucket}] -&gt; {chains[bucket].length ? chains[bucket].join(" -> ") : "NULL"}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-5 text-body">
            The text reports chaining average comparisons of 21 / 11 = 1.91 for the Figure 8.4 identifiers.
          </p>
        </div>
      </div>
    </div>
  );
}

function TheoryPanel() {
  const [load, setLoad] = useState(0.75);
  const chaining = 1 + load / 2;
  const linear = (2 - load) / (2 - 2 * load);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="§8.2.4"
        title="Expected probes depend on loading density"
        copy="Worst case remains O(n), but the chapter evaluates expected searches under uniform hashing."
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[0.5, 0.75, 0.9, 0.95].map((value) => (
          <ModeButton key={value} active={load === value} onClick={() => setLoad(value)}>
            alpha = {value.toFixed(2)}
          </ModeButton>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Load density" value={`alpha = ${load.toFixed(2)}`} note="n / b for one-slot buckets, or n / (s * b) when buckets have s slots." />
        <MetricCard label="Chaining" value={chaining.toFixed(2)} note="Expected successful-search comparisons are near 1 + alpha / 2." />
        <MetricCard label="Linear probing" value={linear.toFixed(2)} note="Approximate expected lookup probes grow quickly as alpha approaches 1." />
      </div>
      <div className="rounded-lg border border-hairline bg-white p-4">
        <div className="grid gap-2 md:grid-cols-5">
          {[
            ["mid-square", "uses middle bits of x^2"],
            ["division", "preferred general-purpose method"],
            ["shift fold", "adds aligned partitions"],
            ["bound fold", "reverses alternate partitions"],
            ["digit analysis", "for known static files"],
          ].map(([name, note]) => (
            <div key={name} className="rounded-md border border-hairline bg-surface-soft p-3">
              <p className="font-mono text-xs text-ink">{name}</p>
              <p className="mt-2 text-xs leading-5 text-body">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DynamicPanel() {
  const [stage, setStage] = useState(0);
  const stages = [
    {
      title: "2-bit directory",
      depth: "global depth = 2",
      entries: [
        ["00", "a: a0, b0"],
        ["01", "c: a1, b1"],
        ["10", "b: c2"],
        ["11", "d: c3"],
      ],
      note: "Four directory entries point directly to four pages.",
    },
    {
      title: "c5 overflows",
      depth: "split one page",
      entries: [
        ["000", "a: a0, b0"],
        ["001", "c: a1, b1"],
        ["010", "b: c2"],
        ["011", "d: c3"],
        ["101", "e: c5"],
      ],
      note: "A new page is allocated and the overflowing page is separated with one more bit.",
    },
    {
      title: "c1 inserted",
      depth: "directory expands",
      entries: [
        ["0000", "a: a0, b0"],
        ["0001", "c: a1, c1"],
        ["1001", "d: b1"],
        ["0101", "e: c5"],
        ["0010", "b: c2"],
        ["0011", "f: c3"],
      ],
      note: "The directory can double, but multiple entries may still point to the same page.",
    },
  ];
  const current = stages[stage];

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="§8.3"
        title="Dynamic hashing splits pages instead of rebuilding the file"
        copy="The chapter maps a trie into a directory so lookup is directory access plus page access, even as pages split."
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {stages.map((item, index) => (
          <ModeButton key={item.title} active={stage === index} onClick={() => setStage(index)}>
            {item.title}
          </ModeButton>
        ))}
      </div>
      <div className="rounded-lg border border-hairline bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg font-medium text-ink">{current.title}</p>
            <p className="mt-1 font-mono text-xs text-mute">{current.depth}</p>
          </div>
          <p className="max-w-[360px] text-sm leading-5 text-body">{current.note}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {current.entries.map(([bits, page]) => (
            <div key={`${bits}-${page}`} className="flex items-center gap-2 rounded-md border border-hairline bg-surface-soft p-3">
              <span className="rounded-full border border-hairline-strong bg-white px-3 py-1 font-mono text-xs text-ink">
                {bits}
              </span>
              <span className="font-mono text-xs text-charcoal">-&gt;</span>
              <span className="min-w-0 truncate font-mono text-xs text-ink">{page}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Lookup" value="2 steps" note="Hash to directory entry, then retrieve the pointed page." />
        <MetricCard label="Split" value="page + bit" note="Overflow rehashes one page with one more identifying bit." />
        <MetricCard label="Utilization" value="n / (m * p)" note="n records, m pages, p records per page." />
      </div>
    </div>
  );
}

export default function HashTableViz({ sectionId }: HashTableVizProps) {
  const mode = modeForSection(sectionId);

  return (
    <div>
      {mode === "adt" && <AdtPanel />}
      {mode === "table" && <StaticTablePanel />}
      {mode === "functions" && <FunctionsPanel />}
      {mode === "overflow" && <OverflowPanel />}
      {mode === "theory" && <TheoryPanel />}
      {mode === "dynamic" && <DynamicPanel />}
    </div>
  );
}

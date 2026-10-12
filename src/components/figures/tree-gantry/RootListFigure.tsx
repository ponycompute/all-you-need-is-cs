"use client";

import * as React from "react";
import TreeGantry from "./TreeGantry";
import { CAPACITY, build, combine, countOf, decreaseKey, deleteMin, frameOf, insert, keysOf, type Heap } from "./rootlist";
import { useLab } from "./useLab";

type Kind = "binomial" | "fibonacci";

const SAMPLE = [12, 8, 15, 3, 10, 17, 20];
/** The sample heap with its root list tidied, so there are real trees to look at from the start. */
const start = (marks: boolean) => deleteMin(insert(build(SAMPLE, marks), 1, marks).heap, marks).heap;
const restOf = (heap: Heap) => `${countOf(heap)} keys · ${heap.roots.length} trees${heap.min >= 0 ? ` · min ${heap.roots[heap.min]!.key}` : ""}`;

const COPY: Record<Kind, { fig: string; title: string; label: string; caption: string; keys: Array<{ mark: "raised" | "lit" | "edge" | "flat"; label: string }> }> = {
  binomial: {
    fig: "Fig 9.4",
    title: "Binomial heap",
    label:
      "A binomial heap hanging from a gantry: a list of trees, each root hanging from the rail by its own string, with a pointer on the rail over the smallest root. In every tree a parent is smaller than its children. Under each root is its degree, the number of children it has. Inserting a key hangs a new one-node tree from the rail and links nothing. Deleting the minimum removes that root, hangs its children from the rail, and then links roots of equal degree, the larger key under the smaller, until every root has a different degree.",
    keys: [
      { mark: "raised", label: "A key; “d” under a root is its degree" },
      { mark: "lit", label: "The root just inserted, removed, or linked under another" },
      { mark: "edge", label: "The pointer on the rail marks the minimum" },
    ],
    caption:
      "A binomial heap is lazy. Insert and combine only add trees to the root list, in O(1). Delete-min does the tidying: it links trees of equal degree until all degrees differ, which leaves at most log₂ n + 1 roots. One delete-min can be expensive, but it is paid for by the cheap inserts before it: O(1) per insert and O(log n) per delete-min, amortized.",
  },
  fibonacci: {
    fig: "Fig 9.5",
    title: "Fibonacci heap",
    label:
      "A Fibonacci heap hanging from a gantry: a list of trees, each root hanging from the rail, with a pointer on the rail over the smallest root. In every tree a parent is smaller than its children. Decreasing a key that becomes smaller than its parent cuts that node off and hangs it from the rail as a new tree. The parent it left gets a dot, a mark that it has lost a child; a marked node that loses a second child is cut off too, and so on upward. Deleting the minimum then links roots of equal degree as in a binomial heap.",
    keys: [
      { mark: "raised", label: "A key; a dot on a tag marks a node that has lost one child" },
      { mark: "lit", label: "The node just cut to the root list, or linked under another" },
      { mark: "edge", label: "The pointer on the rail marks the minimum" },
    ],
    caption:
      "A Fibonacci heap adds decrease-key to the binomial heap's lazy root list. Lowering a key below its parent's cuts the node loose instead of repairing the tree. A mark limits the damage: a node may lose one child, and losing a second cuts it loose as well, the cascading cut. That keeps a tree of degree d at least as large as a Fibonacci number, so delete-min stays O(log n) amortized while decrease-key is O(1).",
  },
};

export default function RootListFigure({ kind }: { kind: Kind }) {
  const copy = COPY[kind];
  const marks = kind === "fibonacci";
  const heap = React.useRef<Heap | null>(null);
  if (heap.current === null) heap.current = start(marks);
  const initial = React.useMemo(() => {
    const first = start(marks);
    return frameOf(first, { note: restOf(first), count: 0 }, marks);
  }, [marks]);
  const lab = useLab();
  const [keys, setKeys] = React.useState(() => [...SAMPLE].sort((a, b) => a - b));
  const [input, setInput] = React.useState("");
  const [lower, setLower] = React.useState("");
  const turn = React.useRef(0);

  const run = (played: { frames: Parameters<typeof lab.play>[1]; heap: Heap; note: string }) => {
    if (!lab.gantry) return;
    lab.play(lab.gantry, played.frames, played.note, () => {
      heap.current = played.heap;
      setKeys(keysOf(played.heap).sort((a, b) => a - b));
    });
  };

  const spare = (count: number) => {
    const taken = keysOf(heap.current!);
    const fresh: number[] = [];
    for (let key = 4 + ((turn.current++ * 5) % 13); fresh.length < count; key += 7) if (!taken.includes(key) && !fresh.includes(key)) fresh.push(key);
    return fresh;
  };

  const by = (move: () => void) => {
    lab.gantry?.takeOver();
    move();
  };

  const key = Number.parseInt(input, 10);
  const target = Number.parseInt(lower, 10);

  return (
    <TreeGantry
      fig={copy.fig}
      title={copy.title}
      hint="Insert a few keys, then delete-min"
      label={copy.label}
      caption={copy.caption}
      keys={copy.keys}
      initial={initial}
      onState={lab.onState}
      tour={() => {
        const now = heap.current!;
        const step = turn.current % 4;
        if (countOf(now) <= 5 || (step < 2 && countOf(now) < CAPACITY - 1)) run(insert(now, spare(1)[0]!, marks));
        else if (marks && step === 2) {
          // Lower the deepest key, so the tour shows a cut.
          const deep = now.roots.flatMap((tree) => tree.kids.flatMap((kid) => (kid.kids.length ? kid.kids : [kid])))[0];
          if (deep && !keysOf(now).includes(deep.key - 20 > 0 ? deep.key - 20 : 1)) run(decreaseKey(now, deep.key, Math.max(1, deep.key - 20)));
          else run(deleteMin(now, marks));
        } else run(deleteMin(now, marks));
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input type="number" min={1} max={99} value={input} onChange={(event) => setInput(event.target.value)} placeholder="key" aria-label="Key" className="ui-input w-20" />
          <button
            type="button"
            onClick={() =>
              by(() => {
                run(insert(heap.current!, Number.isNaN(key) ? spare(1)[0]! : Math.max(1, Math.min(99, key)), marks));
                setInput("");
              })
            }
            disabled={lab.busy || keys.length >= CAPACITY}
            className="ui-btn-primary"
          >
            Insert
          </button>
          <button type="button" onClick={() => by(() => run(deleteMin(heap.current!, marks)))} disabled={lab.busy || !keys.length} className="ui-btn-secondary">
            Delete Min
          </button>
          <button type="button" onClick={() => by(() => run(combine(heap.current!, spare(2), marks)))} disabled={lab.busy || keys.length + 2 > CAPACITY} className="ui-btn-secondary">
            Combine
          </button>
          <button
            type="button"
            onClick={() =>
              by(() => {
                const first = start(marks);
                heap.current = first;
                setKeys(keysOf(first).sort((a, b) => a - b));
                lab.setNote("Reset to the sample heap.");
                lab.gantry?.show(frameOf(first, { note: restOf(first), count: 0 }, marks));
              })
            }
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        {marks ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="ui-label">Decrease the key above to</span>
            <input type="number" min={1} max={98} value={lower} onChange={(event) => setLower(event.target.value)} placeholder="new key" aria-label="New, smaller key" className="ui-input w-24" />
            <button
              type="button"
              onClick={() =>
                by(() => {
                  run(decreaseKey(heap.current!, key, target));
                  setLower("");
                })
              }
              disabled={lab.busy || Number.isNaN(key) || Number.isNaN(target)}
              className="ui-btn-secondary"
            >
              Decrease Key
            </button>
          </div>
        ) : null}
        <p className="ui-caption text-center">
          Keys: {keys.join(", ") || "-"}
          {lab.note ? ` · ${lab.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {lab.busy ? "" : lab.note}
        </p>
      </div>
    </TreeGantry>
  );
}

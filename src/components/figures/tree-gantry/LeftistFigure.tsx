"use client";

import * as React from "react";
import TreeGantry from "./TreeGantry";
import { CAPACITY, build, deleteMin, frameOf, insert, keysOf, meld, type Node } from "./leftist";
import { useLab } from "./useLab";

const SAMPLE = [2, 7, 11, 18, 13, 9];
const start = () => build(SAMPLE);
const REST = (tree: Node | null) => (tree ? `${keysOf(tree).length} keys · min ${tree.key}` : "empty");
const INITIAL = frameOf([start()], { note: `${SAMPLE.length} keys · min 2`, count: 0 });

const LABEL =
  "A min-leftist tree hanging from a gantry. Each key is a round tag with its two children hanging below it, and under each tag is its shortest value: the length of the shortest path from that node down to a missing child. Every parent is smaller than its children, and at every node the left child's shortest value is at least the right child's, so the path down the right side is always the short one. Combining two trees merges their two right paths by key and then, walking back up, swaps the children of any node whose right side has become the deeper.";

const KEYS = [
  { mark: "raised" as const, label: "A key; “s” under it is its shortest path to a missing child" },
  { mark: "lit" as const, label: "The node just linked, or the node whose children were swapped" },
  { mark: "edge" as const, label: "The pointer on the rail marks the minimum, at the root" },
];

const CAPTION =
  "A leftist tree is a heap that can be combined with another in O(log n). Only the two right paths are walked, and the leftist rule keeps a right path no longer than log₂(n + 1). Insert is a combine with a one-node tree, and delete-min is a combine of the root's two subtrees. An array heap would have to be rebuilt, in O(n).";

export default function LeftistFigure() {
  const tree = React.useRef<Node | null>(null);
  const ready = React.useRef(false);
  if (!ready.current) {
    ready.current = true;
    tree.current = start();
  }
  const lab = useLab();
  const [size, setSize] = React.useState(SAMPLE.length);
  const [input, setInput] = React.useState("");
  const turn = React.useRef(0);

  const commit = (next: Node | null) => () => {
    tree.current = next;
    setSize(keysOf(next).length);
  };

  /** Three keys not in the tree, as a small second heap to combine with. */
  const second = () => {
    const taken = keysOf(tree.current);
    const keys: number[] = [];
    for (let key = 5 + ((turn.current++ * 7) % 11); keys.length < 3; key += 9) if (!taken.includes(key) && !keys.includes(key)) keys.push(key);
    return build(keys);
  };

  const act = (move: "insert" | "delete" | "combine", key?: number) => {
    const gantry = lab.gantry;
    if (!gantry) return;
    const played = move === "insert" ? insert(tree.current, key!) : move === "delete" ? deleteMin(tree.current) : meld(tree.current, second());
    lab.play(gantry, played.frames, played.note, commit(played.tree));
  };

  const typed = () => {
    const key = Number.parseInt(input, 10);
    if (Number.isNaN(key)) return;
    lab.gantry?.takeOver();
    act("insert", Math.max(1, Math.min(99, key)));
    setInput("");
  };

  return (
    <TreeGantry
      fig="Fig 9.3"
      title="Leftist tree"
      hint="Insert, delete-min, combine"
      label={LABEL}
      caption={CAPTION}
      keys={KEYS}
      initial={INITIAL}
      onState={lab.onState}
      tour={() => {
        const count = keysOf(tree.current).length;
        if (count + 3 <= CAPACITY && turn.current % 3 === 0) act("combine");
        else if (count > 4) act("delete");
        else act("combine");
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="number"
            min={1}
            max={99}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed();
            }}
            placeholder="1–99"
            aria-label="Key to insert"
            className="ui-input w-24"
          />
          <button type="button" onClick={typed} disabled={lab.busy || size >= CAPACITY} className="ui-btn-primary">
            Insert
          </button>
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              act("delete");
            }}
            disabled={lab.busy || size === 0}
            className="ui-btn-secondary"
          >
            Delete Min
          </button>
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              act("combine");
            }}
            disabled={lab.busy || size + 3 > CAPACITY}
            className="ui-btn-secondary"
          >
            Combine with a second tree
          </button>
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              tree.current = start();
              setSize(SAMPLE.length);
              lab.setNote("Reset to the sample tree.");
              lab.gantry?.show(frameOf([tree.current], { note: REST(tree.current), count: 0 }));
            }}
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          {size} of {CAPACITY} keys
          {lab.note ? ` · ${lab.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {lab.busy ? "" : lab.note}
        </p>
      </div>
    </TreeGantry>
  );
}

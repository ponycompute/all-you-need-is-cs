"use client";

import * as React from "react";
import TreeGantry, { type GantryHandle } from "./TreeGantry";
import { CAPACITY, frameOf, insert, keysOf, plain, search, type Node, type Played } from "./splay";

const SAMPLE = [8, 4, 12, 2, 6, 10, 14, 11];
const start = () => plain(SAMPLE);
const REST = `${SAMPLE.length} keys · root ${SAMPLE[0]}`;
const INITIAL = frameOf(start(), { note: REST, count: 0 });

const LABEL =
  "A binary search tree hanging from a gantry: each key is a round tag, and a tag's two children hang by strings from its lower edge, smaller keys to the left. A pointer on the rail stands over the root. Searching for a key, or inserting one, first walks down the tree and then splays: the tag reached is rotated up, one or two levels at a time, until it hangs from the rail as the new root. A counter on the base counts the rotations.";

const KEYS = [
  { mark: "raised" as const, label: "A key; smaller keys hang to its left, larger to its right" },
  { mark: "lit" as const, label: "The key being splayed to the root" },
  { mark: "edge" as const, label: "The pointer on the rail marks the root" },
];

const CAPTION =
  "A splay tree keeps no balance information at all. Every access finishes by rotating the accessed key to the root: a zig when its parent is the root, a zig-zig when it lies in a line with its parent and grandparent, a zig-zag when it lies between them. A single access can cost many rotations, but the keys it passed end up about half as deep, so any sequence of m operations costs O(m log n) in total.";

export default function SplayFigure() {
  const tree = React.useRef<Node | null>(null);
  if (tree.current === null) tree.current = start();
  const [gantry, setGantry] = React.useState<GantryHandle | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [keys, setKeys] = React.useState(() => [...SAMPLE].sort((a, b) => a - b));
  const [note, setNote] = React.useState("");
  const [input, setInput] = React.useState("");
  const pending = React.useRef("");

  const run = (handle: GantryHandle, played: Played) => {
    if (!played.frames.length) {
      setNote(played.note);
      return;
    }
    // The gantry refuses while it is still moving; only then is the model left as it was.
    if (!handle.play(played.frames)) return;
    tree.current = played.root;
    pending.current = played.note;
    setKeys(keysOf(played.root));
  };

  const typed = (move: "insert" | "search") => {
    const key = Number.parseInt(input, 10);
    if (!gantry || Number.isNaN(key)) return;
    gantry.takeOver();
    const clamped = Math.max(1, Math.min(99, key));
    run(gantry, move === "insert" ? insert(tree.current, clamped) : search(tree.current, clamped));
    setInput("");
  };

  const reset = () => {
    if (!gantry) return;
    gantry.takeOver();
    tree.current = start();
    setKeys(keysOf(tree.current));
    setNote("Reset to the sample tree.");
    gantry.show(INITIAL);
  };

  return (
    <TreeGantry
      fig="Fig 10.7"
      title="Splay tree"
      hint="Click a key to search for it"
      label={LABEL}
      caption={CAPTION}
      keys={KEYS}
      initial={INITIAL}
      onState={(state, handle) => {
        setGantry(handle);
        setBusy(state.busy);
        if (!state.busy && pending.current) {
          setNote(pending.current);
          pending.current = "";
        }
      }}
      onPick={(id, handle) => run(handle, search(tree.current, Number(id.slice(1))))}
      tour={(handle) => {
        // Search for the deepest key, so the tour always shows a long splay; top the tree up when it is small.
        const all = keysOf(tree.current);
        if (all.length < 6) {
          let key = 1 + Math.floor(Math.random() * 30);
          while (all.includes(key)) key = 1 + Math.floor(Math.random() * 30);
          run(handle, insert(tree.current, key));
          return;
        }
        const depthOf = (key: number) => {
          let depth = 0;
          for (let at = tree.current; at && at.key !== key; at = key < at.key ? at.left : at.right) depth++;
          return depth;
        };
        run(handle, search(tree.current, [...all].sort((a, b) => depthOf(b) - depthOf(a))[0]!));
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
              if (event.key === "Enter") typed("search");
            }}
            placeholder="1–99"
            aria-label="Key"
            className="ui-input w-24"
          />
          <button type="button" onClick={() => typed("search")} disabled={!gantry || busy} className="ui-btn-primary">
            Search
          </button>
          <button type="button" onClick={() => typed("insert")} disabled={!gantry || busy || keys.length >= CAPACITY} className="ui-btn-secondary">
            Insert
          </button>
          <button type="button" onClick={reset} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {keys.join(", ") || "-"}
          {note ? ` · ${note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {busy ? "" : note}
        </p>
      </div>
    </TreeGantry>
  );
}

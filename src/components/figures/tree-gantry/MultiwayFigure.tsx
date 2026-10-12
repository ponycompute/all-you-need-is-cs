"use client";

import * as React from "react";
import TreeGantry from "./TreeGantry";
import { CAPACITY, build, frameOf, heightOf, insert, keysOf, redBlack, search, type Node, type Played, type Shot } from "./multiway";
import type { TreeFrame } from "./types";
import { useLab } from "./useLab";

type Kind = "two-three" | "two-three-four" | "red-black";
type View = "nodes" | "binary";

const SAMPLE = [30, 70, 10, 20, 40, 60, 80, 90];

const COPY: Record<Kind, { fig: string; title: string; order: 3 | 4; label: string; caption: string; keys: Array<{ mark: "raised" | "lit" | "edge" | "flat"; label: string }> }> = {
  "two-three": {
    fig: "Fig 10.3",
    title: "2–3 tree",
    order: 3,
    label:
      "A 2-3 tree hanging from a gantry. Each node is a plate holding one or two keys in order; a plate with one key has two subtrees hanging from it and a plate with two keys has three. Every leaf hangs at the same level. Inserting a key puts it in its leaf; a leaf that then holds three keys splits in two and sends its middle key up to the plate above, which may split in turn, and when the root splits a new root is hung above it.",
    keys: [
      { mark: "raised", label: "A node: one or two keys, in order" },
      { mark: "lit", label: "The node being read, or the one that just split" },
      { mark: "edge", label: "Every leaf hangs at the same level" },
    ],
    caption:
      "A 2–3 tree stays balanced without rotating. A node absorbs a new key until it holds three, then splits and passes its middle key upward. The only way the tree gets taller is a split at the root, which lowers every leaf by one level at once: that is why all leaves are always level and a search reads at most log₂(n + 1) nodes.",
  },
  "two-three-four": {
    fig: "Fig 10.4",
    title: "2–3–4 tree",
    order: 4,
    label:
      "A 2-3-4 tree hanging from a gantry. Each node is a plate holding one, two or three keys in order, with one more subtree than it has keys. Every leaf hangs at the same level. An insertion walks down from the root, and whenever the next plate on its way already holds three keys it splits that plate first, sending the middle key up; so the leaf it reaches always has room for the new key.",
    keys: [
      { mark: "raised", label: "A node: one, two or three keys, in order" },
      { mark: "lit", label: "The node being read, or the full node being split" },
      { mark: "edge", label: "Every leaf hangs at the same level" },
    ],
    caption:
      "Allowing a third key per node lets an insertion finish in one pass. Going down, every full node on the path is split before it is entered, so there is always room below and nothing has to be repaired on the way back up. A 2–3 tree has to return upward after an overflow; a 2–3–4 tree never does.",
  },
  "red-black": {
    fig: "Fig 10.5",
    title: "Red-black tree",
    order: 4,
    label:
      "One set of keys hanging from a gantry in two forms. As a 2-3-4 tree, each node is a plate of one to three keys. As a red-black tree, every key is its own round tag in an ordinary binary search tree, and the keys that shared one plate are joined by heavy strings, the red links: a plate of two keys becomes a tag with one red child, a plate of three a tag with two red children. The thin strings, the black links, are the 2-3-4 tree's own links.",
    keys: [
      { mark: "raised", label: "A key; in the binary form each key is its own node" },
      { mark: "edge", label: "A heavy string is a red link: both keys came from one 2–3–4 node" },
      { mark: "lit", label: "The keys of the node an insertion is working on" },
    ],
    caption:
      "A red-black tree is a 2–3–4 tree written with binary nodes. Red links join keys that share a 2–3–4 node, so no path has two red links in a row and every path from the root crosses the same number of black links. Splitting a full node, as seen in the 2–3–4 form, is only a change of colour in the binary form: its two red links turn black and the link above it turns red.",
  },
};

export default function MultiwayFigure({ kind }: { kind: Kind }) {
  const copy = COPY[kind];
  const order = copy.order;
  const root = React.useRef<Node | null>(null);
  const ready = React.useRef(false);
  if (!ready.current) {
    ready.current = true;
    root.current = build(SAMPLE, order);
  }
  const view = React.useRef<View>(kind === "red-black" ? "binary" : "nodes");
  const [shown, setShown] = React.useState<View>(view.current);
  const lab = useLab();
  const [keys, setKeys] = React.useState(() => [...SAMPLE].sort((a, b) => a - b));
  const [input, setInput] = React.useState("");
  const turn = React.useRef(0);

  const rest = React.useCallback(
    (tree: Node | null): TreeFrame => {
      const note = `${keysOf(tree).length} keys · height ${heightOf(tree)}`;
      return view.current === "binary" ? redBlack(tree, { note, count: 0 }) : frameOf(tree, { note, count: 0 });
    },
    [],
  );
  const initial = React.useMemo(() => {
    const tree = build(SAMPLE, order);
    const note = `${SAMPLE.length} keys · height ${heightOf(tree)}`;
    return kind === "red-black" ? redBlack(tree, { note, count: 0 }) : frameOf(tree, { note, count: 0 });
  }, [kind, order]);

  const frameFor = (shot: Shot): TreeFrame =>
    view.current === "binary"
      ? redBlack(shot.root, { note: shot.note, count: shot.count, hold: shot.hold, lit: shot.keys.length ? "yes" : null }, shot.keys)
      : frameOf(shot.root, { note: shot.note, count: shot.count, hold: shot.hold, lit: shot.at === null ? null : `p${shot.at}` });

  const run = (played: Played) => {
    if (!lab.gantry) return;
    lab.play(lab.gantry, [...played.shots.map(frameFor), ...(played.shots.length ? [{ ...rest(played.root), hold: 0.1 }] : [])], played.note, () => {
      root.current = played.root;
      setKeys(keysOf(played.root));
    });
  };

  const typed = (move: "insert" | "search") => {
    const key = Number.parseInt(input, 10);
    if (Number.isNaN(key)) return;
    lab.gantry?.takeOver();
    const clamped = Math.max(1, Math.min(99, key));
    run(move === "insert" ? insert(root.current, clamped, order) : search(root.current, clamped));
    setInput("");
  };

  const choose = (next: View) => {
    if (!lab.gantry) return;
    lab.gantry.takeOver();
    const before = view.current;
    view.current = next;
    if (!lab.gantry.play([rest(root.current)])) {
      view.current = before;
      return;
    }
    setShown(next);
  };

  const spare = () => {
    const taken = keysOf(root.current);
    for (let key = 5 + ((turn.current++ * 13) % 90); ; key = (key % 97) + 1) if (!taken.includes(key)) return key;
  };

  return (
    <TreeGantry
      fig={copy.fig}
      title={copy.title}
      hint="Insert a key and watch a node split"
      label={copy.label}
      caption={copy.caption}
      keys={copy.keys}
      initial={initial}
      onState={lab.onState}
      tour={() => {
        if (keysOf(root.current).length >= CAPACITY) {
          const tree = build(SAMPLE, order);
          root.current = tree;
          setKeys(keysOf(tree));
          lab.gantry?.show(rest(tree));
        } else run(insert(root.current, spare(), order));
      }}
    >
      <div className="space-y-3">
        {kind === "red-black" ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => choose("binary")} disabled={lab.busy} className={shown === "binary" ? "ui-btn-primary" : "ui-btn-secondary"}>
              Red-black tree
            </button>
            <button type="button" onClick={() => choose("nodes")} disabled={lab.busy} className={shown === "nodes" ? "ui-btn-primary" : "ui-btn-secondary"}>
              The same keys as a 2–3–4 tree
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="number"
            min={1}
            max={99}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed("insert");
            }}
            placeholder="1–99"
            aria-label="Key"
            className="ui-input w-24"
          />
          <button type="button" onClick={() => typed("insert")} disabled={lab.busy || keys.length >= CAPACITY} className="ui-btn-primary">
            Insert
          </button>
          <button type="button" onClick={() => typed("search")} disabled={lab.busy} className="ui-btn-secondary">
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              const tree = build(SAMPLE, order);
              root.current = tree;
              setKeys(keysOf(tree));
              lab.setNote("Reset to the sample tree.");
              lab.gantry?.show(rest(tree));
            }}
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {keys.join(", ")}
          {lab.note ? ` · ${lab.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {lab.busy ? "" : lab.note}
        </p>
      </div>
    </TreeGantry>
  );
}

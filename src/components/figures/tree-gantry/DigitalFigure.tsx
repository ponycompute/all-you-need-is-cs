"use client";

import * as React from "react";
import TreeGantry, { type GantryHandle } from "./TreeGantry";
import { BITS, CAPACITY, bitsOf, insert, restOf, search, type View } from "./digital";

/** The book's keys, in the order it inserts them. */
const SAMPLE = [0b1000, 0b0010, 0b1001, 0b0001, 0b1100];
const INITIAL = restOf("digital", SAMPLE);

const VIEWS: Array<{ view: View; name: string }> = [
  { view: "digital", name: "Digital search tree" },
  { view: "trie", name: "Binary trie" },
  { view: "compressed", name: "Compressed trie" },
];

const LABEL =
  "A tree of four-bit keys hanging from a gantry, shown three ways. As a digital search tree every tag carries a key, and the tag at level i sends a search left or right on bit i of the key sought. As a binary trie the keys hang only at the ends; the small beads above them carry no key, only the number of the bit they test. As a compressed trie the beads that every key passes the same way are removed. The strings are labelled 0 and 1. A counter on the base counts how many whole keys a search compares.";

const KEYS = [
  { mark: "raised" as const, label: "A four-bit key" },
  { mark: "flat" as const, label: "A branch bead: only the number of the bit it tests" },
  { mark: "lit" as const, label: "The key found or just inserted; a ring marks the node being tested" },
];

const CAPTION =
  "Three structures that branch on the bits of a key instead of comparing keys. A digital search tree still compares the whole key at every node it passes. A binary trie tests one bit per branch and compares a whole key only once, at the leaf. Compressing the trie removes every branch with a single child, so its beads skip bits; Patricia stores this same shape with the keys kept inside the branch nodes.";

const parse = (text: string) => {
  const value = /^[01]+$/.test(text) ? Number.parseInt(text, 2) : Number.parseInt(text, 10);
  return Number.isNaN(value) || value < 0 || value >= 2 ** BITS ? null : value;
};

export default function DigitalFigure() {
  const order = React.useRef(SAMPLE);
  const [gantry, setGantry] = React.useState<GantryHandle | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [view, setView] = React.useState<View>("digital");
  const [keys, setKeys] = React.useState(SAMPLE);
  const turn = React.useRef(0);
  const [note, setNote] = React.useState("");
  const [input, setInput] = React.useState("");
  const pending = React.useRef("");
  const current = React.useRef<View>("digital");

  const act = (handle: GantryHandle, move: "insert" | "search", key: number) => {
    if (move === "search") {
      const played = search(current.current, order.current, key);
      if (handle.play([...played.frames, { ...restOf(current.current, order.current), hold: 0.1 }])) pending.current = played.note;
      return;
    }
    const played = insert(current.current, order.current, key);
    if (!played.frames.length) {
      setNote(played.note);
      return;
    }
    if (!handle.play([...played.frames, { ...restOf(current.current, played.order), hold: 0.1 }])) return;
    order.current = played.order;
    setKeys(played.order);
    pending.current = played.note;
  };

  const choose = (next: View) => {
    if (!gantry) return;
    gantry.takeOver();
    // The tags that exist in both views glide to their new places.
    if (!gantry.play([restOf(next, order.current)])) return;
    current.current = next;
    setView(next);
    setNote("");
  };

  const typed = (move: "insert" | "search") => {
    const key = parse(input.trim());
    if (!gantry || key === null) return;
    gantry.takeOver();
    act(gantry, move, key);
    setInput("");
  };

  const reset = () => {
    if (!gantry) return;
    gantry.takeOver();
    order.current = SAMPLE;
    setKeys(SAMPLE);
    setNote("Reset to the book's five keys.");
    gantry.show(restOf(current.current, SAMPLE));
  };

  return (
    <TreeGantry
      fig="Fig 10.8"
      title="Digital search"
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
      onPick={(id, handle) => {
        if (id.startsWith("k")) act(handle, "search", Number(id.slice(1)));
      }}
      tour={(handle) => {
        // Search for a key in each view in turn, so the same lookup is seen three ways.
        const keys = order.current;
        const key = keys[turn.current++ % keys.length]!;
        const at = VIEWS.findIndex((item) => item.view === current.current);
        const next = VIEWS[(at + 1) % VIEWS.length]!.view;
        const played = search(next, keys, key);
        if (!handle.play([restOf(next, keys), ...played.frames, { ...restOf(next, keys), hold: 0.1 }])) return;
        current.current = next;
        setView(next);
        pending.current = played.note;
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {VIEWS.map((item) => (
            <button key={item.view} type="button" onClick={() => choose(item.view)} disabled={!gantry || busy} className={item.view === view ? "ui-btn-primary" : "ui-btn-secondary"}>
              {item.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="text"
            maxLength={BITS}
            value={input}
            onChange={(event) => setInput(event.target.value.replace(/[^01]/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed("search");
            }}
            placeholder="0110"
            aria-label="A four-bit key, for example 0110"
            className="ui-input w-24"
          />
          <button type="button" onClick={() => typed("search")} disabled={!gantry || busy} className="ui-btn-secondary">
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
          Keys, in insertion order: {keys.map(bitsOf).join(", ")}
          {note ? ` · ${note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {busy ? "" : note}
        </p>
      </div>
    </TreeGantry>
  );
}

"use client";

import * as React from "react";
import TreeGantry, { type GantryHandle } from "./TreeGantry";
import { MAX_LETTERS, clean, fits, insert, remove, restOf, search, type Played } from "./trie";
import { useLab } from "./useLab";

const SAMPLE = ["bluebird", "bunting", "goshawk", "gull", "wren"];
const INITIAL = restOf(SAMPLE);
/** What the idle tour does, in order: look two keys up, add one that needs new branch nodes, then take it out again. */
const TOUR: Array<["search" | "insert" | "delete", string]> = [
  ["search", "gull"],
  ["insert", "gosling"],
  ["search", "bunting"],
  ["delete", "gosling"],
  ["search", "wren"],
];

const LABEL =
  "A trie of words hanging from a gantry. The small round beads are branch nodes: each carries only the number of the letter it looks at, and each string leaving it is labelled with one letter. A word hangs as a plate at the first place where no other word shares its letters so far, so the letters on the strings above a plate spell only as much of the word as is needed to tell it apart. A word that ends where another goes on hangs from a string labelled with an underscore, the blank.";

const KEYS = [
  { mark: "flat" as const, label: "A branch node: the number of the letter it samples" },
  { mark: "raised" as const, label: "An element node: one whole key" },
  { mark: "lit" as const, label: "The key found or just inserted; a ring marks the node being read" },
];

const CAPTION =
  "A trie never compares two keys to decide which way to go. Each branch node uses one letter of the key as an index and follows that link, so a search costs one link per letter sampled and a single whole-key comparison at the end. A key gets its own element node as soon as it is alone under a link; inserting a key that shares more letters with an old one pushes both further down, and deleting one lets the other move back up.";

export default function TrieFigure() {
  const words = React.useRef(SAMPLE);
  const lab = useLab();
  const [keys, setKeys] = React.useState(SAMPLE);
  const [input, setInput] = React.useState("");
  const turn = React.useRef(0);

  const act = (handle: GantryHandle, move: "search" | "insert" | "delete", word: string) => {
    const played: Played = move === "search" ? search(words.current, word) : move === "insert" ? insert(words.current, word) : remove(words.current, word);
    lab.play(handle, played.frames.length ? [...played.frames, { ...restOf(played.words), hold: 0.1 }] : [], played.note, () => {
      words.current = played.words;
      setKeys(played.words);
    });
  };

  const typed = (move: "search" | "insert" | "delete") => {
    const word = clean(input);
    if (!lab.gantry || !word) return;
    lab.gantry.takeOver();
    act(lab.gantry, move, word);
    setInput("");
  };

  const word = clean(input);
  return (
    <TreeGantry
      fig="Fig 10.9"
      title="Trie"
      hint="Click a key to search for it"
      label={LABEL}
      caption={CAPTION}
      keys={KEYS}
      initial={INITIAL}
      onState={lab.onState}
      onPick={(id, handle) => {
        if (id.startsWith("w")) act(handle, "search", id.slice(1));
      }}
      tour={(handle) => {
        const [move, target] = TOUR[turn.current++ % TOUR.length]!;
        const has = words.current.includes(target);
        // The reader may have changed the keys: only make moves that still make sense.
        if (move === "insert" ? has || !fits([...words.current, target]) : move === "delete" ? !has : false) return;
        act(handle, move, target);
      }}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="text"
            maxLength={MAX_LETTERS}
            value={input}
            onChange={(event) => setInput(clean(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed("search");
            }}
            placeholder="gosling"
            aria-label={`A word of up to ${MAX_LETTERS} letters`}
            className="ui-input w-32"
          />
          <button type="button" onClick={() => typed("search")} disabled={lab.busy || !word} className="ui-btn-secondary">
            Search
          </button>
          <button type="button" onClick={() => typed("insert")} disabled={lab.busy || !word} className="ui-btn-primary">
            Insert
          </button>
          <button type="button" onClick={() => typed("delete")} disabled={lab.busy || !word} className="ui-btn-secondary">
            Delete
          </button>
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              words.current = SAMPLE;
              setKeys(SAMPLE);
              lab.setNote("Reset to the sample keys.");
              lab.gantry?.show(restOf(SAMPLE));
            }}
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {keys.length ? keys.join(", ") : "none"}
          {lab.note ? ` · ${lab.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {lab.busy ? "" : lab.note}
        </p>
      </div>
    </TreeGantry>
  );
}

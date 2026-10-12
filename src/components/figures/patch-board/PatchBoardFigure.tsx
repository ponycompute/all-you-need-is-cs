"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { asksForStillness, useInView, useLoop, useReadout } from "../iso/react/live";
import "../iso/iso.css";
import "./patch-board.css";
import { BoardEngine, type BoardState } from "./engine";
import { BACK } from "./geometry";
import { build, CELLS } from "./model";
import { HEIGHT, WIDTH } from "./view";

/** The book's list, and where each word sits in memory: list order is not memory order. */
const SAMPLE = ["BAT", "CAT", "EAT", "FAT", "HAT"];
const SEATS = [3, 7, 1, 4, 8];
/** Words the idle tour and the feed button insert, starting with the book's own example. */
const POOL = ["GAT", "DAT", "JAT", "LAT", "MAT", "PAT", "RAT", "SAT"];

const COPY = {
  singly: {
    fig: "Fig 4.1",
    title: "Singly linked list",
    label:
      "A patch board with eight numbered memory cells. Each node of the list is a block standing in a cell, with its word on top and a small window showing the address it links to. A patch cord runs from each block's link jack to the block that comes next in the list, wherever in memory that block is. A post labelled first holds the cord to the first node. Inserting a word seats a new block in a free cell and moves two cords, one at a time; deleting moves one cord and lifts the block out.",
    keys: [
      { mark: "raised" as const, label: "A node: its word, and the address it links to" },
      { mark: "lit" as const, label: "The node being added or removed, and the cord just re-plugged" },
      { mark: "edge" as const, label: "A link: a cord from one node to the next in the list" },
    ],
    caption:
      "A sorted singly linked list on a patch board. Neighbours in the list are not neighbours in memory: only the cords say what comes next. An insertion walks to its place, takes a free cell, and then makes two link assignments in a fixed order: the new node is pointed at the rest of the list first, and only then is the node before it pointed at the new one. A deletion needs the node before, and one assignment.",
  },
  doubly: {
    fig: "Fig 4.8",
    title: "Doubly linked list",
    label:
      "A patch board with eight numbered memory cells. Each node of the list is a block standing in a cell with its word on top. A solid patch cord runs from each block to the next node in the list, and a dashed cord runs back to the previous one. A post labelled first holds the cord to the first node. Inserting a word seats a new block in a free cell and plugs four cords, one at a time; deleting re-plugs two cords and lifts the block out.",
    keys: [
      { mark: "raised" as const, label: "A node: its word, and the address of the next node" },
      { mark: "edge" as const, label: "rlink: a cord to the next node" },
      { mark: "dashed" as const, label: "llink: a cord back to the previous node" },
    ],
    caption:
      "The same list with a second link in every node. An insertion now makes four assignments and a deletion two, but a node can be removed knowing only its own address: its two cords already lead to both neighbours.",
  },
};

const TOUR_START = 1600;
const TOUR_EVERY = 1500;
const TOUR_RESUME = 12000;

export default function PatchBoardFigure({ doubly = false }: { doubly?: boolean }) {
  const copy = doubly ? COPY.doubly : COPY.singly;
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const initial = React.useMemo(() => build(SAMPLE, SEATS, doubly), [doubly]);
  const rest = `${SAMPLE.length} nodes · ${CELLS - SAMPLE.length} free`;

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const blocks = React.useRef<SVGGElement>(null);
  const cords = React.useRef<SVGGElement>(null);
  const engine = React.useRef<BoardEngine | null>(null);
  const [state, setState] = React.useState<BoardState>({ busy: false, words: [...SAMPLE], free: CELLS - SAMPLE.length, note: "" });
  const [input, setInput] = React.useState("");
  const visible = useInView(anchor);
  const touring = React.useRef(true);
  const turn = React.useRef(0);
  const quiet = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tourTick, setTourTick] = React.useState(0);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !blocks.current || !cords.current) return;
    const made = new BoardEngine(svg.current, blocks.current, cords.current, doubly, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [doubly, initial, say]);

  /** A word from the pool that is not in the list yet. */
  const spare = React.useCallback((words: string[]) => POOL.find((word) => !words.includes(word)) ?? null, []);

  // The idle tour: insert the book's GAT first, then alternate deletions and insertions.
  React.useEffect(() => {
    if (!visible || state.busy || !touring.current || asksForStillness()) return;
    const timer = setTimeout(() => {
      const board = engine.current;
      if (!board || board.busy || !touring.current) return;
      const words = board.words;
      const next = spare(words);
      const adding = turn.current % 2 === 1 || words.length <= 3;
      if (adding && next && words.length < CELLS) board.insert(next);
      else board.remove(words[Math.floor(Math.random() * words.length)]!);
      kick();
    }, turn.current++ ? TOUR_EVERY : TOUR_START);
    return () => clearTimeout(timer);
  }, [visible, state.busy, state.words, kick, spare, tourTick]);

  React.useEffect(() => () => {
    if (quiet.current) clearTimeout(quiet.current);
  }, []);

  /** The reader takes over: the tour stops where it is and comes back only after a long quiet. */
  const takeOver = React.useCallback(() => {
    touring.current = false;
    if (quiet.current) clearTimeout(quiet.current);
    quiet.current = setTimeout(() => {
      touring.current = true;
      setTourTick((tick) => tick + 1);
    }, TOUR_RESUME);
  }, []);

  const act = React.useCallback(
    (move: "insert" | "delete", word: string) => {
      const board = engine.current;
      if (!board || board.busy) return;
      takeOver();
      if (move === "insert") board.insert(word);
      else board.remove(word);
      kick();
    },
    [kick, takeOver],
  );

  const reset = () => {
    takeOver();
    engine.current?.reset(build(SAMPLE, SEATS, doubly), "Reset to the sample list.");
    kick();
  };

  const typed = (move: "insert" | "delete") => {
    const word = input.trim().toUpperCase();
    if (!/^[A-Z]{1,3}$/.test(word)) return;
    act(move, word);
    setInput("");
  };

  const next = spare(state.words);

  return (
    <div className="iso patch-board space-y-5" data-theme="light">
      <Plate fig={copy.fig} title={copy.title} hint="Click a node to delete it" readout={rest} keys={copy.keys} caption={copy.caption}>
        <div
          ref={anchor}
          className="pb-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label={`${copy.title} patch board. Enter inserts the next spare word, Escape resets.`}
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            const word = (event.target as Element).closest("[data-word]")?.getAttribute("data-word");
            if (word) act("delete", word);
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (next) act("insert", next);
            } else if (event.key === "Escape") {
              event.preventDefault();
              reset();
            }
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={copy.label} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={blocks} />
            <g ref={cords} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="text"
            maxLength={3}
            value={input}
            onChange={(event) => setInput(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed("insert");
            }}
            placeholder={next ?? "WORD"}
            aria-label="Word of up to three letters"
            className="ui-input w-24 uppercase"
          />
          <button type="button" onClick={() => (input ? typed("insert") : next && act("insert", next))} disabled={state.busy || state.free === 0} className="ui-btn-primary">
            Insert{input || !next ? "" : ` ${next}`}
          </button>
          <button type="button" onClick={() => typed("delete")} disabled={state.busy || !input} className="ui-btn-secondary">
            Delete
          </button>
          <button type="button" onClick={reset} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          List: {state.words.join(" → ") || "empty"} → NULL · Free cells: {state.free}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="pb-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

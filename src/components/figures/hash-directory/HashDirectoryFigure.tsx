"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./hash-directory.css";
import { TableEngine, type TableState } from "./engine";
import { BACK, FRONT, HEIGHT, WIDTH } from "./geometry";
import { PAGE_SIZE, build, isKey } from "./model";

/** The book's six identifiers, which fill a two-bit directory, and the keys the tour adds after them. */
const SAMPLE = ["a0", "b0", "c2", "a1", "b1", "c3"];
const POOL = ["c5", "a2", "b3", "c4", "a6", "b7", "c0"];

const LABEL =
  "A bench with a row of eight directory blocks at the back and six page trays at the front. Each directory block in use shows a bit pattern, and a cord runs from it to the page that holds the keys whose codes end in those bits. Each key is a card showing its name and the low three bits of its six-bit code. A tray holds two cards; a third, ringed slot shows an overflow. A plate in front of each tray gives the page number and the number of bits its keys share. When a page overflows it splits on its next bit; if it was already using every directory bit, the directory first doubles, and then the cords of the entries that changed are re-plugged.";

const KEYS = [
  { mark: "raised" as const, label: "A key card: its name, and the low three bits of its code" },
  { mark: "lit" as const, label: "The key being placed, and the cord just re-plugged" },
  { mark: "edge" as const, label: "A cord: directory entry to the page for those bits" },
];

const CAPTION = `Dynamic hashing with a directory. A lookup is always two reads: the directory entry for the key's low bits, then one page. A page holds ${PAGE_SIZE} keys; when a third arrives it splits on one more bit, and only if that page already used every directory bit does the directory double. Entries that still agree on a page's bits share its cord. The bench stops at three bits and six pages.`;

export default function HashDirectoryFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const front = React.useMemo(() => ({ __html: FRONT }), []);
  const initial = React.useMemo(() => build(SAMPLE), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const cords = React.useRef<SVGGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<TableEngine | null>(null);
  const [state, setState] = React.useState<TableState>({ busy: false, keys: [...SAMPLE].sort(), bits: 2, pages: 4, note: "" });
  const [input, setInput] = React.useState("");
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !cords.current || !layer.current) return;
    const made = new TableEngine(svg.current, cords.current, layer.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  const spare = POOL.find((key) => !state.keys.includes(key)) ?? null;

  // The idle tour: add the pool's keys one by one; when one is refused or none is left, start over.
  const { takeOver } = useTour(
    visible,
    state.busy,
    () => {
      const table = engine.current;
      if (!table || table.busy) return;
      if (!spare || !table.insert(spare)) table.reset(build(SAMPLE), "");
      kick();
    },
    state.keys,
  );

  const run = (move: (table: TableEngine) => void) => {
    const table = engine.current;
    if (!table || table.busy) return;
    takeOver();
    move(table);
    kick();
  };

  const typed = (move: "insert" | "search") => {
    const key = input.trim().toLowerCase();
    if (!isKey(key)) return;
    run((table) => (move === "insert" ? table.insert(key) : table.search(key)));
    setInput("");
  };

  return (
    <div className="iso fig hash-directory space-y-5" data-theme="light">
      <Plate fig="Fig 8.3" title="Dynamic hashing" hint="Click the feed to insert" readout="6 keys · 4 pages · 2-bit directory" keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Dynamic hashing bench. Enter inserts the next spare key, Escape resets."
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            if ((event.target as Element).closest('[data-act="load"]') && spare) run((table) => table.insert(spare));
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if ((event.key === "Enter" || event.key === " ") && spare) run((table) => table.insert(spare));
            else if (event.key === "Escape") run((table) => table.reset(build(SAMPLE), "Reset to the book's six keys."));
            else return;
            event.preventDefault();
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={cords} />
            <g ref={layer} />
            <g dangerouslySetInnerHTML={front} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="text"
            maxLength={2}
            value={input}
            onChange={(event) => setInput(event.target.value.toLowerCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") typed("insert");
            }}
            placeholder={spare ?? "c5"}
            aria-label="Key: a letter a, b or c and a digit 0 to 7"
            className="ui-input w-20"
          />
          <button type="button" onClick={() => (input ? typed("insert") : spare && run((table) => table.insert(spare)))} disabled={state.busy || (!input && !spare)} className="ui-btn-primary">
            Insert{input || !spare ? "" : ` ${spare}`}
          </button>
          <button type="button" onClick={() => typed("search")} disabled={state.busy || !isKey(input.trim())} className="ui-btn-secondary">
            Search
          </button>
          <button type="button" onClick={() => run((table) => table.reset(build(SAMPLE), "Reset to the book's six keys."))} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {state.keys.join(", ")} · directory: {2 ** state.bits} entries · pages: {state.pages}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="ui-caption text-center">A key is a letter a to c and a digit 0 to 7, for example c5. Its code is three bits for the letter, then three for the digit.</p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { asksForStillness, useInView, useLoop, useReadout } from "../iso/react/live";
import "../iso/iso.css";
import "./btree-file.css";
import { FileEngine, type FileState } from "./engine";
import { BACK, FRONT_ART } from "./geometry";
import { build, keysOf, LEAST, MOST, ORDER, pagesOf } from "./model";
import { HEIGHT, WIDTH } from "./view";

const SAMPLE = [20, 40, 60, 80, 30, 50, 10, 70, 90, 45];

const LABEL =
  "A card file on a two-step block. Each tray is one page of a B-tree of order 5 and holds up to four key cards in order; a fifth, ringed slot shows an overflow before the page splits. The single tray on the upper step is the root. Inlaid tracks run from the gaps between its cards down to the leaf trays on the lower step, so each leaf holds the keys that fall between two root keys. A line on each leaf's floor marks the two cards it must keep. A tray's rim lights while its page is read, and a counter on the upper step counts the pages read.";

const KEYS = [
  { mark: "raised" as const, label: `A key card; a tray is one page of at most ${MOST} keys` },
  { mark: "lit" as const, label: "The card being followed, and the rim of the page being read" },
  { mark: "dashed" as const, label: "The overflow slot: a fifth card splits the page" },
];

const CAPTION = `A B-tree of order ${ORDER} as a card file. A search reads one page per level, so two reads here. An insert that overflows a leaf splits it and sends the middle key up to the root; a delete that leaves fewer than ${LEAST} keys borrows one through the root or combines two leaves. The file stops at two levels: with all five leaf trays in use, the next split would have to split the root and grow a third.`;

const randomKey = (taken: number[]) => {
  for (;;) {
    const key = 1 + Math.floor(Math.random() * 99);
    if (!taken.includes(key)) return key;
  }
};

const TOUR_START = 1600;
const TOUR_EVERY = 1500;
const TOUR_RESUME = 12000;

type Move = "insert" | "delete" | "search";

export default function BTreeFileFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const front = React.useMemo(() => ({ __html: FRONT_ART }), []);
  const initial = React.useMemo(() => build(SAMPLE), []);
  const rest = `n ${keysOf(initial).length} · ${pagesOf(initial)} pages`;

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<FileEngine | null>(null);
  const [state, setState] = React.useState<FileState>({ busy: false, keys: keysOf(initial), pages: pagesOf(initial), note: "" });
  const [input, setInput] = React.useState("");
  const visible = useInView(anchor);
  const touring = React.useRef(true);
  const turn = React.useRef(0);
  const quiet = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tourTick, setTourTick] = React.useState(0);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !layer.current) return;
    const made = new FileEngine(svg.current, layer.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  // The idle tour: fill the file, then thin it out, so splits, borrows and combines all come round.
  const filling = React.useRef(true);
  React.useEffect(() => {
    if (!visible || state.busy || !touring.current || asksForStillness()) return;
    const timer = setTimeout(() => {
      const file = engine.current;
      if (!file || file.busy || !touring.current) return;
      const keys = file.keys;
      if (keys.length >= 18) filling.current = false;
      if (keys.length <= 6) filling.current = true;
      const inserted = filling.current && file.insert(randomKey(keys));
      if (!inserted) {
        filling.current = false;
        file.remove(keys[Math.floor(Math.random() * keys.length)]!);
      }
      kick();
    }, turn.current++ ? TOUR_EVERY : TOUR_START);
    return () => clearTimeout(timer);
  }, [visible, state.busy, state.keys, kick, tourTick]);

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
    (move: Move, key: number) => {
      const file = engine.current;
      if (!file || file.busy) return;
      takeOver();
      if (move === "insert") file.insert(key);
      else if (move === "delete") file.remove(key);
      else file.search(key);
      kick();
    },
    [kick, takeOver],
  );

  const reset = () => {
    takeOver();
    engine.current?.reset(build(SAMPLE), "Reset to the sample.");
    kick();
  };

  const typed = (move: Move) => {
    const parsed = Number.parseInt(input, 10);
    if (Number.isNaN(parsed)) return;
    act(move, Math.max(1, Math.min(99, parsed)));
    setInput("");
  };

  return (
    <div className="iso btree-file space-y-5" data-theme="light">
      <Plate fig="Fig 10.6" title={`B-tree · order ${ORDER}`} hint="Click the feed to insert" readout={rest} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="bf-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="B-tree card file. Enter inserts a random key, Escape resets."
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            if ((event.target as Element).closest('[data-act="load"]')) act("insert", randomKey(state.keys));
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              act("insert", randomKey(state.keys));
            } else if (event.key === "Escape") {
              event.preventDefault();
              reset();
            }
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={layer} />
            <g dangerouslySetInnerHTML={front} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
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
          <button type="button" onClick={() => typed("insert")} disabled={state.busy} className="ui-btn-primary">
            Insert
          </button>
          <button type="button" onClick={() => typed("delete")} disabled={state.busy} className="ui-btn-secondary">
            Delete
          </button>
          <button type="button" onClick={() => typed("search")} disabled={state.busy} className="ui-btn-secondary">
            Search
          </button>
          <button type="button" onClick={reset} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {state.keys.join(", ") || "-"}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="bf-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

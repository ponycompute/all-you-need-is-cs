"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./diff-desk.css";
import { DeskEngine } from "./engine";
import { DESK, HEAD, HEIGHT, WIDTH } from "./geometry";
import { MASTER, SLOTS, fresh, lookup, merge, rest, update, type Desk, type Played } from "./model";

/** The desk as the reader first sees it: two records already changed, which makes 12 a false alarm for the filter. */
const start = (): Desk => update(update(fresh(), 25).desk, 89).desk;
const START = start();
const START_NOTE = rest(START).note;

/** The idle tour: a changed record, an unchanged one the filter clears, one it wrongly suspects, then an update. */
const TOUR: Array<["lookup" | "update" | "merge", number]> = [
  ["lookup", 25],
  ["lookup", 47],
  ["lookup", 12],
  ["update", 63],
  ["lookup", 63],
  ["merge", 0],
  ["update", 25],
  ["update", 89],
];

const LABEL =
  "A desk with five rows of parts. At the back, the master file: eight record blocks, each showing its version, and in front of them the master index, one tile per key with a line to its record. In the middle, the differential file and its index, with room for five records: only records changed since the last merge are here. At the front, a Bloom filter: a bar of twelve pegs numbered 0 to 11, where a raised peg is a 1. A small read head moves to whatever is being read, and a counter counts disk accesses; the filter is in memory and costs none.";

const KEYS = [
  { mark: "raised" as const, label: "A record, showing its version; index tiles in front point to records" },
  { mark: "lit" as const, label: "A raised filter peg is a 1; the read head marks what is being read" },
  { mark: "edge" as const, label: "A ring: the entry or bits being read in this step" },
];

const CAPTION =
  "Rewriting a large file and its index for every change is slow and risky, so changes go to a small differential file instead, and a lookup must ask it first. That would add a disk access to every lookup. The Bloom filter removes most of them: each changed key sets two bits, and if either bit of the key sought is 0 the key certainly has not changed, so the search goes straight to the master index. When both bits happen to be set by other keys the filter says maybe, wrongly, and one access is wasted; it never says no for a key that has changed.";

export default function DiffDeskFigure() {
  const art = React.useMemo(() => ({ __html: DESK }), []);
  const head = React.useMemo(() => ({ __html: HEAD }), []);
  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const engine = React.useRef<DeskEngine | null>(null);
  const desk = React.useRef<Desk>(START);
  const pending = React.useRef("");
  const turn = React.useRef(0);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [changed, setChanged] = React.useState(() => START.diff.map((record) => record.key));
  const [picked, setPicked] = React.useState(12);
  const [useFilter, setUseFilter] = React.useState(true);
  const filterOn = React.useRef(true);
  const visible = useInView(anchor);
  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current) return;
    const made = new DeskEngine(svg.current, rest(desk.current), say, (state) => {
      setBusy(state.busy);
      if (!state.busy && pending.current) {
        setNote(pending.current);
        pending.current = "";
      }
    });
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [say]);

  const run = (move: "lookup" | "update" | "merge", key: number) => {
    const played: Played = move === "lookup" ? lookup(desk.current, key, filterOn.current) : move === "update" ? update(desk.current, key) : merge(desk.current);
    if (!played.steps.length) {
      setNote(played.note);
      return;
    }
    if (!engine.current?.play([...played.steps, { ...rest(played.desk), hold: 0.1 }])) return;
    kick();
    desk.current = played.desk;
    setChanged(played.desk.diff.map((record) => record.key));
    pending.current = played.note;
  };

  const { takeOver } = useTour(
    visible,
    busy,
    () => {
      const [move, key] = TOUR[turn.current++ % TOUR.length]!;
      // The reader may have filled or emptied the differential file: skip moves that would do nothing.
      if (move === "update" && desk.current.diff.length >= SLOTS && !desk.current.diff.some((record) => record.key === key)) return run("merge", 0);
      run(move, key);
    },
    busy,
  );

  const act = (move: "lookup" | "update" | "merge", key = picked) => {
    takeOver();
    run(move, key);
  };

  const full = changed.length >= SLOTS && !changed.includes(picked);
  return (
    <div className="iso fig diff-desk space-y-5" data-theme="light">
      <Plate fig="Fig 10.10" title="Differential files" hint="Click a record to look it up" readout={START_NOTE} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Differential files. Use the controls below the figure."
          data-busy={busy ? "" : undefined}
          onClick={(event) => {
            const id = (event.target as Element).closest("[data-st]")?.getAttribute("data-st") ?? "";
            const at = Number(id.slice(2));
            const key = id.startsWith("m") ? MASTER[at] : id.startsWith("d") && id.length > 2 ? desk.current.diff[at]?.key : undefined;
            if (key === undefined) return;
            setPicked(key);
            act("lookup", key);
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={art} />
            <g data-part="head" pointerEvents="none" dangerouslySetInnerHTML={head} />
          </svg>
        </div>
      </Plate>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Record">
          {MASTER.map((key) => (
            <button key={key} type="button" onClick={() => setPicked(key)} aria-pressed={key === picked} className={key === picked ? "ui-btn-primary" : "ui-btn-secondary"}>
              {key}
              {changed.includes(key) ? " •" : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => act("lookup")} disabled={busy} className="ui-btn-primary">
            Look up {picked}
          </button>
          <button type="button" onClick={() => act("update")} disabled={busy || full} className="ui-btn-secondary">
            Update {picked}
          </button>
          <button type="button" onClick={() => act("merge")} disabled={busy || !changed.length} className="ui-btn-secondary">
            Merge
          </button>
          <button
            type="button"
            onClick={() => {
              takeOver();
              desk.current = start();
              setChanged(desk.current.diff.map((record) => record.key));
              pending.current = "";
              setNote("Reset: 25 and 89 have been updated once.");
              engine.current?.show(rest(desk.current));
              kick();
            }}
            className="ui-btn-secondary"
          >
            Reset
          </button>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={useFilter}
              onChange={(event) => {
                filterOn.current = event.target.checked;
                setUseFilter(event.target.checked);
              }}
            />
            Use the Bloom filter
          </label>
        </div>
        <p className="ui-caption text-center">
          Changed since the last merge (marked •): {changed.length ? changed.join(", ") : "none"}
          {note ? ` · ${note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {busy ? "" : note}
        </p>
      </div>
    </div>
  );
}

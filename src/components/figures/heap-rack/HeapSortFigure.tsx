"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./heap-rack.css";
import { RackEngine, type RackState } from "./engine";
import { artOf } from "./geometry";
import { extract, heapify } from "./heapsort";
import { SEATS, type Step, type Weight } from "./model";
import { HEIGHT, WIDTH } from "./view";

const COUNT = 10;
const BOOK = [26, 5, 77, 1, 61, 11, 59, 15, 48, 19];

const seatsOf = (values: number[]): Array<Weight | null> => Array.from({ length: SEATS }, (_, seat) => (seat < values.length ? { id: seat + 1, value: values[seat]! } : null));

function shuffled() {
  const values = new Set<number>();
  while (values.size < COUNT) values.add(1 + Math.floor(Math.random() * 99));
  return [...values];
}

type Phase = "file" | "heap" | "sorted";

const LABEL =
  "A four-tier step block holding ten turned test weights; each weight's height is its key and the key is engraved on top. The seats are numbered 1 to 15 in level order, and a strip of windows along the front of the base shows the same keys as the array they are stored in. Heap sort first rearranges the weights into a max-heap, so every weight is at least as tall as the two below it. It then repeatedly swaps the tallest weight, on the top step, with the weight in the last seat of the heap, marks that seat as finished, and repairs the smaller heap.";

const KEYS = [
  { mark: "raised" as const, label: "A weight: its height is its key" },
  { mark: "lit" as const, label: "The weight being moved down into place" },
  { mark: "edge" as const, label: "A ringed seat is finished: its weight is in its final place" },
];

const CAPTION =
  "Heap sort on the step rack. The file is the array along the front; the rack is the same array seen as a complete tree. Building the heap adjusts each parent, last one first. Each round then swaps the root with the last seat of the heap and adjusts once, so the finished seats fill from the back and the array ends in ascending order: O(n log n) with no second array.";

export default function HeapSortFigure() {
  const art = React.useMemo(() => artOf("max"), []);
  const back = React.useMemo(() => ({ __html: art.back }), [art]);
  const initial = React.useMemo(() => seatsOf(BOOK), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<RackEngine | null>(null);
  const [state, setState] = React.useState<RackState>({ busy: false, count: COUNT, low: null, high: null, note: "" });
  const [phase, setPhase] = React.useState<Phase>("file");
  // How many seats are still in the heap, and which are finished; both follow the steps handed to the rack.
  const heap = React.useRef(COUNT);
  const settled = React.useRef<number[]>([]);
  const [left, setLeft] = React.useState(COUNT);
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !layer.current) return;
    const made = new RackEngine("max", svg.current, layer.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  const build = React.useCallback(() => {
    const rack = engine.current;
    if (!rack || rack.busy) return;
    rack.run("building the heap", heapify(rack.current, COUNT), (swaps) => `Built a max-heap with ${swaps} ${swaps === 1 ? "swap" : "swaps"}.`);
    setPhase("heap");
    kick();
  }, [kick]);

  /** Plays `rounds` rounds of phase two, or as many as are left. */
  const sort = React.useCallback(
    (rounds: number) => {
      const rack = engine.current;
      if (!rack || rack.busy || heap.current === 0) return;
      let seats = rack.current;
      const steps: Step[] = [];
      let done = 0;
      while (heap.current > 0 && done < rounds) {
        const round = extract(seats, heap.current, settled.current);
        const last = round[round.length - 1]!;
        steps.push(...round);
        seats = last.seats;
        settled.current = last.settled ?? settled.current;
        heap.current--;
        done++;
      }
      const left = heap.current;
      setLeft(left);
      rack.run(
        left ? "moving the largest key to the back" : "sorting",
        steps,
        (swaps) => (left ? `${COUNT - left} in place, heap of ${left} left (${swaps} ${swaps === 1 ? "swap" : "swaps"}).` : `Sorted: the array now reads in ascending order (${swaps} swaps in this run).`),
      );
      if (!left) setPhase("sorted");
      kick();
    },
    [kick],
  );

  const reset = React.useCallback(
    (values: number[]) => {
      heap.current = COUNT;
      settled.current = [];
      setLeft(COUNT);
      engine.current?.reset(seatsOf(values), "A new unsorted file.");
      setPhase("file");
      kick();
    },
    [kick],
  );

  const { takeOver } = useTour(
    visible,
    state.busy,
    () => {
      if (phase === "file") build();
      else if (phase === "heap") sort(1);
      else reset(shuffled());
    },
    phase,
  );

  const by = (move: () => void) => {
    takeOver();
    move();
  };

  return (
    <div className="iso fig heap-rack space-y-5" data-theme="light">
      <Plate fig="Fig 7.7" title="Heap sort" hint="Build the heap, then sort" readout={`n ${COUNT} · unsorted`} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="hr-stage fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Heap sort on the step rack. Enter performs the next step, Escape shuffles."
          data-busy={state.busy ? "" : undefined}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              takeOver();
              if (phase === "file") build();
              else if (phase === "heap") sort(1);
            } else if (event.key === "Escape") {
              event.preventDefault();
              takeOver();
              reset(shuffled());
            }
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={layer} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => by(build)} disabled={state.busy || phase !== "file"} className={phase === "file" ? "ui-btn-primary" : "ui-btn-secondary"}>
            1 · Build heap
          </button>
          <button type="button" onClick={() => by(() => sort(1))} disabled={state.busy || phase !== "heap"} className={phase === "heap" ? "ui-btn-primary" : "ui-btn-secondary"}>
            2 · Move max to the back
          </button>
          <button type="button" onClick={() => by(() => sort(COUNT))} disabled={state.busy || phase !== "heap"} className="ui-btn-secondary">
            Sort all
          </button>
          <button type="button" onClick={() => by(() => reset(shuffled()))} disabled={state.busy} className="ui-btn-secondary">
            Shuffle
          </button>
          <button type="button" onClick={() => by(() => reset(BOOK))} disabled={state.busy} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          {state.busy ? "Working…" : phase === "file" ? "Unsorted file" : phase === "heap" ? `Max-heap of ${left} · ${COUNT - left} finished` : "Sorted"}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

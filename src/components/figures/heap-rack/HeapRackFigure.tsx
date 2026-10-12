"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { asksForStillness, useInView, useLoop, useReadout } from "../iso/react/live";
import "../iso/iso.css";
import "./heap-rack.css";
import { RackEngine, type RackState } from "./engine";
import { artOf } from "./geometry";
import { build, capacityOf, countOf, extremesOf, type End, type HeapKind } from "./model";
import { HEIGHT, WIDTH } from "./view";

const SAMPLES: Record<HeapKind, number[]> = {
  minmax: [7, 70, 40, 30, 9, 10, 15, 45, 50, 30, 20, 12],
  deap: [5, 45, 10, 8, 25, 40, 15, 19, 9, 30, 20],
};

const COPY: Record<HeapKind, { fig: string; title: string; label: string; keys: Array<{ mark: "raised" | "lit" | "edge" | "dim"; label: string }>; caption: string }> = {
  minmax: {
    fig: "Fig 9.1",
    title: "Min–max heap",
    label:
      "A four-tier step block holding turned test weights; each weight's height is its key and the key is engraved on top. Inlaid tracks join every seat to the two seats below it. The top, third tiers are marked low: each weight there is the shortest of everything below it. The second and fourth tiers are marked high: each is the tallest of everything below it. Two height gauges on the top step read the lowest and the highest key. A drawn weight hops to the left tray if it was the lowest, to the right tray if it was the highest, and the rack repairs itself by trading weights along the tracks.",
    keys: [
      { mark: "raised", label: "A weight: its height is its key" },
      { mark: "lit", label: "The weight being moved into place" },
      { mark: "edge", label: "▽ tier: shortest of all below it · △ tier: tallest of all below it" },
    ],
    caption:
      "A min–max heap as a step rack. Tiers alternate, so the lowest key always stands on the top step and the highest on the step under it: both gauges read their answer from a fixed seat, in O(1). An insert or a delete then repairs the rack by trading weights two tiers at a time, at most ⌊log₂ n⌋ levels.",
  },
  deap: {
    fig: "Fig 9.2",
    title: "Deap",
    label:
      "A four-tier step block holding turned test weights; each weight's height is its key and the key is engraved on top. The single seat on the top step is capped and stays empty. The left half of the rack is a min-heap, marked low, and the right half is a max-heap, marked high. Every weight on the left is no taller than its partner in the matching seat on the right. Two height gauges read the lowest key, at the head of the left half, and the highest, at the head of the right half.",
    keys: [
      { mark: "raised", label: "A weight: its height is its key" },
      { mark: "lit", label: "The weight being moved into place" },
      { mark: "edge", label: "▽ left half: a min-heap · △ right half: a max-heap" },
    ],
    caption:
      "A deap as a step rack. The top seat is capped; under it the left half is a min-heap and the right half a max-heap, and every left weight is no taller than its partner in the matching seat on the right. An insert checks the new weight against its partner once, then climbs one side only.",
  },
};

const randomKey = () => 1 + Math.floor(Math.random() * 99);

/** What the idle tour does next: keep the rack between nine weights and nearly full. */
function tourMove(kind: HeapKind, count: number, turn: number): "load" | End {
  if (count <= 9) return "load";
  if (count >= capacityOf(kind) - 1) return turn % 2 ? "high" : "low";
  return (["load", "low", "load", "high"] as const)[turn % 4]!;
}

const TOUR_START = 1600;
const TOUR_EVERY = 1300;
const TOUR_RESUME = 12000;

export default function HeapRackFigure({ kind }: { kind: HeapKind }) {
  const copy = COPY[kind];
  const art = React.useMemo(() => artOf(kind), [kind]);
  const back = React.useMemo(() => ({ __html: art.back }), [art]);
  const front = React.useMemo(() => ({ __html: art.front }), [art]);
  const initial = React.useMemo(() => build(kind, SAMPLES[kind]), [kind]);
  const rest = React.useMemo(() => {
    const { low, high } = extremesOf(kind, initial);
    return `n ${countOf(initial)} · min ${low!.value} · max ${high!.value}`;
  }, [kind, initial]);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<RackEngine | null>(null);
  const [state, setState] = React.useState<RackState>({ busy: false, count: countOf(initial), low: null, high: null, note: "" });
  const [input, setInput] = React.useState("");
  const visible = useInView(anchor);
  const touring = React.useRef(true);
  const turn = React.useRef(0);
  const quiet = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tourTick, setTourTick] = React.useState(0);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !layer.current) return;
    const made = new RackEngine(kind, svg.current, layer.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [kind, initial, say]);

  // The idle tour: one operation at a time while nobody is using the rack.
  React.useEffect(() => {
    if (!visible || state.busy || !touring.current || asksForStillness()) return;
    const timer = setTimeout(() => {
      const rack = engine.current;
      if (!rack || rack.busy || !touring.current) return;
      const move = tourMove(kind, state.count, turn.current++);
      if (move === "load") rack.load(randomKey());
      else rack.draw(move);
      kick();
    }, turn.current ? TOUR_EVERY : TOUR_START);
    return () => clearTimeout(timer);
  }, [visible, state.busy, state.count, kind, kick, tourTick]);

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
    (move: "load" | End | "reset", value?: number) => {
      const rack = engine.current;
      if (!rack) return;
      takeOver();
      if (move === "reset") rack.reset(build(kind, SAMPLES[kind]), "Reset to the sample.");
      else if (move === "load") rack.load(value ?? randomKey());
      else rack.draw(move);
      kick();
    },
    [kind, kick, takeOver],
  );

  const insertTyped = () => {
    const parsed = Number.parseInt(input, 10);
    if (Number.isNaN(parsed)) return;
    act("load", Math.max(1, Math.min(99, parsed)));
    setInput("");
  };

  const full = state.count >= capacityOf(kind);
  const empty = state.count === 0;

  return (
    <div className="iso heap-rack space-y-5" data-theme="light">
      <Plate fig={copy.fig} title={copy.title} hint="Click a tray or the pad" readout={rest} keys={copy.keys} caption={copy.caption}>
        <div
          ref={anchor}
          className="hr-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label={`${copy.title} step rack. Enter inserts a random key, left arrow deletes the minimum, right arrow deletes the maximum, Escape resets.`}
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            const target = (event.target as Element).closest("[data-act]");
            const move = target?.getAttribute("data-act");
            if (move === "load" || move === "low" || move === "high") act(move);
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const move = { Enter: "load", " ": "load", ArrowLeft: "low", ArrowRight: "high", Escape: "reset" }[event.key] as "load" | End | "reset" | undefined;
            if (!move) return;
            event.preventDefault();
            act(move);
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={copy.label} focusable="false">
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
              if (event.key === "Enter") insertTyped();
            }}
            placeholder="1–99"
            aria-label="Key to insert"
            className="ui-input w-24"
          />
          <button type="button" onClick={insertTyped} disabled={state.busy || full} className="ui-btn-primary">
            Insert
          </button>
          <button type="button" onClick={() => act("low")} disabled={state.busy || empty} className="ui-btn-secondary">
            Delete Min
          </button>
          <button type="button" onClick={() => act("high")} disabled={state.busy || empty} className="ui-btn-secondary">
            Delete Max
          </button>
          <button type="button" onClick={() => act("reset")} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Size: {state.count}
          {full ? " (rack full)" : ""} · Min: {state.low ?? "-"} · Max: {state.high ?? "-"}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="hr-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

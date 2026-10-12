"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import { QueueEngine, type QueueState } from "./engine";
import { BACK, FRONT, HEIGHT, HUB_ART, WIDTH } from "./geometry";
import { CAPACITY, SLOTS, empty, type Ring } from "./model";

/** Three items already queued, in slots 1 to 3. */
function sample(): Ring {
  const ring = empty();
  [12, 47, 30].forEach((value, index) => {
    ring.slots[index + 1] = { id: index + 1, value };
  });
  ring.rear = 3;
  return ring;
}

const LABEL =
  "A turntable with eight numbered slots in a ring: the array a circular queue is stored in. Two arms turn on the hub. The arm marked R, with a dot, points at the slot of the last item; the arm marked F, with a ring, points at the slot just before the first item. Adding an item turns R one slot clockwise and sets the item down there. Deleting turns F one slot clockwise and takes the item it now points at. Nothing else on the turntable moves.";

const KEYS = [
  { mark: "raised" as const, label: "An item in its slot of the array" },
  { mark: "lit" as const, label: "The item being added or deleted" },
  { mark: "edge" as const, label: "F: the slot before the first item · R: the slot of the last" },
];

const CAPTION = `A circular queue of ${SLOTS} slots. Neither operation moves the items already there: only an index advances, and slot ${SLOTS - 1} is followed by slot 0. The queue is empty when F and R point at the same slot, so it must be called full one item early, when R is one step behind F: ${CAPACITY} items fit in ${SLOTS} slots.`;

const randomValue = () => 1 + Math.floor(Math.random() * 99);

export default function RingQueueFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const hub = React.useMemo(() => ({ __html: HUB_ART }), []);
  const front = React.useMemo(() => ({ __html: FRONT }), []);
  const initial = React.useMemo(() => sample(), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const arms = React.useRef<SVGGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<QueueEngine | null>(null);
  const [state, setState] = React.useState<QueueState>({ busy: false, items: [12, 47, 30], front: 0, rear: 3, note: "" });
  const [input, setInput] = React.useState("");
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !arms.current || !layer.current) return;
    const made = new QueueEngine(svg.current, arms.current, layer.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  // The idle tour: fill toward the limit, then drain, so the indices go all the way round.
  const filling = React.useRef(true);
  const { takeOver } = useTour(
    visible,
    state.busy,
    () => {
      const queue = engine.current;
      if (!queue || queue.busy) return;
      if (state.items.length >= CAPACITY - 1) filling.current = false;
      if (state.items.length <= 1) filling.current = true;
      if (filling.current) queue.add(randomValue());
      else queue.remove();
      kick();
    },
    state.items,
  );

  const run = (move: (queue: QueueEngine) => void) => {
    const queue = engine.current;
    if (!queue || queue.busy) return;
    takeOver();
    move(queue);
    kick();
  };

  const addTyped = () => {
    const parsed = Number.parseInt(input, 10);
    run((queue) => queue.add(Number.isNaN(parsed) ? randomValue() : Math.max(1, Math.min(99, parsed))));
    setInput("");
  };

  return (
    <div className="iso fig ring-queue space-y-5" data-theme="light">
      <Plate fig="Fig 3.3" title="Circular queue" hint="Pad: add · tray: delete" readout={`front 0 · rear 3 · 3 of ${CAPACITY}`} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Circular queue turntable. Enter adds a random item, Delete or Backspace deletes from the front, Escape resets."
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            const act = (event.target as Element).closest("[data-act]")?.getAttribute("data-act");
            if (act === "add") run((queue) => queue.add(randomValue()));
            if (act === "delete") run((queue) => queue.remove());
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") run((queue) => queue.add(randomValue()));
            else if (event.key === "Delete" || event.key === "Backspace") run((queue) => queue.remove());
            else if (event.key === "Escape") run((queue) => queue.reset(sample(), "Reset to the sample queue."));
            else return;
            event.preventDefault();
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={arms} />
            <g dangerouslySetInnerHTML={hub} />
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
              if (event.key === "Enter") addTyped();
            }}
            placeholder="random"
            aria-label="Value to add, 1 to 99; leave blank for a random one"
            className="ui-input w-24"
          />
          <button type="button" onClick={addTyped} disabled={state.busy} className="ui-btn-primary">
            Add
          </button>
          <button type="button" onClick={() => run((queue) => queue.remove())} disabled={state.busy} className="ui-btn-secondary">
            Delete
          </button>
          <button type="button" onClick={() => run((queue) => queue.reset(sample(), "Reset to the sample queue."))} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Queue (front first): {state.items.join(", ") || "empty"} · front = {state.front} · rear = {state.rear}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

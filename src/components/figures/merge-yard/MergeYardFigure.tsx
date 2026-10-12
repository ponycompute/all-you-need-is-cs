"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./merge-yard.css";
import { YardEngine, type YardState } from "./engine";
import { BACK, FRONT, GATE_ART, HEIGHT, LANE_FRONT, WIDTH } from "./geometry";
import { RUNS } from "./model";

const SAMPLE = [
  [10, 15, 44],
  [9, 26, 38],
  [20, 31, 52],
  [6, 17, 90],
];

/** Four fresh sorted runs of three distinct keys each. */
function shuffled() {
  const keys = new Set<number>();
  while (keys.size < RUNS * 3) keys.add(1 + Math.floor(Math.random() * 98));
  const all = [...keys];
  return Array.from({ length: RUNS }, (_, run) => all.slice(run * 3, run * 3 + 3).sort((a, b) => a - b));
}

const LABEL =
  "A bench with four lanes at the back, each holding one sorted run of keys with its smallest at the mouth of the lane. Inlaid lines lead the four lane mouths, two by two, to two comparator blocks, and those two on to a third. Each comparator shows the smaller of its two keys in a window, and a pointer on top swings toward the side that key came from. The key shown at the last comparator is the smallest of all; it is lifted out to the tray at the front, its lane moves up, and only the two comparators on its path decide again.";

const KEYS = [
  { mark: "raised" as const, label: "A key; each lane is one sorted run" },
  { mark: "lit" as const, label: "The key being output, and the comparator deciding" },
  { mark: "edge" as const, label: "A comparator's window: the smaller of its two inputs" },
];

const CAPTION = `A ${RUNS}-way merge with a winner tree. Finding the smallest head by scanning would take ${RUNS - 1} comparisons for every key output. The tree remembers the results it already has: after an output only the comparators between that lane and the last one replay, which is log₂ ${RUNS} = 2 comparisons. With k runs the saving grows: log₂ k against k − 1.`;

export default function MergeYardFigure({ fig }: { fig: string }) {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const lanes = React.useMemo(() => ({ __html: LANE_FRONT }), []);
  const front = React.useMemo(() => ({ __html: FRONT }), []);
  // Stable objects: a fresh { __html } on every render would make React rebuild the gates and orphan the engine's handles.
  const gates = React.useMemo(() => GATE_ART.map((art) => ({ __html: art })), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const pointers = React.useRef<Array<SVGGElement | null>>([]);
  const engine = React.useRef<YardEngine | null>(null);
  const [state, setState] = React.useState<YardState>({ busy: false, output: [], left: RUNS * 3, note: "" });
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    const layers = pointers.current.filter((node): node is SVGGElement => node !== null);
    if (!svg.current || !layer.current || layers.length !== 3) return;
    const made = new YardEngine(svg.current, layers, layer.current, SAMPLE, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [say]);

  const run = React.useCallback(
    (move: (yard: YardEngine) => void) => {
      const yard = engine.current;
      if (!yard || yard.busy) return;
      move(yard);
      kick();
    },
    [kick],
  );

  const { takeOver } = useTour(visible, state.busy, () => run((yard) => (yard.left ? yard.next() : yard.reset(shuffled(), ""))), state.left);

  const by = (move: (yard: YardEngine) => void) => {
    takeOver();
    run(move);
  };

  return (
    <div className="iso fig merge-yard space-y-5" data-theme="light">
      <Plate fig={fig} title={`${RUNS}-way merge`} hint="Click the tray: next key" readout={`0 out · ${RUNS * 3} left in ${RUNS} runs`} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Merge yard. Enter outputs the next key, Escape loads new runs."
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            if ((event.target as Element).closest('[data-act="next"]')) by((yard) => yard.next());
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") by((yard) => yard.next());
            else if (event.key === "Escape") by((yard) => yard.reset(shuffled(), "New runs loaded."));
            else return;
            event.preventDefault();
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={layer} />
            <g dangerouslySetInnerHTML={lanes} />
            {gates.map((art, gate) => (
              <React.Fragment key={gate}>
                <g dangerouslySetInnerHTML={art} />
                <g
                  ref={(node) => {
                    pointers.current[gate] = node;
                  }}
                />
              </React.Fragment>
            ))}
            <g dangerouslySetInnerHTML={front} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => by((yard) => yard.next())} disabled={state.busy || state.left === 0} className="ui-btn-primary">
            Output next
          </button>
          <button type="button" onClick={() => by((yard) => yard.reset(SAMPLE, "Reset to the sample runs."))} disabled={state.busy} className="ui-btn-secondary">
            Reset
          </button>
          <button type="button" onClick={() => by((yard) => yard.reset(shuffled(), "New runs loaded."))} disabled={state.busy} className="ui-btn-secondary">
            New runs
          </button>
        </div>
        <p className="ui-caption text-center">
          Output: {state.output.join(", ") || "nothing yet"} · {state.left} left
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

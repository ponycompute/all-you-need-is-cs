"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import { BenchEngine, type BenchState } from "./engine";
import { BACK, HEIGHT, WIDTH } from "./geometry";
import { ELEMENTS, PAIRS, script } from "./model";

const LABEL =
  "A bench with twelve lanes, numbered 0 to 11, one for each element. Lane i holds the list seq[i]: a row of small tokens, each carrying the number of an element declared equivalent to i, with the front of the list nearest the reader. In front of each lane is a button, the element's out flag, which rises once the element has been printed. A thirteenth lane on the right is the stack. At the front left, three rows collect the printed elements, one row per class. Reading a pair sets a token at the front of two lanes. Printing a class scans a lane from the front: a token whose element is new is printed and moved to the stack; when the lane is exhausted the top of the stack says which lane to scan next.";

const KEYS = [
  { mark: "flat" as const, label: "A list node: a token on seq[i] carrying an element equivalent to i" },
  { mark: "raised" as const, label: "A printed element, in the row of its class; its out button is up" },
  { mark: "lit" as const, label: "The node under the scan, and the lane being scanned" },
];

const CAPTION =
  "Program 4.22 on its own nine pairs. Phase one reads each pair once and adds two list nodes. Phase two starts a class at every element not yet out and follows the lists from it: each new element is printed once and its node goes on the stack, so its own list is scanned later. Every pair is handled twice and every element once, O(m + n) in all, and the classes come out as 0 11 4 7 2, then 1 3 5, then 6 8 10 9.";

export default function ClassPegsFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const steps = React.useMemo(() => script(PAIRS), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const layer = React.useRef<SVGGElement>(null);
  const engine = React.useRef<BenchEngine | null>(null);
  const [state, setState] = React.useState<BenchState>({ busy: false, played: 0, read: 0, classes: [], note: "" });
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !layer.current) return;
    const made = new BenchEngine(svg.current, layer.current, steps, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [steps, say]);

  const finished = state.played >= steps.length;

  const run = (move: (bench: BenchEngine) => void) => {
    const bench = engine.current;
    if (!bench) return;
    move(bench);
    kick();
  };

  const { takeOver } = useTour(visible, state.busy, () => run((bench) => (bench.finished ? bench.reset() : bench.advance(1))), state.played);

  const by = (move: (bench: BenchEngine) => void) => {
    takeOver();
    run(move);
  };

  return (
    <div className="iso fig class-pegs space-y-5" data-theme="light">
      <Plate fig="Fig 4.6" title="Equivalence classes" hint="Step through the program" readout="0 printed · stack 0" keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Equivalence classes bench. Enter plays the next step, Escape starts over."
          data-busy={state.busy ? "" : undefined}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") by((bench) => bench.advance(1));
            else if (event.key === "Escape") by((bench) => bench.reset());
            else return;
            event.preventDefault();
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={layer} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-xs">
          <span className="ui-label mr-1">Pairs</span>
          {PAIRS.map(([i, j], index) => (
            <span
              key={index}
              className={`rounded-full border px-2.5 py-1 ${index < state.read ? "border-hairline text-mute" : index === state.read ? "border-ink text-ink" : "border-hairline-strong text-charcoal"}`}
            >
              {i} ≡ {j}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => by((bench) => bench.advance(1))} disabled={state.busy || finished} className="ui-btn-primary">
            {state.read < PAIRS.length ? "Read next pair" : "Next step"}
          </button>
          <button type="button" onClick={() => by((bench) => bench.advance(steps.length))} disabled={state.busy || finished} className="ui-btn-secondary">
            Run to the end
          </button>
          <button type="button" onClick={() => by((bench) => bench.reset())} className="ui-btn-secondary">
            Start over
          </button>
        </div>
        <p className="ui-caption text-center">
          {state.read < PAIRS.length ? `Phase 1: ${state.read} of ${PAIRS.length} pairs read` : finished ? "Done" : "Phase 2: printing classes"}
          {state.classes.length ? ` · Classes: ${state.classes.map((members) => `{${members.join(", ")}}`).join(" ")}` : ""}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="ui-caption text-center">{ELEMENTS} elements, 0 to 11. A raised button means out[i] is TRUE.</p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

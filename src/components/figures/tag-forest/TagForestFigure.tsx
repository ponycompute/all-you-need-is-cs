"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./tag-forest.css";
import { ForestEngine, type ForestState } from "./engine";
import { BACK, HEIGHT, WIDTH } from "./geometry";
import { ELEMENTS, depthOf, fresh, rootOf } from "./model";

const LABEL =
  "A rail on two posts with ten numbered tags hanging from it. Each set is a tree of tags: a root hangs from the rail, and every other tag hangs by a string from its parent. A strip of ten windows along the front of the base shows the parent array: the parent of each element, or, for a root, minus the number of elements in its set. A union hangs the root of the smaller tree under the root of the larger. A find follows the strings up to the root and then re-hangs every tag on that path directly under the root.";

const KEYS = [
  { mark: "raised" as const, label: "An element; its string leads to its parent, or to the rail if it is a root" },
  { mark: "lit" as const, label: "The element whose parent was just changed" },
  { mark: "edge" as const, label: "Windows: parent[i], or minus the set's size at a root" },
];

const CAPTION =
  "Disjoint sets as a forest. Weighted union always hangs the smaller tree under the larger, so a tree of m elements is never deeper than log₂ m. Collapsing find then shortens the path it just walked: find the same element twice and the second walk follows one link. The counter shows the links followed.";

const clamp = (text: string) => {
  const value = Number.parseInt(text, 10);
  return Number.isNaN(value) ? null : Math.max(0, Math.min(ELEMENTS - 1, value));
};

export default function TagForestFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const initial = React.useMemo(() => fresh(), []);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const strings = React.useRef<SVGGElement>(null);
  const tags = React.useRef<SVGGElement>(null);
  const engine = React.useRef<ForestEngine | null>(null);
  const [state, setState] = React.useState<ForestState>({ busy: false, parent: initial, sets: ELEMENTS, note: "" });
  const [first, setFirst] = React.useState("");
  const [second, setSecond] = React.useState("");
  const visible = useInView(anchor);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !strings.current || !tags.current) return;
    const made = new ForestEngine(svg.current, strings.current, tags.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  // The idle tour: join random sets; now and then find the deepest element, so a path collapses; start over at one set.
  const turns = React.useRef(0);
  const { takeOver } = useTour(
    visible,
    state.busy,
    () => {
      const forest = engine.current;
      if (!forest || forest.busy) return;
      const parent = forest.forest;
      const deepest = parent.map((_, element) => element).sort((a, b) => depthOf(parent, b) - depthOf(parent, a))[0]!;
      if (state.sets === 1 && depthOf(parent, deepest) < 2) forest.reset(fresh(), "");
      else if (depthOf(parent, deepest) >= 2 && turns.current++ % 3 === 0) forest.find(deepest);
      else if (state.sets === 1) forest.find(deepest);
      else {
        const a = Math.floor(Math.random() * ELEMENTS);
        const others = parent.map((_, element) => element).filter((element) => rootOf(parent, element) !== rootOf(parent, a));
        forest.union(a, others[Math.floor(Math.random() * others.length)]!);
      }
      kick();
    },
    state.parent,
  );

  const run = (move: (forest: ForestEngine) => void) => {
    const forest = engine.current;
    if (!forest || forest.busy) return;
    takeOver();
    move(forest);
    kick();
  };

  const a = clamp(first);
  const b = clamp(second);

  return (
    <div className="iso fig tag-forest space-y-5" data-theme="light">
      <Plate fig="Fig 5.10" title="Union–find" hint="Click a tag: find" readout={`${ELEMENTS} elements · ${ELEMENTS} sets`} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Union–find forest. Click a tag to find its root; use the fields below to union two elements. Escape resets."
          data-busy={state.busy ? "" : undefined}
          onClick={(event) => {
            const element = (event.target as Element).closest("[data-element]")?.getAttribute("data-element");
            if (element !== null && element !== undefined) run((forest) => forest.find(Number(element)));
          }}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && event.key === "Escape") {
              event.preventDefault();
              run((forest) => forest.reset(fresh(), "Reset: ten sets of one."));
            }
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={strings} />
            <g ref={tags} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input type="number" min={0} max={ELEMENTS - 1} value={first} onChange={(event) => setFirst(event.target.value)} placeholder="i" aria-label="First element, 0 to 9" className="ui-input w-16" />
          <input type="number" min={0} max={ELEMENTS - 1} value={second} onChange={(event) => setSecond(event.target.value)} placeholder="j" aria-label="Second element, 0 to 9" className="ui-input w-16" />
          <button type="button" onClick={() => a !== null && b !== null && run((forest) => forest.union(a, b))} disabled={state.busy || a === null || b === null} className="ui-btn-primary">
            Union(i, j)
          </button>
          <button type="button" onClick={() => a !== null && run((forest) => forest.find(a))} disabled={state.busy || a === null} className="ui-btn-secondary">
            Find(i)
          </button>
          <button type="button" onClick={() => run((forest) => forest.reset(fresh(), "Reset: ten sets of one."))} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Sets: {state.sets} · parent = [{state.parent.join(", ")}]
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

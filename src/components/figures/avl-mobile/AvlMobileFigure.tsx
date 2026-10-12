"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { asksForStillness, useInView, useLoop, useReadout } from "../iso/react/live";
import "../iso/iso.css";
import "./avl-mobile.css";
import { MobileEngine, type MobileState } from "./engine";
import { BACK, FRONT_ART } from "./geometry";
import { build, CAPACITY, heightLimit, rootOf, type RotationKind } from "./model";
import { HEIGHT, WIDTH } from "./view";

const SAMPLE = [40, 20, 60, 10, 30];

/** Two keys already hung, and the third that forces each repair. */
const PRESETS: Record<RotationKind, [number, number, number]> = {
  LL: [30, 20, 10],
  RR: [10, 20, 30],
  LR: [30, 10, 20],
  RL: [10, 30, 20],
};

const LABEL =
  "A mobile hanging from a gantry. Each key is a round tag; a tag with children carries a beam, and each child hangs by a string from an end of its parent's beam. Tags keep their left-to-right order on the rail's ruler whatever happens. Every beam leans toward its taller side, one notch for each level of difference: level, or one notch either way, is allowed. When a new key makes a beam lean two notches, the arms around it are unhooked, the tags move up or down, and the arms are hooked again: a rotation. A slider on the left post marks the mobile's height, and one on the right post marks the tallest an AVL tree of this many keys can be.";

const KEYS = [
  { mark: "raised" as const, label: "A key; its beam leans toward the taller side" },
  { mark: "lit" as const, label: "The key being inserted" },
  { mark: "edge" as const, label: "Left slider: height now · right slider: the AVL limit for n keys" },
];

const CAPTION =
  "An AVL tree as a mobile. A beam leans one notch for each level its two sides differ; two notches is a break, and one or two rotations at the lowest broken beam level the whole mobile again. A rotation only moves tags up or down: their order along the rail never changes. With n keys the height stays within 1.44 log₂(n + 2).";

const randomKey = (taken: number[]) => {
  for (;;) {
    const key = 1 + Math.floor(Math.random() * 99);
    if (!taken.includes(key)) return key;
  }
};

const TOUR_START = 1600;
const TOUR_EVERY = 1500;
const TOUR_RESUME = 12000;

export default function AvlMobileFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const front = React.useMemo(() => ({ __html: FRONT_ART }), []);
  const initial = React.useMemo(() => build(SAMPLE), []);
  const rest = `n ${initial.length} · height ${rootOf(initial)!.height} · limit ${heightLimit(initial.length)}`;

  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const arms = React.useRef<SVGGElement>(null);
  const coins = React.useRef<SVGGElement>(null);
  const engine = React.useRef<MobileEngine | null>(null);
  const [state, setState] = React.useState<MobileState>({ busy: false, keys: [...SAMPLE].sort((a, b) => a - b), height: 0, limit: 0, note: "" });
  const [input, setInput] = React.useState("");
  const [preset, setPreset] = React.useState<RotationKind | null>(null);
  const visible = useInView(anchor);
  const touring = React.useRef(true);
  const turn = React.useRef(0);
  const quiet = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tourTick, setTourTick] = React.useState(0);

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  React.useEffect(() => {
    if (!svg.current || !arms.current || !coins.current) return;
    const made = new MobileEngine(svg.current, arms.current, coins.current, initial, say, setState);
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [initial, say]);

  // The idle tour: hang random keys until the gantry is full, then start over.
  React.useEffect(() => {
    if (!visible || state.busy || !touring.current || asksForStillness()) return;
    const timer = setTimeout(() => {
      const mobile = engine.current;
      if (!mobile || mobile.busy || !touring.current) return;
      if (mobile.full) mobile.reset(build(SAMPLE), "");
      else mobile.insert(randomKey(state.keys));
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

  const insertKey = React.useCallback(
    (key?: number) => {
      const mobile = engine.current;
      if (!mobile || mobile.busy) return;
      takeOver();
      setPreset(null);
      mobile.insert(key ?? randomKey(state.keys));
      kick();
    },
    [kick, state.keys, takeOver],
  );

  const reset = React.useCallback(() => {
    takeOver();
    setPreset(null);
    engine.current?.reset(build(SAMPLE), "Reset to the sample.");
    kick();
  }, [kick, takeOver]);

  const loadPreset = (kind: RotationKind) => {
    const mobile = engine.current;
    if (!mobile) return;
    const [first, second, third] = PRESETS[kind];
    takeOver();
    setPreset(kind);
    mobile.reset(build([first, second]), "");
    mobile.insert(third);
    kick();
  };

  const insertTyped = () => {
    const parsed = Number.parseInt(input, 10);
    if (Number.isNaN(parsed)) return;
    insertKey(Math.max(1, Math.min(99, parsed)));
    setInput("");
  };

  const full = state.keys.length >= CAPACITY;

  return (
    <div className="iso avl-mobile space-y-5" data-theme="light">
      <Plate fig="Fig 10.2" title="AVL tree" hint="Click the cradle to insert" readout={rest} keys={KEYS} caption={CAPTION}>
        <div
          ref={anchor}
          className="am-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="AVL mobile. Enter inserts a random key, Escape resets."
          data-busy={state.busy || full ? "" : undefined}
          onClick={(event) => {
            if ((event.target as Element).closest('[data-act="load"]') && !full) insertKey();
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!full) insertKey();
            } else if (event.key === "Escape") {
              event.preventDefault();
              reset();
            }
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={arms} />
            <g ref={coins} />
            <g dangerouslySetInnerHTML={front} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(PRESETS) as RotationKind[]).map((kind) => (
            <button key={kind} type="button" onClick={() => loadPreset(kind)} className={kind === preset ? "ui-btn-primary" : "ui-btn-secondary"}>
              {kind}
            </button>
          ))}
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
          <button type="button" onClick={reset} className="ui-btn-secondary">
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Keys: {state.keys.join(", ") || "-"}
          {full ? " (gantry full)" : ""}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <p className="am-live" aria-live="polite">
          {state.busy ? "" : state.note}
        </p>
      </div>
    </div>
  );
}

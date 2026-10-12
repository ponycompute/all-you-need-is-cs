"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { useInView, useLoop, useReadout } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./tree-gantry.css";
import { GantryEngine, type GantryState } from "./engine";
import { BACK, HEIGHT, WIDTH } from "./geometry";
import type { TreeFrame } from "./types";

export interface GantryHandle {
  /** Plays frames one after another; false if the gantry is still busy. */
  play: (frames: TreeFrame[]) => boolean;
  /** Puts one frame on the gantry at once. */
  show: (frame: TreeFrame, note?: string) => void;
  /** Tells the gantry the reader is driving it, so the idle tour stands down for a while. */
  takeOver: () => void;
}

interface TreeGantryProps {
  fig: string;
  title: string;
  hint: string;
  label: string;
  caption: string;
  keys: Array<{ mark: "raised" | "flat" | "lit" | "edge" | "dim" | "dotted" | "dashed"; label: string }>;
  initial: TreeFrame;
  /** Called once the gantry can be driven, and again whenever it starts or stops moving; `state.busy` says which. */
  onState: (state: GantryState, handle: GantryHandle) => void;
  /** What the idle tour does next; it runs only while nobody is using the figure. */
  tour: (handle: GantryHandle) => void;
  /** A tag was clicked. */
  onPick?: (id: string, handle: GantryHandle) => void;
  /** The lab's controls, shown under the card. */
  children?: React.ReactNode;
}

/** A gantry with a tree hanging from it, a card around it, and whatever controls the lab puts underneath. */
export default function TreeGantry({ fig, title, hint, label, caption, keys, initial, onState, tour, onPick, children }: TreeGantryProps) {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const { anchor, say } = useReadout<HTMLDivElement>();
  const svg = React.useRef<SVGSVGElement>(null);
  const strings = React.useRef<SVGGElement>(null);
  const tags = React.useRef<SVGGElement>(null);
  const engine = React.useRef<GantryEngine | null>(null);
  const [busy, setBusy] = React.useState(false);
  const visible = useInView(anchor);
  const first = React.useRef(initial);
  const report = React.useRef(onState);
  React.useEffect(() => {
    report.current = onState;
  });

  const kick = useLoop((dt, calm) => engine.current?.tick(dt, calm) ?? false, visible);

  const stand = React.useRef<() => void>(() => {});
  const handle = React.useMemo<GantryHandle>(
    () => ({
      takeOver: () => stand.current(),
      play: (frames) => {
        const played = engine.current?.play(frames) ?? false;
        kick();
        return played;
      },
      show: (frame, note = "") => {
        engine.current?.show(frame, note);
        kick();
      },
    }),
    [kick],
  );
  const latest = React.useRef(handle);
  React.useEffect(() => {
    latest.current = handle;
  });

  React.useEffect(() => {
    if (!svg.current || !strings.current || !tags.current) return;
    const made = new GantryEngine(svg.current, strings.current, tags.current, first.current, say, (state) => {
      setBusy(state.busy);
      report.current(state, latest.current);
    });
    engine.current = made;
    return () => {
      made.dispose();
      engine.current = null;
    };
  }, [say]);

  const { takeOver } = useTour(visible, busy, () => tour(latest.current), busy);
  React.useEffect(() => {
    stand.current = takeOver;
  }, [takeOver]);

  return (
    <div className="iso fig tree-gantry space-y-5" data-theme="light">
      <Plate fig={fig} title={title} hint={hint} readout={initial.note} keys={keys} caption={caption}>
        <div
          ref={anchor}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label={`${title}. Use the controls below the figure.`}
          data-busy={busy ? "" : undefined}
          onClick={(event) => {
            const id = (event.target as Element).closest("[data-node]")?.getAttribute("data-node");
            if (!id || !onPick) return;
            takeOver();
            onPick(id, latest.current);
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g ref={strings} />
            <g ref={tags} />
          </svg>
        </div>
      </Plate>
      {children}
    </div>
  );
}

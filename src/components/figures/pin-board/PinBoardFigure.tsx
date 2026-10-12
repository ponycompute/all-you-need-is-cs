"use client";

import * as React from "react";
import { Plate } from "../iso/react/draw";
import { asksForStillness, useInView } from "../iso/react/live";
import { useTour } from "../iso/react/tour";
import "../iso/iso.css";
import "../iso/figure.css";
import "./pin-board.css";
import { BACK, HEIGHT, HITS, VERTICES, WIDTH, edgeKey, graphArt, neighboursOf, type Probe } from "./geometry";

const SAMPLE = ["0-1", "0-2", "1-3", "2-3", "3-4", "4-5"];
const PROBE_MS = 330;

const LABEL =
  "One undirected graph of six vertices shown three ways on a bench. On the left, an adjacency matrix: a six by six board of holes with a pin in row i, column j wherever i and j are joined, so every edge has two pins. In the middle, a model: a post for each vertex and a wire for each edge. On the right, adjacency lists: a row for each vertex holding one node per neighbour, linked in a chain. Scanning a vertex's neighbours probes all six holes of its matrix row, but only as many list nodes as it has neighbours; two counters show both.";

const KEYS = [
  { mark: "raised" as const, label: "Left: a pin at [i][j] and [j][i] for each edge · right: one list node per neighbour" },
  { mark: "lit" as const, label: "The vertex being scanned, and what the scan has found" },
  { mark: "edge" as const, label: "Middle: the graph itself, a wire per edge" },
];

const CAPTION =
  "The same graph as an adjacency matrix and as adjacency lists. The matrix answers “is i joined to j?” in one look, but it always holds n² cells and finding a vertex's neighbours always costs n probes. The lists hold two nodes per edge and nothing else, and a scan costs only the vertex's degree: for a graph with few edges that is the difference between O(n²) and O(n + e).";

export default function PinBoardFigure() {
  const back = React.useMemo(() => ({ __html: BACK }), []);
  const hits = React.useMemo(() => ({ __html: HITS }), []);
  const [edges, setEdges] = React.useState(() => new Set(SAMPLE));
  const [fresh, setFresh] = React.useState<string | null>(null);
  const [probe, setProbe] = React.useState<Probe>(null);
  const [counts, setCounts] = React.useState({ matrix: 0, list: 0 });
  const [note, setNote] = React.useState("");
  const stage = React.useRef<HTMLDivElement>(null);
  const svg = React.useRef<SVGSVGElement>(null);
  const visible = useInView(stage);

  const art = React.useMemo(() => ({ __html: graphArt(edges, probe, fresh) }), [edges, probe, fresh]);

  // The counters are part of the static art; their digits are written here.
  React.useEffect(() => {
    for (const part of ["matrix", "list"] as const) {
      const digits = svg.current?.querySelector(`[data-part="${part}"]`);
      if (digits) digits.textContent = String(counts[part]).padStart(2, "0");
    }
  }, [counts]);

  // The scan: every cell of the row, then every node of the list, one probe at a time.
  React.useEffect(() => {
    if (!probe) return;
    const degree = neighboursOf(edges, probe.vertex).length;
    const timer = setTimeout(
      () => {
        if (probe.phase === "matrix" && probe.index < VERTICES - 1) {
          setProbe({ ...probe, index: probe.index + 1 });
          setCounts((now) => ({ ...now, matrix: now.matrix + 1 }));
        } else if (probe.phase === "matrix" && degree) {
          setProbe({ vertex: probe.vertex, phase: "list", index: 0 });
          setCounts((now) => ({ ...now, list: 1 }));
        } else if (probe.phase === "list" && probe.index < degree - 1) {
          setProbe({ ...probe, index: probe.index + 1 });
          setCounts((now) => ({ ...now, list: now.list + 1 }));
        } else {
          const near = neighboursOf(edges, probe.vertex);
          setNote(`Neighbours of ${probe.vertex}: ${near.join(", ") || "none"}. The matrix row took ${VERTICES} probes, the list ${near.length}.`);
          setProbe(null);
        }
      },
      asksForStillness() ? 0 : PROBE_MS,
    );
    return () => clearTimeout(timer);
  }, [probe, edges]);

  const scan = React.useCallback(
    (vertex: number) => {
      if (probe) return;
      setFresh(null);
      setCounts({ matrix: 1, list: 0 });
      setProbe({ vertex, phase: "matrix", index: 0 });
    },
    [probe],
  );

  const toggle = React.useCallback(
    (key: string) => {
      if (probe) return;
      const had = edges.has(key);
      const next = new Set(edges);
      if (had) next.delete(key);
      else next.add(key);
      setEdges(next);
      setFresh(had ? null : key);
      const [a, b] = key.split("-");
      setNote(had ? `Removed edge (${a}, ${b}): two pins and two list nodes gone.` : `Added edge (${a}, ${b}): a pin at [${a}][${b}] and [${b}][${a}], and a node in both lists.`);
    },
    [edges, probe],
  );

  const { takeOver } = useTour(visible, probe !== null, () => scan(Math.floor(Math.random() * VERTICES)), note);

  const busy = probe !== null;
  const cell = probe?.phase === "matrix" ? `row ${probe.vertex}: [${probe.vertex}][${probe.index}] = ${edges.has(edgeKey(probe.vertex, probe.index)) && probe.vertex !== probe.index ? 1 : 0}` : null;
  const node = probe?.phase === "list" ? `list ${probe.vertex}: node ${neighboursOf(edges, probe.vertex)[probe.index]}` : null;
  const readout = cell ?? node ?? `n ${VERTICES} · e ${edges.size} · ${VERTICES * VERTICES} cells · ${edges.size * 2} list nodes`;

  return (
    <div className="iso fig pin-board space-y-5" data-theme="light">
      <Plate fig="Fig 6.1" title="Matrix and lists" hint="Click a post: scan · a hole: edge" readout={readout} keys={KEYS} caption={CAPTION}>
        <div
          ref={stage}
          className="fig-stage iso-stage"
          tabIndex={0}
          role="group"
          aria-label="Adjacency matrix and adjacency lists. Use the buttons below to scan a vertex's neighbours; click a hole of the matrix to add or remove an edge."
          data-busy={busy ? "" : undefined}
          onClick={(event) => {
            const target = event.target as Element;
            const vertex = target.closest("[data-vertex]")?.getAttribute("data-vertex");
            const edge = target.closest("[data-edge]")?.getAttribute("data-edge");
            if (vertex === null && edge === null) return;
            takeOver();
            if (vertex !== null && vertex !== undefined) scan(Number(vertex));
            else if (edge) toggle(edge);
          }}
        >
          <svg ref={svg} className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={LABEL} focusable="false">
            <g dangerouslySetInnerHTML={back} />
            <g dangerouslySetInnerHTML={art} />
            <g dangerouslySetInnerHTML={hits} />
          </svg>
        </div>
      </Plate>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="ui-label">Scan the neighbours of</span>
          {Array.from({ length: VERTICES }, (_, vertex) => (
            <button
              key={vertex}
              type="button"
              onClick={() => {
                takeOver();
                scan(vertex);
              }}
              disabled={busy}
              className="ui-btn-secondary-sm"
            >
              {vertex}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              takeOver();
              setEdges(new Set(SAMPLE));
              setFresh(null);
              setCounts({ matrix: 0, list: 0 });
              setNote("Reset to the sample graph.");
            }}
            disabled={busy}
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">
          Edges: {[...edges].sort().map((key) => `(${key.replace("-", ", ")})`).join(" ") || "none"}
          {note ? ` · ${note}` : ""}
        </p>
        <p className="fig-live" aria-live="polite">
          {busy ? "" : note}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeapRackFigure from "@/components/figures/heap-rack/HeapRackFigure";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

type RackMode = "minmax" | "deap";
type FrameMode = "leftist" | "binomial" | "fibonacci";
type HeapMode = RackMode | FrameMode;
type P5Like = Parameters<SketchFunction>[0];

const MODES: Record<
  HeapMode,
  {
    label: string;
    summary: string;
    operations: string[];
  }
> = {
  minmax: {
    label: "Min-max heap",
    summary: "Double-ended priority queue with alternating min and max levels.",
    operations: ["Insert", "Delete Min", "Delete Max"],
  },
  deap: {
    label: "Deap",
    summary: "Empty root with min heap on the left and max heap on the right.",
    operations: ["Insert", "Delete Min", "Delete Max"],
  },
  leftist: {
    label: "Leftist tree",
    summary: "Mergeable priority queue where combine follows short right paths.",
    operations: ["Tree A", "Tree B", "Combine", "Delete Min"],
  },
  binomial: {
    label: "Binomial heap",
    summary: "Root list of heap-ordered trees; delete-min consolidates equal degrees.",
    operations: ["Root list", "Insert", "Combine", "Delete Min"],
  },
  fibonacci: {
    label: "Fibonacci heap",
    summary: "Lazy mergeable heap with decrease-key and cascading cuts.",
    operations: ["Root list", "Decrease Key", "Cut", "Consolidate"],
  },
};

const SECTION_TO_MODE: Record<string, HeapMode> = {
  "9-1": "minmax",
  "9-1-1": "minmax",
  "9-1-2": "minmax",
  "9-1-3": "minmax",
  "9-2": "deap",
  "9-2-1": "deap",
  "9-2-2": "deap",
  "9-2-3": "deap",
  "9-3": "leftist",
  "9-4": "binomial",
  "9-4-1": "binomial",
  "9-4-2": "binomial",
  "9-4-3": "binomial",
  "9-4-4": "binomial",
  "9-4-5": "binomial",
  "9-4-6": "binomial",
  "9-5": "fibonacci",
  "9-5-1": "fibonacci",
  "9-5-2": "fibonacci",
  "9-5-3": "fibonacci",
  "9-5-4": "fibonacci",
  "9-5-5": "fibonacci",
  "9-5-6": "fibonacci",
};

export default function HeapStructuresConceptViz({ sectionId }: { sectionId: string }) {
  const mode = useMemo(() => SECTION_TO_MODE[sectionId] ?? "minmax", [sectionId]);
  if (mode === "minmax" || mode === "deap") {
    return (
      <div className="space-y-5">
        <HeapRackFigure kind={mode} />
        <ModeNotes mode={mode} frame={-1} />
      </div>
    );
  }
  return <FrameHeapViz mode={mode} />;
}

function FrameHeapViz({ mode }: { mode: FrameMode }) {
  const active = MODES[mode];
  const [frame, setFrame] = useState(0);
  const [status, setStatus] = useState(() => `Step 1 of ${active.operations.length}: ${active.operations[0]}`);
  const frameRef = useRef(frame);
  const statusRef = useRef(status);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const sketch: SketchFunction = useCallback(
    (p) => {
      p.setup = () => {
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.textAlign(p.CENTER, p.CENTER);
        p.textFont("monospace");
      };

      p.draw = () => {
        p.background(0, 0, 100);
        drawTitle(p, MODES[mode].label, statusRef.current);
        if (mode === "leftist") drawLeftist(p, frameRef.current);
        if (mode === "binomial") drawBinomial(p, frameRef.current);
        if (mode === "fibonacci") drawFibonacci(p, frameRef.current);
      };
    },
    [mode]
  );

  const selectFrame = (index: number) => {
    setFrame(index);
    setStatus(`Step ${index + 1} of ${active.operations.length}: ${active.operations[index]}`);
  };

  return (
    <div className="space-y-5">
      <P5Wrapper sketch={sketch} className="min-h-[380px]" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {active.operations.map((operation, index) => (
          <button
            key={operation}
            type="button"
            onClick={() => selectFrame(index)}
            className={index === frame ? "ui-btn-primary" : "ui-btn-secondary"}
          >
            {operation}
          </button>
        ))}
        <button
          type="button"
          onClick={() => selectFrame((frame + 1) % active.operations.length)}
          className="ui-btn-secondary"
        >
          {frame === active.operations.length - 1 ? "Back to start" : "Next"}
        </button>
      </div>

      <ModeNotes mode={mode} frame={frame} />
    </div>
  );
}

function ModeNotes({ mode, frame }: { mode: HeapMode; frame: number }) {
  const active = MODES[mode];
  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-hairline p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-[20px] font-medium leading-[1.4] text-ink">
            {active.label}
          </h3>
          <span className="rounded-full bg-surface-soft px-3 py-1 font-mono text-xs text-charcoal">
            Ch. 9
          </span>
        </div>
        <p className="text-sm leading-[1.43] text-body">{active.summary}</p>
      </div>

      <div className="rounded-lg border border-hairline p-4">
        <h4 className="mb-3 font-mono text-xs font-medium uppercase text-mute">Operations</h4>
        <div className="space-y-2">
          {active.operations.map((operation, index) => (
            <div
              key={operation}
              className={`flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0 ${
                index === frame ? "text-ink" : "text-charcoal"
              }`}
            >
              <span className="text-sm font-medium">{operation}</span>
              <span className="font-mono text-xs">{operationCost(mode, operation)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function operationCost(mode: HeapMode, operation: string) {
  if (mode === "binomial" && (operation === "Insert" || operation === "Combine")) return "O(1) amortized";
  if (mode === "fibonacci" && (operation === "Insert" || operation === "Decrease Key" || operation === "Cut")) return "O(1) amortized";
  if (operation === "Reset" || operation === "Tree A" || operation === "Tree B" || operation === "Root list") return "view";
  if (mode === "binomial" || mode === "fibonacci") return "O(log n) amortized";
  return "O(log n)";
}

function drawTitle(p: P5Like, title: string, subtitle: string) {
  p.noStroke();
  p.fill(0, 0, 8);
  p.textSize(15);
  p.text(title, p.width / 2, 26);
  p.fill(0, 0, 48);
  p.textSize(11);
  p.text(subtitle, p.width / 2, 46);
}

function drawLeftist(p: P5Like, frame: number) {
  const c = p.width / 2;
  if (frame < 2) {
    // Two min-leftist trees. In each, the shortest path to a missing child is never longer on the left.
    const a = [
      { x: c - 150, y: 96, label: "2" },
      { x: c - 220, y: 172, label: "7" },
      { x: c - 80, y: 172, label: "11" },
      { x: c - 125, y: 248, label: "18" },
    ];
    const b = [
      { x: c + 150, y: 96, label: "5" },
      { x: c + 95, y: 172, label: "8" },
      { x: c + 205, y: 172, label: "50" },
    ];
    drawTreeFromPoints(p, a, [[0, 1], [0, 2], [2, 3]], frame === 0);
    drawTreeFromPoints(p, b, [[0, 1], [0, 2]], frame === 1);
    p.noStroke();
    p.fill(0, 0, 36);
    p.textSize(11);
    p.text("Tree A", c - 150, 62);
    p.text("Tree B", c + 150, 62);
    drawPill(
      p,
      c,
      320,
      frame === 0
        ? "Tree A: 18 hangs on the left of 11, so no right path is longer than its left"
        : "Tree B: every parent is smaller than its children, as in A"
    );
    return;
  }
  if (frame === 2) {
    const nodes = [
      { x: c, y: 84, label: "2" },
      { x: c - 100, y: 148, label: "5" },
      { x: c + 100, y: 148, label: "7" },
      { x: c - 170, y: 212, label: "11" },
      { x: c - 30, y: 212, label: "8" },
      { x: c - 215, y: 276, label: "18" },
      { x: c - 125, y: 276, label: "50" },
    ];
    drawTreeFromPoints(p, nodes, [[0, 1], [0, 2], [1, 3], [1, 4], [3, 5], [3, 6]], true);
    drawPill(p, c, 324, "combine merges the two right paths (2, 11 with 5, 50), then swaps children wherever the right side got deeper");
    return;
  }
  const nodes = [
    { x: c, y: 84, label: "5" },
    { x: c - 100, y: 156, label: "11" },
    { x: c + 100, y: 156, label: "7" },
    { x: c - 150, y: 232, label: "18" },
    { x: c - 50, y: 232, label: "50" },
    { x: c + 55, y: 232, label: "8" },
  ];
  drawTreeFromPoints(p, nodes, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]], true);
  drawPill(p, c, 320, "delete-min removes the root 2 and combines its two subtrees, rooted at 5 and 7");
}

/** A heap-ordered tree for the root-list pictures: a key and its children, left to right. */
type ListTree = { key: string; kids?: ListTree[]; dark?: boolean; accent?: boolean };

const UNIT = 58;
const LEVEL = 62;
const widthOf = (tree: ListTree): number => Math.max(1, (tree.kids ?? []).reduce((sum, kid) => sum + widthOf(kid), 0));

/** Draws one tree with its root centred over its children; returns nothing, positions are derived from widths. */
function drawListTree(p: P5Like, tree: ListTree, left: number, y: number) {
  const x = left + (widthOf(tree) * UNIT) / 2;
  let at = left;
  for (const kid of tree.kids ?? []) {
    const kidX = at + (widthOf(kid) * UNIT) / 2;
    drawLine(p, x, y + 22, kidX, y + LEVEL - 22, false);
    drawListTree(p, kid, at, y + LEVEL);
    at += widthOf(kid) * UNIT;
  }
  drawNode(p, x, y, tree.key, tree.dark ?? false, tree.accent ?? false);
}

/** Draws a root list: the trees side by side, their roots joined by dashed sibling links. */
function drawRootList(p: P5Like, trees: ListTree[], y: number) {
  const gap = 18;
  const total = trees.reduce((sum, tree) => sum + widthOf(tree) * UNIT, 0) + gap * (trees.length - 1);
  let left = p.width / 2 - total / 2;
  let previous: number | null = null;
  for (const tree of trees) {
    const x = left + (widthOf(tree) * UNIT) / 2;
    if (previous !== null) drawLine(p, previous + 24, y, x - 24, y, false, true);
    drawListTree(p, tree, left, y);
    previous = x;
    left += widthOf(tree) * UNIT + gap;
  }
}

function drawBinomial(p: P5Like, frame: number) {
  const b1: ListTree = { key: "8", kids: [{ key: "15" }] };
  const b2: ListTree = { key: "3", dark: true, kids: [{ key: "10", kids: [{ key: "17" }] }, { key: "20" }] };
  const frames: ListTree[][] = [
    [{ key: "12" }, b1, b2],
    [{ key: "5", accent: true }, { key: "12" }, b1, b2],
    [{ key: "5" }, { key: "12" }, b1, b2, { key: "6", accent: true, kids: [{ key: "9" }] }],
    [
      { key: "20" },
      {
        key: "5",
        dark: true,
        kids: [{ key: "12" }, { key: "10", kids: [{ key: "17" }] }, { key: "6", kids: [{ key: "9" }, { key: "8", kids: [{ key: "15" }] }] }],
      },
    ],
  ];
  drawRootList(p, frames[frame] ?? frames[0], 92);
  const notes = [
    "a root list of min-trees (dashed links); the filled root, 3, is the minimum",
    "insert 5: a one-node tree joins the root list, and nothing else moves",
    "combine with the heap 6-9: the two root lists are simply joined",
    "delete-min removed 3; trees of equal degree were then linked until all degrees differ",
  ];
  drawPill(p, p.width / 2, 322, notes[frame] ?? notes[0]);
}

function drawFibonacci(p: P5Like, frame: number) {
  const frames: ListTree[][] = [
    [{ key: "6", dark: true }, { key: "12", kids: [{ key: "15" }, { key: "20", kids: [{ key: "25" }] }] }, { key: "24" }],
    [{ key: "6", dark: true }, { key: "12", kids: [{ key: "15" }, { key: "20", kids: [{ key: "25->4", accent: true }] }] }, { key: "24" }],
    [{ key: "6" }, { key: "12", kids: [{ key: "15" }, { key: "20", accent: true }] }, { key: "24" }, { key: "4", dark: true }],
    [{ key: "6", dark: true, kids: [{ key: "24" }] }, { key: "12", kids: [{ key: "15" }, { key: "20", accent: true }] }],
  ];
  drawRootList(p, frames[frame] ?? frames[0], 100);
  const notes = [
    "a root list of heap-ordered trees; the filled root, 6, is the minimum",
    "decrease-key 25 to 4: the new key is smaller than its parent 20, so heap order is broken",
    "cut: 4 moves to the root list and becomes the minimum; 20 is marked (ringed) for losing a child",
    "delete-min removed 4, then linked the two one-node roots: 24 went under 6",
  ];
  drawPill(p, p.width / 2, 322, notes[frame] ?? notes[0]);
}

function drawTreeFromPoints(
  p: P5Like,
  nodes: Array<{ x: number; y: number; label: string }>,
  edges: Array<[number, number]>,
  emphasis = true
) {
  edges.forEach(([from, to]) => drawLine(p, nodes[from].x, nodes[from].y + 22, nodes[to].x, nodes[to].y - 22, false));
  nodes.forEach((node, index) => drawNode(p, node.x, node.y, node.label, emphasis && index === 0, false));
}

function drawNode(p: P5Like, x: number, y: number, label: string, dark: boolean, accent: boolean) {
  p.stroke(accent ? 0 : 0, 0, accent ? 0 : 72);
  p.strokeWeight(accent ? 3 : 1.5);
  p.fill(dark ? 0 : 0, 0, dark ? 0 : 100);
  p.circle(x, y, 46);
  p.noStroke();
  p.fill(dark ? 100 : 0, 0, dark ? 100 : 10);
  p.textSize(label.length > 4 ? 9 : 12);
  p.text(label, x, y);
}

function drawLine(p: P5Like, x1: number, y1: number, x2: number, y2: number, red: boolean, dashed = false) {
  p.stroke(red ? 0 : 0, red ? 75 : 0, red ? 55 : 78);
  p.strokeWeight(red ? 3 : 1.5);
  if (!dashed) {
    p.line(x1, y1, x2, y2);
    return;
  }
  for (let i = 0; i < 10; i += 2) {
    p.line(p.lerp(x1, x2, i / 10), p.lerp(y1, y2, i / 10), p.lerp(x1, x2, (i + 1) / 10), p.lerp(y1, y2, (i + 1) / 10));
  }
}

function drawPill(p: P5Like, x: number, y: number, label: string) {
  p.rectMode(p.CENTER);
  p.noStroke();
  p.fill(0, 0, 97);
  p.rect(x, y, Math.min(p.width - 48, label.length * 7 + 34), 34, 17);
  p.fill(0, 0, 35);
  p.textSize(11);
  p.text(label, x, y);
}

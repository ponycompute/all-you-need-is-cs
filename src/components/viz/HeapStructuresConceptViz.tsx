"use client";

import { useMemo } from "react";
import HeapRackFigure from "@/components/figures/heap-rack/HeapRackFigure";
import LeftistFigure from "@/components/figures/tree-gantry/LeftistFigure";
import RootListFigure from "@/components/figures/tree-gantry/RootListFigure";

type HeapMode = "minmax" | "deap" | "leftist" | "binomial" | "fibonacci";

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
    operations: ["Combine", "Insert", "Delete Min"],
  },
  binomial: {
    label: "Binomial heap",
    summary: "Root list of heap-ordered trees; delete-min consolidates equal degrees.",
    operations: ["Insert", "Combine", "Delete Min"],
  },
  fibonacci: {
    label: "Fibonacci heap",
    summary: "Lazy mergeable heap with decrease-key and cascading cuts.",
    operations: ["Insert", "Decrease Key", "Delete Min"],
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
  return (
    <div className="space-y-5">
      {mode === "minmax" || mode === "deap" ? <HeapRackFigure kind={mode} /> : mode === "leftist" ? <LeftistFigure /> : <RootListFigure kind={mode} />}
      <ModeNotes mode={mode} />
    </div>
  );
}

function ModeNotes({ mode }: { mode: HeapMode }) {
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
          {active.operations.map((operation) => (
            <div
              key={operation}
              className={`flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0 ${
                "text-charcoal"
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

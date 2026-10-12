"use client";

import * as React from "react";
import TreeGantry from "./TreeGantry";
import { costWithRoot, frameOf, shapeOf, solve, type Shape } from "./obst";
import { useLab } from "./useLab";

/** The book's example: four identifiers, with weights in sixteenths. */
const NAMES = ["do", "if", "int", "while"];
const P0 = [3, 3, 1, 1];
const Q0 = [2, 3, 1, 1, 1];
const MAX_WEIGHT = 4;

const LABEL =
  "A binary search tree of four identifiers hanging from a gantry. Each key is a plate with its weight p underneath: how often it is searched for. The small beads at the ends are the failure nodes E0 to E4, each with its weight q: how often a search fails in the gap between two keys. The tree shown is the one with the lowest total cost for these weights, where a key costs its weight times its level and a failure costs its weight times the level of the key above it. The counter on the base shows that total.";

const KEYS = [
  { mark: "raised" as const, label: "A key, with p, how often it is found" },
  { mark: "flat" as const, label: "A failure node, with q, how often a search ends there" },
  { mark: "lit" as const, label: "The root this tree was built around" },
];

const CAPTION =
  "A key that is looked up often should hang near the root, but so should a gap where searches often fail. The cheapest tree is found by trying every key as the root of every run of keys, smallest runs first: c(i, j) = w(i, j) + min over k of c(i, k−1) + c(k, j), where w(i, j) is the total weight in the run. Each entry reuses the entries for shorter runs, so the whole table takes O(n²) work with Knuth's bound instead of trying every tree.";

/** The runs of keys (i, j) whose table entries this tree was assembled from. */
function runsOf(shape: Shape, i: number, j: number, out: string[] = []) {
  if (!shape.key) return out;
  out.push(`${i}-${j}`);
  runsOf(shape.left!, i, shape.key - 1, out);
  runsOf(shape.right!, shape.key, j, out);
  return out;
}

export default function ObstFigure() {
  const [p, setP] = React.useState(P0);
  const [q, setQ] = React.useState(Q0);
  const [forced, setForced] = React.useState<number | null>(null);
  const lab = useLab();
  const turn = React.useRef(0);
  const n = NAMES.length;
  const table = React.useMemo(() => solve(p, q), [p, q]);
  const best = table.r[0]![n]!;
  const root = forced ?? best;
  const shape = React.useMemo(() => shapeOf(table, 0, n, root), [table, n, root]);
  const cost = costWithRoot(table, root);
  const used = React.useMemo(() => new Set(runsOf(shape, 0, n)), [shape, n]);

  const frame = React.useCallback(
    (weights: { p: number[]; q: number[] }, at: number | null) => {
      const solved = solve(weights.p, weights.q);
      const top = at ?? solved.r[0]![n]!;
      const total = costWithRoot(solved, top);
      const lowest = solved.c[0]![n]!;
      return frameOf(shapeOf(solved, 0, n, top), NAMES, weights.p, weights.q, {
        lit: `a${top}`,
        count: total,
        note: total === lowest ? `root ${NAMES[top - 1]} · cost ${total}, the lowest` : `root ${NAMES[top - 1]} · cost ${total}, ${total - lowest} more than the best`,
      });
    },
    [n],
  );
  const initial = React.useMemo(() => frame({ p: P0, q: Q0 }, null), [frame]);

  const hang = (weights: { p: number[]; q: number[] }, at: number | null) => {
    if (!lab.gantry?.play([frame(weights, at)])) return false;
    setP(weights.p);
    setQ(weights.q);
    setForced(at);
    return true;
  };

  const weigh = (list: "p" | "q", index: number, by: number) => {
    const next = { p: [...p], q: [...q] };
    const value = next[list][index]! + by;
    if (value < 0 || value > MAX_WEIGHT) return;
    next[list][index] = value;
    lab.gantry?.takeOver();
    hang(next, null);
  };

  const stepper = (list: "p" | "q", index: number, name: string) => {
    const value = (list === "p" ? p : q)[index]!;
    return (
      <div key={`${list}${index}`} className="flex items-center gap-1 rounded-md border border-hairline px-1.5 py-1">
        <span className="min-w-9 font-mono text-xs text-charcoal">{name}</span>
        <button type="button" onClick={() => weigh(list, index, -1)} disabled={lab.busy || value <= 0} aria-label={`Lower the weight of ${name}`} className="ui-btn-secondary !min-h-0 !px-2 !py-0.5">
          −
        </button>
        <span className="w-4 text-center font-mono text-sm text-ink" aria-label={`weight ${value}`}>
          {value}
        </span>
        <button type="button" onClick={() => weigh(list, index, 1)} disabled={lab.busy || value >= MAX_WEIGHT} aria-label={`Raise the weight of ${name}`} className="ui-btn-secondary !min-h-0 !px-2 !py-0.5">
          +
        </button>
      </div>
    );
  };

  return (
    <TreeGantry
      fig="Fig 10.1"
      title="Optimal binary search tree"
      hint="Click a key to make it the root"
      label={LABEL}
      caption={CAPTION}
      keys={KEYS}
      initial={initial}
      onState={lab.onState}
      onPick={(id) => {
        if (id.startsWith("a")) hang({ p, q }, Number(id.slice(1)) === best ? null : Number(id.slice(1)));
      }}
      tour={() => {
        // Try each key as the root in turn, then return to the best, so the costs can be compared.
        const at = turn.current++ % (n + 1);
        hang({ p, q }, at === 0 || at === best ? null : at);
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="ui-caption text-center">p: how often each key is found</p>
          <div className="flex flex-wrap items-center justify-center gap-2">{NAMES.map((name, index) => stepper("p", index, name))}</div>
          <p className="ui-caption text-center">q: how often a search fails in each gap (E0 is before do, E4 after while)</p>
          <div className="flex flex-wrap items-center justify-center gap-2">{q.map((_, index) => stepper("q", index, `E${index}`))}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {NAMES.map((name, index) => {
            const total = costWithRoot(table, index + 1);
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  lab.gantry?.takeOver();
                  hang({ p, q }, index + 1 === best ? null : index + 1);
                }}
                disabled={lab.busy}
                className={index + 1 === root ? "ui-btn-primary" : "ui-btn-secondary"}
              >
                Root {name}: cost {total}
                {index + 1 === best ? " (best)" : ""}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              lab.gantry?.takeOver();
              hang({ p: P0, q: Q0 }, null);
            }}
            disabled={lab.busy}
            className="ui-btn-secondary"
          >
            Reset
          </button>
        </div>
        <p className="ui-caption text-center">c(i, j): the lowest cost for keys i+1 … j, and the root that gives it. Shaded entries are the ones this tree is built from.</p>
        <div className="overflow-x-auto">
          <table className="mx-auto border-collapse font-mono text-xs text-charcoal">
            <thead>
              <tr>
                <th className="px-2 py-1 text-mute">i \ j</th>
                {Array.from({ length: n }, (_, j) => (
                  <th key={j} className="px-2 py-1 text-mute">
                    {j + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr key={i}>
                  <th className="px-2 py-1 text-mute">{i}</th>
                  {Array.from({ length: n }, (_, at) => {
                    const j = at + 1;
                    if (j <= i) return <td key={j} className="border border-hairline px-2 py-1" />;
                    // The top-right entry shows the tree on the gantry, which may have a forced root.
                    const whole = i === 0 && j === n;
                    return (
                      <td key={j} className={`border border-hairline px-2 py-1 text-center ${used.has(`${i}-${j}`) ? "bg-surface-soft text-ink" : ""}`}>
                        {whole ? cost : table.c[i]![j]}
                        <span className="block text-[10px] text-mute">{NAMES[(whole ? root : table.r[i]![j]!) - 1]}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ui-caption text-center">
          Total weight w(0, {n}) = {table.w[0]![n]}; this tree costs {cost}, an average of {(cost / Math.max(1, table.w[0]![n]!)).toFixed(2)} per search.
        </p>
        <p className="fig-live" aria-live="polite">
          {lab.busy ? "" : `Root ${NAMES[root - 1]}, cost ${cost}.`}
        </p>
      </div>
    </TreeGantry>
  );
}

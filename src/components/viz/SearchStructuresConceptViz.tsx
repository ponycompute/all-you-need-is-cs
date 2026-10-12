"use client";

import AvlMobileFigure from "@/components/figures/avl-mobile/AvlMobileFigure";
import BTreeFileFigure from "@/components/figures/btree-file/BTreeFileFigure";
import DiffDeskFigure from "@/components/figures/diff-desk/DiffDeskFigure";
import DigitalFigure from "@/components/figures/tree-gantry/DigitalFigure";
import MultiwayFigure from "@/components/figures/tree-gantry/MultiwayFigure";
import ObstFigure from "@/components/figures/tree-gantry/ObstFigure";
import SplayFigure from "@/components/figures/tree-gantry/SplayFigure";
import TrieFigure from "@/components/figures/tree-gantry/TrieFigure";

type SearchMode = "obst" | "avl" | "multiway" | "rb" | "btree" | "splay" | "digital" | "trie" | "diff";

const MODES: Record<
  SearchMode,
  {
    label: string;
    target: string;
    idea: string;
    facts: string[];
  }
> = {
  obst: {
    label: "Optimal BST",
    target: "Static tables",
    idea: "Choose a tree that minimizes expected search cost from success and failure probabilities.",
    facts: ["Uses internal and external path costs.", "Dynamic programming fills cost/root tables.", "Knuth's bound reduces the table work."],
  },
  avl: {
    label: "AVL",
    target: "Strict height balance",
    idea: "Keep every node's left/right subtree heights within one.",
    facts: ["Balance factors are -1, 0, or 1.", "Repairs use LL, RR, LR, and RL rotations.", "Worst-case height is logarithmic."],
  },
  multiway: {
    label: "2-3 / 2-3-4",
    target: "Balanced multiway search",
    idea: "Let nodes hold multiple keys so all external nodes stay on the same level.",
    facts: ["2-nodes, 3-nodes, and 4-nodes encode intervals.", "Splits and combines preserve level balance.", "2-3-4 trees support top-down updates."],
  },
  rb: {
    label: "Red-black",
    target: "Binary form of 2-3-4",
    idea: "Represent multiway nodes with black and red links in a binary search tree.",
    facts: ["Search ignores colors.", "No two consecutive red links.", "Height is within a constant factor of log n."],
  },
  btree: {
    label: "B-tree",
    target: "Disk indexes",
    idea: "Use high-degree balanced nodes so a search needs very few disk reads.",
    facts: ["Nonroot nodes stay at least half full.", "Failure nodes are at the same level.", "Insertion splits; deletion rotates or combines."],
  },
  splay: {
    label: "Splay",
    target: "Amortized locality",
    idea: "After each operation, rotate the accessed node to the root.",
    facts: ["No stored balance bits or colors.", "Uses zig, zig-zig, and zig-zag rotations.", "O(log n) amortized per operation."],
  },
  digital: {
    label: "Digital / Patricia",
    target: "Bitwise keys",
    idea: "Branch on key bits instead of comparing full keys at every node.",
    facts: ["Digital trees store one element per node.", "Binary tries compare full keys only at element nodes.", "Patricia compresses degree-one branches."],
  },
  trie: {
    label: "Trie",
    target: "Variable string keys",
    idea: "Branch by sampled characters or key fragments.",
    facts: ["Shared prefixes share paths.", "Sampling strategy controls height.", "Branch nodes can be collapsed with skip fields."],
  },
  diff: {
    label: "Differential files",
    target: "Indexed-file updates",
    idea: "Keep updates in smaller differential structures and merge later.",
    facts: ["Differential files reduce master-file rewrites.", "Differential indexes avoid frequent master-index backup.", "Bloom filters avoid many unnecessary differential-index reads."],
  },
};

const SECTION_TO_MODE: Record<string, SearchMode> = {
  "10-1": "obst",
  "10-2": "avl",
  "10-3": "multiway",
  "10-4": "multiway",
  "10-5": "rb",
  "10-6": "btree",
  "10-6-1": "btree",
  "10-6-2": "btree",
  "10-6-3": "btree",
  "10-6-4": "btree",
  "10-6-5": "btree",
  "10-6-6": "btree",
  "10-7": "splay",
  "10-8": "digital",
  "10-8-1": "digital",
  "10-8-2": "digital",
  "10-8-3": "digital",
  "10-9": "trie",
  "10-9-1": "trie",
  "10-9-2": "trie",
  "10-9-3": "trie",
  "10-9-4": "trie",
  "10-9-5": "trie",
  "10-10": "diff",
};

export default function SearchStructuresConceptViz({ sectionId }: { sectionId: string }) {
  const mode = SECTION_TO_MODE[sectionId] ?? "obst";
  return (
    <div className="space-y-5">
      <ModeFigure mode={mode} sectionId={sectionId} />
      <ModeNotes mode={mode} />
    </div>
  );
}

function ModeFigure({ mode, sectionId }: { mode: SearchMode; sectionId: string }) {
  if (mode === "avl") return <AvlMobileFigure />;
  if (mode === "btree") return <BTreeFileFigure />;
  if (mode === "multiway") return <MultiwayFigure kind={sectionId === "10-4" ? "two-three-four" : "two-three"} />;
  if (mode === "rb") return <MultiwayFigure kind="red-black" />;
  if (mode === "splay") return <SplayFigure />;
  if (mode === "digital") return <DigitalFigure />;
  if (mode === "trie") return <TrieFigure />;
  if (mode === "diff") return <DiffDeskFigure />;
  return <ObstFigure />;
}

function ModeNotes({ mode }: { mode: SearchMode }) {
  const active = MODES[mode];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-hairline p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[20px] font-medium leading-[1.4] text-ink">
              {active.label}
            </h3>
            <span className="rounded-full bg-surface-soft px-3 py-1 font-mono text-xs text-charcoal">
              {active.target}
            </span>
          </div>
          <p className="text-sm leading-[1.43] text-body">{active.idea}</p>
        </div>

        <div className="rounded-lg border border-hairline p-4">
          <h4 className="mb-3 font-mono text-xs font-medium uppercase text-mute">Section checks</h4>
          <div className="space-y-2">
            {active.facts.map((fact) => (
              <div key={fact} className="flex items-start gap-2 text-sm leading-[1.43] text-charcoal">
                <span className="mt-[0.55rem] h-1.5 w-1.5 rounded-full bg-ink" />
                <span>{fact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

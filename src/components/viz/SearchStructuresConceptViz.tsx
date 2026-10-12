"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AvlMobileFigure from "@/components/figures/avl-mobile/AvlMobileFigure";
import BTreeFileFigure from "@/components/figures/btree-file/BTreeFileFigure";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

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
  const mode = useMemo(() => SECTION_TO_MODE[sectionId] ?? "obst", [sectionId]);
  if (mode === "avl") {
    return (
      <div className="space-y-5">
        <AvlMobileFigure />
        <ModeNotes mode={mode} />
      </div>
    );
  }
  if (mode === "btree") {
    return (
      <div className="space-y-5">
        <BTreeFileFigure />
        <ModeNotes mode={mode} />
      </div>
    );
  }
  return <FrameSearchViz mode={mode} sectionId={sectionId} />;
}

function FrameSearchViz({ mode, sectionId }: { mode: SearchMode; sectionId: string }) {
  const controls = useMemo(() => controlsFor(mode, sectionId), [mode, sectionId]);
  const [frame, setFrame] = useState(0);
  const modeRef = useRef(mode);
  const sectionRef = useRef(sectionId);
  const frameRef = useRef(frame);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    sectionRef.current = sectionId;
  }, [sectionId]);

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont("monospace");
    };

    p.draw = () => {
      p.background(0, 0, 100);
      drawChapter10Scene(p, modeRef.current, sectionRef.current, frameRef.current);
    };
  }, []);

  return (
    <div className="space-y-5">
      <P5Wrapper sketch={sketch} className="min-h-[380px]" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {controls.map((control, index) => (
          <button
            key={control}
            type="button"
            onClick={() => setFrame(index)}
            className={index === frame ? "ui-btn-primary" : "ui-btn-secondary"}
          >
            {control}
          </button>
        ))}
        <button type="button" onClick={() => setFrame((current) => (current + 1) % controls.length)} className="ui-btn-secondary">
          {frame === controls.length - 1 ? "Back to start" : "Next"}
        </button>
      </div>

      <ModeNotes mode={mode} />
    </div>
  );
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

function controlsFor(mode: SearchMode, sectionId: string): string[] {
  if (mode === "obst") return ["Skewed", "Optimal", "DP table"];
  if (mode === "multiway") return sectionId === "10-4" ? ["Before split", "After split"] : ["Search", "Insert", "Delete"];
  if (mode === "rb") return ["2-3-4 view", "Red links", "Colour flip"];
  if (mode === "splay") return ["Search path", "Zig-zag", "Root"];
  if (mode === "digital") return ["Digital tree", "Binary trie", "Compressed"];
  if (mode === "trie") return ["Search", "Insert", "Delete"];
  if (mode === "diff") return ["Master", "Differential", "Bloom filter"];
  return ["View"];
}

type P5Like = Parameters<SketchFunction>[0];

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  fill?: "white" | "black" | "soft";
  accent?: boolean;
};

type Edge = {
  from: string;
  to: string;
  red?: boolean;
  dashed?: boolean;
};

function drawChapter10Scene(
  p: P5Like,
  mode: SearchMode,
  sectionId: string,
  frame: number
) {
  drawTitle(p, MODES[mode].label, sectionLabel(sectionId));

  switch (mode) {
    case "obst":
      drawOptimalBST(p, frame);
      break;
    case "avl":
      break;
    case "multiway":
      drawMultiwayTree(p, sectionId === "10-4", frame);
      break;
    case "rb":
      drawRedBlackTree(p, frame);
      break;
    case "btree":
      break;
    case "splay":
      drawSplay(p, frame);
      break;
    case "digital":
      drawDigitalTree(p, sectionId, frame);
      break;
    case "trie":
      drawTrie(p, sectionId, frame);
      break;
    case "diff":
      drawDifferentialFiles(p, frame);
      break;
  }
}

function drawTitle(p: P5Like, title: string, section: string) {
  p.noStroke();
  p.fill(0, 0, 8);
  p.textSize(15);
  p.text(title, p.width / 2, 26);
  p.fill(0, 0, 48);
  p.textSize(11);
  p.text(section, p.width / 2, 46);
}

function sectionLabel(sectionId: string) {
  const labels: Record<string, string> = {
    "10-1": "Expected search cost table",
    "10-2": "Height repair by rotation",
    "10-3": "2-3 node intervals",
    "10-4": "Top-down 4-node split",
    "10-5": "2-3-4 encoded as red-black links",
    "10-6": "High fanout index node",
    "10-6-1": "m-way search node",
    "10-6-2": "Search within node, then descend",
    "10-6-3": "Half-full balanced index",
    "10-6-4": "Leaf split and promotion",
    "10-6-5": "Rotation or combine after deletion",
    "10-6-6": "Variable key storage",
    "10-7": "Splay rotates access to root",
    "10-8": "Bit-directed search",
    "10-8-1": "Digital search tree",
    "10-8-2": "Binary trie",
    "10-8-3": "Patricia compressed trie",
    "10-9": "Character-sampled trie",
    "10-9-1": "Branch and element nodes",
    "10-9-2": "Search by sampled characters",
    "10-9-3": "Sampling changes height",
    "10-9-4": "Insert by first differing sample",
    "10-9-5": "Delete and collapse branches",
    "10-10": "Master plus differential structures",
    "10-11": "Search-structure tradeoff review",
  };
  return labels[sectionId] ?? "Search-structure visualization";
}

function drawOptimalBST(p: P5Like, frame: number) {
  const c = p.width / 2;
  if (frame === 2) {
    drawTable(p, c - 155, 120, [
      ["i,j", "0,1", "1,2", "2,3", "3,4"],
      ["w", "8", "7", "3", "3"],
      ["c", "8", "7", "3", "3"],
      ["r", "1", "2", "3", "4"],
    ]);
    drawPill(p, c, 284, "fill one diagonal at a time: r(i,j) is the root k that minimizes c(i,k-1) + c(k,j)");
    drawCaption(p, "First diagonal of the table (one key each). The last entry, c(0,4) = 32 with root a2 = for, is the optimal tree.");
    return;
  }
  // The same four keys and probabilities in both frames: only the shape, and so the cost, differs.
  const skewed = frame === 0;
  const nodes: Node[] = skewed
    ? [
        { id: "do", label: "do", x: c - 120, y: 84, fill: "black" },
        { id: "for", label: "for", x: c - 40, y: 144 },
        { id: "void", label: "void", x: c + 40, y: 204 },
        { id: "while", label: "while", x: c + 120, y: 264 },
      ]
    : [
        { id: "for", label: "for", x: c, y: 92, fill: "black" },
        { id: "do", label: "do", x: c - 120, y: 172 },
        { id: "void", label: "void", x: c + 120, y: 172 },
        { id: "while", label: "while", x: c + 185, y: 252 },
      ];
  drawEdges(
    p,
    nodes,
    skewed
      ? [
          { from: "do", to: "for" },
          { from: "for", to: "void" },
          { from: "void", to: "while" },
        ]
      : [
          { from: "for", to: "do" },
          { from: "for", to: "void" },
          { from: "void", to: "while" },
        ]
  );
  drawNodes(p, nodes);
  drawTable(p, skewed ? c - 330 : c - 330, 306, [
    ["key", "do", "for", "void", "while"],
    ["p", "3", "3", "1", "1"],
  ]);
  drawPill(p, c + 150, 320, skewed ? "inserted in sorted order: cost 35" : "optimal for these weights: cost 32");
  drawCaption(
    p,
    "p counts successful searches for each key (failures between keys: q = 2, 3, 1, 1, 1). Cost is weight times depth, summed."
  );
}

function drawMultiwayTree(p: P5Like, splitView: boolean, frame: number) {
  const c = p.width / 2;
  if (splitView) {
    // A 2-3-4 tree meets a 4-node on the way down and splits it before going on.
    if (frame === 0) {
      drawRectNode(p, c, 120, ["x", "y", "z"], true);
      for (const dx of [-105, -35, 35, 105]) drawLine(p, c + dx * 0.6, 144, c + dx, 206, false);
      drawPill(p, c, 300, "a 4-node: three keys and four subtrees. There is no room for another key");
      drawCaption(p, "A 2-3-4 insertion splits every 4-node it passes on the way down.");
      return;
    }
    drawRectNode(p, c, 96, ["y"], true);
    drawRectNode(p, c - 90, 190, ["x"], false);
    drawRectNode(p, c + 90, 190, ["z"], false);
    drawLine(p, c, 120, c - 90, 166, false);
    drawLine(p, c, 120, c + 90, 166, false);
    for (const dx of [-125, -55, 55, 125]) drawLine(p, c + (dx < 0 ? -90 : 90), 214, c + dx, 262, false);
    drawPill(p, c, 300, "after the split: y moves up, x and z become 2-nodes that keep the four subtrees");
    drawCaption(p, "Because the split happens on the way down, the leaf reached at the end always has room.");
    return;
  }
  if (frame === 1) {
    // Insert 50: the leaf [40, 50, 60] splits, 50 moves up, and the root [30, 50, 70] splits in turn.
    drawRectNode(p, c, 84, ["50"], true);
    drawRectNode(p, c - 130, 168, ["30"], false);
    drawRectNode(p, c + 130, 168, ["70"], false);
    drawRectNode(p, c - 205, 252, ["10", "20"], false);
    drawRectNode(p, c - 65, 252, ["40"], false);
    drawRectNode(p, c + 65, 252, ["60"], false);
    drawRectNode(p, c + 205, 252, ["80", "90"], false);
    drawLine(p, c, 108, c - 130, 144, false);
    drawLine(p, c, 108, c + 130, 144, false);
    drawLine(p, c - 130, 192, c - 205, 228, false);
    drawLine(p, c - 130, 192, c - 65, 228, false);
    drawLine(p, c + 130, 192, c + 65, 228, false);
    drawLine(p, c + 130, 192, c + 205, 228, false);
    drawPill(p, c, 316, "insert 50: leaf [40 50 60] splits and 50 moves up; the root [30 50 70] splits too");
    drawCaption(p, "A split that reaches the root makes a new root: the tree grows by one level, at the top.");
    return;
  }
  const borrowed = frame === 2;
  drawRectNode(p, c, 100, borrowed ? ["30", "60"] : ["30", "70"], true);
  drawRectNode(p, c - 160, 210, ["10", "20"], false);
  drawRectNode(p, c, 210, borrowed ? ["40"] : ["40", "60"], false);
  drawRectNode(p, c + 160, 210, borrowed ? ["70"] : ["80", "90"], false);
  drawLine(p, c - 40, 124, c - 160, 186, false);
  drawLine(p, c, 124, c, 186, false);
  drawLine(p, c + 40, 124, c + 160, 186, false);
  drawPill(
    p,
    c,
    310,
    borrowed ? "delete 80 and 90: the empty leaf borrows through the root (60 up, 70 down)" : "search 60: it lies between 30 and 70, so take the middle subtree"
  );
  drawCaption(p, "A 2-3 tree keeps every leaf on one level by holding one or two keys in each node.");
}

function drawRedBlackTree(p: P5Like, frame: number) {
  const c = p.width / 2;
  if (frame === 0) {
    drawRectNode(p, c, 100, ["50"], true);
    drawRectNode(p, c - 150, 210, ["7", "10", "40"], false);
    drawRectNode(p, c + 150, 210, ["60", "70", "80"], false);
    drawLine(p, c, 124, c - 150, 186, false);
    drawLine(p, c, 124, c + 150, 186, false);
    drawPill(p, c, 310, "the 2-3-4 tree: a 2-node over two 4-nodes");
    drawCaption(p, "Next: the same seven keys in binary nodes.");
    return;
  }
  const flipped = frame === 2;
  const nodes: Node[] = [
    { id: "50", label: "50", x: c, y: 88 },
    { id: "10", label: "10", x: c - 135, y: 170 },
    { id: "70", label: "70", x: c + 135, y: 170 },
    { id: "7", label: "7", x: c - 205, y: 250 },
    { id: "40", label: "40", x: c - 65, y: 250 },
    { id: "60", label: "60", x: c + 70, y: 250 },
    { id: "80", label: "80", x: c + 205, y: 250 },
  ];
  drawEdges(p, nodes, [
    { from: "50", to: "10", red: flipped },
    { from: "50", to: "70", red: flipped },
    { from: "10", to: "7", red: !flipped },
    { from: "10", to: "40", red: !flipped },
    { from: "70", to: "60", red: !flipped },
    { from: "70", to: "80", red: !flipped },
  ]);
  drawNodes(p, nodes);
  drawPill(
    p,
    c,
    320,
    flipped
      ? "splitting both 4-nodes is a colour flip: their red links turn black, the links above turn red"
      : "red links join the keys of one 4-node: 7-10-40 and 60-70-80; black links are the 2-3-4 tree's own"
  );
  drawCaption(p, "Every path from the root crosses the same number of black links, and no path has two red links in a row.");
}

function drawSplay(p: P5Like, frame: number) {
  const c = p.width / 2;
  const before = (left: number): Node[] => [
    { id: "8", label: "8", x: left, y: 92, fill: "black" },
    { id: "4", label: "4", x: left - 70, y: 172 },
    { id: "12", label: "12", x: left + 70, y: 172 },
    { id: "10", label: "10", x: left + 30, y: 252, accent: true },
    { id: "14", label: "14", x: left + 110, y: 252 },
  ];
  const after = (centre: number, spread: number): Node[] => [
    { id: "10", label: "10", x: centre, y: 100, fill: "black", accent: true },
    { id: "8", label: "8", x: centre - spread, y: 180 },
    { id: "12", label: "12", x: centre + spread, y: 180 },
    { id: "4", label: "4", x: centre - spread - 40, y: 255 },
    { id: "14", label: "14", x: centre + spread + 40, y: 255 },
  ];
  const beforeEdges: Edge[] = [
    { from: "8", to: "4" },
    { from: "8", to: "12" },
    { from: "12", to: "10", red: frame === 0 },
    { from: "12", to: "14" },
  ];
  const afterEdges: Edge[] = [
    { from: "10", to: "8" },
    { from: "10", to: "12" },
    { from: "8", to: "4" },
    { from: "12", to: "14" },
  ];
  if (frame === 0) {
    const nodes = before(c - 20);
    drawEdges(p, nodes, [{ from: "8", to: "4" }, { from: "8", to: "12", red: true }, ...beforeEdges.slice(2)]);
    drawNodes(p, nodes);
    drawPill(p, c, 320, "search 10: right of 8, then left of 12 (the highlighted path)");
    drawCaption(p, "A splay tree searches like any binary search tree. The difference is what happens next.");
    return;
  }
  if (frame === 1) {
    const left = before(c - 200);
    drawEdges(p, left, beforeEdges);
    drawNodes(p, left);
    drawArrow(p, c - 40, 172, c + 20, 172, false);
    const right = after(c + 190, 60);
    drawEdges(p, right, afterEdges);
    drawNodes(p, right);
    drawPill(p, c, 320, "zig-zag: 10 is a left child of a right child, so two rotations bring it to the top");
    drawCaption(p, "All five keys are still there and still in search-tree order.");
    return;
  }
  const nodes = after(c, 100);
  drawEdges(p, nodes, afterEdges);
  drawNodes(p, nodes);
  drawPill(p, c, 320, "10 is now the root: the next search for it, or for a key near it, is short");
  drawCaption(p, "No balance information is stored; the cost averages out to O(log n) over a sequence of operations.");
}

function drawDigitalTree(p: P5Like, sectionId: string, frame: number) {
  const c = p.width / 2;
  if (frame === 0) {
    // Keys inserted in this order: 1000, 0010, 1001, 0001, 1100. Level i branches on bit i, left for 0.
    const nodes: Node[] = [
      { id: "1000", label: "1000", x: c, y: 82, fill: "black" },
      { id: "0010", label: "0010", x: c - 115, y: 165 },
      { id: "1001", label: "1001", x: c + 115, y: 165 },
      { id: "0001", label: "0001", x: c - 175, y: 250 },
      { id: "1100", label: "1100", x: c + 175, y: 250 },
    ];
    drawEdges(p, nodes, [
      { from: "1000", to: "0010" },
      { from: "1000", to: "1001" },
      { from: "0010", to: "0001" },
      { from: "1001", to: "1100" },
    ]);
    drawNodes(p, nodes);
    drawPill(p, c, 318, "digital search tree: a key in every node; level i goes left on bit i = 0, right on 1");
    drawCaption(p, "Keys 1000, 0010, 1001, 0001, 1100 inserted in that order. A search still compares the whole key at each node.");
    return;
  }
  if (frame === 1) {
    // The binary trie of the same five keys: filled nodes only branch, keys live in the leaves.
    const nodes: Node[] = [
      { id: "r", label: "bit 1", x: c, y: 70, fill: "black" },
      { id: "l2", label: "bit 2", x: c - 150, y: 125, fill: "black" },
      { id: "l3", label: "bit 3", x: c - 190, y: 180, fill: "black" },
      { id: "0001", label: "0001", x: c - 235, y: 240 },
      { id: "0010", label: "0010", x: c - 145, y: 240 },
      { id: "r2", label: "bit 2", x: c + 150, y: 125, fill: "black" },
      { id: "r3", label: "bit 3", x: c + 90, y: 180, fill: "black" },
      { id: "r4", label: "bit 4", x: c + 90, y: 235, fill: "black" },
      { id: "1000", label: "1000", x: c + 45, y: 290 },
      { id: "1001", label: "1001", x: c + 135, y: 290 },
      { id: "1100", label: "1100", x: c + 230, y: 180 },
    ];
    drawEdges(p, nodes, [
      { from: "r", to: "l2" },
      { from: "l2", to: "l3" },
      { from: "l3", to: "0001" },
      { from: "l3", to: "0010" },
      { from: "r", to: "r2" },
      { from: "r2", to: "r3" },
      { from: "r3", to: "r4" },
      { from: "r4", to: "1000" },
      { from: "r4", to: "1001" },
      { from: "r2", to: "1100" },
    ]);
    drawNodes(p, nodes);
    drawCaption(p, "Binary trie: filled nodes only branch on a bit; keys sit in the leaves, so a search compares one whole key, at the end.");
    return;
  }
  // The same trie with one-child branch nodes removed: each branch names the bit it tests.
  const nodes: Node[] = [
    { id: "r", label: "bit 1", x: c, y: 76, fill: "black" },
    { id: "l", label: "bit 3", x: c - 150, y: 146, fill: "black" },
    { id: "0001", label: "0001", x: c - 205, y: 216 },
    { id: "0010", label: "0010", x: c - 95, y: 216 },
    { id: "rr", label: "bit 2", x: c + 150, y: 146, fill: "black" },
    { id: "r4", label: "bit 4", x: c + 100, y: 216, fill: "black" },
    { id: "1000", label: "1000", x: c + 55, y: 284 },
    { id: "1001", label: "1001", x: c + 145, y: 284 },
    { id: "1100", label: "1100", x: c + 215, y: 216 },
  ];
  drawEdges(p, nodes, [
    { from: "r", to: "l" },
    { from: "l", to: "0001" },
    { from: "l", to: "0010" },
    { from: "r", to: "rr" },
    { from: "rr", to: "r4" },
    { from: "r4", to: "1000" },
    { from: "r4", to: "1001" },
    { from: "rr", to: "1100" },
  ]);
  drawNodes(p, nodes);
  drawCaption(p, "Compressed: branches that had one child are gone. Patricia stores this same tree with the keys kept inside the branch nodes.");
}

function drawTrie(p: P5Like, sectionId: string, frame: number) {
  const c = p.width / 2;
  // Keys: bluebird, bunting, cardinal, goshawk, gull, wren. One letter is sampled per level.
  const inserted = frame === 1;
  const deleted = frame === 2;
  drawRectNode(p, c, 78, ["b", "c", "g", "w"], true);
  const port = (index: number) => c - 63 + index * 42;
  if (deleted) {
    drawRectNode(p, c - 200, 172, ["bluebird"], false);
  } else {
    drawRectNode(p, c - 200, 172, ["l", "u"], true);
    drawRectNode(p, c - 250, 266, ["bluebird"], false);
    drawRectNode(p, c - 165, 266, ["bunting"], false);
    drawLine(p, c - 221, 196, c - 250, 242, false);
    drawLine(p, c - 179, 196, c - 165, 242, false);
  }
  drawRectNode(p, c - 60, 172, ["cardinal"], false);
  drawRectNode(p, c + 85, 172, inserted ? ["a", "o", "u"] : ["o", "u"], true);
  drawRectNode(p, c + 222, 172, ["wren"], false);
  if (inserted) {
    drawRectNode(p, c - 30, 266, ["gannet"], false);
    drawLine(p, c + 43, 196, c - 30, 242, false);
    drawRectNode(p, c + 60, 266, ["goshawk"], false);
    drawRectNode(p, c + 145, 266, ["gull"], false);
    drawLine(p, c + 85, 196, c + 60, 242, false);
    drawLine(p, c + 127, 196, c + 145, 242, false);
  } else {
    drawRectNode(p, c + 45, 266, ["goshawk"], false);
    drawRectNode(p, c + 130, 266, ["gull"], false);
    drawLine(p, c + 64, 196, c + 45, 242, false);
    drawLine(p, c + 106, 196, c + 130, 242, false);
  }
  drawLine(p, port(0), 102, c - 200, 148, false);
  drawLine(p, port(1), 102, c - 60, 148, false);
  drawLine(p, port(2), 102, c + 85, 148, false);
  drawLine(p, port(3), 102, c + 222, 148, false);
  drawPill(
    p,
    c,
    322,
    deleted
      ? "delete bunting: the b branch no longer separates two keys, so it collapses and bluebird moves up"
      : inserted
        ? "insert gannet: it parts from goshawk and gull at the 2nd letter, so the g branch gains a link"
        : "search gull: g at level 1, u at level 2, then one comparison of the whole key"
  );
}

function drawDifferentialFiles(p: P5Like, frame: number) {
  const c = p.width / 2;
  const y = 138;
  // The master index never changes; updates accumulate in the two differential structures.
  drawStore(p, c - 225, y, "Master index", ["A -> M1", "B -> M4", "C -> M9"]);
  drawStore(p, c, y, "Differential index", frame === 0 ? ["empty", "", ""] : ["B -> D4", "E -> D7", "C -> deleted"]);
  drawStore(p, c + 225, y, "Differential file", frame === 0 ? ["empty", "", ""] : ["D4: updated B", "D7: inserted E"]);
  drawArrow(p, c - 85, y, c - 138, y, false);
  drawArrow(p, c + 85, y, c + 138, y, false);
  if (frame === 2) drawPill(p, c, 252, "Bloom filter in front of the differential index: “no” is certain, “maybe” means look");
  drawPill(
    p,
    c,
    310,
    frame === 2
      ? "a “no” from the filter skips the differential index and goes straight to the master index"
      : frame === 1
        ? "an update is written to the differential index and file; a lookup checks them first"
        : "with no updates yet, a lookup finds nothing in the differential index and falls back to the master"
  );
  drawCaption(p, "A lookup starts at the differential index (centre): a hit leads right, to the changed record; a miss leads left, to the master.");
}

function drawStore(p: P5Like, x: number, y: number, title: string, rows: string[]) {
  p.stroke(0, 0, 88);
  p.strokeWeight(1);
  p.fill(0, 0, 100);
  p.rectMode(p.CENTER);
  p.rect(x, y, 170, 140, 12);
  p.noStroke();
  p.fill(0, 0, 8);
  p.textSize(12);
  p.text(title, x, y - 48);
  p.fill(0, 0, 42);
  p.textSize(10);
  rows.forEach((row, index) => p.text(row, x, y - 18 + index * 24));
}

function drawTable(p: P5Like, x: number, y: number, rows: string[][]) {
  const cellW = 62;
  const cellH = 28;
  p.push();
  p.rectMode(p.CORNER);
  p.textSize(11);
  rows.forEach((row, r) => {
    row.forEach((cell, col) => {
      p.stroke(0, 0, 88);
      p.fill(0, 0, r === 0 ? 98 : 100);
      p.rect(x + col * cellW, y + r * cellH, cellW, cellH, 7);
      p.noStroke();
      p.fill(0, 0, 24);
      p.text(cell, x + col * cellW + cellW / 2, y + r * cellH + cellH / 2);
    });
  });
  p.pop();
}

function drawRectNode(p: P5Like, x: number, y: number, keys: string[], active: boolean) {
  const w = Math.max(74, keys.length * 46);
  p.rectMode(p.CENTER);
  p.stroke(active ? 0 : 0, 0, active ? 0 : 82);
  p.strokeWeight(active ? 2 : 1.5);
  p.fill(active ? 0 : 0, 0, active ? 8 : 100);
  p.rect(x, y, w, 48, 12);
  keys.forEach((key, index) => {
    const start = x - ((keys.length - 1) * 42) / 2;
    p.fill(active ? 100 : 0, 0, active ? 100 : 12);
    p.noStroke();
    p.textSize(12);
    p.text(key, start + index * 42, y);
    if (index > 0) {
      p.stroke(active ? 100 : 0, 0, active ? 50 : 88);
      p.line(start + index * 42 - 21, y - 16, start + index * 42 - 21, y + 16);
    }
  });
}

function drawEdges(p: P5Like, nodes: Node[], edges: Edge[]) {
  for (const edge of edges) {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);
    if (!from || !to) continue;
    drawLine(p, from.x, from.y + 22, to.x, to.y - 22, edge.red ?? false, edge.dashed ?? false);
  }
}

function drawNodes(p: P5Like, nodes: Node[]) {
  for (const node of nodes) drawNode(p, node);
}

function drawNode(p: P5Like, node: Node) {
  const dark = node.fill === "black";
  p.stroke(node.accent ? 0 : 0, 0, node.accent ? 0 : 72);
  p.strokeWeight(node.accent ? 3 : 1.5);
  p.fill(dark ? 0 : 0, 0, dark ? 0 : node.fill === "soft" ? 96 : 100);
  p.circle(node.x, node.y, 46);
  p.noStroke();
  p.fill(dark ? 100 : 0, 0, dark ? 100 : 10);
  p.textSize(12);
  p.text(node.label, node.x, node.y);
}

function drawLine(p: P5Like, x1: number, y1: number, x2: number, y2: number, red: boolean, dashed = false) {
  p.stroke(red ? 0 : 0, red ? 75 : 0, red ? 55 : 78);
  p.strokeWeight(red ? 3 : 1.5);
  if (!dashed) {
    p.line(x1, y1, x2, y2);
    return;
  }
  const parts = 12;
  for (let i = 0; i < parts; i += 2) {
    p.line(p.lerp(x1, x2, i / parts), p.lerp(y1, y2, i / parts), p.lerp(x1, x2, (i + 1) / parts), p.lerp(y1, y2, (i + 1) / parts));
  }
}

function drawArrow(p: P5Like, x1: number, y1: number, x2: number, y2: number, red: boolean) {
  drawLine(p, x1, y1, x2, y2, red);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  p.push();
  p.translate(x2, y2);
  p.rotate(angle);
  p.noStroke();
  p.fill(red ? 0 : 0, red ? 75 : 0, red ? 55 : 20);
  p.triangle(0, 0, -10, -5, -10, 5);
  p.pop();
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

function drawCaption(p: P5Like, text: string) {
  p.noStroke();
  p.fill(0, 0, 48);
  p.textSize(11);
  p.text(text, p.width / 2, p.height - 24);
}

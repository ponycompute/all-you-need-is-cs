"use client";

import { useEffect, useMemo, useState } from "react";

type TreeConceptVizProps = {
  sectionId: string;
};

type DiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type DiagramEdge = {
  from: string;
  to: string;
  dashed?: boolean;
  label?: string;
};

const BASE_NODES: DiagramNode[] = [
  { id: "A", label: "A", x: 340, y: 46 },
  { id: "B", label: "B", x: 205, y: 128 },
  { id: "C", label: "C", x: 340, y: 128 },
  { id: "D", label: "D", x: 475, y: 128 },
  { id: "E", label: "E", x: 140, y: 218 },
  { id: "F", label: "F", x: 270, y: 218 },
  { id: "G", label: "G", x: 340, y: 218 },
  { id: "H", label: "H", x: 430, y: 218 },
  { id: "I", label: "I", x: 520, y: 218 },
];

const BASE_EDGES: DiagramEdge[] = [
  { from: "A", to: "B" },
  { from: "A", to: "C" },
  { from: "A", to: "D" },
  { from: "B", to: "E" },
  { from: "B", to: "F" },
  { from: "C", to: "G" },
  { from: "D", to: "H" },
  { from: "D", to: "I" },
];

const BINARY_NODES: DiagramNode[] = [
  { id: "A", label: "A", x: 340, y: 44 },
  { id: "B", label: "B", x: 220, y: 132 },
  { id: "C", label: "C", x: 460, y: 132 },
  { id: "D", label: "D", x: 150, y: 228 },
  { id: "E", label: "E", x: 290, y: 228 },
  { id: "F", label: "F", x: 390, y: 228 },
  { id: "G", label: "G", x: 530, y: 228 },
];

const BINARY_EDGES: DiagramEdge[] = [
  { from: "A", to: "B", label: "left" },
  { from: "A", to: "C", label: "right" },
  { from: "B", to: "D" },
  { from: "B", to: "E" },
  { from: "C", to: "F" },
  { from: "C", to: "G" },
];

// The nine-node tree whose four orders the §5.3 text quotes.
const TRAVERSAL_NODES: DiagramNode[] = [
  { id: "A", label: "A", x: 340, y: 36 },
  { id: "B", label: "B", x: 200, y: 104 },
  { id: "C", label: "C", x: 480, y: 104 },
  { id: "D", label: "D", x: 130, y: 172 },
  { id: "E", label: "E", x: 270, y: 172 },
  { id: "F", label: "F", x: 410, y: 172 },
  { id: "G", label: "G", x: 550, y: 172 },
  { id: "H", label: "H", x: 85, y: 240 },
  { id: "I", label: "I", x: 175, y: 240 },
];

const TRAVERSAL_EDGES: DiagramEdge[] = [
  { from: "A", to: "B", label: "left" },
  { from: "A", to: "C", label: "right" },
  { from: "B", to: "D" },
  { from: "B", to: "E" },
  { from: "C", to: "F" },
  { from: "C", to: "G" },
  { from: "D", to: "H" },
  { from: "D", to: "I" },
];

const THREAD_NODES: DiagramNode[] = [
  { id: "D", label: "D", x: 125, y: 220 },
  { id: "B", label: "B", x: 245, y: 132 },
  { id: "E", label: "E", x: 365, y: 220 },
  { id: "A", label: "A", x: 365, y: 44 },
  { id: "F", label: "F", x: 510, y: 132 },
];

const THREAD_EDGES: DiagramEdge[] = [
  { from: "A", to: "B" },
  { from: "A", to: "F" },
  { from: "B", to: "D" },
  { from: "B", to: "E" },
  { from: "D", to: "B", dashed: true, label: "succ" },
  { from: "E", to: "A", dashed: true, label: "succ" },
];

const WINNER_NODES: DiagramNode[] = [
  { id: "r", label: "7", x: 340, y: 44 },
  { id: "l", label: "7", x: 235, y: 124 },
  { id: "rr", label: "13", x: 445, y: 124 },
  { id: "a", label: "7", x: 165, y: 218 },
  { id: "b", label: "21", x: 305, y: 218 },
  { id: "c", label: "13", x: 375, y: 218 },
  { id: "d", label: "18", x: 515, y: 218 },
];

const WINNER_EDGES: DiagramEdge[] = [
  { from: "r", to: "l" },
  { from: "r", to: "rr" },
  { from: "l", to: "a" },
  { from: "l", to: "b" },
  { from: "rr", to: "c" },
  { from: "rr", to: "d" },
];

const FOREST_NODES: DiagramNode[] = [
  { id: "A", label: "A", x: 150, y: 78 },
  { id: "B", label: "B", x: 95, y: 170 },
  { id: "C", label: "C", x: 205, y: 170 },
  { id: "D", label: "D", x: 340, y: 78 },
  { id: "E", label: "E", x: 285, y: 170 },
  { id: "F", label: "F", x: 395, y: 170 },
  { id: "G", label: "G", x: 530, y: 78 },
  { id: "H", label: "H", x: 530, y: 170 },
];

const FOREST_EDGES: DiagramEdge[] = [
  { from: "A", to: "B" },
  { from: "A", to: "C" },
  { from: "D", to: "E" },
  { from: "D", to: "F" },
  { from: "G", to: "H" },
];

// The same forest as one binary tree: a solid link to the first child, a dashed link to the next sibling.
const FOREST_BINARY_EDGES: DiagramEdge[] = [
  { from: "A", to: "B", label: "left" },
  { from: "B", to: "C", dashed: true, label: "right" },
  { from: "A", to: "D", dashed: true, label: "right" },
  { from: "D", to: "E", label: "left" },
  { from: "E", to: "F", dashed: true, label: "right" },
  { from: "D", to: "G", dashed: true, label: "right" },
  { from: "G", to: "H", label: "left" },
];

/** The five binary trees on three nodes, numbered in preorder, with the inorder sequence each one gives. */
const SHAPES: Array<{ at: Array<[number, number]>; edges: Array<[number, number]>; inorder: string }> = [
  { at: [[30, 50], [0, 120], [-30, 190]], edges: [[0, 1], [1, 2]], inorder: "3 2 1" },
  { at: [[15, 50], [-25, 120], [15, 190]], edges: [[0, 1], [1, 2]], inorder: "2 3 1" },
  { at: [[0, 50], [-36, 120], [36, 120]], edges: [[0, 1], [0, 2]], inorder: "2 1 3" },
  { at: [[-15, 50], [25, 120], [-15, 190]], edges: [[0, 1], [1, 2]], inorder: "1 3 2" },
  { at: [[-30, 50], [0, 120], [30, 190]], edges: [[0, 1], [1, 2]], inorder: "1 2 3" },
];
const SHAPE_SLOT = 136;
const SHAPE_NODES: DiagramNode[] = SHAPES.flatMap((shape, tree) =>
  shape.at.map(([dx, y], node) => ({ id: `${tree}-${node}`, label: String(node + 1), x: SHAPE_SLOT * (tree + 0.5) + dx, y })),
);
const SHAPE_EDGES: DiagramEdge[] = SHAPES.flatMap((shape, tree) => shape.edges.map(([from, to]) => ({ from: `${tree}-${from}`, to: `${tree}-${to}` })));

const COUNT_NODES: DiagramNode[] = [
  { id: "1", label: "1", x: 340, y: 44 },
  { id: "2", label: "2", x: 220, y: 124 },
  { id: "3", label: "3", x: 460, y: 124 },
  { id: "4", label: "4", x: 150, y: 212 },
  { id: "5", label: "5", x: 290, y: 212 },
  { id: "6", label: "6", x: 390, y: 212 },
  { id: "7", label: "7", x: 530, y: 212 },
];

const COUNT_EDGES: DiagramEdge[] = [
  { from: "1", to: "2", label: "2i" },
  { from: "1", to: "3", label: "2i+1" },
  { from: "2", to: "4" },
  { from: "2", to: "5" },
  { from: "3", to: "6" },
  { from: "3", to: "7" },
];

const TRAVERSALS = {
  pre: ["A", "B", "D", "H", "I", "E", "C", "F", "G"],
  in: ["H", "D", "I", "B", "E", "A", "F", "C", "G"],
  post: ["H", "I", "D", "E", "B", "F", "G", "C", "A"],
  level: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
};

const ORDER_NAMES: Record<keyof typeof TRAVERSALS, string> = {
  pre: "Preorder (VLR)",
  in: "Inorder (LVR)",
  post: "Postorder (LRV)",
  level: "Level order",
};

/** Time between visits while a traversal plays. */
const VISIT_MS = 550;

export default function TreeConceptViz({ sectionId }: TreeConceptVizProps) {
  const [order, setOrder] = useState<keyof typeof TRAVERSALS>("in");
  // How many nodes of the chosen traversal have been visited so far.
  const [visited, setVisited] = useState(TRAVERSALS.in.length);
  const [binary, setBinary] = useState(false);

  useEffect(() => {
    if (sectionId !== "5-3" || visited >= TRAVERSALS[order].length) return;
    const timer = setTimeout(() => setVisited((count) => count + 1), VISIT_MS);
    return () => clearTimeout(timer);
  }, [sectionId, order, visited]);

  const play = (next: keyof typeof TRAVERSALS) => {
    setOrder(next);
    setVisited(0);
  };

  const content = useMemo(() => conceptFor(sectionId, order, visited, binary), [sectionId, order, visited, binary]);

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-hairline bg-surface-soft p-4">
        <svg
          viewBox="0 0 680 300"
          role="img"
          aria-label={content.title}
          className="h-auto w-full"
        >
          <rect x="0" y="0" width="680" height="300" rx="12" fill="#fafafa" />
          <g>
            {content.edges.map((edge, index) => (
              <DiagramLine key={`${edge.from}-${edge.to}-${index}`} edge={edge} nodes={content.nodes} />
            ))}
          </g>
          <g>
            {content.nodes.map((node) => (
              <DiagramCircle key={node.id} node={node} active={content.active.includes(node.id)} />
            ))}
          </g>
          {content.annotations.map((annotation) => (
            <text
              key={annotation.text}
              x={annotation.x}
              y={annotation.y}
              textAnchor="middle"
              className="fill-charcoal font-mono text-[12px]"
            >
              {annotation.text}
            </text>
          ))}
        </svg>
      </div>

      {sectionId === "5-3" ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(TRAVERSALS) as Array<keyof typeof TRAVERSALS>).map((name) => (
            <button key={name} type="button" onClick={() => play(name)} className={order === name ? "ui-btn-primary" : "ui-btn-secondary"}>
              {ORDER_NAMES[name]}
            </button>
          ))}
        </div>
      ) : null}
      {sectionId === "5-9" ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => setBinary(false)} className={binary ? "ui-btn-secondary" : "ui-btn-primary"}>
            Forest
          </button>
          <button type="button" onClick={() => setBinary(true)} className={binary ? "ui-btn-primary" : "ui-btn-secondary"}>
            As a binary tree
          </button>
        </div>
      ) : null}

      <p className="ui-caption text-center">{content.caption}</p>
    </div>
  );
}

function conceptFor(sectionId: string, order: keyof typeof TRAVERSALS, visited: number, binary: boolean) {
  switch (sectionId) {
    case "5-1":
      return {
        title: "Tree terminology and left-child right-sibling representation",
        nodes: BASE_NODES,
        edges: BASE_EDGES,
        active: ["E", "F", "G", "H", "I"],
        annotations: [
          { x: 340, y: 18, text: "root A · level 1 · degree 3" },
          { x: 130, y: 132, text: "B: degree 2" },
          { x: 340, y: 278, text: "leaves (degree 0), filled: E F G H I · height 3" },
        ],
        caption: "A general tree. B, C and D are siblings and the children of A; E and F are descendants of B; the degree of the tree is the largest node degree, 3.",
      };
    case "5-2":
      return {
        title: "Complete binary tree array positions",
        nodes: COUNT_NODES,
        edges: COUNT_EDGES,
        active: ["1", "4", "5", "6", "7"],
        annotations: [
          { x: 180, y: 278, text: "level i max: 2^(i-1)" },
          { x: 500, y: 278, text: "parent(i)=floor(i/2)" },
        ],
        caption: "Complete binary tree: positions 1..n map directly to array indices.",
      };
    case "5-3":
      return {
        title: "Binary tree traversal orders",
        nodes: TRAVERSAL_NODES,
        edges: TRAVERSAL_EDGES,
        active: TRAVERSALS[order].slice(0, visited),
        annotations: [
          { x: 400, y: 286, text: `${ORDER_NAMES[order]}: ${TRAVERSALS[order].slice(0, visited).join(" ") || "…"}` },
        ],
        caption: "Pick an order to replay it: nodes fill in as they are visited. The tree never changes, only the order of the visits.",
      };
    case "5-4":
      return {
        title: "Copy and equality recurse over matching subtrees",
        nodes: BINARY_NODES,
        edges: BINARY_EDGES,
        active: ["A", "B", "C"],
        annotations: [
          { x: 202, y: 278, text: "copy(left), copy(right)" },
          { x: 496, y: 278, text: "equal(data,left,right)" },
        ],
        caption: "Copying and equality both handle NULL first, then recurse on left and right subtrees.",
      };
    case "5-5":
      return {
        title: "Threaded binary tree inorder successor links",
        nodes: THREAD_NODES,
        edges: THREAD_EDGES,
        active: ["D", "B", "E", "A", "F"],
        annotations: [
          { x: 340, y: 278, text: "dashed links replace NULL child links with inorder threads" },
        ],
        caption: "Threads let repeated insucc calls perform inorder traversal without a stack.",
      };
    case "5-8":
      return {
        title: "Winner tree for k-way merging",
        nodes: WINNER_NODES,
        edges: WINNER_EDGES,
        active: ["r", "l", "a"],
        annotations: [
          { x: 340, y: 278, text: "root stores the current smallest run head" },
        ],
        caption: "After output, rebuild only one leaf-to-root path: O(log k) per selected record.",
      };
    case "5-9":
      return {
        title: binary ? "The forest stored as one binary tree" : "A forest of three trees",
        nodes: FOREST_NODES,
        edges: binary ? FOREST_BINARY_EDGES : FOREST_EDGES,
        active: ["A", "D", "G"],
        annotations: binary
          ? [
              { x: 340, y: 236, text: "preorder A B C D E F G H = forest preorder" },
              { x: 340, y: 262, text: "inorder B C A E F D H G = forest inorder" },
            ]
          : [{ x: 340, y: 250, text: "three trees, roots A, D and G (filled)" }],
        caption: binary
          ? "Each node keeps two links: left (solid) to its first child, right (dashed) to its next sibling. The roots count as siblings, so the whole forest is one binary tree rooted at A."
          : "Switch to the binary-tree form to see the same eight nodes joined by first-child and next-sibling links.",
      };
    case "5-11":
      return {
        title: "The five distinct binary trees with three nodes",
        nodes: SHAPE_NODES,
        edges: SHAPE_EDGES,
        active: [],
        annotations: [
          ...SHAPES.map((shape, tree) => ({ x: SHAPE_SLOT * (tree + 0.5), y: 240, text: `inorder ${shape.inorder}` })),
          { x: 340, y: 282, text: "b(n) = C(2n, n) / (n + 1):  1, 2, 5, 14, 42, …" },
        ],
        caption: "All five binary trees with three nodes, numbered in preorder. Their inorder sequences are the five orderings of 1 2 3 a stack can produce; 3 1 2 is the one it cannot, and no tree gives it.",
      };
    default:
      return {
        title: "Binary tree overview",
        nodes: BINARY_NODES,
        edges: BINARY_EDGES,
        active: ["A"],
        annotations: [],
        caption: "Binary tree structure with left and right children.",
      };
  }
}

function DiagramLine({ edge, nodes }: { edge: DiagramEdge; nodes: DiagramNode[] }) {
  const from = nodes.find((node) => node.id === edge.from);
  const to = nodes.find((node) => node.id === edge.to);
  if (!from || !to) return null;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - 6;
  // Stop the line at each circle's rim, whatever direction it runs in.
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const [ux, uy] = [(to.x - from.x) / length, (to.y - from.y) / length];

  return (
    <g>
      <line
        x1={from.x + ux * 22}
        y1={from.y + uy * 22}
        x2={to.x - ux * 22}
        y2={to.y - uy * 22}
        stroke={edge.dashed ? "#a3a3a3" : "#d4d4d4"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={edge.dashed ? "5 6" : undefined}
      />
      {edge.label ? (
        <text x={midX} y={midY} textAnchor="middle" className="fill-mute font-mono text-[10px]">
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}

function DiagramCircle({ node, active }: { node: DiagramNode; active: boolean }) {
  return (
    <g>
      <circle
        cx={node.x}
        cy={node.y}
        r="22"
        fill={active ? "#000000" : "#ffffff"}
        stroke={active ? "#000000" : "#d4d4d4"}
        strokeWidth="1.5"
      />
      <text
        x={node.x}
        y={node.y + 4}
        textAnchor="middle"
        className={active ? "fill-white font-mono text-[13px]" : "fill-ink font-mono text-[13px]"}
      >
        {node.label}
      </text>
    </g>
  );
}

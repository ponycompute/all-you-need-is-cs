// What a tree on the gantry looks like at one moment. Every lab that hangs a tree
// (splay, leftist, red-black, tries, heaps of trees) describes its steps as a list
// of these frames; the gantry only moves tags between them.

export interface TreeNode {
  id: string;
  /** A round tag with one key, a plate with one cell per key, or a small bead that only branches. */
  kind: "coin" | "plate" | "bead";
  /** One text per cell: a coin and a bead have one, a plate one or more. */
  cells: string[];
  parent: string | null;
  /** Which of the parent's ports this node hangs from, left to right. */
  port: number;
  /** How many ports this node has: 2 for a binary node, keys + 1 for a multiway node. Ports with nothing on them still take room. */
  ports: number;
  /** A heavier string, for a red link. */
  heavy?: boolean;
  /** A short label on the string from the parent: a bit or a letter. */
  via?: string;
  /** A small figure under the key: a rank, a degree, a shortest-path length. */
  sub?: string;
  /** A dot on the tag: a mark that the node has lost a child, or that it ends a word. */
  marked?: boolean;
}

export interface TreeFrame {
  /** Roots hang from the rail in the order they first appear here. */
  nodes: TreeNode[];
  /** The tag the reader should watch. */
  lit?: string | null;
  /** Tags being compared or read. */
  on?: string[];
  /** The root the rail's pointer stands over: the minimum of a heap, the root of a search tree. */
  pointer?: string | null;
  /** What this step does, for the readout. */
  note: string;
  /** The number on the counter. */
  count?: number;
  /** Seconds to rest on this frame before the next. */
  hold?: number;
}

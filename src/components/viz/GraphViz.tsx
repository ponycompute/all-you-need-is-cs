"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

type Mode = "repr" | "traversal" | "paths" | "activity";

type GraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type GraphEdge = {
  from: string;
  to: string;
  weight?: number;
  directed?: boolean;
  critical?: boolean;
};

type GraphView = {
  mode: Mode;
  title: string;
  caption: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  facts: string[];
  tableTitle: string;
  tableRows: string[];
};

type StepState = {
  current: string | null;
  visited: Set<string>;
  frontier: string[];
  activeEdges: Set<string>;
  message: string;
  metric: string;
};

const EMPTY_STEP: StepState = {
  current: null,
  visited: new Set(),
  frontier: [],
  activeEdges: new Set(),
  message: "Choose an operation.",
  metric: "Idle",
};

function edgeKey(from: string, to: string) {
  return `${from}->${to}`;
}

function reverseEdgeKey(from: string, to: string) {
  return `${to}->${from}`;
}

function undirectedKey(a: string, b: string) {
  return a < b ? `${a}->${b}` : `${b}->${a}`;
}

export default function GraphViz({ sectionId = "6-2" }: { sectionId?: string }) {
  const view = useMemo(() => getView(sectionId), [sectionId]);
  const [step, setStep] = useState<StepState>(() => ({
    ...EMPTY_STEP,
    message: view.caption,
  }));
  const [activeRun, setActiveRun] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewRef = useRef(view);
  const stepRef = useRef(step);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => stopTimer, [stopTimer]);

  const playSteps = useCallback(
    (name: string, steps: StepState[]) => {
      stopTimer();
      if (steps.length === 0) return;

      setActiveRun(name);
      setStep(steps[0]);
      let index = 1;

      timerRef.current = setInterval(() => {
        if (index >= steps.length) {
          stopTimer();
          setActiveRun(null);
          return;
        }
        setStep(steps[index]);
        index += 1;
      }, 700);
    },
    [stopTimer]
  );

  const reset = useCallback(() => {
    stopTimer();
    setActiveRun(null);
    setStep({ ...EMPTY_STEP, message: view.caption });
  }, [stopTimer, view.caption]);

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont("monospace");
    };

    p.draw = () => {
      const currentView = viewRef.current;
      const currentStep = stepRef.current;
      p.background(0, 0, 100);

      for (const edge of currentView.edges) {
        const from = currentView.nodes.find((node) => node.id === edge.from);
        const to = currentView.nodes.find((node) => node.id === edge.to);
        if (!from || !to) continue;

        const active =
          currentStep.activeEdges.has(edgeKey(edge.from, edge.to)) ||
          currentStep.activeEdges.has(reverseEdgeKey(edge.from, edge.to)) ||
          currentStep.activeEdges.has(undirectedKey(edge.from, edge.to));

        p.stroke(active ? 35 : 0, active ? 85 : 0, active ? 78 : 80);
        p.strokeWeight(active ? 4 : 2);
        p.line(from.x, from.y, to.x, to.y);

        if (edge.directed) {
          drawArrowHead(p, from, to, active);
        }

        if (edge.weight !== undefined) {
          p.noStroke();
          p.fill(0, 0, 100);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          p.rectMode(p.CENTER);
          p.rect(midX, midY, 26, 18, 9);
          p.fill(0, 0, 30);
          p.textSize(11);
          p.text(String(edge.weight), midX, midY);
        }
      }

      for (const node of currentView.nodes) {
        const isCurrent = currentStep.current === node.id;
        const isVisited = currentStep.visited.has(node.id);
        const inFrontier = currentStep.frontier.includes(node.id);

        if (isCurrent) {
          p.fill(45, 85, 88);
          p.stroke(35, 90, 65);
        } else if (isVisited) {
          p.fill(135, 45, 84);
          p.stroke(135, 45, 62);
        } else if (inFrontier) {
          p.fill(205, 42, 92);
          p.stroke(205, 50, 68);
        } else {
          p.fill(0, 0, 97);
          p.stroke(0, 0, 68);
        }
        p.strokeWeight(2);
        p.circle(node.x, node.y, 46);
        p.noStroke();
        p.fill(0, 0, 10);
        p.textSize(13);
        p.text(node.label, node.x, node.y);
      }

      p.noStroke();
      p.fill(0, 0, 35);
      p.textSize(11);
      p.text(currentStep.metric, p.width / 2, p.height - 28);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-display text-[20px] font-medium text-ink">{view.title}</h3>
        <p className="text-sm leading-[1.43] text-body">{view.caption}</p>
      </div>

      <P5Wrapper sketch={sketch} className="min-h-[400px]" />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {sectionId === "6-1" && (
          <>
            <button
              type="button"
              onClick={() => playSteps("Matrix", representationSteps(view, "Matrix"))}
              disabled={activeRun !== null}
              className="ui-btn-primary"
            >
              Matrix
            </button>
            <button
              type="button"
              onClick={() => playSteps("List", representationSteps(view, "Adjacency list"))}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              List
            </button>
            <button
              type="button"
              onClick={() => playSteps("Multilist", representationSteps(view, "Multilist"))}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              Multilist
            </button>
          </>
        )}

        {sectionId === "6-2" && (
          <>
            <button
              type="button"
              onClick={() => playSteps("DFS", traversalSteps(view, "dfs"))}
              disabled={activeRun !== null}
              className="ui-btn-primary"
            >
              DFS
            </button>
            <button
              type="button"
              onClick={() => playSteps("BFS", traversalSteps(view, "bfs"))}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              BFS
            </button>
            <button
              type="button"
              onClick={() => playSteps("Kruskal", kruskalSteps(view))}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              Kruskal
            </button>
          </>
        )}

        {sectionId === "6-3" && (
          <>
            <button
              type="button"
              onClick={() => playSteps("Dijkstra", dijkstraSteps(view))}
              disabled={activeRun !== null}
              className="ui-btn-primary"
            >
              Dijkstra
            </button>
            <button
              type="button"
              onClick={() => playSteps("Closure", closureSteps(view))}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              Closure
            </button>
          </>
        )}

        {sectionId === "6-4" && (
          <>
            <button
              type="button"
              onClick={() => playSteps("Topological", topologicalSteps(view))}
              disabled={activeRun !== null}
              className="ui-btn-primary"
            >
              Topological
            </button>
            <button
              type="button"
              onClick={() => playSteps("Critical", criticalPathSteps())}
              disabled={activeRun !== null}
              className="ui-btn-secondary"
            >
              Critical path
            </button>
          </>
        )}

        {sectionId === "6-5" && (
          <button
            type="button"
            onClick={() => playSteps("M paths", mShortestSteps())}
            disabled={activeRun !== null}
            className="ui-btn-primary"
          >
            Enumerate paths
          </button>
        )}

        <button type="button" onClick={reset} className="ui-btn-secondary">
          Reset
        </button>
      </div>

      <p className="ui-caption text-center">{step.message}</p>

      <div className="grid gap-4 border-t border-hairline pt-4 md:grid-cols-[1fr_1fr]">
        <div>
          <h4 className="mb-2 font-mono text-xs font-medium uppercase tracking-wide text-mute">
            {view.tableTitle}
          </h4>
          <ul className="space-y-1 font-mono text-xs leading-normal text-charcoal">
            {view.tableRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-mono text-xs font-medium uppercase tracking-wide text-mute">
            Textbook checkpoints
          </h4>
          <ul className="space-y-1 text-xs leading-normal text-body">
            {view.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function drawArrowHead(p: Parameters<SketchFunction>[0], from: GraphNode, to: GraphNode, active: boolean) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const radius = 25;
  const x = to.x - Math.cos(angle) * radius;
  const y = to.y - Math.sin(angle) * radius;
  p.push();
  p.translate(x, y);
  p.rotate(angle);
  p.noStroke();
  p.fill(active ? p.color(35, 85, 78) : p.color(0, 0, 80));
  p.triangle(0, 0, -10, -5, -10, 5);
  p.pop();
}

function representationSteps(view: GraphView, name: string): StepState[] {
  const focus =
    name === "Matrix"
      ? ["1", "2", "3", "4"]
      : name === "Adjacency list"
        ? ["1", "2"]
        : ["2", "3", "4"];

  return focus.map((id, index) => ({
    current: id,
    visited: new Set(focus.slice(0, index + 1)),
    frontier: neighborsOf(view, id),
    activeEdges: new Set(neighborsOf(view, id).map((next) => undirectedKey(id, next))),
    message:
      name === "Matrix"
        ? `Adjacency matrix row ${id}: scan every possible column.`
        : name === "Adjacency list"
          ? `Adjacency list ${id}: follow only stored neighbors.`
          : `Multilist view: one undirected edge node can be shared by both endpoint lists.`,
    metric:
      name === "Matrix"
        ? "Matrix: n^2 space, O(1) edge test"
        : name === "Adjacency list"
          ? "List: n heads plus 2e undirected edge entries"
          : "Multilist: one edge node, two incidence links",
  }));
}

function traversalSteps(view: GraphView, kind: "dfs" | "bfs"): StepState[] {
  const start = "1";
  const visited = new Set<string>();
  const activeEdges = new Set<string>();
  const steps: StepState[] = [];

  if (kind === "dfs") {
    const visit = (id: string, parent: string | null) => {
      visited.add(id);
      if (parent) activeEdges.add(undirectedKey(parent, id));
      steps.push({
        current: id,
        visited: new Set(visited),
        frontier: neighborsOf(view, id).filter((next) => !visited.has(next)),
        activeEdges: new Set(activeEdges),
        message: `DFS visits ${id}; recurse into the first unvisited adjacent vertex.`,
        metric: `DFS order: ${Array.from(visited).join(", ")}`,
      });
      for (const next of neighborsOf(view, id)) {
        if (!visited.has(next)) visit(next, id);
      }
    };
    visit(start, null);
    return steps;
  }

  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of neighborsOf(view, id)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
        activeEdges.add(undirectedKey(id, next));
      }
    }
    steps.push({
      current: id,
      visited: new Set(visited),
      frontier: [...queue],
      activeEdges: new Set(activeEdges),
      message: `BFS expands ${id}; newly discovered vertices wait in the queue.`,
      metric: `Queue: [${queue.join(", ")}]`,
    });
  }
  return steps;
}

function kruskalSteps(view: GraphView): StepState[] {
  const parent = new Map(view.nodes.map((node) => [node.id, node.id]));
  const accepted = new Set<string>();
  const steps: StepState[] = [];
  const find = (id: string): string => {
    const p = parent.get(id)!;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));

  const edges = [...view.edges].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
  for (const edge of edges) {
    const key = undirectedKey(edge.from, edge.to);
    const createsCycle = find(edge.from) === find(edge.to);
    if (!createsCycle) {
      accepted.add(key);
      union(edge.from, edge.to);
    }
    steps.push({
      current: edge.to,
      visited: new Set([...accepted].flatMap((item) => item.split("->"))),
      frontier: [edge.from, edge.to],
      activeEdges: new Set(accepted),
      message: createsCycle
        ? `Reject (${edge.from}, ${edge.to}); its endpoints are already connected.`
        : `Accept (${edge.from}, ${edge.to}); it connects two components.`,
      metric: `Kruskal accepted ${accepted.size}/${view.nodes.length - 1} tree edges`,
    });
    if (accepted.size === view.nodes.length - 1) break;
  }
  return steps;
}

function dijkstraSteps(view: GraphView): StepState[] {
  const distances = new Map(view.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const finalized = new Set<string>();
  // The edge each vertex's best distance came through: together they are the shortest-path tree.
  const through = new Map<string, string>();
  const steps: StepState[] = [];
  distances.set("1", 0);

  while (finalized.size < view.nodes.length) {
    const next = [...distances.entries()]
      .filter(([id]) => !finalized.has(id))
      .sort((a, b) => a[1] - b[1])[0];
    if (!next || !Number.isFinite(next[1])) break;
    const [id] = next;
    finalized.add(id);

    for (const edge of view.edges.filter((item) => item.from === id)) {
      const candidate = distances.get(id)! + (edge.weight ?? 0);
      if (candidate < distances.get(edge.to)!) {
        distances.set(edge.to, candidate);
        through.set(edge.to, edgeKey(edge.from, edge.to));
      }
    }

    steps.push({
      current: id,
      visited: new Set(finalized),
      frontier: [...distances.entries()]
        .filter(([nodeId, dist]) => !finalized.has(nodeId) && Number.isFinite(dist))
        .map(([nodeId]) => nodeId),
      activeEdges: new Set(through.values()),
      message: `Finalize ${id}; relax its outgoing edges. Highlighted edges are the best known way into each vertex.`,
      metric: `DIST: ${formatDistances(distances)}`,
    });
  }
  return steps;
}

function closureSteps(view: GraphView): StepState[] {
  const steps: StepState[] = [];
  const reach = new Set(view.edges.map((edge) => edgeKey(edge.from, edge.to)));
  for (const pivot of view.nodes.map((node) => node.id)) {
    for (const i of view.nodes.map((node) => node.id)) {
      for (const j of view.nodes.map((node) => node.id)) {
        if (reach.has(edgeKey(i, pivot)) && reach.has(edgeKey(pivot, j))) {
          reach.add(edgeKey(i, j));
        }
      }
    }
    steps.push({
      current: pivot,
      visited: new Set([pivot]),
      frontier: [],
      activeEdges: new Set([...reach].filter((key) => key.includes(`->${pivot}`) || key.includes(`${pivot}->`))),
      message: `Use ${pivot} as the allowed intermediate vertex index in the closure update.`,
      metric: `Reachability entries known: ${reach.size}`,
    });
  }
  return steps;
}

function topologicalSteps(view: GraphView): StepState[] {
  const indegree = new Map(view.nodes.map((node) => [node.id, 0]));
  for (const edge of view.edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const stack = [...indegree.entries()].filter(([, count]) => count === 0).map(([id]) => id).reverse();
  const output: string[] = [];
  const activeEdges = new Set<string>();
  const steps: StepState[] = [];

  while (stack.length > 0) {
    const id = stack.pop()!;
    output.push(id);
    for (const edge of view.edges.filter((item) => item.from === id)) {
      activeEdges.add(edgeKey(edge.from, edge.to));
      const nextCount = (indegree.get(edge.to) ?? 0) - 1;
      indegree.set(edge.to, nextCount);
      if (nextCount === 0) stack.push(edge.to);
    }
    steps.push({
      current: id,
      visited: new Set(output),
      frontier: [...stack],
      activeEdges: new Set(activeEdges),
      message: `Output ${id}; decrement predecessor counts for its successors.`,
      metric: `Topological order: ${output.join(", ")}`,
    });
  }
  return steps;
}

function criticalPathSteps(): StepState[] {
  // Two paths of length 18 leave v5; every activity on either has e(i) = l(i).
  const first = ["v1", "v2", "v5", "v7", "v9"];
  const second = ["v5", "v8", "v9"];
  const edgesOf = (path: string[]) => path.slice(0, -1).map((from, i) => edgeKey(from, path[i + 1]));
  const steps: StepState[] = first.map((id, index) => ({
    current: id,
    visited: new Set(first.slice(0, index + 1)),
    frontier: first.slice(index + 1, index + 2),
    activeEdges: new Set(edgesOf(first.slice(0, index + 1))),
    message: `Critical path reaches ${id}; activities on this route have zero slack.`,
    metric: "Critical path length: 18",
  }));
  steps.push({
    current: "v8",
    visited: new Set([...first, "v8"]),
    frontier: [],
    activeEdges: new Set([...edgesOf(first), ...edgesOf(second)]),
    message: "A second critical path, v5-v8-v9, is just as long. Only v1-v2 and v2-v5 lie on both, so only speeding those shortens the project.",
    metric: "Two critical paths, both of length 18",
  });
  return steps;
}

function mShortestSteps(): StepState[] {
  const paths = [
    { path: ["1", "3", "5", "6"], cost: 8 },
    { path: ["1", "3", "4", "6"], cost: 9 },
    { path: ["1", "2", "5", "6"], cost: 12 },
    { path: ["1", "2", "4", "6"], cost: 13 },
    { path: ["1", "2", "3", "5", "6"], cost: 14 },
  ];

  return paths.map((item, index) => ({
    current: item.path[item.path.length - 1],
    visited: new Set(item.path),
    frontier: [],
    activeEdges: new Set(item.path.slice(0, -1).map((from, i) => edgeKey(from, item.path[i + 1]))),
    message: `p${index + 1}: ${item.path.join(" -> ")} has cost ${item.cost}.`,
    metric: `Candidate Q emits paths in nondecreasing length`,
  }));
}

function neighborsOf(view: GraphView, id: string): string[] {
  const out = new Set<string>();
  for (const edge of view.edges) {
    if (edge.from === id) out.add(edge.to);
    if (!edge.directed && edge.to === id) out.add(edge.from);
  }
  return [...out].sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

function formatDistances(distances: Map<string, number>) {
  return [...distances.entries()]
    .map(([id, dist]) => `${id}:${Number.isFinite(dist) ? dist : "inf"}`)
    .join(" ");
}

function getView(sectionId: string): GraphView {
  if (sectionId === "6-1") return representationView();
  if (sectionId === "6-3") return shortestPathView();
  if (sectionId === "6-4") return activityView();
  if (sectionId === "6-5") return pathEnumerationView();
  return traversalView();
}

function traversalView(): GraphView {
  return {
    mode: "traversal",
    title: "DFS, BFS, and spanning-tree edges",
    caption:
      "The sample graph follows the textbook traversal idea: DFS goes deep and backs up, while BFS expands by queue layers from vertex 1.",
    nodes: [
      { id: "1", label: "v1", x: 210, y: 70 },
      { id: "2", label: "v2", x: 120, y: 150 },
      { id: "3", label: "v3", x: 300, y: 150 },
      { id: "4", label: "v4", x: 70, y: 250 },
      { id: "5", label: "v5", x: 160, y: 260 },
      { id: "6", label: "v6", x: 250, y: 260 },
      { id: "7", label: "v7", x: 360, y: 250 },
      { id: "8", label: "v8", x: 210, y: 345 },
    ],
    edges: [
      { from: "1", to: "2", weight: 4 },
      { from: "1", to: "3", weight: 8 },
      { from: "2", to: "4", weight: 5 },
      { from: "2", to: "5", weight: 7 },
      { from: "3", to: "6", weight: 6 },
      { from: "3", to: "7", weight: 9 },
      { from: "4", to: "8", weight: 10 },
      { from: "5", to: "8", weight: 11 },
      { from: "6", to: "8", weight: 12 },
      { from: "5", to: "6", weight: 3 },
    ],
    tableTitle: "Adjacency lists",
    tableRows: [
      "1: 2, 3",
      "2: 1, 4, 5",
      "3: 1, 6, 7",
      "4: 2, 8",
      "5: 2, 6, 8",
      "6: 3, 5, 8",
      "7: 3",
      "8: 4, 5, 6",
    ],
    facts: [
      "DFS with adjacency lists examines each list node at most once.",
      "BFS uses a queue; DFS uses recursion or a stack.",
      "Accepted traversal edges form a spanning tree when the graph is connected.",
      "Kruskal accepts low-cost edges only when they join different components.",
    ],
  };
}

function representationView(): GraphView {
  const base = traversalView();
  return {
    ...base,
    title: "Adjacency matrix, lists, and multilists",
    caption:
      "Toggle the representation focus: matrix scans possible pairs, lists store actual neighbors, and multilists share one node per undirected edge.",
    tableTitle: "Representation tradeoffs",
    tableRows: [
      "Matrix: A(i,j)=1 iff edge exists",
      "Undirected matrix: symmetric",
      "List: one head node per vertex",
      "Undirected list: two entries per edge",
      "Multilist: one edge node appears in two incidence lists",
    ],
    facts: [
      "Dense graphs often justify an adjacency matrix.",
      "Sparse graphs benefit from adjacency lists.",
      "Digraph in-degree can need inverse adjacency lists.",
      "Weighted networks store costs in matrix entries or list nodes.",
    ],
  };
}

function shortestPathView(): GraphView {
  return {
    mode: "paths",
    title: "Shortest paths and reachability",
    caption:
      "Run Dijkstra from vertex 1 or replay a transitive-closure pivot pass over the same directed network.",
    nodes: [
      { id: "1", label: "v1", x: 80, y: 190 },
      { id: "2", label: "v2", x: 175, y: 90 },
      { id: "3", label: "v3", x: 300, y: 100 },
      { id: "4", label: "v4", x: 190, y: 285 },
      { id: "5", label: "v5", x: 330, y: 270 },
    ],
    edges: [
      { from: "1", to: "2", weight: 10, directed: true },
      { from: "1", to: "4", weight: 30, directed: true },
      { from: "1", to: "5", weight: 100, directed: true },
      { from: "2", to: "3", weight: 50, directed: true },
      { from: "3", to: "5", weight: 10, directed: true },
      { from: "4", to: "3", weight: 20, directed: true },
      { from: "4", to: "5", weight: 60, directed: true },
    ],
    tableTitle: "Cost adjacency rows",
    tableRows: ["1: 2(10), 4(30), 5(100)", "2: 3(50)", "3: 5(10)", "4: 3(20), 5(60)", "5: -"],
    facts: [
      "SHORTEST_PATH finalizes the outside vertex with smallest DIST.",
      "Matrix-based Dijkstra is O(n^2).",
      "ALL_COSTS is the all-pairs min-plus triple loop.",
      "Transitive closure swaps min/plus for boolean or/and.",
    ],
  };
}

function activityView(): GraphView {
  return {
    mode: "activity",
    title: "AOV ordering and AOE critical path",
    caption:
      "This project network shows the topological-order mechanism and the zero-slack critical path idea from §6.4.",
    nodes: [
      { id: "v1", label: "v1", x: 55, y: 200 },
      { id: "v2", label: "v2", x: 135, y: 95 },
      { id: "v3", label: "v3", x: 135, y: 200 },
      { id: "v4", label: "v4", x: 135, y: 305 },
      { id: "v5", label: "v5", x: 240, y: 140 },
      { id: "v6", label: "v6", x: 240, y: 285 },
      { id: "v7", label: "v7", x: 340, y: 115 },
      { id: "v8", label: "v8", x: 340, y: 250 },
      { id: "v9", label: "v9", x: 430, y: 185 },
    ],
    edges: [
      { from: "v1", to: "v2", weight: 6, directed: true, critical: true },
      { from: "v1", to: "v3", weight: 4, directed: true },
      { from: "v1", to: "v4", weight: 5, directed: true },
      { from: "v2", to: "v5", weight: 1, directed: true, critical: true },
      { from: "v3", to: "v5", weight: 1, directed: true },
      { from: "v4", to: "v6", weight: 2, directed: true },
      { from: "v5", to: "v7", weight: 9, directed: true, critical: true },
      { from: "v5", to: "v8", weight: 7, directed: true, critical: true },
      { from: "v6", to: "v8", weight: 4, directed: true },
      { from: "v7", to: "v9", weight: 2, directed: true, critical: true },
      { from: "v8", to: "v9", weight: 4, directed: true, critical: true },
    ],
    tableTitle: "Critical data",
    tableRows: ["ee(v1)=0", "ee(v5)=7", "ee(v7)=16", "ee(v8)=14", "ee(v9)=18", "Critical: v1-v2-v5-v7-v9", "and v1-v2-v5-v8-v9"],
    facts: [
      "AOV vertices are activities; edges are precedence constraints.",
      "Topological order fails when every remaining vertex has a predecessor.",
      "AOE edges are activities; vertices are events.",
      "Critical activities have e(i)=l(i).",
    ],
  };
}

function pathEnumerationView(): GraphView {
  return {
    mode: "paths",
    title: "Nondecreasing path enumeration",
    caption:
      "The path player mirrors §6.5: emit the shortest simple path, then keep constrained candidates for later paths.",
    nodes: [
      { id: "1", label: "v1", x: 65, y: 200 },
      { id: "2", label: "v2", x: 160, y: 290 },
      { id: "3", label: "v3", x: 160, y: 110 },
      { id: "4", label: "v4", x: 290, y: 200 },
      { id: "5", label: "v5", x: 290, y: 315 },
      { id: "6", label: "v6", x: 410, y: 200 },
    ],
    edges: [
      { from: "1", to: "3", weight: 3, directed: true },
      { from: "3", to: "5", weight: 3, directed: true },
      { from: "5", to: "6", weight: 2, directed: true },
      { from: "3", to: "4", weight: 3, directed: true },
      { from: "4", to: "6", weight: 3, directed: true },
      { from: "1", to: "2", weight: 5, directed: true },
      { from: "2", to: "5", weight: 5, directed: true },
      { from: "2", to: "4", weight: 5, directed: true },
      { from: "2", to: "3", weight: 4, directed: true },
      { from: "4", to: "5", weight: 8, directed: true },
    ],
    tableTitle: "First candidate paths",
    tableRows: [
      "p1: 1-3-5-6 = 8",
      "p2: 1-3-4-6 = 9",
      "p3: 1-2-5-6 = 12",
      "p4: 1-2-4-6 = 13",
      "p5: 1-2-3-5-6 = 14",
    ],
    facts: [
      "Only simple paths are listed.",
      "Candidate tuples carry include/exclude constraints.",
      "The first satisfying constrained path can be used for extra route constraints.",
      "The text analyzes first m paths because all simple paths may be factorial.",
    ],
  };
}

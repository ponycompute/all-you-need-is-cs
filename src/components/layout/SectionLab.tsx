"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const ArrayViz = dynamic(() => import("@/components/viz/ArrayViz"), { ssr: false });
const MultidimArrayViz = dynamic(() => import("@/components/viz/MultidimArrayViz"), {
  ssr: false,
});
const SparseMatrixViz = dynamic(() => import("@/components/viz/SparseMatrixViz"), {
  ssr: false,
});
const StringArrayViz = dynamic(() => import("@/components/viz/StringArrayViz"), { ssr: false });
const StructUnionViz = dynamic(() => import("@/components/viz/StructUnionViz"), {
  ssr: false,
});
const LinkedStacksQueuesViz = dynamic(
  () => import("@/components/viz/LinkedStacksQueuesViz"),
  { ssr: false }
);
const ClassPegsFigure = dynamic(() => import("@/components/figures/class-pegs/ClassPegsFigure"), {
  ssr: false,
});
const PolynomialListViz = dynamic(() => import("@/components/viz/PolynomialListViz"), {
  ssr: false,
});
const TagForestFigure = dynamic(() => import("@/components/figures/tag-forest/TagForestFigure"), {
  ssr: false,
});
const RadixSortViz = dynamic(() => import("@/components/viz/RadixSortViz"), { ssr: false });
const PatchBoardFigure = dynamic(() => import("@/components/figures/patch-board/PatchBoardFigure"), {
  ssr: false,
});
const MazeStackViz = dynamic(() => import("@/components/viz/MazeStackViz"), { ssr: false });
const StackViz = dynamic(() => import("@/components/viz/StackViz"), { ssr: false });
const PostfixEvalViz = dynamic(() => import("@/components/viz/PostfixEvalViz"), { ssr: false });
const DualStackArrayViz = dynamic(() => import("@/components/viz/DualStackArrayViz"), {
  ssr: false,
});
const QueueViz = dynamic(() => import("@/components/viz/QueueViz"), { ssr: false });
const RingQueueFigure = dynamic(() => import("@/components/figures/ring-queue/RingQueueFigure"), {
  ssr: false,
});
const HashTableViz = dynamic(() => import("@/components/viz/HashTableViz"), {
  ssr: false,
});
const TreeViz = dynamic(() => import("@/components/viz/TreeViz"), { ssr: false });
const TreeConceptViz = dynamic(() => import("@/components/viz/TreeConceptViz"), { ssr: false });
const BSTViz = dynamic(() => import("@/components/viz/BSTViz"), { ssr: false });
const HeapViz = dynamic(() => import("@/components/viz/HeapViz"), { ssr: false });
const HeapStructuresConceptViz = dynamic(
  () => import("@/components/viz/HeapStructuresConceptViz"),
  { ssr: false }
);
const HeapSortFigure = dynamic(() => import("@/components/figures/heap-rack/HeapSortFigure"), {
  ssr: false,
});
const MergeYardFigure = dynamic(() => import("@/components/figures/merge-yard/MergeYardFigure"), {
  ssr: false,
});
const HashDirectoryFigure = dynamic(() => import("@/components/figures/hash-directory/HashDirectoryFigure"), {
  ssr: false,
});
const PinBoardFigure = dynamic(() => import("@/components/figures/pin-board/PinBoardFigure"), {
  ssr: false,
});
const GraphViz = dynamic(() => import("@/components/viz/GraphViz"), { ssr: false });
const InternalSortingConceptViz = dynamic(
  () => import("@/components/viz/InternalSortingConceptViz"),
  { ssr: false }
);
const SearchStructuresConceptViz = dynamic(
  () => import("@/components/viz/SearchStructuresConceptViz"),
  { ssr: false }
);

function StackQueuePair() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="mb-4 font-display text-[20px] font-medium text-ink">Stack (LIFO)</h3>
        <StackViz />
      </div>
      <div>
        <h3 className="mb-4 font-display text-[20px] font-medium text-ink">Queue (FIFO)</h3>
        <QueueViz />
      </div>
    </div>
  );
}

function labNode(topicId: string, sectionId: string): ReactNode | null {
  switch (topicId) {
    case "basic-concepts":
      return null;
    case "arrays":
      switch (sectionId) {
        case "2-1":
          return <ArrayViz />;
        case "2-2":
          return <StructUnionViz />;
        case "2-3":
          return <SparseMatrixViz />;
        case "2-4":
          return <MultidimArrayViz />;
        case "2-5":
          return <StringArrayViz />;
        default:
          return <ArrayViz />;
      }
    case "stack-queue":
      if (sectionId === "3-4-2") {
        return <PostfixEvalViz />;
      }
      if (sectionId === "3-6") {
        return <DualStackArrayViz />;
      }
      if (sectionId === "3-5") {
        return <MazeStackViz />;
      }
      if (sectionId === "3-2" || sectionId === "3-4") {
        return <StackViz />;
      }
      if (sectionId === "3-3") {
        return <RingQueueFigure />;
      }
      return <StackQueuePair />;
    case "linked-list":
      if (sectionId === "4-4") {
        return <PolynomialListViz />;
      }
      if (sectionId === "4-3") {
        return <LinkedStacksQueuesViz />;
      }
      if (sectionId === "4-6") {
        return <ClassPegsFigure />;
      }
      if (sectionId === "4-7") {
        return <SparseMatrixViz />;
      }
      return <PatchBoardFigure key={sectionId} doubly={sectionId === "4-8"} />;
    case "trees":
      if (sectionId === "5-6") return <HeapViz />;
      if (sectionId === "5-7") return <BSTViz />;
      if (sectionId === "5-10") return <TagForestFigure />;
      if (sectionId === "5-8") return <MergeYardFigure fig="Fig 5.8" />;
      if (
        sectionId === "5-1" ||
        sectionId === "5-2" ||
        sectionId === "5-3" ||
        sectionId === "5-4" ||
        sectionId === "5-5" ||
        sectionId === "5-8" ||
        sectionId === "5-9" ||
        sectionId === "5-11"
      ) {
        return <TreeConceptViz sectionId={sectionId} />;
      }
      return <TreeViz />;
    case "graphs":
      if (sectionId === "6-1") return <PinBoardFigure />;
      return <GraphViz key={sectionId} sectionId={sectionId} />;
    case "sorting":
      if (["7-11-2", "7-11-3", "7-11-4", "7-11-5"].includes(sectionId)) return <MergeYardFigure fig="Fig 7.11" />;
      if (
        sectionId === "7-1" ||
        sectionId === "7-2" ||
        sectionId === "7-3" ||
        sectionId === "7-4" ||
        sectionId === "7-5" ||
        sectionId === "7-6" ||
        sectionId === "7-9" ||
        sectionId === "7-10" ||
        sectionId === "7-11" ||
        sectionId === "7-11-1" ||
        sectionId === "7-11-2" ||
        sectionId === "7-11-3" ||
        sectionId === "7-11-4" ||
        sectionId === "7-11-5"
      ) {
        return <InternalSortingConceptViz sectionId={sectionId} />;
      }
      if (sectionId === "7-7") return <HeapSortFigure />;
      if (sectionId === "7-8") return <RadixSortViz />;
      return null;
    case "hash-table":
      if (sectionId.startsWith("8-3")) return <HashDirectoryFigure />;
      return <HashTableViz key={sectionId} sectionId={sectionId} />;
    case "heap":
      return <HeapStructuresConceptViz key={sectionId} sectionId={sectionId} />;
    case "binary-search-trees":
      return <SearchStructuresConceptViz key={sectionId} sectionId={sectionId} />;
    default:
      return null;
  }
}

export default function SectionLab({
  topicId,
  sectionId,
}: {
  topicId: string;
  sectionId: string;
}) {
  const node = labNode(topicId, sectionId);
  if (node) return <div className="ui-terminal-panel">{node}</div>;
  if (topicId === "basic-concepts") return null;
  return (
    <p className="border-t border-hairline pt-8 text-center text-sm text-mute">
      No interactive visualization for this section—continue with the textbook or adjacent § links.
    </p>
  );
}

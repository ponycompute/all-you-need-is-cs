/**
 * Which interactive lab a section shows, as a key. Sections of one chapter that
 * share a key show the same lab, so the chapter page mounts it once, at the
 * first of them. Mirrors the routing in `components/layout/SectionLab.tsx`;
 * reference-only sections have no lab.
 */
const TREE_CONCEPTS = new Set(["5-1", "5-2", "5-3", "5-4", "5-5", "5-8", "5-9", "5-11"]);
const SORTING_CONCEPTS = new Set(["7-1", "7-2", "7-3", "7-4", "7-5", "7-6", "7-9", "7-10", "7-11-2", "7-11-3", "7-11-4", "7-11-5"]);
const SEARCH_MODES: Record<string, string> = { "10-2": "avl", "10-5": "rb", "10-7": "splay", "10-10": "diff" };

export function labKeyOf(topicId: string, sectionId: string): string | null {
  switch (topicId) {
    case "arrays":
      return ["2-2", "2-3", "2-4", "2-5"].includes(sectionId) ? sectionId : "2-1";
    case "stack-queue":
      if (["3-4-2", "3-5", "3-6"].includes(sectionId)) return sectionId;
      if (sectionId === "3-2" || sectionId === "3-4") return "stack";
      // §3.1 only introduces the two; each gets its own lab in the section that defines it.
      return sectionId === "3-3" ? "queue" : null;
    case "linked-list":
      // §4.7's linked sparse matrix has no lab of its own; the array form is under §2.3.
      if (sectionId === "4-7") return null;
      if (["4-3", "4-4", "4-6"].includes(sectionId)) return sectionId;
      return sectionId === "4-8" ? "doubly" : "singly";
    case "trees":
      if (sectionId === "5-6") return "heap";
      if (sectionId === "5-7") return "bst";
      if (sectionId === "5-10") return "union-find";
      return TREE_CONCEPTS.has(sectionId) ? sectionId : "tree";
    case "graphs":
      return ["6-1", "6-3", "6-4", "6-5"].includes(sectionId) ? sectionId : "6-2";
    case "sorting":
      if (sectionId === "7-7") return "heapsort";
      if (sectionId === "7-8") return "radix";
      if (sectionId === "7-11" || sectionId === "7-11-1") return "7-11";
      // The merge yard under §7.11.2 serves the three sections after it as well.
      if (/^7-11-[2-5]$/.test(sectionId)) return "merge";
      return SORTING_CONCEPTS.has(sectionId) ? sectionId : null;
    case "hash-table":
      // §8.2 only sets up the vocabulary; the table lab belongs with the example in §8.2.1.
      if (sectionId === "8-4" || sectionId === "8-2") return null;
      if (sectionId === "8-1") return "adt";
      if (sectionId === "8-2-2") return "functions";
      if (sectionId === "8-2-3") return "overflow";
      if (sectionId === "8-2-4") return "theory";
      return sectionId.startsWith("8-3") ? "dynamic" : "table";
    case "heap":
      if (sectionId === "9-6") return null;
      if (sectionId.startsWith("9-2")) return "deap";
      if (sectionId === "9-3") return "leftist";
      if (sectionId.startsWith("9-4")) return "binomial";
      if (sectionId.startsWith("9-5")) return "fibonacci";
      return "minmax";
    case "binary-search-trees":
      if (sectionId === "10-11") return null;
      if (SEARCH_MODES[sectionId]) return SEARCH_MODES[sectionId];
      if (sectionId.startsWith("10-6")) return "btree";
      if (sectionId.startsWith("10-8")) return "digital";
      if (sectionId.startsWith("10-9")) return "trie";
      return /^10-(3|4)/.test(sectionId) ? sectionId : "obst";
    default:
      return null;
  }
}

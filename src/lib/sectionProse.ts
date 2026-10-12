import type { BookOutlineItem, Topic } from "@/lib/topics";

/** Last resort if a section id is missing from the tables below. */
function fallback(topic: Topic, section: BookOutlineItem): string[] {
  return [
    `${section.label} (${section.title}) is covered in ${topic.bookChapter} of Horowitz, Sahni, and Anderson-Freed’s text; a summary has not been written for it here yet.`,
    "See the book for the full definitions, figures, and exercises.",
  ];
}

const BASIC_CONCEPTS: Record<string, string[]> = {
  "1-1": [
    "Developing software follows a life cycle: specification, design, implementation, and verification. Data structures enter as soon as we commit to how data is stored and accessed.",
    "This chapter frames later material: we always trade clarity, correctness, and resource use when choosing a representation.",
  ],
  "1-2": [
    "An algorithm is a finite sequence of unambiguous steps that transforms inputs into outputs for a well-stated problem.",
    "Good specifications name inputs and outputs, state preconditions and postconditions, and leave room to compare different implementations fairly.",
  ],
  "1-2-2": [
    "Recursion expresses a problem in terms of smaller instances of the same problem, with base cases that stop the descent.",
    "Each recursive call should make progress toward a base case; otherwise you risk infinite recursion and stack overflow.",
  ],
  "1-3": [
    "Data abstraction separates the allowed operations of an abstract data type (ADT) from the concrete representation that implements them.",
    "Clients reason about behavior through the ADT interface; implementers can swap structures without breaking correct client code.",
  ],
  "1-4": [
    "Performance analysis asks how time and space requirements grow with input size, often before any benchmarking.",
    "Reasoning about worst-, average-, and best-case behavior helps compare algorithms independently of a particular machine.",
  ],
  "1-4-1": [
    "Space complexity counts extra memory beyond the input—recursion depth, temporary arrays, and auxiliary data structures all matter.",
    "Some algorithms trade time for space, or the reverse; the textbook emphasizes asymptotic growth of that footprint.",
  ],
  "1-4-2": [
    "Time complexity counts dominant operations—comparisons, assignments, pointer updates—as a function of problem size.",
    "Tight bounds and asymptotic notation summarize how run time scales when inputs grow large.",
  ],
  "1-4-3": [
    "Big-O, Ω, and Θ describe upper, lower, and tight growth rates; little-o and little-ω refine strict comparisons.",
    "These tools summarize behavior without hiding constants that still matter in small or resource-constrained settings.",
  ],
  "1-5": [
    "Measurement complements analysis: timing real runs can expose caching, system load, and implementation details asymptotics ignore.",
    "Use experiments to validate models and to choose between implementations whose asymptotics match.",
  ],
};

const ARRAYS: Record<string, string[]> = {
  "2-1": [
    "An array ADT exposes linearly ordered elements with random access by index. The textbook contrasts logical operations (create, retrieve, store, length) with how C lays out contiguous memory.",
    "Use the lab to practice insert, delete, and access on a small vector—the same ideas underpin static and dynamic array implementations.",
  ],
  "2-2": [
    "Structures (records) group heterogeneous fields with named components; unions share storage among alternatives when only one interpretation is active.",
    "Arrays of structures appear everywhere in matrix and table code; alignment and padding affect real memory footprints.",
  ],
  "2-3": [
    "Sparse matrices store mostly-zero data efficiently by recording only nonzero positions—often as triples (row, col, value) or linked structures.",
    "Choosing a representation depends on the sparsity pattern and whether you need fast row, column, or random access.",
  ],
  "2-4": [
    "Multidimensional arrays can be stored in row-major or column-major order in a single block; index formulas map logical (i, j, …) to a linear offset.",
    "The choice interacts with cache performance and with how languages define multidimensional indexing.",
  ],
  "2-5": [
    "The string ADT treats sequences of characters with operations such as length, concat, compare, and substring. Implementations range from fixed arrays to dynamic buffers.",
    "C’s null-terminated strings are one representation; the text also motivates more abstract string APIs.",
  ],
};

const STACK_QUEUE: Record<string, string[]> = {
  "3-1": [
    "Stacks and queues restrict insertion and deletion to ends of a sequence, which yields simple invariants and O(1) time behavior for the core operations.",
    "Both appear as building blocks for parsing, scheduling, graph algorithms, and simulations.",
  ],
  "3-2": [
    "A stack is last-in, first-out (LIFO): push adds at the top, pop removes from the top. The ADT hides whether you use an array or a linked list underneath.",
    "The lab focuses on stack operations—trace how recursion uses an implicit call stack as you read the book.",
  ],
  "3-3": [
    "A queue is first-in, first-out (FIFO): enqueue adds at the rear, dequeue removes from the front. Circular-array implementations avoid shifting elements.",
    "The lab below is that circular array: items stay where they are, and adding or deleting only advances the rear or front index, round the ring. Compare it with the stack lab’s LIFO discipline.",
  ],
  "3-4": [
    "Evaluating arithmetic expressions involves precedence and associativity. Infix notation needs parentheses or rules; compilers often convert to postfix (RPN) for one-pass evaluation.",
    "The stack lab under §3.2 is the one to keep in mind: push and pop are “operands held while you wait for their operator”. §3.4.2, next, steps through a concrete postfix evaluation.",
  ],
  "3-4-2": [
    "Postfix (Reverse Polish) expressions can be evaluated with a single operand stack: scan left-to-right, push numbers, and on each operator apply it to the top stack values.",
    "Use Next token in the lab to replay a short postfix example; each step matches the textbook’s one-stack evaluation pattern.",
  ],
  "3-5": [
    "The mazing problem (classic rat-in-a-maze / DFS on a grid): keep a trial path on a stack, mark visited cells — the usual formulation uses maze[][] where 0 is open and 1 is blocked plus mark[][] so each grid cell is tried at most once.",
    "The lab fixes a common four-way tie-break — try moves in order right, then down, then left, then up. Horowitz §3.5 tells the same story; richer variants scan eight compass directions and store (row, col, dir) on each stack frame.",
  ],
  "3-6": [
    "When multiple stacks or queues share one array, you can grow pointers from both ends or partition the array carefully to avoid overflow.",
    "The lab shows two stacks in one vector: left stack grows upward in index, right stack downward until tops meet—that is Horowitz’s classic two-stack picture; queues with two ends use related bookkeeping.",
  ],
};

const LINKED_LIST: Record<string, string[]> = {
  "4-1": [
    "Chapter 4 contrasts sequential allocation (fixed stride, cheap indexed access, expensive arbitrary insert/delete) with linked allocation (nodes anywhere in memory, each with a link to the next).",
    "Classic walkthroughs simulate a chain with parallel data[] and link[] plus first. Inserting “between FAT and HAT” uses four updates: allocate a node, set its data, point its link at the successor, then point the predecessor’s link at the new node—swapping the last two steps breaks the list (common exam question).",
    "Deleting needs the predecessor: use prev/cur (or trail), splitting the head case from interior deletes. The lab below plays those updates one cord at a time, on the book's own list.",
  ],
  "4-2": [
    "In C, listNode holds data fields and listPointer link; trail (or the node before x) matters because deleting the head differs from deleting an interior cell.",
    "Insert/delete signatures use listPointer *first when the caller’s head must change; alternatively delete can return the new head for call-by-value call sites.",
  ],
  "4-3": [
    "Instead of stack[N][MAX], linked storage uses an array of tops top[i], each the head of a chain. Linked queues keep front[i] and rear[i]; empty means both NULL (a common textbook pattern).",
    "The lab demonstrates multiple stacks and queues side by side with push/pop and enqueue/dequeue.",
  ],
  "4-4": [
    "Polynomials use polyNode lists with coef, expon, and link; keeping terms sorted by exponent makes padd a single merge-style pass. attach grows the result at the rear by updating a rear pointer.",
    "erase walks the list and frees nodes. The same chapter pattern also mentions recycling nodes through an avail list (get_node/ret_node, cerase) so teardown can be O(1)-ish for circular polynomial lists.",
    "The lab below shows polynomials as linked lists of terms.",
  ],
  "4-5": [
    "Circular lists use a last pointer: insertFront(last, node) and length walk the ring. The same material also gives invert(lead) with lead/middle/trail pointers reversing links in one pass, and concatenate(ptr1, ptr2) splicing the end of the first list to the second (mutating the first list).",
    "Circular polynomials reuse nodes via get_node/ret_node, cerase, and an avail list.",
  ],
  "4-6": [
    "Equivalence relations (reflexive, symmetric, transitive) partition a finite set. A standard worked example uses S = {0,…,11}, sample pairs, and Program 4.22 with seq[], out[], and a stack—O(n+m) for n elements and m pairs.",
    "The lab plays that program on the same nine pairs: phase one builds the seq[] lists, phase two prints the classes with the out[] flags and the stack. The classes come out as {0, 11, 4, 7, 2}, {1, 3, 5} and {6, 8, 10, 9}.",
  ],
  "4-7": [
    "A sparse matrix can also be stored with links. Each nonzero term becomes a node that sits on two circular lists at once, one for its row and one for its column, each with a header node, so only the nonzero entries take space and a term can be added or removed without shifting the rest.",
    "Compare this with the array of (row, col, value) triples in the lab under §2.3: the same nonzero terms, but there a new term means shifting every triple after it.",
  ],
  "4-8": [
    "Singly linked and singly circular lists force a walk from the head to find a predecessor or to delete an arbitrary node you only hold by address. Doubly linked nodes add llink and rlink so neighbors update symmetrically.",
    "The usual dinsert/ddelete patterns rewire both directions: four assignments to insert, two to delete. The lab below plays them on the same list as §4.1, with a dashed cord for each backward link.",
  ],
};

const TREES: Record<string, string[]> = {
  "5-1": [
    "Chapter 5 starts by contrasting linear structures with tree structures: arrays, stacks, queues, and linked lists move along one dimension, while a tree organizes data hierarchically from a distinguished root.",
    "A tree is a finite nonempty set of nodes with one root; the remaining nodes are partitioned into disjoint subtrees. The usual vocabulary is: degree of a node, degree of a tree, leaf, parent, child, sibling, ancestor, descendant, level, and height.",
    "Representation comes before algorithms. General trees can be written in list form where parentheses raise and lower the level, but fixed-size nodes are easier to implement. The left-child/right-sibling representation gives every node two links and shows why every general tree can be rotated into an equivalent degree-two, binary-style representation.",
  ],
  "5-2": [
    "A binary tree is either empty or consists of a root and two disjoint binary trees called the left subtree and right subtree. That empty-tree case, and the left/right order of children, are the main differences from an ordinary tree.",
    "The key counting facts are central: level i has at most 2^(i-1) nodes, and a depth-k binary tree has at most 2^k - 1 nodes. In any nonempty binary tree, if n0 is the number of leaves and n2 is the number of degree-two nodes, then n0 = n2 + 1.",
    "A full binary tree of depth k has exactly 2^k - 1 nodes. A complete binary tree fills positions from 1 through n in the corresponding full tree, which enables array storage: parent(i) = floor(i/2), left child = 2i, and right child = 2i + 1 when those indices stay within n. Irregular binary trees use linked nodes with data, leftChild, and rightChild fields.",
  ],
  "5-3": [
    "Traversal is described by the relative order of left subtree (L), node visit (V), and right subtree (R). With left before right, the three standard orders are inorder LVR, preorder VLR, and postorder LRV.",
    "The tree in the lab gives inorder HDIBEAFCG, postorder HIDEBFGCA, preorder ABDHIECFG, and level order ABCDEFGHI. The important habit is to state the visit rule first, then trace the same tree without changing the structure.",
    "Recursive traversal follows a small template: stop at NULL, recurse left or right as required, and print the node at the V position. Iterative inorder simulates recursion with a stack: walk left until NULL, pop and visit the parent, then continue into the right subtree. Level-order traversal uses a queue rather than a stack.",
  ],
  "5-4": [
    "The additional operations reuse traversal structure rather than introducing a new data structure. Copying a binary tree allocates a new node for the root, recursively copies the left subtree, and recursively copies the right subtree; NULL children remain NULL.",
    "Testing equality also mirrors the tree shape: two NULL trees are equal, two non-NULL nodes are equal only when their data matches and both left and right subtrees are equal. A node matched against NULL immediately fails.",
    "These functions are useful because they expose the core binary-tree recursion pattern: handle the empty case, do local work, and delegate the same operation to the two subtrees.",
  ],
  "5-5": [
    "A binary tree with n nodes has 2n child links, but only n - 1 of them are real edges, leaving n + 1 NULL links. A threaded binary tree replaces those NULL links with threads to useful inorder neighbors.",
    "The rule is: if leftChild is NULL, point it to the inorder predecessor; if rightChild is NULL, point it to the inorder successor. Extra tag bits such as leftThread and rightThread distinguish a thread from a real child pointer.",
    "The key operation is insucc: if the right link is a thread, the successor is reached directly; otherwise move to the right child and then as far left as possible. Repeatedly calling insucc performs inorder traversal without recursion or an explicit stack.",
  ],
  "5-6": [
    "Heaps are introduced through priority queues: a normal queue is FIFO, but a priority queue removes the item with highest or lowest priority first. Unordered arrays insert in Θ(1) but delete in Θ(n); sorted structures reverse that tradeoff. A heap gives O(log n) insertion and deletion.",
    "A max heap is a complete binary tree that is also a max tree: every node key is no smaller than its children. A min heap is the symmetric version. Because the tree is complete, the implementation uses an array starting at index 1.",
    "Insertion appends the new item at the next leaf and moves it upward while it is larger than its parent in a max heap. Deletion removes the root, places the last element in a temporary variable, repeatedly promotes the larger child downward, and finally stores the temp item. Both operations walk one root-to-leaf path, so their time is O(log2 n).",
  ],
  "5-7": [
    "A binary search tree is a binary tree where each element has a unique key, every key in the left subtree is smaller than the root key, every key in the right subtree is larger, and both subtrees are themselves BSTs.",
    "Search follows one path: compare the target key with the current node, go left if smaller, right if larger, and stop on match or NULL. Insert first performs this search; if the key is absent, the new node is linked at the last comparison point.",
    "Deletion has three cases: remove a leaf, replace a one-child node with its child, or replace a two-child node with either the largest key in the left subtree or the smallest key in the right subtree. Search, insert, and delete are O(h), where h is tree height; sorted insertion can make h = n, which motivates balanced trees such as AVL, 2-3, and red-black trees.",
  ],
  "5-8": [
    "Selection trees solve the k-way merge problem: if eight already ordered sequences must be merged into one ordered sequence, repeatedly scanning all runs costs too many comparisons per output.",
    "A winner tree is a complete binary tree whose leaves represent the current front record of each run, and each internal node stores the smaller winner of its two children. The root therefore identifies the next global minimum.",
    "Initial setup costs O(k). After outputting one record, only the path from that run's leaf to the root must be rebuilt, costing O(log2 k). Merging n total records with k runs therefore costs O(n log2 k) after setup.",
  ],
  "5-9": [
    "A forest is a set of zero or more disjoint trees. Remove the root of any tree and what remains is a forest, so forests turn up whenever a problem holds several trees at once, as the sets of §5.10 do.",
    "Any forest can be stored as one binary tree: treat the roots of its trees as siblings, then apply the left-child/right-sibling rule from §5.1, so a node's left link goes to its first child and its right link to its next sibling.",
    "Forest preorder and forest inorder then visit nodes in the same order as preorder and inorder on that binary tree, so the traversal code from §5.3 works unchanged.",
  ],
  "5-10": [
    "Disjoint sets partition elements 0 through n - 1 into nonoverlapping groups. Find(i) returns the representative set containing i, and Union(i, j) merges two sets.",
    "Each set is represented as a tree stored in a parent array. A root has a negative parent value, while a non-root stores the index of its parent. simpleFind follows parent pointers to a root; simpleUnion makes one root point to the other.",
    "The improvement is weighted union: store the negative size at each root and attach the smaller tree under the larger tree. This bounds the height of a weighted-union tree by floor(log2 n) + 1. Collapsing find then compresses every node on the search path directly under the root, making repeated finds much faster.",
  ],
  "5-11": [
    "How many different binary trees have n nodes? There are 2 for n = 2 and 5 for n = 3. The same count answers two other questions: how many orderings of 1, 2, …, n can be produced by passing them through a stack, and how many ways a product of n + 1 matrices can be parenthesized.",
    "Traversal is the link. A binary tree is fixed by its preorder and inorder sequences together; if the preorder sequence is 1, 2, …, n, each distinct tree gives a distinct inorder sequence, and those are exactly the orderings a stack can produce.",
    "Splitting on the size of the left subtree gives b(n) = b(0)·b(n−1) + b(1)·b(n−2) + … + b(n−1)·b(0), and solving it gives b(n) = C(2n, n) / (n + 1), the Catalan numbers, which grow roughly like 4^n / n^1.5.",
  ],
};

const GRAPHS: Record<string, string[]> = {
  "6-1": [
    "Chapter 6 opens with Euler's Koenigsberg bridge problem, then turns it into graph terminology: vertices, edges, directed edges, paths, cycles, connected components, strongly connected components, degree, in-degree, and out-degree.",
    "The representation choice is the practical point of §6.1. An adjacency matrix answers edge-existence queries immediately but costs n^2 space and usually n^2 scans; adjacency lists store only present edges and make sparse graph work closer to O(n + e).",
    "The text also introduces inverse adjacency lists, orthogonal lists for digraphs, adjacency multilists for undirected graphs where one edge node can live in two vertex lists, and weighted networks where matrix entries or list nodes carry cost.",
  ],
  "6-2": [
    "DFS and BFS are the two traversal patterns in this section. DFS marks a start vertex, recursively follows an unvisited adjacent vertex, and backs up when it reaches a dead end; BFS marks the start vertex, then expands outward by queue layers.",
    "With adjacency lists, each undirected edge contributes two list nodes, so DFS/BFS over a connected component costs O(e) for traversal plus O(n) for outer bookkeeping. With an adjacency matrix, checking each possible neighbor pushes traversal toward O(n^2).",
    "Repeated DFS or BFS calls over still-unvisited vertices produce all connected components. When the graph is connected, the traversed edges form a DFS or BFS spanning tree; the non-tree edges are back edges, and adding one back edge to the tree creates a cycle.",
    "The same section introduces minimum-cost spanning trees through Kruskal's algorithm: consider edges in nondecreasing weight order, accept an edge only if it connects two different components, and use union-find to make the cycle test efficient.",
  ],
  "6-3": [
    "Shortest-path problems in §6.3 use directed weighted graphs, with path length defined as the sum of edge weights. The first target is single-source shortest paths with positive weights.",
    "The textbook presents Dijkstra's method as SHORTEST_PATH: maintain a set S of vertices whose shortest distances are finalized, choose the outside vertex with minimum DIST, then relax outgoing costs through that vertex. With a cost adjacency matrix the running time is O(n^2).",
    "For all-pairs shortest paths, ALL_COSTS is the Floyd-style dynamic program. A(k)(i,j) stores the best i-to-j cost using no intermediate vertex with index greater than k, giving the recurrence min(A(i,j), A(i,k) + A(k,j)) and O(n^3) time.",
    "Transitive closure asks only whether a path exists. A+ records positive-length reachability, while A* is the reflexive transitive closure with the diagonal set to one. The same triple-loop idea works with boolean or/and instead of numeric min/plus.",
  ],
  "6-4": [
    "An AOV network puts activities on vertices and precedence constraints on directed edges. A feasible AOV network must be acyclic; topological order lists each activity after all of its predecessors.",
    "TOPOLOGICAL_ORDER stores each vertex's predecessor count in the head node and uses adjacency lists for outgoing edges. Vertices whose count drops to zero are pushed onto a stack; each output vertex decrements its successors. The whole algorithm is O(n + e).",
    "An AOE network puts activities on edges and events on vertices. Critical path analysis computes earliest event times in topological order, then latest event times in reverse topological order; activities with equal earliest and latest start times are critical.",
    "The book's project-network point is operational: the minimum project duration is the longest start-to-finish path, and only speeding activities that lie on every critical path can reduce that duration.",
  ],
  "6-5": [
    "The final graph section switches from one shortest path to listing simple source-to-destination paths in nondecreasing length. This is useful when the shortest path must also satisfy extra constraints that are hard to encode in edge weights.",
    "The M_SHORTEST sketch starts with the shortest path, partitions the remaining path space by which edge of that path is first excluded while later suffix edges are required, and keeps candidate paths with their include/exclude constraints.",
    "Each iteration prints the currently shortest candidate, partitions the corresponding constrained set, and inserts the new shortest constrained paths into Q. The number of simple paths can grow factorially, so the text analyzes the cost of producing the first m paths rather than all paths.",
    "Using repeated shortest-path computations gives O(mn^3) time for the first m paths in the book's informal analysis; a heap for Q keeps candidate selection from dominating that bound.",
  ],
};

const SORTING: Record<string, string[]> = {
  "7-1": [
    "Chapter 7 begins with searching and list verification because ordered files are one of the main reasons to sort. A file is a collection of records, and the field used for lookup is the key.",
    "SEQSRCH scans sequentially and uses a dummy key K0 = K to avoid an extra end-of-file test. Successful search averages about (n + 1) / 2 comparisons, while unsuccessful search takes n + 1 comparisons in the dummy-record version.",
    "For ordered sequential files, BINSRCH repeatedly compares against the middle key and cuts the remaining subfile roughly in half, giving O(log n) key comparisons. The section also discusses Fibonacci search, which avoids division by splitting according to Fibonacci numbers.",
    "The same motivation leads to file verification: matching two unsorted files directly can cost O(mn), but sorting both files first lets VERIFY2 compare them with one linear merge-style pass after sorting.",
  ],
  "7-2": [
    "§7.2 formally defines the sorting problem. The input is a list of records R0 through Rn-1, each with a key Ki and a transitive ordering relation on keys.",
    "Sorting means finding a permutation sigma such that the records appear in nondecreasing key order. If equal-key records preserve their original relative order, the sorting method is stable.",
    "The section also separates internal sorting from external sorting. Internal sorting fits entirely in main memory; external sorting is needed when the file is too large and must be processed in pieces from disk or tape.",
    "The chapter then studies insertion sort, quick sort, merge sort, heap sort, radix sort, list/table sorts, and finally external sorting.",
  ],
  "7-3": [
    "Insertion sort repeatedly inserts the next record into an already ordered prefix. The textbook's INSERT uses a dummy record R0 with key -infinity so the inner loop does not need an explicit left-bound test.",
    "INSORT starts with R1 as the ordered prefix and inserts R2 through Rn. In the worst case, INSERT(R, i) makes i + 1 comparisons, so the full sort is O(n^2).",
    "The useful refinement is left-out-of-order behavior: if only k records are LOO, the time is O((k + 1)n). This is why insertion sort is attractive for nearly sorted inputs and very small subfiles.",
    "The method is stable because equal keys are not moved ahead of earlier equal records.",
  ],
  "7-4": [
    "Quicksort fixes one control key in its final position with respect to the whole current subfile, then sorts the left and right subfiles independently.",
    "The textbook QSORT chooses the first record in the subfile as the control key and scans inward with i and j. The lab below uses the common Lomuto variant instead: choose the last element as pivot, scan j from low to high - 1, and keep i as the boundary of values smaller than the pivot.",
    "Balanced partitions give T(n) = cn + 2T(n/2), hence O(n log n). The worst case is O(n^2), but the average time is O(n log n), and the text notes that quicksort has the best average behavior among the internal methods studied.",
    "Recursive stack space is O(log n) for balanced splits and O(n) in the worst case; sorting smaller subfiles first can keep extra stack space O(log n).",
  ],
  "7-5": [
    "§7.5 asks for an optimal sorting time lower bound: if sorting algorithms can only compare and interchange keys, how fast can any comparison sort be?",
    "The proof uses a decision tree. Each internal node is a key comparison, each branch is an outcome, and each leaf must correspond to one possible input permutation.",
    "Sorting n distinct elements requires n! different leaves. Since a binary tree of height k has at most 2^(k-1) leaves, any decision tree that sorts n distinct elements has height at least log2(n!) + 1.",
    "The result is the comparison-sorting lower bound: some input must take Omega(n log n) comparisons. This explains why merge sort, heap sort, and average-case quicksort are asymptotically optimal within the comparison model.",
  ],
  "7-6": [
    "Merge sort starts with n sorted files of length 1, merges adjacent pairs into runs of length 2, then length 4, and so on until one sorted run remains.",
    "MERGE combines two sorted subfiles in linear time by comparing the leading records. MPASS performs one pass over adjacent runs, and MSORT alternates between source array X and auxiliary array Y.",
    "The running time is O(n log n): each pass costs O(n), and there are log2 n passes. The method is stable, but the sequential-array version needs auxiliary storage proportional to n.",
    "The section is broader than a single 2-way picture: it also discusses O(1)-space merge mechanics, iterative merge sort, recursive merge sort, and using already sorted sublists as initial runs.",
  ],
  "7-7": [
    "Heap sort interprets the file R1 through Rn as the sequential representation of a complete binary tree: parent floor(i/2), left child 2i, right child 2i + 1.",
    "A max heap has every parent key at least as large as its children, so the root holds the largest key. ADJUST assumes both child subtrees already satisfy the heap property and moves the root item down until the whole subtree is a heap.",
    "HSORT first heapifies all internal nodes by calling ADJUST from floor(n/2) down to 1. It then repeatedly swaps the max root into the sorted suffix and adjusts the remaining prefix.",
    "Heap sort is O(n log n) in worst and average cases and uses only constant extra record storage, trading away merge sort's stability and auxiliary array.",
  ],
  "7-8": [
    "Radix sort treats one key as several subkeys, such as decimal digits or character positions. The text presents the linked-queue version LRSORT.",
    "The least-significant-digit method distributes records into radix queues by the current digit, then gathers the queues in order. Stability of each pass preserves the ordering created by earlier passes.",
    "With d digits and radix r, the running time is O(d(n + r)) when distribution and collection over the r queues are linear. Its usefulness depends on key length, radix choice, and record representation.",
  ],
  "7-9": [
    "List and table sorts address the cost of record movement. When records are large, physically moving whole records during every comparison or swap can dominate the sorting cost.",
    "List sort keeps records linked in sorted order by rewiring link fields. If physical rearrangement is later required, LIST1 converts the sorted singly linked list into a doubly linked list before moving records into place.",
    "LIST2 avoids the extra backward link by marking moved records through the existing link field. For table sort, an auxiliary table T stores the sorted permutation, so swaps move table entries instead of records.",
    "The TABLE algorithm physically rearranges records by following disjoint cycles of the permutation.",
  ],
  "7-10": [
    "The chapter summary emphasizes that no one internal sorting method is best for every input size and initial ordering.",
    "Insertion sort works well for small n and partially ordered lists. Quicksort has the best average behavior but O(n^2) worst-case behavior. Merge sort has the best worst-case behavior but needs more storage than heap sort.",
    "The timing table in the text suggests a composite strategy: use insertion sort for very small subfiles, quicksort for medium subfiles, and merge sort when strong large-n behavior matters.",
  ],
  "7-11": [
    "External sorting is used when the file is too large to fit in main memory. The chapter assumes disk storage and counts seek time, latency time, and block transmission time.",
    "The standard method is external merge sort: internally sort chunks into runs, write the runs to external storage, then repeatedly merge runs until one sorted file remains.",
    "Because merge only needs the leading records of each run in memory, it adapts naturally to files much larger than memory.",
  ],
  "7-11-1": [
    "The introduction to external sorting defines blocks as the unit read from or written to disk. A block normally contains several records.",
    "The worked example sorts 4500 records with memory for 750 records and block length 250, producing six initial runs and then merging them.",
    "The analysis focuses on the number of passes over the data, because each pass causes expensive disk input and output.",
  ],
  "7-11-2": [
    "k-way merging reduces the number of passes over the file by merging k runs at once instead of only two.",
    "A 2-way merge over m runs requires about log2(m) passes, while a k-way merge requires about log_k(m) passes.",
    "The tradeoff is memory: k input buffers plus output buffers reduce buffer size as k grows, and very large k can increase seek and latency overhead despite fewer passes.",
  ],
  "7-11-3": [
    "Buffer handling tries to overlap input, output, and CPU merging. A k-way merge needs at least k input buffers and one output buffer, but parallel operation benefits from 2k input buffers and two output buffers.",
    "The text shows that assigning two fixed buffers per run is not enough; buffers should float to the run that will exhaust records first.",
    "Program 7.20 keeps input buffers in queues, output buffers in rotation, and a stack of free buffers so merging can continue while disk I/O is active.",
  ],
  "7-11-4": [
    "Run generation asks how to create longer initial runs before the merge phase. Longer runs mean fewer later passes over external storage.",
    "The chapter's replacement-selection style discussion uses internal memory to produce runs longer than a simple memory-sized chunk when the input order allows it.",
    "The goal is not a new comparison sort, but better external-sort throughput by reducing the number of runs that must be merged.",
  ],
  "7-11-5": [
    "Optimal merging of runs chooses a merge pattern that minimizes total merge cost when run lengths differ.",
    "The problem is analogous to optimal merge patterns and Huffman-style combining: repeatedly merge small runs first to reduce total record movement.",
    "This section closes the external sorting discussion by connecting run lengths, merge order, and I/O cost.",
  ],
  "7-12": [
    "The references section points to further work on internal and external sorting algorithms, including implementation and empirical performance studies.",
    "Use it as a reading list once the sections above are familiar.",
  ],
  "7-13": [
    "The additional exercises ask for implementation, timing, worst-case data generation, random permutation tests, and comparison/exchange counting.",
    "They are designed to make the summary concrete: the best practical sorting method depends on n, input order, record movement cost, memory, and I/O behavior.",
  ],
};

const HASH_TABLE: Record<string, string[]> = {
  "8-1": [
    "A symbol table stores pairs of the form (identifier, attributes). The ADT supports search, insert, and delete, with other operations such as modify and join built around those basics.",
    "The chapter motivates hashing as an alternative to comparison-based search trees. Instead of walking by key comparisons, hashing computes a table address from the identifier.",
    "The chapter is split into static hashing, where the table size is fixed, and dynamic hashing, where pages can split and coalesce as a database file grows or shrinks.",
  ],
  "8-2": [
    "Static hashing stores identifiers in a fixed-size hash table. A hash function f(x) maps each identifier x to a home bucket address.",
    "A table has b buckets and each bucket has s slots. Identifier density is n / T, where T is the universe of possible identifiers; loading factor is alpha = n / (s * b).",
    "Because b is much smaller than the identifier universe, several identifiers can map to the same bucket. These synonyms create collisions, and an overflow occurs when a new identifier hashes into a full bucket.",
  ],
  "8-2-1": [
    "The text's first hash-table example uses b = 26 buckets and s = 2 slots per bucket for C library names: acos, define, float, exp, char, atan, ceil, floor, clock, and ctime.",
    "The simple hash function uses the first character: a maps to bucket 0, c to bucket 2, d to bucket 3, and so on. This makes acos and atan synonyms, float and floor synonyms, and char and ceil synonyms.",
    "After char and ceil fill bucket 2, clock also hashes to bucket 2 and overflows. This concrete overflow is the bridge into the collision-handling techniques in §8.2.3.",
  ],
  "8-2-2": [
    "A good hash function should be easy to compute and should minimize collisions. The text calls a hash function uniform when every bucket is equally likely for a randomly selected identifier.",
    "The four methods discussed are mid-square, division, folding, and digit analysis. Mid-square takes middle bits from x squared; division uses x % M; folding adds partitions of the key; digit analysis keeps the least skewed digit positions in a known static file.",
    "For general-purpose symbol tables, the text prefers division with a divisor M chosen carefully. M should not be a power of two, and in practice it is enough to choose M with no prime factors less than 20.",
  ],
  "8-2-3": [
    "Overflow handling first appears through linear open addressing. The table is a one-dimensional array, and an insertion probes f(x), then f(x) + 1, f(x) + 2, and so on modulo the table size until it finds the key, an empty slot, or a full-table cycle.",
    "The worked 13-bucket example transforms keys by summing character codes. The words for, do, while, if, and else enter directly, but function hashes to the same bucket as if and is placed at bucket 0 by circular probing.",
    "Linear probing creates clusters. Quadratic probing and rehashing reduce clustering, while chaining stores a linked list of synonyms for each home bucket so unrelated buckets are not scanned.",
  ],
  "8-2-4": [
    "The theoretical evaluation separates expected behavior from the bad worst case. In the worst case, a hash-table insertion can take O(n) time if many identifiers collide.",
    "Under uniform hashing, the expected number of probes depends strongly on the loading density alpha and the overflow method. Chaining has expected successful-search comparisons near 1 + alpha / 2.",
    "The empirical table in the chapter compares mid-square, division, folding, digit analysis, chaining, and open addressing. Chaining generally performs better than open addressing at high load, and division is the preferred general-purpose hash function.",
  ],
  "8-3": [
    "Dynamic hashing targets database files whose size changes over time. A static table either wastes space when overallocated or needs expensive restructuring when it fills.",
    "The chapter uses pages, also called buckets, with capacity p. The main cost is page access, because pages are assumed to live on disk.",
    "Dynamic hashing, also called extendible hashing, preserves fast lookup while letting the file grow and shrink by splitting and coalescing pages.",
  ],
  "8-3-1": [
    "Directory dynamic hashing maps a binary trie into a directory of page pointers. If k bits distinguish the current keys, the directory has 2^k entries.",
    "Lookup uses the hash function to choose a directory entry, then retrieves the page pointed to by that entry. This keeps page access to two steps: directory, then page.",
    "When a page overflows, the system allocates a new page, rehashes records using one more bit, and doubles the directory only if the page's local depth exceeds the current global depth.",
  ],
  "8-3-2": [
    "The key guarantee of directory dynamic hashing is bounded access time: lookup does not walk down a long trie because the directory collapses the trie into direct page pointers.",
    "Space utilization is measured as n / (m * p), where n is the number of records, m the number of pages, and p the page capacity.",
    "The tradeoff is directory size. If keys are not spread uniformly, many directory entries can point to the same pages and the directory can become large.",
  ],
  "8-3-3": [
    "Directoryless dynamic hashing, also called linear hashing, avoids a separate directory by mapping hash addresses directly to a contiguous set of pages.",
    "As the file expands, pages split in a controlled order. Pages before the split pointer use one more hash bit than pages that have not yet split.",
    "The method grows by adding one page at a time instead of doubling a directory, but overflow pages can still exist temporarily when a particular page receives too many synonyms.",
  ],
  "8-4": [
    "The references section points to classic work on hash tables, quadratic quotient hashing, extendible hashing, virtual hashing, and dynamic hashing schemes.",
    "Before the exercises, go back over the static and dynamic labs above and compare the overflow strategies.",
  ],
};

const HEAP_CH: Record<string, string[]> = {
  "9-1": [
    "Chapter 9 starts with double-ended priority queues: insert an arbitrary key, delete the minimum key, and delete the maximum key. A normal min heap or max heap supports only one deletion direction, so the chapter introduces structures that support both or that make merging priority queues efficient.",
    "The first structure is the min–max heap. It keeps the complete-tree array layout from ordinary heaps, but alternates min levels and max levels so the root exposes the minimum and a top max level exposes the maximum.",
  ],
  "9-1-1": [
    "A min–max heap is a complete binary tree whose root is on a min level. At a min-level node, the node stores the minimum key in its subtree; at a max-level node, it stores the maximum key in its subtree.",
    "Because the tree is complete, it uses the same array representation as the binary heaps from Chapter 5. The new invariant is not parent-versus-child only; a value must be checked against ancestors on matching min or max levels.",
  ],
  "9-1-2": [
    "Insertion first appends a new leaf, preserving the complete tree shape. The inserted key is compared with its parent to decide whether it belongs on the min-level path or the max-level path.",
    "If the new key violates the parent side, the parent moves down and the item is verified against grandparents on alternating levels. Only one rootward path is touched, so insertion remains O(log n).",
  ],
  "9-1-3": [
    "Deleting the minimum removes the root, then uses the last leaf value to repair the hole. The algorithm repeatedly chooses an appropriate child or grandchild so the min-level invariant is restored while the empty position moves downward.",
    "The final displaced value is inserted into the last hole with local checks against parent and grandchildren. The delete-max operation is symmetric on the max side of the top levels.",
  ],
  "9-2": [
    "A deap is another double-ended priority queue. It is a complete binary tree with an empty root, a min heap on the left, a max heap on the right, and partner links that connect corresponding positions across the two sides.",
    "The cross-side ordering rule says each min-side key is less than or equal to its max partner. That rule lets the structure expose both extremes while still using heap-style root-to-leaf repair paths.",
  ],
  "9-2-1": [
    "In a deap, position 1 is unused. The left subtree is the min heap, the right subtree is the max heap, and every node on one side has a corresponding partner on the other side when the shape permits.",
    "The partner relationship is the extra invariant beyond the two ordinary heap properties: min-side items must not exceed their max-side partners.",
  ],
  "9-2-2": [
    "Insertion appends the new item at the next complete-tree position, then determines whether that position lies on the min side or the max side. The item is compared with its partner on the opposite side.",
    "If the partner invariant is violated, the partner item moves into the new position and the inserted item is routed into the opposite heap. Otherwise it is inserted into the heap side where the new position already belongs. The height bound keeps the time O(log n).",
  ],
  "9-2-3": [
    "Delete-min removes the min-side root. The algorithm moves the smaller child upward along the min heap until a leaf hole is reached, then inserts the last deap item into that hole while checking its max partner.",
    "Delete-max is symmetric. The chapter compares min–max heaps and deaps through worst-case comparison counts and empirical exercises.",
  ],
  "9-3": [
    "Leftist trees extend priority queues in a different direction: they support combine, which merges two priority queues into one. Ordinary binary heaps need O(n) time to combine, but leftist trees combine in O(log n).",
    "The leftist invariant uses shortest(x), the length of the shortest path from x to an external node. Every internal node keeps shortest(left child) >= shortest(right child), so the rightmost path is logarithmically short.",
    "A min-leftist tree is both a leftist tree and a min tree. Insert combines the current tree with a one-node tree; delete-min combines the old root's left and right subtrees.",
  ],
  "9-4": [
    "Binomial heaps support insert, combine, and delete-min using a collection of min-trees. The chapter calls these B-heaps and represents root lists and sibling lists with circular doubly linked lists.",
    "The important shift is amortized analysis: an individual operation can be expensive, but over a sequence the charged cost stays small.",
  ],
  "9-4-1": [
    "Cost amortization moves part of an expensive operation's cost onto earlier cheap operations, as long as the total charged cost still covers total actual cost.",
    "The chapter uses this accounting view to explain how a priority-queue structure can have occasional costly delete-min work while still giving a strong bound over a long operation sequence.",
  ],
  "9-4-2": [
    "A min-binomial heap is a collection of min-trees. Each node stores its degree, one child pointer, left and right sibling links, and data.",
    "The roots of the component min-trees form a circular doubly linked list. Children of a node also form a circular sibling list.",
  ],
  "9-4-3": [
    "Insertion into a binomial heap is cheap because a new item can start as a one-node min-tree and be added to the root list.",
    "The later consolidation work is charged through the amortized analysis rather than paid eagerly on every insert.",
  ],
  "9-4-4": [
    "Combine joins the root lists of two B-heaps. This gives the mergeable-heap operation that ordinary array heaps lack.",
    "The operation is intentionally inexpensive in the representation; structural cleanup is handled during delete-min and analyzed over operation sequences.",
  ],
  "9-4-5": [
    "Delete-min finds and removes the root with the smallest key, then joins its child trees back into the heap and combines equal-degree trees as needed.",
    "The work resembles binary carrying: when two trees of the same degree appear, one becomes a child of the other so each degree is represented in a controlled way.",
  ],
  "9-4-6": [
    "The binomial-heap analysis bounds sequences of insert, combine, and delete-min operations. Insert and combine can be O(1) amortized; delete-min is O(log n) amortized.",
    "This section is the bridge from concrete pointer operations to the more aggressive Fibonacci heap bounds in §9.5.",
  ],
  "9-5": [
    "Fibonacci heaps generalize the binomial-heap idea by delaying more restructuring. They support insert and combine cheaply, and they make decrease-key especially efficient in amortized terms.",
    "The tradeoff is implementation complexity: lazy cuts, marked nodes, and later consolidation replace the simpler eager shape discipline of binary heaps.",
  ],
  "9-5-1": [
    "An F-heap is a collection of heap-ordered trees with a pointer to the current minimum. It does not force the same rigid degree structure after every update.",
    "That looseness is deliberate. The heap postpones consolidation so cheap operations stay cheap.",
  ],
  "9-5-2": [
    "Deleting from an F-heap removes the minimum root, promotes its children into the root list, and then consolidates roots so degree growth stays controlled.",
    "This is where much of the delayed structural cost is paid.",
  ],
  "9-5-3": [
    "Decrease-key lowers a node's key. If the new key violates heap order with its parent, the node is cut from its parent and moved to the root list.",
    "This operation is central to graph algorithms with many priority decreases.",
  ],
  "9-5-4": [
    "Cascading cut is the rule that keeps lazy decrease-key from damaging the heap too much. After a child is cut, a marked parent may also be cut and moved upward.",
    "The mark records whether a node has already lost a child since becoming a child itself.",
  ],
  "9-5-5": [
    "The amortized analysis for Fibonacci heaps shows excellent sequence bounds: cheap insert/combine behavior, logarithmic delete-min, and very low amortized decrease-key cost.",
    "The proof relies on the potential stored in roots and marked nodes.",
  ],
  "9-5-6": [
    "The textbook highlights Fibonacci heaps because their decrease-key bound improves theoretical running times for algorithms such as Dijkstra's shortest paths when many relaxations occur.",
    "In practice, simpler heaps often win on constants, but the structure shows what the priority-queue interface can achieve asymptotically.",
  ],
  "9-6": [
    "The references section points outward from the chapter's heap structures. Use it as a review stop: compare which structures optimize double-ended deletion, merge, decrease-key, or amortized sequence behavior.",
  ],
};

const BST_ADV: Record<string, string[]> = {
  "10-1": [
    "Optimal binary search trees model a static identifier set: the table is known, no insertions or deletions occur, and searches have known success and failure probabilities.",
    "The cost measure counts levels for successful searches and external failure nodes for unsuccessful searches. Dynamic programming computes the tree with minimum expected cost, using Knuth's range restriction to reduce the table computation to O(n^2).",
  ],
  "10-2": [
    "AVL trees are dynamic binary search trees balanced by subtree height. Every node has balance factor -1, 0, or 1, where the factor is left height minus right height.",
    "Insertion is ordinary BST insertion followed by local repair. The four rotation cases are LL, RR, LR, and RL, classified by the nearest ancestor whose balance factor becomes ±2.",
    "The minimum-node recurrence for height-balanced trees follows Fibonacci growth, so AVL tree height is O(log n) and search, insert, and delete remain logarithmic in the worst case.",
  ],
  "10-3": [
    "A 2–3 tree is a balanced search tree whose internal nodes are either 2-nodes with one key and two children or 3-nodes with two keys and three children. All external nodes stay at the same level.",
    "Searching chooses among child intervals inside each node. Insertion and deletion preserve balance through splitting, promotion, rotation, and combining.",
    "The operations are logarithmic because every root-to-leaf path has the same length.",
  ],
  "10-4": [
    "A 2–3–4 tree extends 2–3 trees by allowing 4-nodes with three keys and four children. It keeps all external nodes on the same level.",
    "The main advantage over 2–3 trees is top-down update. Splitting 4-nodes on the way down guarantees the final leaf has room, avoiding a backward restructuring pass for insertion.",
    "Deletion uses the same top-down idea in reverse: before descending, ensure the child to be visited is not a 2-node by rotating or combining with a sibling.",
  ],
  "10-5": [
    "A red-black tree is a binary-tree representation of a 2–3–4 tree. Black links represent original 2–3–4 tree child pointers, while red links connect binary nodes that together encode a 3-node or 4-node.",
    "The resulting binary search tree has equal black-link counts on all root-to-external paths and no two consecutive red links. Its height is at most twice a logarithmic bound.",
    "Searching ignores colors and behaves like ordinary BST search. Updates use recoloring and rotations, either top-down by splitting 4-nodes during descent or bottom-up after insertion.",
  ],
  "10-6": [
    "B-trees are high-degree balanced search trees designed for indexes that live on disk. The goal is not only O(log n) comparisons, but a very small number of disk accesses.",
    "A B-tree of order m is an m-way search tree whose nonroot nodes are at least half full and whose failure nodes are all on the same level.",
  ],
  "10-6-1": [
    "An m-way search tree stores multiple keys in each node and uses the intervals between those keys to choose among up to m subtrees.",
    "AVL, 2–3, and 2–3–4 trees can be viewed as low-degree search trees; B-trees raise the degree to reduce external-memory access.",
  ],
  "10-6-2": [
    "Searching an m-way search tree retrieves a node, finds the interval containing the target key, and descends through the matching subtree pointer.",
    "If a node has few keys, sequential scan is adequate. If it has many keys, binary search inside the node reduces CPU work, but disk access count is still governed by tree height.",
  ],
  "10-6-3": [
    "A B-tree of order m requires the root to have at least two children when nonempty, every other nonfailure node to have at least ceil(m/2) children, and all failure nodes to be at the same level.",
    "Large order keeps height small. The text analyzes node size, seek time, latency, and transfer time to choose m near the flat minimum of expected search time.",
  ],
  "10-6-4": [
    "B-tree insertion first searches to the leaf where the new key belongs. If the leaf overflows, it splits and promotes a separator key to the parent.",
    "Splitting can propagate up to the root; a root split creates a new root and increases tree height by one. With large m, average split frequency is low.",
  ],
  "10-6-5": [
    "B-tree deletion reduces deletion from an internal node to deletion from a leaf by replacing the key with a predecessor or successor from a leaf.",
    "If a leaf becomes deficient, the algorithm first tries rotation with a nearby sibling; if that is impossible, it combines nodes and may propagate the deficiency upward.",
    "The section also describes lazy deletion with delete bits, trading disk space for fewer restructuring writes.",
  ],
  "10-6-6": [
    "Variable-size keys complicate in-node binary search and storage management. The text recommends fixed-size nodes and enough space for the largest expected keys when the range is small.",
    "For larger variation, node formats may include key-address tables, or keys may be sampled or truncated with synonym handling.",
  ],
  "10-7": [
    "Splay trees are ordinary binary search trees followed by a splay after every successful search, insertion, or deletion. The splay rotates the accessed or affected node to the root.",
    "The rotations are zig, zig-zig, and zig-zag variants. Unlike AVL or red-black trees, no balance factor or color is stored.",
    "The guarantee is amortized: a sequence of operations on a splay tree costs O(log n) per operation on average over the sequence, using a potential argument based on subtree sizes.",
  ],
  "10-8": [
    "Digital search structures branch on bits of the key rather than comparing the whole key at every node. This is useful when key comparisons are expensive or keys have predictable bit structure.",
    "The chapter moves from digital search trees to binary tries, compressed binary tries, and Patricia.",
  ],
  "10-8-1": [
    "A digital search tree stores one element per node. At level i, bit i of the search key chooses left for 0 or right for 1.",
    "Search, insert, and delete resemble ordinary BST operations, but the branch decision comes from a key bit rather than comparing the whole key with the current node's key.",
  ],
  "10-8-2": [
    "A binary trie separates branch nodes from element nodes. Branch nodes contain left and right pointers; element nodes hold the actual data.",
    "A successful search follows bits until it reaches an element node, then performs the single key comparison. Degree-one branch nodes can be compressed away by storing a bit-number field.",
  ],
  "10-8-3": [
    "Patricia represents a compressed binary trie using augmented branch nodes. The head node has bit number zero, and pointers that move to a node with a nonincreasing bit number behave like element pointers.",
    "Search follows bit-number tests without comparing full keys until the final candidate node. Insertion finds the first differing bit between the new key and the candidate key, then splices in a new augmented branch node.",
  ],
  "10-9": [
    "A trie generalizes binary tries to degree m. Branching at each level is determined by a sampled portion of the key, often one character at a time.",
    "The structure is especially useful for variable-length string keys because common prefixes share paths and a blank character can distinguish a key from its extension.",
  ],
  "10-9-1": [
    "A trie has branch nodes containing pointer arrays and element nodes containing actual keys and record information. In the book's alphabet example, branch nodes use 27 links: one for each letter plus a blank.",
    "At level j, the jth sampled character chooses the next link. When a subtrie contains only one key, the subtrie can be represented by an element node.",
  ],
  "10-9-2": [
    "Searching a trie decomposes the key into sampled characters and follows the matching links. The full key is checked only when an element node is reached.",
    "The worst-case time is O(l), where l is the number of trie levels traversed.",
  ],
  "10-9-3": [
    "Sampling strategy determines trie height. Sampling left-to-right, right-to-left, randomized positions, or alternating positions can produce very different shapes for the same key set.",
    "The optimal sampling function is data dependent and hard to choose dynamically, so practical designs use simple robust sampling or limit the number of levels and pack synonyms into element nodes.",
  ],
  "10-9-4": [
    "Insertion searches for the new key. If it reaches a missing pointer, the new element node is attached there.",
    "If it reaches a different element key, branch nodes are introduced until the two keys differ at the sampled position, then the old and new element nodes are placed under different links.",
  ],
  "10-9-5": [
    "Deletion removes the target element and then collapses branch nodes that no longer separate multiple keys.",
    "A count field on branch nodes helps determine when a branch node has become unnecessary. Compressed tries add skip information to remove one-child branch nodes.",
  ],
  "10-10": [
    "Differential files address indexed-file recovery and update cost. Instead of rewriting a large master file on every update, changed records can be stored in a smaller differential file with logging.",
    "When the master index is manageable, it can point to either master-file or differential-file records. When both index and file are large, a differential index tracks updates, deletes, and inserts while the master index remains unchanged.",
    "A Bloom filter can reduce extra index lookups: a no answer proves the key is not in the differential index, while maybe triggers a differential-index search before falling back to the master index.",
  ],
  "10-11": [
    "The references section closes the chapter's survey of search structures. Use it as a map of tradeoffs: static optimality, strict height balance, multiway disk indexes, amortized self-adjustment, bitwise branching, string-key tries, and update logs solve different search-table pressures.",
  ],
};

/** What each chapter is for and how it follows from the ones before: shown under the chapter title. */
const INTROS: Record<string, string> = {
  "basic-concepts":
    "Every later chapter makes the same three moves: state what an operation must do, choose a representation, and count what it costs. This chapter sets up the vocabulary for each move (specification, abstraction, analysis) so that the structures from Chapter 2 on can be compared on equal terms.",
  arrays:
    "Arrays are the first representation: one block of memory, addressed by index. The chapter starts from the array as an abstract type, then shows how records, sparse matrices, multidimensional arrays and strings are all laid out on that one block. The cost analysis of Chapter 1 is what tells the layouts apart.",
  "stack-queue":
    "A stack and a queue are arrays (Chapter 2) with a rule about which end you may touch. That one restriction is enough to drive expression evaluation and maze search, the two applications worked through here.",
  "linked-list":
    "Arrays make an insertion in the middle expensive, because everything after it has to move (Chapter 2). A linked list gives up indexed access so that the same insertion is a few pointer updates. The chapter builds the singly linked chain first, reuses it for stacks, queues and polynomials, and adds a second link once walking backwards matters.",
  trees:
    "A list (Chapter 4) is one-dimensional: each node has one successor. Give a node several successors and you have a tree. After the vocabulary and the binary tree, the chapter follows three uses of the shape: priorities (heaps), ordered data (search trees), and groupings (forests and sets).",
  graphs:
    "A tree (Chapter 5) has exactly one path between any two nodes. A graph drops that restriction, and the questions change: can I get there at all, what is the cheapest way, and in what order can dependent tasks run? Each section answers one of them, reusing the stacks, queues and union–find of earlier chapters.",
  sorting:
    "Sorting is where the cost analysis of Chapter 1 is argued most carefully. The chapter first shows why sorted order is worth having, then works through one method per idea (insert, partition, merge, heap, digit by digit), proves that no comparison sort can beat n log n, and ends with files too big for memory.",
  "hash-table":
    "The search trees of Chapter 5 find a key by comparing it with others. Hashing computes where the key should be and looks there. The first half of the chapter fixes the table size and deals with keys that collide; the second half lets the table grow with the file.",
  heap:
    "The heap of §5.6 answers one question, what is the largest, and cannot be merged with another heap cheaply. Each structure here removes one of those limits: min–max heaps and deaps answer for both ends, leftist trees merge, and binomial and Fibonacci heaps make a sequence of operations cheap on average.",
  "binary-search-trees":
    "A binary search tree (§5.7) is fast only while it stays shallow, and nothing keeps it shallow. Most of this chapter is ways of guaranteeing that: by rotating (AVL, red-black, splay), by letting a node hold several keys (2–3, 2–3–4, B-trees), or by branching on the key's digits instead of comparing it (digital trees and tries).",
};

/** One sentence that carries the reader from the section before into this one. */
const BRIDGES: Record<string, string> = {
  "1-2": "With the life cycle in view, the first step is saying precisely what a program must do.",
  "1-3": "Specifying one algorithm at a time does not scale. Abstraction groups data with the operations allowed on it.",
  "1-4": "Two implementations of one abstract type can both be correct. What separates them is cost.",
  "1-5": "Analysis predicts how cost grows. Measurement checks the prediction on a real machine.",
  "2-2": "An array holds many values of one type. A structure holds a few values of different types, and the two combine.",
  "2-3": "A matrix is a two-dimensional array, but when most entries are zero, storing all of them wastes the block.",
  "2-4": "Sparse storage sidestepped the question of layout. A dense array of two or more dimensions has to answer it: which element sits where in the single block?",
  "2-5": "A string is an array of characters with operations of its own.",
  "3-2": "Start with the restricted list that is easiest to build: all activity at one end.",
  "3-3": "Move removals to the opposite end from insertions, and the stack becomes a queue.",
  "3-4": "The first real use of a stack: holding operands until their operator arrives.",
  "3-5": "The second use: remembering the way back. A stack of positions is what lets a search retreat from a dead end.",
  "3-6": "So far each stack has had an array to itself. Several stacks sharing one array need a plan for the free space.",
  "4-2": "The picture of boxes and arrows needs a concrete type in C.",
  "4-3": "§3.6 fitted several stacks into one array and had to shuffle them when one filled. With links, each stack simply grows on its own.",
  "4-4": "A polynomial is a list of terms, and most possible terms are absent: a natural fit for a chain.",
  "4-5": "Three more operations (reversing, concatenating, and closing the chain into a ring) complete the singly linked toolkit.",
  "4-6": "An application that needs many small lists at once: grouping elements that have been declared equivalent.",
  "4-7": "§2.3 stored a sparse matrix as an array of triples, which is awkward once entries are added and removed. Links fix that.",
  "4-8": "Every list so far can only be walked forwards. Deleting the node you are pointing at needs its predecessor, which is the case for a second link.",
  "5-2": "The left-child/right-sibling form showed that two links per node are enough. Trees with at most two children are therefore the case worth studying in detail.",
  "5-3": "A tree has no obvious first-to-last order. A traversal chooses one.",
  "5-4": "Copying and comparing trees are traversals with different work at each visit.",
  "5-5": "Traversal needs a stack because half the links in a tree are NULL and lead nowhere. Threads put those links to work.",
  "5-6": "From here on the binary tree is used to solve problems. First: always knowing the largest element.",
  "5-7": "A heap finds only the extreme. To find any key, order the tree left to right instead of top to bottom.",
  "5-8": "A third use of the complete binary tree: running a tournament between k sorted runs.",
  "5-9": "Back to general trees, and to several of them side by side.",
  "5-10": "A forest in which the only question is “which tree am I in?” gives a very fast way to track disjoint sets.",
  "5-11": "The chapter ends with a counting question that ties traversals, stacks and tree shapes together.",
  "6-2": "With a representation chosen, the first algorithm is simply visiting everything reachable.",
  "6-3": "Traversal ignores edge weights. Put costs on the edges and “reachable” becomes “reachable how cheaply”.",
  "6-4": "When an edge means “must come before”, the graph is a project plan, and the questions are about order and time.",
  "6-5": "Sometimes the single shortest path is not acceptable and the next best ones are needed.",
  "7-2": "Searching showed what sorted order buys. Now the problem of producing it, stated exactly.",
  "7-3": "The simplest method: grow a sorted prefix one record at a time.",
  "7-4": "Insertion sort moves a record one position at a time. Quick sort moves records long distances by partitioning.",
  "7-5": "Quick sort averages n log n. Could a cleverer comparison sort do better?",
  "7-6": "Merge sort meets that lower bound in the worst case too, at the price of extra space.",
  "7-7": "Heap sort keeps the n log n worst case and gives the extra space back, using the heap of §5.6.",
  "7-8": "The lower bound applies only to sorts that compare whole keys. Radix sort looks at one digit at a time and escapes it.",
  "7-9": "Every method so far moves records. When records are large, sort their links or an index instead.",
  "7-10": "Six methods, each best somewhere.",
  "7-11": "Everything above assumed the file fits in memory. When it does not, disk access dominates and merging takes over.",
  "8-2": "The simplest setting first: a table whose size is fixed in advance.",
  "8-3": "A fixed table is either too big or eventually too small. Dynamic hashing lets it grow a page at a time.",
  "9-2": "A second way to serve both ends: keep a min-heap and a max-heap side by side in one tree.",
  "9-3": "Both structures above live in arrays, so merging two of them means rebuilding. Leftist trees use links, and merge in logarithmic time.",
  "9-4": "A leftist tree pays log n for every operation. Binomial heaps let most operations be cheap, as long as cost is measured over a sequence.",
  "9-5": "Fibonacci heaps push the same laziness further and add a cheap decrease-key.",
  "10-2": "An optimal tree needs every key and probability in advance. When keys arrive one at a time, the tree has to rebalance itself as it goes.",
  "10-3": "AVL trees stay balanced by rotating. A different idea: let a node hold more than one key, so the tree can absorb an insertion without getting deeper.",
  "10-4": "Allow one more key per node, and an insertion can be done in a single pass down the tree.",
  "10-5": "Nodes of three sizes are awkward to program. A red-black tree stores the same tree in ordinary binary nodes with one colour bit each.",
  "10-6": "Take the multiway idea to its limit, hundreds of keys per node, and the tree is shallow enough to live on disk.",
  "10-7": "Every balanced tree so far stores extra information to stay balanced. A splay tree stores none and still does well on average.",
  "10-8": "All the trees above compare whole keys. The remaining structures look at the key's bits or characters instead.",
  "10-9": "Branch on a character rather than a bit, and the binary trie becomes the trie used for strings.",
  "10-10": "Last, a practical problem around any large index: how to update it without rewriting it.",
};

export const getChapterIntro = (topic: Topic): string | null => INTROS[topic.id] ?? null;
export const getSectionBridge = (section: BookOutlineItem): string | null => BRIDGES[section.id] ?? null;

/** Every phase-1 topic id → section id → paragraphs (English UI). */
const BY_TOPIC: Record<string, Record<string, string[]>> = {
  "basic-concepts": BASIC_CONCEPTS,
  arrays: ARRAYS,
  "stack-queue": STACK_QUEUE,
  "linked-list": LINKED_LIST,
  trees: TREES,
  graphs: GRAPHS,
  sorting: SORTING,
  "hash-table": HASH_TABLE,
  heap: HEAP_CH,
  "binary-search-trees": BST_ADV,
};

export function getSectionProse(topic: Topic, section: BookOutlineItem): string[] {
  const block = BY_TOPIC[topic.id]?.[section.id];
  if (block?.length) return block;
  return fallback(topic, section);
}

// Pure model for the trie (Horowitz §10.9). Branch nodes sample one letter of the key per level;
// a subtrie that holds a single key is an element node carrying that key. A key that ends where
// another goes on hangs from the blank link. Each operation returns the frames the gantry plays.

import type { TreeFrame, TreeNode } from "./types";

export const MAX_LETTERS = 8;
/** How much rail the element plates may take up: the gantry is full when the words no longer fit side by side. */
const RAIL = 262;
const BLANK = "_";

export const widthOf = (word: string) => Math.max(25, word.length * 5 + 12);
export const fits = (words: string[]) => words.reduce((sum, word) => sum + widthOf(word), 0) <= RAIL;
export const clean = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "").slice(0, MAX_LETTERS);

const leaf = (word: string) => `w${word}`;
/** The letter a branch at this depth samples; a word that has run out gives the blank. */
const sample = (word: string, depth: number) => word[depth] ?? BLANK;

export function nodesOf(words: string[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const grow = (group: string[], depth: number, parent: string | null, port: number, via: string | undefined, prefix: string) => {
    if (group.length === 1) {
      nodes.push({ id: leaf(group[0]!), kind: "plate", cells: [group[0]!], parent, port, ports: 0, via });
      return;
    }
    const links = [...new Set(group.map((word) => sample(word, depth)))].sort((a, b) => (a === BLANK ? -1 : b === BLANK ? 1 : a < b ? -1 : 1));
    const id = `b${prefix}`;
    nodes.push({ id, kind: "bead", cells: [String(depth + 1)], parent, port, ports: links.length, via });
    links.forEach((link, at) => grow(group.filter((word) => sample(word, depth) === link), depth + 1, id, at, link, prefix + link));
  };
  const sorted = [...new Set(words)].sort();
  if (sorted.length) grow(sorted, 0, null, 0, undefined, "");
  return nodes;
}

/** The nodes a search for `word` visits, top first, and whether it ran off a branch with no link for its letter. */
function pathOf(nodes: TreeNode[], word: string): { path: TreeNode[]; fell: boolean } {
  const path: TreeNode[] = [];
  let at = nodes.find((node) => node.parent === null);
  while (at) {
    path.push(at);
    if (at.kind !== "bead") return { path, fell: false };
    const link = sample(word, Number(at.cells[0]) - 1);
    const here: string = at.id;
    at = nodes.find((node) => node.parent === here && node.via === link);
  }
  return { path, fell: true };
}

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const said = (link: string) => (link === BLANK ? "blank" : `“${link}”`);

export function restOf(words: string[]): TreeFrame {
  const nodes = nodesOf(words);
  return { nodes, note: `${words.length} ${words.length === 1 ? "key" : "keys"} · ${nodes.filter((node) => node.kind === "bead").length} branch nodes`, count: 0, pointer: null };
}

export interface Played {
  frames: TreeFrame[];
  words: string[];
  note: string;
  found: boolean;
}

/** The frames of walking down to where `word` is or would be; the counter counts links followed. */
function walk(nodes: TreeNode[], word: string): { frames: TreeFrame[]; path: TreeNode[]; fell: boolean } {
  const { path, fell } = pathOf(nodes, word);
  const frames: TreeFrame[] = [];
  path.forEach((at, index) => {
    if (at.kind !== "bead") return;
    const level = Number(at.cells[0]);
    const link = sample(word, level - 1);
    const last = fell && index === path.length - 1;
    frames.push({
      nodes,
      on: [at.id],
      count: index + (last ? 0 : 1),
      hold: 0.6,
      note: last ? `no ${said(link)} link at level ${level}` : `${ordinal(level)} letter of ${word} is ${said(link)}: follow it`,
    });
  });
  return { frames, path, fell };
}

export function search(words: string[], word: string): Played {
  const nodes = nodesOf(words);
  if (!nodes.length) return { frames: [], words, note: "The trie is empty.", found: false };
  const { frames, path, fell } = walk(nodes, word);
  const end = path[path.length - 1]!;
  const links = path.length - 1;
  if (fell) return { frames, words, found: false, note: `${word} is not there: the branch at level ${end.cells[0]} has no link for its ${ordinal(Number(end.cells[0]))} letter. No whole key was compared.` };
  const found = end.id === leaf(word);
  frames.push({ nodes, on: [end.id], lit: found ? end.id : null, count: links, note: found ? `${word} = ${end.cells[0]}: found` : `${word} ≠ ${end.cells[0]}: not there` });
  return {
    frames,
    words,
    found,
    note: found ? `Found ${word} after ${links} ${links === 1 ? "link" : "links"} and one whole-key comparison.` : `${word} is not there: ${links} ${links === 1 ? "link" : "links"} led to ${end.cells[0]}, and one comparison showed it is a different key.`,
  };
}

export function insert(words: string[], word: string): Played {
  if (!word) return { frames: [], words, note: "Type a word of letters first.", found: false };
  if (words.includes(word)) return { frames: [], words, note: `${word} is already there.`, found: true };
  const next = [...words, word].sort();
  if (!fits(next)) return { frames: [], words, note: "The gantry is full: delete a key first.", found: false };
  const before = nodesOf(words);
  const after = nodesOf(next);
  const { frames, path, fell } = before.length ? walk(before, word) : { frames: [], path: [], fell: true };
  const added = after.filter((node) => node.kind === "bead" && !before.some((old) => old.id === node.id));
  const end = path[path.length - 1];
  const links = pathOf(after, word).path.length - 1;
  if (!fell && end) frames.push({ nodes: before, on: [end.id], count: path.length - 1, hold: 0.7, note: `${end.cells[0]} is already here: branch until the two differ` });
  frames.push({ nodes: after, lit: leaf(word), on: added.map((node) => node.id), count: links, note: added.length ? `${added.length} new branch ${added.length === 1 ? "node" : "nodes"} separate${added.length === 1 ? "s" : ""} them` : `${word} hangs from the empty link` });
  return {
    frames,
    words: next,
    found: true,
    note:
      fell || !end
        ? `Inserted ${word}: its link was empty, so it became an element node at once.`
        : `Inserted ${word}: it met ${end.cells[0]}, and ${added.length} branch ${added.length === 1 ? "node was" : "nodes were"} added, down to the first letter where they differ.`,
  };
}

export function remove(words: string[], word: string): Played {
  const found = search(words, word);
  if (!found.found) return { ...found, note: `${word} is not there, so nothing was deleted.` };
  const next = words.filter((other) => other !== word);
  const before = nodesOf(words);
  const after = nodesOf(next);
  const gone = before.filter((node) => node.kind === "bead" && !after.some((kept) => kept.id === node.id));
  const frames = [...found.frames];
  if (gone.length) frames.push({ nodes: before, lit: leaf(word), on: gone.map((node) => node.id), hold: 0.7, note: `without ${word}, ${gone.length} branch ${gone.length === 1 ? "node separates" : "nodes separate"} nothing` });
  frames.push({ nodes: after, note: gone.length ? "the lone key moves up in their place" : `${word} is unhooked` });
  return {
    frames,
    words: next,
    found: true,
    note: gone.length ? `Deleted ${word}: ${gone.length} branch ${gone.length === 1 ? "node" : "nodes"} that only led to one key collapsed.` : `Deleted ${word}: its branch still separates other keys, so nothing else changed.`,
  };
}

/** True when the nodes are a correct trie of exactly these words; used by the checks. */
export function holds(words: string[]) {
  const nodes = nodesOf(words);
  const leaves = nodes.filter((node) => node.kind === "plate").map((node) => node.cells[0]!).sort();
  if (leaves.join() !== [...words].sort().join()) return false;
  for (const node of nodes) {
    // A branch node may have one link (two keys that agree on this letter), but never leads to a single key.
    if (node.kind === "bead" && words.filter((word) => word.startsWith(node.id.slice(1).replace(BLANK, ""))).length < 2) return false;
    if (node.kind !== "plate") continue;
    // The links above an element spell a prefix of its key.
    let spelled = "";
    for (let at: TreeNode | undefined = node; at?.parent; at = nodes.find((other) => other.id === at!.parent)) spelled = (at.via === BLANK ? "" : at.via) + spelled;
    if (!node.cells[0]!.startsWith(spelled)) return false;
  }
  return true;
}

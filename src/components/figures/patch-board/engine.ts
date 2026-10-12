import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { CELL_ORDER, blockSvg, cordSvg } from "./geometry";
import { CELLS, NIL, insert, remove, wordsOf, type Memory, type Played, type Step } from "./model";
import { P, inJack, outJack, type Side } from "./view";

const SVG_NS = "http://www.w3.org/2000/svg";

const HOLD: Record<Step["kind"], number> = { walk: 0.42, stop: 0.6, allocate: 0.45, data: 0.4, link: 0.55, free: 0.45, miss: 0.8 };
/** How far above its cell a block starts when it is allocated, and ends when it is freed. */
const LIFT = 14;

interface Block {
  node: SVGGElement;
  body: Element | null;
  word: Element | null;
  link: Element | null;
  hit: Element | null;
  /** 0 when the cell is free, 1 when its block is seated. */
  seated: number;
}

interface Cord {
  from: number;
  side: Side;
  node: SVGGElement;
  end: Point3;
  alpha: number;
  drawn: string;
}

export interface BoardState {
  busy: boolean;
  words: string[];
  free: number;
  /** What the last operation did, in words, for the caption and the live region. */
  note: string;
}

interface Operation {
  verb: string;
  steps: Step[];
  updates: number;
  done: (operation: Operation, last: Step) => string;
}

const near = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.25;
const updatesText = (count: number) => `${count} link ${count === 1 ? "update" : "updates"}`;

export class BoardEngine {
  private blocks = new Map<number, Block>();
  private cords = new Map<string, Cord>();
  private memory: Memory;
  private operation: Operation | null = null;
  private step: Step | null = null;
  private last: Step | null = null;
  private hold = 0;
  private lastUpdates: number | null = null;
  private note = "";
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    blockLayer: SVGGElement,
    private readonly cordLayer: SVGGElement,
    private readonly doubly: boolean,
    memory: Memory,
    private readonly say: (text: string) => void,
    private readonly changed: (state: BoardState) => void,
  ) {
    this.memory = memory;
    this.digits = root.querySelector('[data-part="updates"]');
    for (const address of CELL_ORDER) {
      const node = document.createElementNS(SVG_NS, "g");
      node.setAttribute("class", "pb-block");
      node.innerHTML = blockSvg(address, doubly);
      blockLayer.appendChild(node);
      this.blocks.set(address, {
        node,
        body: node.querySelector(".pb-body"),
        word: node.querySelector('[data-part="word"]'),
        link: node.querySelector('[data-part="link"]'),
        hit: node.querySelector(".pb-hit"),
        seated: 0,
      });
    }
    const sides: Side[] = doubly ? ["next", "back"] : ["next"];
    for (const from of [NIL, ...Array.from({ length: CELLS }, (_, index) => index + 1)]) {
      for (const side of from === NIL ? (["next"] as Side[]) : sides) {
        const node = document.createElementNS(SVG_NS, "g");
        cordLayer.appendChild(node);
        this.cords.set(`${from}:${side}`, { from, side, node, end: outJack(from, side), alpha: 0, drawn: "" });
      }
    }
    this.reset(memory, "");
  }

  get busy() {
    return this.operation !== null;
  }

  get words() {
    return wordsOf(this.memory);
  }

  /** Clears the board and seats the given list at once. */
  reset(memory: Memory, note: string) {
    this.memory = memory;
    this.operation = null;
    this.step = null;
    this.last = null;
    this.lastUpdates = null;
    this.note = note;
    this.blocks.forEach((block, address) => (block.seated = memory.cells[address] ? 1 : 0));
    this.cords.forEach((cord) => {
      const target = this.targetOf(cord);
      cord.end = target ?? outJack(cord.from, cord.side);
      cord.alpha = target ? 1 : 0;
      cord.drawn = "";
    });
    this.count(0);
    this.paint(null);
    this.report();
  }

  insert(word: string) {
    return this.begin(insert(this.memory, word, this.doubly), `insert ${word}`, (operation) => `Inserted ${word} with ${updatesText(operation.updates)}.`, {
      duplicate: `${word} is already in the list.`,
      full: "No free cell is left: the avail stack is empty. Delete a word first.",
    });
  }

  remove(word: string) {
    return this.begin(
      remove(this.memory, word, this.doubly),
      `delete ${word}`,
      (operation, last) => (last.kind === "miss" ? `${word} is not in the list.` : `Deleted ${word} with ${updatesText(operation.updates)}; its cell is free again.`),
      { empty: "The list is empty." },
    );
  }

  /** Advances the board; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const [address, block] of this.blocks) {
      const target = this.memory.cells[address] ? 1 : 0;
      if (block.seated !== target) {
        block.seated = follow(block.seated, target, dt, 0.11, calm);
        moving = true;
      }
    }
    for (const cord of this.cords.values()) {
      const target = this.targetOf(cord);
      const goal = target ?? outJack(cord.from, cord.side);
      if (!near(cord.end, goal)) {
        cord.end = calm ? goal : (cord.end.map((value, axis) => follow(value, goal[axis]!, dt, 0.13, false)) as Point3);
        if (near(cord.end, goal)) cord.end = goal;
        moving = true;
      }
      const alpha = target ? 1 : 0;
      if (cord.alpha !== alpha) {
        // A cord that is being pulled fades only once its plug is back home.
        cord.alpha = target || near(cord.end, goal) ? follow(cord.alpha, alpha, dt, 0.07, calm) : cord.alpha;
        moving = true;
      }
    }
    if (this.operation) {
      this.advance(dt, calm, moving);
      moving = true;
    }
    this.paint(this.step ?? this.last);
    this.speak();
    return moving;
  }

  dispose() {
    this.blocks.forEach((block) => block.node.remove());
    this.cords.forEach((cord) => cord.node.remove());
    this.operation = null;
  }

  /** Where a cord's far plug belongs: the jack of the block its owner links to, or nowhere. */
  private targetOf(cord: Cord): Point3 | null {
    const address = cord.from === NIL ? this.memory.first : (this.memory.cells[cord.from]?.[cord.side] ?? NIL);
    if (cord.from !== NIL && !this.memory.cells[cord.from]) return null;
    return address === NIL ? null : inJack(address, cord.side);
  }

  private begin(played: Played, verb: string, done: Operation["done"], refusals: Partial<Record<NonNullable<Played["refused"]>, string>>) {
    if (this.busy) return false;
    if (!played.steps.length) {
      this.note = (played.refused && refusals[played.refused]) || "";
      this.report();
      return false;
    }
    this.operation = { verb, steps: [...played.steps], updates: 0, done };
    this.step = null;
    this.last = null;
    this.hold = 0;
    this.lastUpdates = null;
    this.count(0);
    this.report();
    return true;
  }

  private advance(dt: number, calm: boolean, moving: boolean) {
    const operation = this.operation!;
    if (this.step) {
      if (moving && !calm) return;
      this.hold -= dt;
      if (this.hold > 0 && !calm) return;
      this.last = this.step;
      this.step = null;
    }
    const step = operation.steps.shift();
    if (!step) {
      this.operation = null;
      this.lastUpdates = operation.updates;
      this.note = operation.done(operation, this.last!);
      this.last = null;
      this.report();
      return;
    }
    this.step = step;
    this.memory = step.memory;
    this.hold = HOLD[step.kind];
    operation.updates = step.updates;
    this.count(step.updates);
  }

  private count(value: number) {
    if (this.digits) this.digits.textContent = String(value).padStart(2, "0");
  }

  private paint(step: Step | null) {
    for (const [address, block] of this.blocks) {
      const cell = this.memory.cells[address];
      const shown = block.seated > 0.01;
      block.node.setAttribute("opacity", block.seated.toFixed(2));
      block.node.style.display = shown ? "" : "none";
      if (block.seated < 1) block.node.setAttribute("transform", translateAlong(P, [0, 0, (1 - block.seated) * LIFT]));
      else block.node.removeAttribute("transform");
      if (cell) {
        if (block.word) block.word.textContent = cell.word;
        if (block.link) block.link.textContent = String(cell.next);
        block.hit?.setAttribute("data-word", cell.word);
      }
      const lit = step?.focus === address;
      const on = step?.trail === address;
      if (lit) block.node.setAttribute("data-lit", "");
      else block.node.removeAttribute("data-lit");
      if (lit) block.body?.setAttribute("data-lit", "");
      else block.body?.removeAttribute("data-lit");
      if (on) block.node.setAttribute("data-on", "");
      else block.node.removeAttribute("data-on");
    }
    for (const [key, cord] of this.cords) {
      const from = outJack(cord.from, cord.side);
      const drawn = cord.alpha < 0.02 ? "" : `${cord.end.map((value) => value.toFixed(2)).join(",")}`;
      if (drawn !== cord.drawn) {
        cord.drawn = drawn;
        cord.node.innerHTML = drawn ? cordSvg(from, cord.end, cord.side) : "";
      }
      if (cord.alpha < 1) cord.node.setAttribute("opacity", cord.alpha.toFixed(2));
      else cord.node.removeAttribute("opacity");
      const moved = step?.moved && `${step.moved.from}:${step.moved.side}` === key;
      if (moved) {
        cord.node.setAttribute("data-lit", "");
        this.cordLayer.appendChild(cord.node);
      } else cord.node.removeAttribute("data-lit");
    }
  }

  private speak() {
    if (this.operation) {
      this.say(this.step?.note ?? this.operation.verb);
      return;
    }
    const used = this.words.length;
    const rest = `${used} ${used === 1 ? "node" : "nodes"} · ${CELLS - used} free`;
    this.say(this.lastUpdates === null ? rest : `${rest} · ${updatesText(this.lastUpdates)}`);
  }

  private report() {
    this.changed({ busy: this.busy, words: this.words, free: this.memory.avail.length, note: this.note });
  }
}

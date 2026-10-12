import { translateAlong, type Point3 } from "../iso/iso-kit";
import { cardSvg } from "./geometry";
import { insert, keysOf, pagesOf, remove, search, type Layout, type Played, type Step } from "./model";
import { BIN_SLOTS, FEED, P, SLOT, binAt, heldOver, nearness, slotAt } from "./view";

const SVG_NS = "http://www.w3.org/2000/svg";

/** How far a hopping card clears the higher of its two slots. */
const HOP = 20;
const READ_HOLD = 0.42;
const VERDICT_HOLD = 0.7;
const STEP_GAP = 0.1;
const FADE = 0.22;

interface Flight {
  from: Point3;
  to: Point3;
  /** Height of the quadratic control point; the middle of the flight reaches the hop. */
  control: number;
  age: number;
  span: number;
}

interface Card {
  key: number;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
  /** 1 while appearing, -1 while leaving, 0 otherwise. */
  fade: number;
}

export interface FileState {
  busy: boolean;
  keys: number[];
  pages: number;
  /** What the last operation did, in words, for the caption and the live region. */
  note: string;
}

interface Operation {
  verb: string;
  steps: Step[];
  reads: number;
  seen: Set<Step["kind"]>;
  done: (operation: Operation) => string;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const reads = (count: number) => `${count} ${count === 1 ? "read" : "reads"}`;

/** What a repair did, for the note under the figure. */
function repairOf(seen: Set<Step["kind"]>, promoted: number | null) {
  if (seen.has("split")) return promoted === null ? " The root split: the tree grew a level." : ` A leaf split and ${promoted} moved up.`;
  if (seen.has("collapse")) return " Two leaves combined and the tree lost a level.";
  if (seen.has("merge")) return " Two leaves combined.";
  if (seen.has("rotate")) return " A key was borrowed through the root.";
  return "";
}

export class FileEngine {
  private cards = new Map<number, Card>();
  private layout: Layout;
  private bin: number[] = [];
  private operation: Operation | null = null;
  private step: Step | null = null;
  private hold = 0;
  private gap = 0;
  private order = "";
  private lastReads: number | null = null;
  private note = "";
  private trays = new Map<number, Element>();
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    private readonly layer: SVGGElement,
    layout: Layout,
    private readonly say: (text: string) => void,
    private readonly changed: (state: FileState) => void,
  ) {
    this.layout = layout;
    root.querySelectorAll("[data-page]").forEach((rim) => this.trays.set(Number(rim.getAttribute("data-page")), rim));
    this.digits = root.querySelector('[data-part="reads"]');
    this.reset(layout, "");
  }

  get busy() {
    return this.operation !== null;
  }

  get keys() {
    return keysOf(this.layout);
  }

  /** Clears the file and stands the given cards in their slots at once. */
  reset(layout: Layout, note: string) {
    this.cards.forEach((card) => card.node.remove());
    this.cards.clear();
    this.bin = [];
    this.operation = null;
    this.step = null;
    this.layout = layout;
    this.lastReads = null;
    this.note = note;
    this.seats(layout).forEach((at, key) => this.add(key, at));
    this.read(null);
    this.count(0);
    this.sort();
    this.paint();
    this.report();
  }

  insert(key: number) {
    return this.begin(insert(this.layout, key), `inserting ${key}`, (operation) => `Inserted ${key} in ${reads(operation.reads)}.${repairOf(operation.seen, this.promoted)}`, { duplicate: `${key} is already in the file.`, full: "That leaf is full and all five trays are in use: a real B-tree would split the root and grow a level." });
  }

  remove(key: number) {
    return this.begin(remove(this.layout, key), `deleting ${key}`, (operation) =>
      operation.seen.has("miss") ? `${key} is not in the file (${reads(operation.reads)}).` : `Deleted ${key} in ${reads(operation.reads)}.${repairOf(operation.seen, null)}`,
    { empty: "The file is empty." });
  }

  search(key: number) {
    return this.begin(search(this.layout, key), `searching ${key}`, (operation) =>
      operation.seen.has("miss") ? `${key} is not in the file (${reads(operation.reads)}).` : `Found ${key} in ${reads(operation.reads)}.`,
    {});
  }

  /** Advances the file; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const card of this.cards.values()) {
      if (card.flight) {
        const flight = card.flight;
        flight.age = calm ? flight.span : flight.age + dt;
        const e = ease(Math.min(1, flight.age / flight.span));
        card.at = [
          flight.from[0] + (flight.to[0] - flight.from[0]) * e,
          flight.from[1] + (flight.to[1] - flight.from[1]) * e,
          (1 - e) * (1 - e) * flight.from[2] + 2 * e * (1 - e) * flight.control + e * e * flight.to[2],
        ];
        if (flight.age >= flight.span) {
          card.at = flight.to;
          card.flight = null;
        }
        moving = true;
      }
      if (card.fade) {
        card.alpha = calm ? (card.fade > 0 ? 1 : 0) : card.alpha + (card.fade * dt) / FADE;
        if (card.alpha >= 1 || card.alpha <= 0) {
          card.alpha = Math.max(0, Math.min(1, card.alpha));
          if (card.fade < 0) {
            card.node.remove();
            this.cards.delete(card.key);
          }
          card.fade = 0;
        }
        moving = true;
      }
    }
    if (this.operation) {
      moving = true;
      this.advance(dt, calm);
    }
    this.sort();
    this.paint();
    this.speak();
    return moving;
  }

  dispose() {
    this.cards.forEach((card) => card.node.remove());
    this.cards.clear();
    this.operation = null;
  }

  private promoted: number | null = null;

  private begin(played: Played, verb: string, done: Operation["done"], refusals: Partial<Record<NonNullable<Played["refused"]>, string>>) {
    if (this.busy) return false;
    if (!played.steps.length) {
      this.note = (played.refused && refusals[played.refused]) || "";
      this.report();
      return false;
    }
    this.promoted = played.steps.find((step) => step.kind === "promote")?.focus ?? null;
    this.operation = { verb, steps: [...played.steps], reads: 0, seen: new Set(), done };
    this.step = null;
    this.gap = 0;
    this.lastReads = null;
    this.count(0);
    this.report();
    return true;
  }

  private advance(dt: number, calm: boolean) {
    const operation = this.operation!;
    if (!this.step) {
      this.gap -= dt;
      if (this.gap > 0 && !calm) return;
      const step = operation.steps.shift();
      if (!step) {
        this.operation = null;
        this.lastReads = operation.reads;
        this.note = operation.done(operation);
        this.light(null);
        this.read(null);
        this.report();
        return;
      }
      this.play(step, operation, calm);
      return;
    }
    if ([...this.cards.values()].some((card) => card.flight)) return;
    this.hold -= dt;
    if (this.hold > 0 && !calm) return;
    this.layout = this.step.layout;
    this.step = null;
    this.gap = STEP_GAP;
  }

  private play(step: Step, operation: Operation, calm: boolean) {
    this.step = step;
    operation.seen.add(step.kind);
    operation.reads = step.reads;
    this.count(step.reads);
    this.read(step.reading);
    this.hold = calm ? 0 : step.kind === "read" ? READ_HOLD : step.kind === "found" || step.kind === "miss" ? VERDICT_HOLD : 0.12;
    if (step.enter !== undefined) {
      const card = this.add(step.enter, [FEED[0], FEED[1], FEED[2] + 12]);
      card.alpha = 0;
      card.fade = 1;
      this.fly(card, FEED);
    }
    if (step.out !== undefined) this.discard(step.out);
    if (step.held) {
      const card = this.cards.get(step.held.key);
      if (card) this.fly(card, heldOver(step.held.over));
    }
    this.seats(step.layout).forEach((home, key) => {
      const card = this.cards.get(key);
      if (card && !same(card.flight?.to ?? card.at, home)) this.fly(card, home);
    });
    this.light(step.focus);
  }

  /** Where every card of a layout stands. */
  private seats(layout: Layout) {
    const seats = new Map<number, Point3>();
    layout.root.forEach((key, slot) => seats.set(key, slotAt(-1, slot)));
    layout.leaves?.forEach((leaf, page) => leaf.forEach((key, slot) => seats.set(key, slotAt(page, slot))));
    return seats;
  }

  /** Sends a deleted card to the bin; the cards already there slide along, and the oldest leaves. */
  private discard(key: number) {
    if (this.bin.length >= BIN_SLOTS) {
      const oldest = this.cards.get(this.bin.pop()!);
      if (oldest) oldest.fade = -1;
    }
    this.bin.forEach((other, slot) => {
      const card = this.cards.get(other);
      if (card) this.fly(card, binAt(slot + 1));
    });
    this.bin.unshift(key);
    const card = this.cards.get(key);
    if (card) this.fly(card, binAt(0));
  }

  private add(key: number, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "bf-card");
    node.innerHTML = cardSvg(key);
    this.layer.appendChild(node);
    const card: Card = { key, node, solid: node.querySelector(".bf-body"), at, flight: null, alpha: 1, fade: 0 };
    this.cards.set(key, card);
    return card;
  }

  private fly(card: Card, to: Point3) {
    const from = card.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    // A card moving to the next slot of its own tray slides; anything further hops over the walls.
    const slide = from[2] === to[2] && from[1] === to[1] && distance <= SLOT * 1.5;
    const peak = Math.max(from[2], to[2]) + (slide ? 0 : HOP);
    card.flight = { from, to, control: slide ? from[2] : 2 * peak - (from[2] + to[2]) / 2, age: 0, span: slide ? 0.3 : 0.42 + distance / 420 };
  }

  private light(key: number | null) {
    for (const card of this.cards.values()) {
      if (card.key === key) {
        card.node.setAttribute("data-lit", "");
        card.solid?.setAttribute("data-lit", "");
      } else {
        card.node.removeAttribute("data-lit");
        card.solid?.removeAttribute("data-lit");
      }
    }
  }

  /** Marks the tray whose page is being read. */
  private read(page: number | null) {
    this.trays.forEach((rim, at) => {
      if (at === page) rim.setAttribute("data-on", "");
      else rim.removeAttribute("data-on");
    });
  }

  private count(value: number) {
    if (this.digits) this.digits.textContent = String(value).padStart(2, "0");
  }

  /** Upright cards never interlock, so the nearer footprint is always drawn later. */
  private sort() {
    const sorted = [...this.cards.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((card) => card.key).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((card) => fragment.appendChild(card.node));
    this.layer.appendChild(fragment);
  }

  private paint() {
    for (const card of this.cards.values()) {
      card.node.setAttribute("transform", translateAlong(P, card.at));
      if (card.alpha < 1) card.node.setAttribute("opacity", card.alpha.toFixed(2));
      else card.node.removeAttribute("opacity");
    }
  }

  private speak() {
    if (this.operation) {
      this.say(this.operation.reads ? `${this.operation.verb} · read ${this.operation.reads}` : this.operation.verb);
      return;
    }
    const pages = pagesOf(this.layout);
    const rest = `n ${this.keys.length} · ${pages} ${pages === 1 ? "page" : "pages"}`;
    this.say(this.lastReads === null ? rest : `${rest} · ${reads(this.lastReads)}`);
  }

  private report() {
    this.changed({ busy: this.busy, keys: this.keys, pages: pagesOf(this.layout), note: this.note });
  }
}

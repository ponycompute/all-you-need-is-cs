import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { FEED, P, cardSvg, cordSvg, heldOver, inJack, nearness, outJack, slotAt } from "./geometry";
import { ENTRIES, bitsOf, insert, keysOf, labelOf, search, type Played, type Step, type Table } from "./model";

const SVG_NS = "http://www.w3.org/2000/svg";
const HOP = 20;
const HOLD: Record<Step["kind"], number> = { enter: 0.3, entry: 0.55, page: 0.45, place: 0.2, double: 0.9, split: 0.5, repoint: 0.6, found: 0.8, miss: 0.8 };

interface Flight {
  from: Point3;
  to: Point3;
  control: number;
  age: number;
  span: number;
}

interface Card {
  key: string;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
}

interface Cord {
  node: SVGGElement;
  end: Point3;
  alpha: number;
  drawn: string;
}

export interface TableState {
  busy: boolean;
  keys: string[];
  bits: number;
  pages: number;
  note: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const near = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.25;

export class TableEngine {
  private cards = new Map<string, Card>();
  private cords: Cord[] = [];
  private table: Table;
  private steps: Step[] | null = null;
  private step: Step | null = null;
  private last: Step | null = null;
  private hold = 0;
  private order = "";
  private note = "";
  private done: (last: Step) => string = () => "";
  private entries = new Map<number, Element>();
  private labels = new Map<number, Element>();
  private depths = new Map<number, Element>();
  private rims = new Map<number, Element>();
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    private readonly cordLayer: SVGGElement,
    private readonly layer: SVGGElement,
    table: Table,
    private readonly say: (text: string) => void,
    private readonly changed: (state: TableState) => void,
  ) {
    this.table = table;
    root.querySelectorAll("[data-entry]").forEach((node) => this.entries.set(Number(node.getAttribute("data-entry")), node));
    root.querySelectorAll("[data-label]").forEach((node) => this.labels.set(Number(node.getAttribute("data-label")), node));
    root.querySelectorAll("[data-depth]").forEach((node) => this.depths.set(Number(node.getAttribute("data-depth")), node));
    root.querySelectorAll("[data-page]").forEach((node) => this.rims.set(Number(node.getAttribute("data-page")), node));
    this.digits = root.querySelector('[data-part="bits"]');
    for (let entry = 0; entry < ENTRIES; entry++) {
      const node = document.createElementNS(SVG_NS, "g");
      cordLayer.appendChild(node);
      this.cords.push({ node, end: outJack(entry), alpha: 0, drawn: "" });
    }
    this.reset(table, "");
  }

  get busy() {
    return this.steps !== null;
  }

  get keys() {
    return keysOf(this.table);
  }

  /** Clears the bench and sets the given table on it at once. */
  reset(table: Table, note: string) {
    this.cards.forEach((card) => card.node.remove());
    this.cards.clear();
    this.steps = null;
    this.step = null;
    this.last = null;
    this.table = table;
    this.note = note;
    this.seats(table).forEach((at, key) => this.put(key, at));
    this.cords.forEach((cord, entry) => {
      const target = this.targetOf(entry);
      cord.end = target ?? outJack(entry);
      cord.alpha = target ? 1 : 0;
      cord.drawn = "";
    });
    this.sort();
    this.paint(null);
    this.report();
  }

  insert(key: string) {
    return this.begin(insert(this.table, key), (last) => (last.kind === "place" ? `Inserted ${key}: two reads, the directory and one page.` : `Inserted ${key}. Its page overflowed and split; the directory is ${last.table.bits} bits deep.`), {
      duplicate: `${key} is already in the table.`,
      bits: `${key} would overflow a page that already uses all three directory bits. The table would need a fourth bit, which this bench does not have.`,
      pages: `${key} would need a seventh page; this bench has six.`,
    });
  }

  search(key: string) {
    return this.begin({ steps: search(this.table, key) }, (last) => (last.kind === "found" ? `Found ${key} in two reads.` : `${key} is not in the table (two reads).`), {});
  }

  /** Advances the bench; returns true while anything is still moving. */
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
      if (card.alpha < 1) {
        card.alpha = calm ? 1 : Math.min(1, card.alpha + dt / 0.2);
        moving = true;
      }
    }
    this.cords.forEach((cord, entry) => {
      const target = this.targetOf(entry);
      const goal = target ?? outJack(entry);
      if (!near(cord.end, goal)) {
        cord.end = calm ? goal : (cord.end.map((value, axis) => follow(value, goal[axis]!, dt, 0.13)) as Point3);
        if (near(cord.end, goal)) cord.end = goal;
        moving = true;
      }
      const alpha = target ? 1 : 0;
      if (cord.alpha !== alpha) {
        cord.alpha = follow(cord.alpha, alpha, dt, 0.08, calm);
        moving = true;
      }
    });
    if (this.steps) {
      this.advance(dt, calm, moving);
      moving = true;
    }
    this.sort();
    this.paint(this.step ?? this.last);
    this.speak();
    return moving;
  }

  dispose() {
    this.cards.forEach((card) => card.node.remove());
    this.cards.clear();
    this.cords.forEach((cord) => cord.node.remove());
    this.cords = [];
    this.steps = null;
  }

  private targetOf(entry: number): Point3 | null {
    return entry < this.table.directory.length ? inJack(this.table.directory[entry]!) : null;
  }

  private seats(table: Table) {
    const seats = new Map<string, Point3>();
    table.pages.forEach((page, at) => page.keys.forEach((key, slot) => seats.set(key, slotAt(at, slot))));
    return seats;
  }

  private begin(played: Played, done: (last: Step) => string, refusals: Partial<Record<NonNullable<Played["refused"]>, string>>) {
    if (this.busy) return false;
    if (!played.steps.length) {
      this.note = (played.refused && refusals[played.refused]) || "";
      this.report();
      return false;
    }
    this.steps = [...played.steps];
    this.step = null;
    this.last = null;
    this.done = done;
    this.hold = 0;
    this.report();
    return true;
  }

  private advance(dt: number, calm: boolean, moving: boolean) {
    if (this.step) {
      if (moving && !calm) return;
      this.hold -= dt;
      if (this.hold > 0 && !calm) return;
      this.last = this.step;
      this.step = null;
    }
    const step = this.steps!.shift();
    if (!step) {
      this.steps = null;
      this.note = this.done(this.last!);
      this.last = null;
      this.report();
      return;
    }
    this.step = step;
    this.hold = HOLD[step.kind];
    this.table = step.table;
    if (step.enter) {
      const card = this.put(step.enter, [FEED[0], FEED[1], FEED[2] + 12]);
      card.alpha = 0;
      this.fly(card, FEED);
    }
    if (step.held) {
      const card = this.cards.get(step.held.key);
      if (card) this.fly(card, heldOver(step.held.over));
    }
    this.seats(step.table).forEach((home, key) => {
      const card = this.cards.get(key);
      if (card && !step.held && !same(card.flight?.to ?? card.at, home)) this.fly(card, home);
    });
  }

  private put(key: string, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "hd-card");
    node.innerHTML = cardSvg(key, bitsOf(key));
    this.layer.appendChild(node);
    const card: Card = { key, node, solid: node.querySelector(".hd-body"), at, flight: null, alpha: 1 };
    this.cards.set(key, card);
    return card;
  }

  private fly(card: Card, to: Point3) {
    const from = card.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const slide = from[2] === to[2] && from[1] === to[1] && distance <= 20;
    const peak = Math.max(from[2], to[2]) + (slide ? 0 : HOP);
    card.flight = { from, to, control: slide ? from[2] : 2 * peak - (from[2] + to[2]) / 2, age: 0, span: slide ? 0.3 : 0.42 + distance / 420 };
  }

  private sort() {
    const sorted = [...this.cards.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((card) => card.key).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((card) => fragment.appendChild(card.node));
    this.layer.appendChild(fragment);
  }

  private paint(step: Step | null) {
    for (const card of this.cards.values()) {
      card.node.setAttribute("transform", translateAlong(P, card.at));
      if (card.alpha < 1) card.node.setAttribute("opacity", card.alpha.toFixed(2));
      else card.node.removeAttribute("opacity");
      if (step?.focus === card.key) {
        card.node.setAttribute("data-lit", "");
        card.solid?.setAttribute("data-lit", "");
      } else {
        card.node.removeAttribute("data-lit");
        card.solid?.removeAttribute("data-lit");
      }
    }
    const size = this.table.directory.length;
    this.entries.forEach((node, entry) => {
      node.setAttribute("opacity", entry < size ? "1" : "0.35");
      if (step?.entry === entry && step.kind !== "page") node.setAttribute("data-on", "");
      else node.removeAttribute("data-on");
    });
    this.labels.forEach((node, entry) => {
      const text = entry < size ? labelOf(entry, this.table.bits) : "";
      if (node.textContent !== text) node.textContent = text;
    });
    this.depths.forEach((node, page) => {
      const text = this.table.pages[page] ? String(this.table.pages[page]!.depth) : "";
      if (node.textContent !== text) node.textContent = text;
    });
    this.rims.forEach((node, page) => {
      if (step?.page === page) node.setAttribute("data-on", "");
      else node.removeAttribute("data-on");
    });
    if (this.digits) this.digits.textContent = String(this.table.bits).padStart(2, "0");
    this.cords.forEach((cord, entry) => {
      const drawn = cord.alpha < 0.02 ? "" : cord.end.map((value) => value.toFixed(2)).join(",");
      if (drawn !== cord.drawn) {
        cord.drawn = drawn;
        cord.node.innerHTML = drawn ? cordSvg(outJack(entry), cord.end) : "";
      }
      if (cord.alpha < 1) cord.node.setAttribute("opacity", cord.alpha.toFixed(2));
      else cord.node.removeAttribute("opacity");
      if (step?.kind === "repoint" && step.entry === entry) {
        cord.node.setAttribute("data-lit", "");
        this.cordLayer.appendChild(cord.node);
      } else cord.node.removeAttribute("data-lit");
    });
  }

  private speak() {
    if (this.steps) {
      this.say(this.step?.note ?? "");
      return;
    }
    this.say(`${this.keys.length} keys · ${this.table.pages.length} pages · ${this.table.bits}-bit directory`);
  }

  private report() {
    this.changed({ busy: this.busy, keys: this.keys, bits: this.table.bits, pages: this.table.pages.length, note: this.note });
  }
}

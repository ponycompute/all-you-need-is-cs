import { translateAlong, type Point3 } from "../iso/iso-kit";
import { spring, type Spring } from "../iso/react/live";
import { riderLift, weightSvg } from "./geometry";
import { capacityOf, countOf, draw, extremesOf, insert, type End, type HeapKind, type RackKind, type Step, type Weight } from "./model";
import { P, PAD, TRAY_SLOTS, nearness, seatAt, trayAt } from "./view";

const SVG_NS = "http://www.w3.org/2000/svg";

/** How far a hopping weight clears the higher of its two seats. */
const HOP = 40;
/** How far two weights that trade seats swing apart, each to its own side. */
const BOW = 13;
const COMPARE_HOLD = 0.34;
const STEP_GAP = 0.09;

interface Flight {
  from: Point3;
  to: Point3;
  /** Height of the quadratic control point; the middle of the flight reaches the hop. */
  control: number;
  bow: number;
  age: number;
  span: number;
}

interface Body {
  weight: Weight;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
  /** 1 while appearing, -1 while leaving, 0 otherwise. */
  fade: number;
}

export interface RackState {
  busy: boolean;
  count: number;
  low: number | null;
  high: number | null;
  /** What the last operation did, in words, for the caption and the live region. */
  note: string;
}

type Operation = { verb: string; steps: Step[]; hops: number; done: (hops: number) => string };

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export class RackEngine {
  private bodies = new Map<number, Body>();
  private seats: Array<Weight | null>;
  private trays: Record<End, number[]> = { low: [], high: [] };
  private operation: Operation | null = null;
  private step: Step | null = null;
  private hold = 0;
  private gap = 0;
  private nextId = 1;
  private order = "";
  private lastHops: number | null = null;
  private note = "";
  private riders: Record<End, { node: Element | null; spring: Spring }>;
  private seatRings = new Map<number, Element>();
  private digits: Element | null;
  private cells = new Map<number, Element>();
  private cellBoxes = new Map<number, Element>();
  private settled: number[] = [];

  constructor(
    private readonly kind: RackKind,
    private readonly root: SVGSVGElement,
    private readonly layer: SVGGElement,
    seats: Array<Weight | null>,
    private readonly say: (text: string) => void,
    private readonly changed: (state: RackState) => void,
  ) {
    this.seats = seats;
    this.riders = {
      low: { node: root.querySelector('[data-part="rider-low"]'), spring: { at: 0, rate: 0 } },
      high: { node: root.querySelector('[data-part="rider-high"]'), spring: { at: 0, rate: 0 } },
    };
    root.querySelectorAll("[data-seat]").forEach((ring) => this.seatRings.set(Number(ring.getAttribute("data-seat")), ring));
    this.digits = root.querySelector('[data-part="hops"]');
    root.querySelectorAll("[data-cell]").forEach((text) => this.cells.set(Number(text.getAttribute("data-cell")), text));
    root.querySelectorAll("[data-cell-box]").forEach((box) => this.cellBoxes.set(Number(box.getAttribute("data-cell-box")), box));
    this.reset(seats, "");
  }

  get busy() {
    return this.operation !== null;
  }

  get full() {
    return countOf(this.seats) >= capacityOf(this.kind);
  }

  get empty() {
    return countOf(this.seats) === 0;
  }

  /** Clears the rack and stands the given weights in their seats at once. */
  reset(seats: Array<Weight | null>, note: string) {
    this.bodies.forEach((body) => body.node.remove());
    this.bodies.clear();
    this.trays = { low: [], high: [] };
    this.operation = null;
    this.step = null;
    this.seats = seats;
    this.lastHops = null;
    this.note = note;
    this.settled = [];
    seats.forEach((weight, seat) => {
      if (!weight) return;
      this.nextId = Math.max(this.nextId, weight.id + 1);
      this.add(weight, seatAt(seat));
    });
    this.highlight([]);
    const { low, high } = extremesOf(this.kind, this.seats);
    this.riders.low.spring = { at: riderLift(low?.value ?? null), rate: 0 };
    this.riders.high.spring = { at: riderLift(high?.value ?? null), rate: 0 };
    this.count(0);
    this.sort();
    this.paint();
    this.report();
  }

  load(value: number) {
    if (this.busy || this.full) return false;
    const weight = { id: this.nextId++, value };
    const steps = insert(this.kind as HeapKind, this.seats, weight);
    return this.begin({ verb: `loading ${value}`, steps, hops: 0, done: (hops) => `Inserted ${value} in ${hops} ${hops === 1 ? "hop" : "hops"}.` });
  }

  draw(end: End) {
    if (this.busy || this.empty) return false;
    const steps = draw(this.kind as HeapKind, this.seats, end);
    const out = steps.find((step) => step.out)?.out?.weight.value;
    const name = end === "low" ? "min" : "max";
    return this.begin({
      verb: `drawing ${name} ${out}`,
      steps,
      hops: 0,
      done: (hops) => (hops ? `Deleted ${name} ${out}; repaired in ${hops} ${hops === 1 ? "hop" : "hops"}.` : `Deleted ${name} ${out}.`),
    });
  }

  /** Advances the rack; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const body of this.bodies.values()) {
      if (body.flight) {
        const flight = body.flight;
        flight.age = calm ? flight.span : flight.age + dt;
        const e = ease(Math.min(1, flight.age / flight.span));
        body.at = this.along(flight, e);
        if (flight.age >= flight.span) {
          body.at = flight.to;
          body.flight = null;
        }
        moving = true;
      }
      if (body.fade) {
        body.alpha = calm ? (body.fade > 0 ? 1 : 0) : body.alpha + (body.fade * dt) / 0.22;
        if (body.alpha >= 1 || body.alpha <= 0) {
          body.alpha = Math.max(0, Math.min(1, body.alpha));
          if (body.fade < 0) {
            body.node.remove();
            this.bodies.delete(body.weight.id);
          }
          body.fade = 0;
        }
        moving = true;
      }
    }
    if (this.operation) {
      moving = true;
      this.advance(dt, calm);
    }
    const { low, high } = extremesOf(this.kind, this.seats);
    const lowStill = spring(this.riders.low.spring, riderLift(low?.value ?? null), dt, 150, 17, calm);
    const highStill = spring(this.riders.high.spring, riderLift(high?.value ?? null), dt, 150, 17, calm);
    this.sort();
    this.paint();
    this.speak();
    return moving || !lowStill || !highStill;
  }

  dispose() {
    this.bodies.forEach((body) => body.node.remove());
    this.bodies.clear();
    this.operation = null;
  }

  private begin(operation: Operation) {
    if (!operation.steps.length) return false;
    this.operation = operation;
    this.step = null;
    this.gap = 0;
    this.lastHops = null;
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
        this.lastHops = operation.hops;
        this.note = operation.done(operation.hops);
        this.focus(null);
        this.highlight([]);
        this.report();
        return;
      }
      this.play(step, operation, calm);
      return;
    }
    const flying = [...this.bodies.values()].some((body) => body.flight);
    if (flying) return;
    this.hold -= dt;
    if (this.hold > 0 && !calm) return;
    this.seats = this.step.seats;
    if (this.step.settled) this.settled = this.step.settled;
    this.step = null;
    this.gap = STEP_GAP;
  }

  private play(step: Step, operation: Operation, calm: boolean) {
    this.step = step;
    this.hold = 0;
    this.highlight(step.kind === "compare" ? step.compared : []);
    if (step.kind === "compare") this.hold = calm ? 0 : COMPARE_HOLD;
    if (step.enter) {
      const body = this.add(step.enter, [PAD[0], PAD[1], PAD[2] + 16]);
      body.alpha = 0;
      body.fade = 1;
      this.fly(body, PAD, 0, false);
    }
    if (step.out) this.send(step.out.weight.id, step.out.end);
    const movers: Body[] = [];
    step.seats.forEach((weight, seat) => {
      if (!weight) return;
      const body = this.bodies.get(weight.id);
      if (!body) return;
      const home = seatAt(seat);
      if (same(body.flight?.to ?? body.at, home)) return;
      this.fly(body, home, 0, true);
      movers.push(body);
    });
    if (movers.length === 2) movers.forEach((body) => (body.flight!.bow = BOW));
    if (step.kind === "swap" || step.kind === "place") this.count(++operation.hops);
    this.focus(step.focus);
  }

  /** Sends a drawn weight to its tray; the weights already there slide outward, and the oldest leaves. */
  private send(id: number, end: End) {
    const tray = this.trays[end];
    if (tray.length >= TRAY_SLOTS) {
      const oldest = this.bodies.get(tray.pop()!);
      if (oldest) oldest.fade = -1;
    }
    tray.forEach((other, slot) => {
      const body = this.bodies.get(other);
      if (body) this.fly(body, trayAt(end, slot + 1), 0, false);
    });
    tray.unshift(id);
    const body = this.bodies.get(id);
    if (body) this.fly(body, trayAt(end, 0), 0, true);
  }

  private add(weight: Weight, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "hr-weight");
    node.innerHTML = weightSvg(weight.value);
    this.layer.appendChild(node);
    const body: Body = { weight, node, solid: node.querySelector(".hr-body"), at, flight: null, alpha: 1, fade: 0 };
    this.bodies.set(weight.id, body);
    return body;
  }

  private fly(body: Body, to: Point3, bow: number, hop: boolean) {
    const from = body.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const peak = Math.max(from[2], to[2]) + (hop ? HOP : 0);
    body.flight = {
      from,
      to,
      control: hop ? 2 * peak - (from[2] + to[2]) / 2 : (from[2] + to[2]) / 2,
      bow,
      age: 0,
      span: hop ? 0.46 + distance / 420 : 0.3 + distance / 260,
    };
  }

  private along({ from, to, control, bow }: Flight, e: number): Point3 {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    const swing = bow * 4 * e * (1 - e);
    return [
      from[0] + dx * e + (-dy / length) * swing,
      from[1] + dy * e + (dx / length) * swing,
      (1 - e) * (1 - e) * from[2] + 2 * e * (1 - e) * control + e * e * to[2],
    ];
  }

  private focus(id: number | null) {
    for (const body of this.bodies.values()) {
      const lit = body.weight.id === id;
      if (lit) {
        body.node.setAttribute("data-lit", "");
        body.solid?.setAttribute("data-lit", "");
      } else {
        body.node.removeAttribute("data-lit");
        body.solid?.removeAttribute("data-lit");
      }
    }
  }

  private highlight(seats: number[]) {
    this.seatRings.forEach((ring, seat) => {
      if (seats.includes(seat)) ring.setAttribute("data-on", "");
      else ring.removeAttribute("data-on");
    });
  }

  /** Marks the seats whose weights are in their final place, and mirrors every seat into the array strip. */
  private mirror() {
    const done = new Set(this.settled);
    this.seatRings.forEach((ring, seat) => {
      if (done.has(seat)) ring.setAttribute("data-done", "");
      else ring.removeAttribute("data-done");
    });
    for (const body of this.bodies.values()) {
      if (done.has(this.seats.findIndex((weight) => weight?.id === body.weight.id))) body.node.setAttribute("data-done", "");
      else body.node.removeAttribute("data-done");
    }
    this.cells.forEach((text, seat) => {
      const value = this.seats[seat] ? String(this.seats[seat]!.value) : "";
      if (text.textContent !== value) text.textContent = value;
    });
    this.cellBoxes.forEach((box, seat) => {
      if (done.has(seat)) box.setAttribute("data-done", "");
      else box.removeAttribute("data-done");
    });
  }

  /** The seats as they stand now. */
  get current() {
    return this.seats;
  }

  /** Plays a prepared list of steps as one operation; `done` words the note when it finishes. */
  run(verb: string, steps: Step[], done: (hops: number) => string) {
    if (this.busy || !steps.length) return false;
    return this.begin({ verb, steps: [...steps], hops: 0, done });
  }

  private count(hops: number) {
    if (this.digits) this.digits.textContent = String(hops).padStart(2, "0");
  }

  /** Upright weights never interlock, so the nearer footprint is always drawn later. */
  private sort() {
    const sorted = [...this.bodies.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((body) => body.weight.id).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((body) => fragment.appendChild(body.node));
    this.layer.appendChild(fragment);
  }

  private paint() {
    if (this.cells.size || this.settled.length) this.mirror();
    for (const body of this.bodies.values()) {
      body.node.setAttribute("transform", translateAlong(P, body.at));
      if (body.alpha < 1) body.node.setAttribute("opacity", body.alpha.toFixed(2));
      else body.node.removeAttribute("opacity");
    }
    for (const end of ["low", "high"] as End[]) {
      const { node, spring: state } = this.riders[end];
      if (!node) continue;
      if (state.at) node.setAttribute("transform", translateAlong(P, [0, 0, state.at]));
      else node.removeAttribute("transform");
    }
  }

  private speak() {
    if (this.operation) {
      const hops = this.operation.hops;
      this.say(hops ? `${this.operation.verb} · ${this.kind === "max" ? "swap" : "hop"} ${hops}` : this.operation.verb);
      return;
    }
    const { low, high } = extremesOf(this.kind, this.seats);
    const count = countOf(this.seats);
    if (this.kind === "max") {
      // Heap sort reads the root and how much of the file is finished.
      const done = this.settled.length;
      const rest = done === count ? `n ${count} · sorted` : `n ${count} · root ${high?.value ?? "-"} · ${done} finished`;
      this.say(this.lastHops === null ? rest : `${rest} · ${this.lastHops} ${this.lastHops === 1 ? "swap" : "swaps"}`);
      return;
    }
    const rest = count ? `n ${count} · min ${low!.value} · max ${high!.value}` : "n 0 · empty";
    this.say(this.lastHops === null ? rest : `${rest} · ${this.lastHops} ${this.lastHops === 1 ? "hop" : "hops"}`);
  }

  private report() {
    const { low, high } = extremesOf(this.kind, this.seats);
    this.changed({ busy: this.busy, count: countOf(this.seats), low: low?.value ?? null, high: high?.value ?? null, note: this.note });
  }
}

import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { P, TRAY_SLOTS, laneAt, nearness, pointerSvg, puckSvg, trayAt } from "./geometry";
import { build, leftOf, output, type Gate, type Step, type Yard } from "./model";

const SVG_NS = "http://www.w3.org/2000/svg";
const HOP = 26;
const FADE = 0.22;
const HOLD: Record<Step["kind"], number> = { compare: 0.62, out: 0.1, advance: 0.2, done: 0.4 };
const GATE_IDS: Gate[] = [0, 1, 2];

interface Flight {
  from: Point3;
  to: Point3;
  control: number;
  age: number;
  span: number;
}

interface Puck {
  key: number;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
  fade: number;
}

interface Pointer {
  node: SVGGElement;
  lean: number;
  drawn: number;
}

export interface YardState {
  busy: boolean;
  output: number[];
  left: number;
  note: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export class YardEngine {
  private pucks = new Map<number, Puck>();
  private yard: Yard;
  private steps: Step[] | null = null;
  private step: Step | null = null;
  private hold = 0;
  private order = "";
  private note = "";
  private lastCompares: number | null = null;
  private pointers: Pointer[] = [];
  private windows = new Map<number, Element>();
  private rims = new Map<number, Element>();
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    pointerLayers: SVGGElement[],
    private readonly layer: SVGGElement,
    runs: number[][],
    private readonly say: (text: string) => void,
    private readonly changed: (state: YardState) => void,
  ) {
    this.pointers = pointerLayers.map((node) => ({ node, lean: 0, drawn: NaN }));
    root.querySelectorAll("[data-window]").forEach((text) => this.windows.set(Number(text.getAttribute("data-window")), text));
    root.querySelectorAll("[data-gate]").forEach((rim) => this.rims.set(Number(rim.getAttribute("data-gate")), rim));
    this.digits = root.querySelector('[data-part="compares"]');
    this.yard = build(runs).yard;
    this.reset(runs, "");
  }

  get busy() {
    return this.steps !== null;
  }

  get left() {
    return leftOf(this.yard);
  }

  /** Clears the yard, loads the runs, and plays the tree once so every gate shows its winner. */
  reset(runs: number[][], note: string) {
    this.pucks.forEach((puck) => puck.node.remove());
    this.pucks.clear();
    this.steps = null;
    this.step = null;
    this.yard = build(runs).yard;
    this.note = note;
    this.lastCompares = null;
    this.seats(this.yard).forEach((at, key) => this.put(key, at));
    this.pointers.forEach((pointer, gate) => (pointer.lean = this.leanOf(gate as Gate)));
    this.mark(null);
    this.count(0);
    this.sort();
    this.paint();
    this.report();
  }

  /** Sends the next key to the output and replays its path through the gates. */
  next() {
    if (this.busy) return false;
    const steps = output(this.yard);
    if (!steps.length) {
      this.note = "Every run is empty.";
      this.report();
      return false;
    }
    this.steps = steps;
    this.step = null;
    this.hold = 0;
    this.lastCompares = null;
    this.count(0);
    this.report();
    return true;
  }

  /** Advances the yard; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const puck of this.pucks.values()) {
      if (puck.flight) {
        const flight = puck.flight;
        flight.age = calm ? flight.span : flight.age + dt;
        const e = ease(Math.min(1, flight.age / flight.span));
        puck.at = [
          flight.from[0] + (flight.to[0] - flight.from[0]) * e,
          flight.from[1] + (flight.to[1] - flight.from[1]) * e,
          (1 - e) * (1 - e) * flight.from[2] + 2 * e * (1 - e) * flight.control + e * e * flight.to[2],
        ];
        if (flight.age >= flight.span) {
          puck.at = flight.to;
          puck.flight = null;
        }
        moving = true;
      }
      if (puck.fade) {
        puck.alpha = calm ? 0 : puck.alpha + (puck.fade * dt) / FADE;
        if (puck.alpha <= 0) {
          puck.node.remove();
          this.pucks.delete(puck.key);
        }
        moving = true;
      }
    }
    this.pointers.forEach((pointer, gate) => {
      const target = this.leanOf(gate as Gate);
      if (pointer.lean === target) return;
      pointer.lean = follow(pointer.lean, target, dt, 0.1, calm);
      moving = true;
    });
    if (this.steps) {
      this.advance(dt, calm, moving);
      moving = true;
    }
    this.sort();
    this.paint();
    this.speak();
    return moving;
  }

  dispose() {
    this.pucks.forEach((puck) => puck.node.remove());
    this.pucks.clear();
    this.pointers.forEach((pointer) => (pointer.node.innerHTML = ""));
    this.steps = null;
  }

  /** Which way a gate's pointer leans: toward the side its winner came from. */
  private leanOf(gate: Gate) {
    const winner = this.yard.winners[gate];
    if (winner === null) return 0;
    if (gate === 2) return winner < 2 ? -1 : 1;
    return winner % 2 === 0 ? -1 : 1;
  }

  /** Where every key stands: in its lane, or in the last slots of the output tray. */
  private seats(yard: Yard) {
    const seats = new Map<number, Point3>();
    yard.runs.forEach((run, lane) => run.forEach((key, place) => seats.set(key, laneAt(lane, place))));
    const shown = yard.output.slice(-TRAY_SLOTS);
    shown.forEach((key, slot) => seats.set(key, trayAt(slot)));
    return seats;
  }

  private advance(dt: number, calm: boolean, moving: boolean) {
    if (this.step) {
      if (moving && !calm) return;
      this.hold -= dt;
      if (this.hold > 0 && !calm) return;
      this.step = null;
    }
    const step = this.steps!.shift();
    if (!step) {
      this.steps = null;
      const key = this.yard.output[this.yard.output.length - 1];
      this.note = `Output ${key}; the tree was replayed with ${this.lastCompares} ${this.lastCompares === 1 ? "comparison" : "comparisons"}.${this.left ? "" : " The merge is complete."}`;
      this.mark(null);
      this.light(null);
      this.report();
      return;
    }
    this.step = step;
    this.hold = HOLD[step.kind];
    this.yard = step.yard;
    this.lastCompares = step.compares;
    this.count(step.compares);
    const seats = this.seats(step.yard);
    for (const puck of this.pucks.values()) {
      const home = seats.get(puck.key);
      if (!home) {
        // An output older than the tray's last slot leaves the bench.
        puck.fade = -1;
        continue;
      }
      if (!same(puck.flight?.to ?? puck.at, home)) this.fly(puck, home, step.kind === "out" && puck.key === step.focus);
    }
    this.mark(step.gate);
    this.light(step.focus);
  }

  private put(key: number, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "my-puck");
    node.innerHTML = puckSvg(key);
    this.layer.appendChild(node);
    const puck: Puck = { key, node, solid: node.querySelector(".my-body"), at, flight: null, alpha: 1, fade: 0 };
    this.pucks.set(key, puck);
    return puck;
  }

  private fly(puck: Puck, to: Point3, hop: boolean) {
    const from = puck.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const peak = Math.max(from[2], to[2]) + (hop ? HOP : 0);
    puck.flight = { from, to, control: hop ? 2 * peak - (from[2] + to[2]) / 2 : (from[2] + to[2]) / 2, age: 0, span: hop ? 0.46 + distance / 420 : 0.3 + distance / 300 };
  }

  private light(key: number | null) {
    for (const puck of this.pucks.values()) {
      if (puck.key === key) {
        puck.node.setAttribute("data-lit", "");
        puck.solid?.setAttribute("data-lit", "");
      } else {
        puck.node.removeAttribute("data-lit");
        puck.solid?.removeAttribute("data-lit");
      }
    }
  }

  private mark(gate: Gate | null) {
    this.rims.forEach((rim, at) => {
      if (at === gate) rim.setAttribute("data-on", "");
      else rim.removeAttribute("data-on");
    });
  }

  private count(value: number) {
    if (this.digits) this.digits.textContent = String(value).padStart(2, "0");
  }

  private sort() {
    const sorted = [...this.pucks.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((puck) => puck.key).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((puck) => fragment.appendChild(puck.node));
    this.layer.appendChild(fragment);
  }

  private paint() {
    for (const puck of this.pucks.values()) {
      puck.node.setAttribute("transform", translateAlong(P, puck.at));
      if (puck.alpha < 1) puck.node.setAttribute("opacity", Math.max(0, puck.alpha).toFixed(2));
      else puck.node.removeAttribute("opacity");
    }
    this.pointers.forEach((pointer, gate) => {
      if (pointer.drawn === pointer.lean) return;
      pointer.drawn = pointer.lean;
      pointer.node.innerHTML = pointerSvg(gate as Gate, pointer.lean);
    });
    for (const gate of GATE_IDS) {
      const winner = this.yard.winners[gate];
      const text = winner === null ? "--" : String(this.yard.runs[winner]![0]).padStart(2, "0");
      const window = this.windows.get(gate);
      if (window && window.textContent !== text) window.textContent = text;
    }
  }

  private speak() {
    if (this.steps) {
      this.say(this.step?.note ?? "");
      return;
    }
    const rest = `${this.yard.output.length} out · ${this.left} left in ${this.yard.runs.filter((run) => run.length).length} runs`;
    this.say(this.lastCompares === null ? rest : `${rest} · ${this.lastCompares} compares`);
  }

  private report() {
    this.changed({ busy: this.busy, output: this.yard.output, left: this.left, note: this.note });
  }
}

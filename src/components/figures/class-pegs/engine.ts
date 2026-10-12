import { translateAlong, type Point3 } from "../iso/iso-kit";
import { P, flagAt, laneAt, nearness, printAt, stackAt, tokenSvg } from "./geometry";
import { empty, type Bench, type Step } from "./model";

const SVG_NS = "http://www.w3.org/2000/svg";
const HOP = 20;
const FADE = 0.22;
const HOLD: Record<Step["kind"], number> = { pair: 0.45, new: 0.55, print: 0.5, skip: 0.6, pop: 0.6, done: 0.3 };

interface Flight {
  from: Point3;
  to: Point3;
  control: number;
  age: number;
  span: number;
}

interface Body {
  key: string;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
  fade: number;
}

export interface BenchState {
  busy: boolean;
  /** Steps of the script played so far. */
  played: number;
  read: number;
  classes: number[][];
  note: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const same = (a: Point3, b: Point3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export class BenchEngine {
  private bodies = new Map<string, Body>();
  private bench: Bench = empty();
  private played = 0;
  /** How many steps the reader has asked for; the engine plays until it has caught up. */
  private wanted = 0;
  private step: Step | null = null;
  private hold = 0;
  private order = "";
  private flags = new Map<number, Element>();
  private lanes = new Map<string, Element>();

  constructor(
    root: SVGSVGElement,
    private readonly layer: SVGGElement,
    private readonly script: Step[],
    private readonly say: (text: string) => void,
    private readonly changed: (state: BenchState) => void,
  ) {
    root.querySelectorAll("[data-flag]").forEach((node) => this.flags.set(Number(node.getAttribute("data-flag")), node));
    root.querySelectorAll("[data-lane]").forEach((node) => this.lanes.set(node.getAttribute("data-lane")!, node));
    this.reset();
  }

  get busy() {
    return this.step !== null || this.played < this.wanted;
  }

  get finished() {
    return this.played >= this.script.length;
  }

  /** Clears the bench: no pairs read, nothing printed. */
  reset() {
    this.bodies.forEach((body) => body.node.remove());
    this.bodies.clear();
    this.bench = empty();
    this.played = 0;
    this.wanted = 0;
    this.step = null;
    this.paint();
    this.report();
  }

  /** Asks for `count` more steps of the script. */
  advance(count: number) {
    this.wanted = Math.min(this.script.length, Math.max(this.wanted, this.played) + count);
    this.report();
  }

  /** Advances the bench; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const body of this.bodies.values()) {
      if (body.flight) {
        const flight = body.flight;
        flight.age = calm ? flight.span : flight.age + dt;
        const e = ease(Math.min(1, flight.age / flight.span));
        body.at = [
          flight.from[0] + (flight.to[0] - flight.from[0]) * e,
          flight.from[1] + (flight.to[1] - flight.from[1]) * e,
          (1 - e) * (1 - e) * flight.from[2] + 2 * e * (1 - e) * flight.control + e * e * flight.to[2],
        ];
        if (flight.age >= flight.span) {
          body.at = flight.to;
          body.flight = null;
        }
        moving = true;
      }
      if (body.fade) {
        body.alpha = calm ? (body.fade > 0 ? 1 : 0) : body.alpha + (body.fade * dt) / FADE;
        if (body.alpha >= 1 || body.alpha <= 0) {
          body.alpha = Math.max(0, Math.min(1, body.alpha));
          if (body.fade < 0) {
            body.node.remove();
            this.bodies.delete(body.key);
          }
          body.fade = 0;
        }
        moving = true;
      }
    }
    if (this.step) {
      if (!moving || calm) {
        this.hold -= dt;
        if (this.hold <= 0 || calm) {
          this.step = null;
          this.report();
        }
      }
      moving = true;
    } else if (this.played < this.wanted) {
      this.play(this.script[this.played++]!);
      moving = true;
    }
    this.sort();
    this.paint();
    this.say(this.step?.note ?? (this.finished ? `${this.bench.classes.length} classes · ${this.script[this.script.length - 1]!.read} pairs` : `${this.bench.classes.flat().length} printed · stack ${this.bench.stack.length}`));
    return moving;
  }

  dispose() {
    this.bodies.forEach((body) => body.node.remove());
    this.bodies.clear();
    this.wanted = this.played;
  }

  private play(step: Step) {
    this.step = step;
    this.hold = HOLD[step.kind];
    this.bench = step.bench;
    const seats = new Map<string, Point3>();
    step.bench.lanes.forEach((lane, at) => lane.forEach((token, place) => seats.set(`n${token.id}`, laneAt(at, place))));
    step.bench.stack.forEach((token, place) => seats.set(`n${token.id}`, stackAt(place)));
    step.bench.classes.forEach((members, row) => members.forEach((element, place) => seats.set(`p${element}`, printAt(row, place))));
    const data = new Map<string, number>();
    step.bench.lanes.flat().forEach((token) => data.set(`n${token.id}`, token.data));
    step.bench.stack.forEach((token) => data.set(`n${token.id}`, token.data));
    for (const [key, home] of seats) {
      let body = this.bodies.get(key);
      if (!body) {
        // A list node is set down from above its seat; a printed element rises from its out flag.
        const printed = key[0] === "p";
        const value = printed ? Number(key.slice(1)) : data.get(key)!;
        const from: Point3 = printed ? flagAt(value) : [home[0], home[1], home[2] + 14];
        body = this.put(key, value, printed, from);
        body.alpha = 0;
        body.fade = 1;
        this.fly(body, home, printed);
        continue;
      }
      if (!same(body.flight?.to ?? body.at, home)) this.fly(body, home, Math.abs(home[0] - body.at[0]) > 1);
    }
    // A node popped off the stack is used up.
    for (const body of this.bodies.values()) if (!seats.has(body.key)) body.fade = -1;
  }

  private put(key: string, value: number, printed: boolean, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "cp-token");
    node.innerHTML = tokenSvg(value, printed);
    this.layer.appendChild(node);
    const body: Body = { key, node, solid: node.querySelector(".cp-body"), at, flight: null, alpha: 1, fade: 0 };
    this.bodies.set(key, body);
    return body;
  }

  private fly(body: Body, to: Point3, hop: boolean) {
    const from = body.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const peak = Math.max(from[2], to[2]) + (hop ? HOP : 0);
    body.flight = { from, to, control: hop ? 2 * peak - (from[2] + to[2]) / 2 : (from[2] + to[2]) / 2, age: 0, span: hop ? 0.44 + distance / 460 : 0.3 + distance / 300 };
  }

  private sort() {
    const sorted = [...this.bodies.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((body) => body.key).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((body) => fragment.appendChild(body.node));
    this.layer.appendChild(fragment);
  }

  private paint() {
    const step = this.step;
    for (const body of this.bodies.values()) {
      body.node.setAttribute("transform", translateAlong(P, body.at));
      if (body.alpha < 1) body.node.setAttribute("opacity", body.alpha.toFixed(2));
      else body.node.removeAttribute("opacity");
      const lit = step !== null && (body.key === `n${step.focus}` || body.key === `p${step.printed}`);
      if (lit) {
        body.node.setAttribute("data-lit", "");
        body.solid?.setAttribute("data-lit", "");
      } else {
        body.node.removeAttribute("data-lit");
        body.solid?.removeAttribute("data-lit");
      }
    }
    this.flags.forEach((node, element) => node.setAttribute("opacity", this.bench.out[element] ? "1" : "0"));
    this.lanes.forEach((node, lane) => {
      const on = step !== null && (lane === String(step.lane) || (lane === "stack" && (step.kind === "print" || step.kind === "pop")));
      if (on) node.setAttribute("data-on", "");
      else node.removeAttribute("data-on");
    });
  }

  private report() {
    this.changed({ busy: this.busy, played: this.played, read: this.script[Math.max(0, this.played - 1)]?.read ?? 0, classes: this.bench.classes, note: this.played ? this.script[this.played - 1]!.note : "" });
  }
}

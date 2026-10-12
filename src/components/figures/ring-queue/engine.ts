import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { FEED, P, TRAY_SLOTS, angleOf, armSvg, nearness, puckSvg, slotAt, trayAt } from "./geometry";
import { CAPACITY, SLOTS, add, itemsOf, remove, sizeOf, type Item, type Played, type Ring, type Step } from "./model";

const SVG_NS = "http://www.w3.org/2000/svg";
const HOP = 24;
const FADE = 0.22;
const STEP = (Math.PI * 2) / SLOTS;

interface Flight {
  from: Point3;
  to: Point3;
  control: number;
  age: number;
  span: number;
}

interface Puck {
  item: Item;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  flight: Flight | null;
  alpha: number;
  fade: number;
}

interface Arm {
  node: SVGGElement;
  /** The angle shown, and the angle its index asks for; both only ever grow, so the arm always turns clockwise. */
  angle: number;
  target: number;
  drawn: number;
}

export interface QueueState {
  busy: boolean;
  items: number[];
  front: number;
  rear: number;
  note: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);

export class QueueEngine {
  private pucks = new Map<number, Puck>();
  private ring: Ring;
  private tray: number[] = [];
  private steps: Step[] | null = null;
  private step: Step | null = null;
  private hold = 0;
  private order = "";
  private note = "";
  private done = "";
  private nextId = 1;
  private arms: Record<"front" | "rear", Arm>;
  private rims = new Map<number, Element>();

  constructor(
    root: SVGSVGElement,
    armLayer: SVGGElement,
    private readonly layer: SVGGElement,
    ring: Ring,
    private readonly say: (text: string) => void,
    private readonly changed: (state: QueueState) => void,
  ) {
    this.ring = ring;
    const arm = (): Arm => {
      const node = document.createElementNS(SVG_NS, "g");
      armLayer.appendChild(node);
      return { node, angle: 0, target: 0, drawn: NaN };
    };
    this.arms = { front: arm(), rear: arm() };
    root.querySelectorAll("[data-slot]").forEach((rim) => this.rims.set(Number(rim.getAttribute("data-slot")), rim));
    this.reset(ring, "");
  }

  get busy() {
    return this.steps !== null;
  }

  /** Clears the turntable and sets the given queue on it at once. */
  reset(ring: Ring, note: string) {
    this.pucks.forEach((puck) => puck.node.remove());
    this.pucks.clear();
    this.tray = [];
    this.steps = null;
    this.step = null;
    this.ring = ring;
    this.note = note;
    ring.slots.forEach((item, slot) => {
      if (!item) return;
      this.nextId = Math.max(this.nextId, item.id + 1);
      this.put(item, slotAt(slot));
    });
    this.arms.front.angle = this.arms.front.target = angleOf(ring.front);
    this.arms.rear.angle = this.arms.rear.target = angleOf(ring.rear);
    this.mark(null);
    this.sort();
    this.paint();
    this.report();
  }

  add(value: number) {
    return this.begin(add(this.ring, { id: this.nextId, value }), `Added ${value} at the rear.`, {
      full: `Full: (rear + 1) % ${SLOTS} would equal front. One slot always stays empty, so ${CAPACITY} items fit.`,
    });
  }

  remove() {
    const first = itemsOf(this.ring)[0];
    return this.begin(remove(this.ring), `Deleted ${first?.value} from the front.`, { empty: "Empty: front equals rear." });
  }

  /** Advances the turntable; returns true while anything is still moving. */
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
        puck.alpha = calm ? (puck.fade > 0 ? 1 : 0) : puck.alpha + (puck.fade * dt) / FADE;
        if (puck.alpha >= 1 || puck.alpha <= 0) {
          puck.alpha = Math.max(0, Math.min(1, puck.alpha));
          if (puck.fade < 0) {
            puck.node.remove();
            this.pucks.delete(puck.item.id);
          }
          puck.fade = 0;
        }
        moving = true;
      }
    }
    for (const arm of Object.values(this.arms)) {
      if (arm.angle === arm.target) continue;
      arm.angle = follow(arm.angle, arm.target, dt, 0.12, calm);
      moving = true;
    }
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
    this.arms.front.node.remove();
    this.arms.rear.node.remove();
    this.steps = null;
  }

  private begin(played: Played, done: string, refusals: Partial<Record<NonNullable<Played["refused"]>, string>>) {
    if (this.busy) return false;
    if (!played.steps.length) {
      this.note = (played.refused && refusals[played.refused]) || "";
      this.report();
      return false;
    }
    this.nextId++;
    this.steps = [...played.steps];
    this.step = null;
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
      this.step = null;
    }
    const step = this.steps!.shift();
    if (!step) {
      this.steps = null;
      this.note = this.done;
      this.mark(null);
      this.light(null);
      this.report();
      return;
    }
    this.step = step;
    this.hold = 0.35;
    // An index only ever advances by one slot, clockwise.
    if (step.ring.front !== this.ring.front) this.arms.front.target += STEP;
    if (step.ring.rear !== this.ring.rear) this.arms.rear.target += STEP;
    this.ring = step.ring;
    if (step.enter) {
      const puck = this.put(step.enter, [FEED[0], FEED[1], FEED[2] + 12]);
      puck.alpha = 0;
      puck.fade = 1;
      this.fly(puck, FEED, false);
    }
    if (step.kind === "store") {
      const puck = this.pucks.get(step.focus!);
      if (puck) this.fly(puck, slotAt(step.ring.rear), true);
    }
    if (step.out) this.discard(step.out.id);
    this.mark(step.kind === "rear" || step.kind === "store" ? step.ring.rear : step.ring.front);
    this.light(step.focus);
  }

  /** Sends a deleted item to the tray; the items already there slide along, and the oldest leaves. */
  private discard(id: number) {
    if (this.tray.length >= TRAY_SLOTS) {
      const oldest = this.pucks.get(this.tray.pop()!);
      if (oldest) oldest.fade = -1;
    }
    this.tray.forEach((other, slot) => {
      const puck = this.pucks.get(other);
      if (puck) this.fly(puck, trayAt(slot + 1), false);
    });
    this.tray.unshift(id);
    const puck = this.pucks.get(id);
    if (puck) this.fly(puck, trayAt(0), true);
  }

  private put(item: Item, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "rq-puck");
    node.innerHTML = puckSvg(item.value);
    this.layer.appendChild(node);
    const puck: Puck = { item, node, solid: node.querySelector(".rq-body"), at, flight: null, alpha: 1, fade: 0 };
    this.pucks.set(item.id, puck);
    return puck;
  }

  private fly(puck: Puck, to: Point3, hop: boolean) {
    const from = puck.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const peak = Math.max(from[2], to[2]) + (hop ? HOP : 0);
    puck.flight = { from, to, control: hop ? 2 * peak - (from[2] + to[2]) / 2 : (from[2] + to[2]) / 2, age: 0, span: hop ? 0.44 + distance / 420 : 0.3 + distance / 300 };
  }

  private light(id: number | null) {
    for (const puck of this.pucks.values()) {
      if (puck.item.id === id) {
        puck.node.setAttribute("data-lit", "");
        puck.solid?.setAttribute("data-lit", "");
      } else {
        puck.node.removeAttribute("data-lit");
        puck.solid?.removeAttribute("data-lit");
      }
    }
  }

  /** Rings the slot an index has just moved to. */
  private mark(slot: number | null) {
    this.rims.forEach((rim, at) => {
      if (at === slot) rim.setAttribute("data-on", "");
      else rim.removeAttribute("data-on");
    });
  }

  private sort() {
    const sorted = [...this.pucks.values()].sort((a, b) => nearness(a.at) - nearness(b.at));
    const order = sorted.map((puck) => puck.item.id).join(",");
    if (order === this.order) return;
    this.order = order;
    const fragment = document.createDocumentFragment();
    sorted.forEach((puck) => fragment.appendChild(puck.node));
    this.layer.appendChild(fragment);
  }

  private paint() {
    for (const puck of this.pucks.values()) {
      puck.node.setAttribute("transform", translateAlong(P, puck.at));
      if (puck.alpha < 1) puck.node.setAttribute("opacity", puck.alpha.toFixed(2));
      else puck.node.removeAttribute("opacity");
    }
    for (const which of ["front", "rear"] as const) {
      const arm = this.arms[which];
      if (arm.drawn === arm.angle) continue;
      arm.drawn = arm.angle;
      arm.node.innerHTML = armSvg(which, arm.angle);
    }
  }

  private speak() {
    if (this.steps) {
      this.say(this.step?.note ?? "");
      return;
    }
    this.say(`front ${this.ring.front} · rear ${this.ring.rear} · ${sizeOf(this.ring)} of ${CAPACITY}`);
  }

  private report() {
    this.changed({ busy: this.busy, items: itemsOf(this.ring).map((item) => item.value), front: this.ring.front, rear: this.ring.rear, note: this.note });
  }
}

import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { HOME, P, headAt } from "./geometry";
import { MASTER, SLOTS, filterOf, type Step } from "./model";

const HOLD = 0.85;

export interface DeskState {
  busy: boolean;
  step: Step;
}

/** Plays a lookup or an update on the desk: writes the texts, raises the filter pegs, rings what is read, and moves the read head. */
export class DeskEngine {
  private queue: Step[] | null = null;
  private hold = 0;
  private step: Step;
  private at: Point3 = [...HOME];
  private goal: Point3 = [...HOME];
  private head: Element | null;
  private digits: Element | null;
  private stations: Element[];

  constructor(
    private readonly root: SVGSVGElement,
    step: Step,
    private readonly say: (text: string) => void,
    private readonly changed: (state: DeskState) => void,
  ) {
    this.step = step;
    this.head = root.querySelector('[data-part="head"]');
    this.digits = root.querySelector('[data-part="count"]');
    this.stations = [...root.querySelectorAll("[data-st]")];
    this.show(step);
  }

  get busy() {
    return this.queue !== null;
  }

  show(step: Step) {
    this.queue = null;
    this.adopt(step);
    this.at = [...this.goal];
    this.paint();
    this.changed({ busy: false, step });
  }

  play(steps: Step[]) {
    if (this.busy || !steps.length) return false;
    this.queue = [...steps];
    this.hold = 0;
    this.changed({ busy: true, step: this.step });
    return true;
  }

  tick(dt: number, calm: boolean) {
    let moving = false;
    if (this.at.some((value, axis) => value !== this.goal[axis])) {
      this.at = this.at.map((value, axis) => follow(value, this.goal[axis]!, dt, 0.11, calm)) as Point3;
      if (Math.hypot(...this.at.map((value, axis) => value - this.goal[axis]!)) < 0.25) this.at = [...this.goal];
      moving = true;
    }
    if (this.queue) {
      if (!moving || calm) {
        this.hold -= dt;
        if (this.hold <= 0 || calm) {
          const next = this.queue.shift();
          if (next) {
            this.adopt(next);
            this.hold = next.hold ?? HOLD;
          } else {
            this.queue = null;
            this.changed({ busy: false, step: this.step });
          }
        }
      }
      moving = true;
    }
    this.paint();
    return moving;
  }

  dispose() {
    this.queue = null;
  }

  private adopt(step: Step) {
    this.step = step;
    this.goal = step.head ? headAt(step.head) : [...HOME];
    const { desk } = step;
    const write = (id: string, text: string) => {
      const node = this.root.querySelector(`[data-text="${id}"]`);
      if (node && node.textContent !== text) node.textContent = text;
    };
    MASTER.forEach((_, at) => write(`mf${at}`, `v${desk.master[at]}`));
    for (let slot = 0; slot < SLOTS; slot++) {
      const record = desk.diff[slot];
      if (record) {
        write(`df${slot}`, `v${record.version}`);
        write(`di${slot}`, String(record.key));
      }
      this.root.querySelectorAll(`[data-slot="${slot}"]`).forEach((group) => group.setAttribute("opacity", record ? "1" : "0"));
    }
    const filter = filterOf(desk);
    const on = new Set(step.on);
    for (const station of this.stations) {
      const id = station.getAttribute("data-st")!;
      const target = station.matches(".fig-rim") ? station : station.querySelector(".fig-rim");
      if (on.has(id)) target?.setAttribute("data-on", "");
      else target?.removeAttribute("data-on");
      if (step.lit === id) station.setAttribute("data-lit", "");
      else station.removeAttribute("data-lit");
      if (id.startsWith("f")) {
        const set = filter[Number(id.slice(1))];
        station.querySelector('[data-peg="up"]')?.setAttribute("display", set ? "inline" : "none");
        station.querySelector('[data-peg="down"]')?.setAttribute("display", set ? "none" : "inline");
      }
    }
    if (this.digits) this.digits.textContent = String(step.count).padStart(2, "0");
    this.say(step.note);
  }

  private paint() {
    this.head?.setAttribute("transform", translateAlong(P, this.at));
    this.head?.setAttribute("opacity", this.step.head || this.at.some((value, axis) => value !== HOME[axis]) ? "1" : "0");
  }
}

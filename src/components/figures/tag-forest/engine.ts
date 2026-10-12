import { translateAlong, type Point3 } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { COIN_R, HOOK_Z, P, coinSvg, laneX, levelZ, stringSvg } from "./geometry";
import { ELEMENTS, find, layout, setsOf, union, type Forest, type Step } from "./model";

const SVG_NS = "http://www.w3.org/2000/svg";
const HOLD: Record<Step["kind"], number> = { walk: 0.45, root: 0.6, link: 0.7, lift: 0.6, same: 0.9 };

interface Tag {
  node: SVGGElement;
  body: Element | null;
  string: SVGGElement;
  at: Point3;
  drawn: string;
}

export interface ForestState {
  busy: boolean;
  parent: Forest;
  sets: number;
  note: string;
}

interface Operation {
  verb: string;
  steps: Step[];
  followed: number;
  done: (operation: Operation, last: Step) => string;
}

const links = (count: number) => `${count} ${count === 1 ? "link" : "links"} followed`;

export class ForestEngine {
  private tags: Tag[] = [];
  private parent: Forest;
  private operation: Operation | null = null;
  private step: Step | null = null;
  private last: Step | null = null;
  private hold = 0;
  private lastFollowed: number | null = null;
  private note = "";
  private digits: Element | null;
  private cells = new Map<number, Element>();

  constructor(
    root: SVGSVGElement,
    stringLayer: SVGGElement,
    tagLayer: SVGGElement,
    parent: Forest,
    private readonly say: (text: string) => void,
    private readonly changed: (state: ForestState) => void,
  ) {
    this.parent = parent;
    this.digits = root.querySelector('[data-part="followed"]');
    root.querySelectorAll("[data-cell]").forEach((text) => this.cells.set(Number(text.getAttribute("data-cell")), text));
    for (let element = 0; element < ELEMENTS; element++) {
      const node = document.createElementNS(SVG_NS, "g");
      node.setAttribute("class", "tf-tag");
      node.innerHTML = coinSvg(element);
      tagLayer.appendChild(node);
      const string = document.createElementNS(SVG_NS, "g");
      stringLayer.appendChild(string);
      this.tags.push({ node, body: node.querySelector(".tf-body"), string, at: [0, 0, 0], drawn: "" });
    }
    this.reset(parent, "");
  }

  get busy() {
    return this.operation !== null;
  }

  get forest() {
    return this.parent;
  }

  /** Clears the rack and hangs the given forest at once. */
  reset(parent: Forest, note: string) {
    this.parent = parent;
    this.operation = null;
    this.step = null;
    this.last = null;
    this.lastFollowed = null;
    this.note = note;
    const seats = this.seats();
    this.tags.forEach((tag, element) => {
      tag.at = seats[element]!;
      tag.drawn = "";
    });
    this.count(0);
    this.paint(null);
    this.report();
  }

  union(a: number, b: number) {
    return this.begin(`union(${a}, ${b})`, union(this.parent, a, b), (operation, last) =>
      last.kind === "same" ? `${a} and ${b} were already in one set.` : `Union(${a}, ${b}): the smaller tree went under the larger (${last.note}).`,
    );
  }

  find(element: number) {
    return this.begin(`find(${element})`, find(this.parent, element), (operation, last) => {
      const lifted = operation.steps.length === 0 && last.kind === "lift";
      return `Find(${element}) = ${last.trail}, after ${links(operation.followed)}.${lifted ? " The path now hangs directly under the root." : ""}`;
    });
  }

  /** Advances the forest; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    const seats = this.seats();
    this.tags.forEach((tag, element) => {
      const goal = seats[element]!;
      if (tag.at[0] === goal[0] && tag.at[2] === goal[2]) return;
      tag.at = calm ? goal : [follow(tag.at[0], goal[0], dt, 0.14), 0, follow(tag.at[2], goal[2], dt, 0.14)];
      if (Math.hypot(tag.at[0] - goal[0], tag.at[2] - goal[2]) < 0.2) tag.at = goal;
      moving = true;
    });
    if (this.operation) {
      this.advance(dt, calm, moving);
      moving = true;
    }
    this.paint(this.step ?? this.last);
    this.speak();
    return moving;
  }

  dispose() {
    this.tags.forEach((tag) => {
      tag.node.remove();
      tag.string.remove();
    });
    this.tags = [];
    this.operation = null;
  }

  private seats(): Point3[] {
    return layout(this.parent).map(({ lane, depth }) => [laneX(lane), 0, levelZ(depth)]);
  }

  private begin(verb: string, steps: Step[], done: Operation["done"]) {
    if (this.busy || !steps.length) return false;
    this.operation = { verb, steps: [...steps], followed: 0, done };
    this.step = null;
    this.last = null;
    this.hold = 0;
    this.lastFollowed = null;
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
      this.lastFollowed = operation.followed;
      this.note = operation.done(operation, this.last!);
      this.last = null;
      this.report();
      return;
    }
    this.step = step;
    this.parent = step.parent;
    this.hold = HOLD[step.kind];
    operation.followed = step.followed;
    this.count(step.followed);
  }

  private count(value: number) {
    if (this.digits) this.digits.textContent = String(value).padStart(2, "0");
  }

  private paint(step: Step | null) {
    this.tags.forEach((tag, element) => {
      tag.node.setAttribute("transform", translateAlong(P, tag.at));
      const above = this.parent[element]!;
      const from: Point3 = above < 0 ? [tag.at[0], 0, HOOK_Z] : [this.tags[above]!.at[0], 0, this.tags[above]!.at[2] - COIN_R];
      const drawn = [...from, ...tag.at].map((value) => value.toFixed(2)).join(",");
      if (drawn !== tag.drawn) {
        tag.drawn = drawn;
        tag.string.innerHTML = stringSvg(from, tag.at);
      }
      const lit = step?.focus === element;
      if (lit) {
        tag.node.setAttribute("data-lit", "");
        tag.body?.setAttribute("data-lit", "");
      } else {
        tag.node.removeAttribute("data-lit");
        tag.body?.removeAttribute("data-lit");
      }
      if (step?.trail === element) tag.node.setAttribute("data-on", "");
      else tag.node.removeAttribute("data-on");
    });
    this.cells.forEach((text, element) => {
      const value = String(this.parent[element]);
      if (text.textContent !== value) text.textContent = value;
    });
  }

  private speak() {
    if (this.operation) {
      this.say(this.step?.note ?? this.operation.verb);
      return;
    }
    const sets = setsOf(this.parent);
    const rest = `${ELEMENTS} elements · ${sets} ${sets === 1 ? "set" : "sets"}`;
    this.say(this.lastFollowed === null ? rest : `${rest} · ${links(this.lastFollowed)}`);
  }

  private report() {
    this.changed({ busy: this.busy, parent: this.parent, sets: setsOf(this.parent), note: this.note });
  }
}

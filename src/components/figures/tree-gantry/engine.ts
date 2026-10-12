import { translateAlong } from "../iso/iso-kit";
import { follow } from "../iso/react/live";
import { P, POINTER_X, layout, stringSvg, tagSvg, type Seat } from "./geometry";
import type { TreeFrame, TreeNode } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";
const FADE = 0.2;
const HOLD = 0.7;

interface Tag {
  node: SVGGElement;
  string: SVGGElement;
  body: Element | null;
  /** What the tag was last drawn from: a change of key, kind or mark redraws it. */
  face: string;
  seat: Seat;
  x: number;
  z: number;
  alpha: number;
  leaving: boolean;
  drawn: string;
}

export interface GantryState {
  busy: boolean;
  /** The frame on show once nothing is moving. */
  frame: TreeFrame;
  /** The note the last sequence ended on. */
  note: string;
}

const faceOf = (node: TreeNode) => [node.kind, node.cells.join("|"), node.sub ?? "", node.marked ? "m" : ""].join("/");

/** Moves the tags of a tree between frames: tags glide to their new places, new ones fade in, removed ones fade out. */
export class GantryEngine {
  private tags = new Map<string, Tag>();
  private frame: TreeFrame;
  private queue: TreeFrame[] | null = null;
  private hold = 0;
  private note = "";
  private pointer: Element | null;
  private pointerX = POINTER_X;
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    private readonly stringLayer: SVGGElement,
    private readonly tagLayer: SVGGElement,
    frame: TreeFrame,
    private readonly say: (text: string) => void,
    private readonly changed: (state: GantryState) => void,
  ) {
    this.frame = frame;
    this.pointer = root.querySelector('[data-part="pointer"]');
    this.digits = root.querySelector('[data-part="count"]');
    this.show(frame, "");
  }

  get busy() {
    return this.queue !== null;
  }

  /** Puts a frame on the gantry at once. */
  show(frame: TreeFrame, note: string) {
    this.tags.forEach((tag) => {
      tag.node.remove();
      tag.string.remove();
    });
    this.tags.clear();
    this.queue = null;
    this.note = note;
    this.adopt(frame);
    for (const tag of this.tags.values()) {
      tag.x = tag.seat.x;
      tag.z = tag.seat.z;
      tag.alpha = 1;
    }
    this.pointerX = this.pointerTarget();
    this.paint();
    this.report();
  }

  /** Plays a list of frames, one after another. */
  play(frames: TreeFrame[]) {
    if (this.busy || !frames.length) return false;
    this.queue = [...frames];
    this.hold = 0;
    this.report();
    return true;
  }

  /** Advances the gantry; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const [id, tag] of this.tags) {
      if (tag.x !== tag.seat.x || tag.z !== tag.seat.z) {
        tag.x = follow(tag.x, tag.seat.x, dt, 0.13, calm);
        tag.z = follow(tag.z, tag.seat.z, dt, 0.13, calm);
        if (Math.hypot(tag.x - tag.seat.x, tag.z - tag.seat.z) < 0.2) [tag.x, tag.z] = [tag.seat.x, tag.seat.z];
        moving = true;
      }
      const target = tag.leaving ? 0 : 1;
      if (tag.alpha !== target) {
        const step = calm ? 1 : dt / FADE;
        tag.alpha = target ? Math.min(1, tag.alpha + step) : Math.max(0, tag.alpha - step);
        if (!target && tag.alpha === 0) {
          tag.node.remove();
          tag.string.remove();
          this.tags.delete(id);
        }
        moving = true;
      }
    }
    const goal = this.pointerTarget();
    if (this.pointerX !== goal) {
      this.pointerX = follow(this.pointerX, goal, dt, 0.13, calm);
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
            this.note = this.frame.note;
            this.report();
          }
        }
      }
      moving = true;
    }
    this.paint();
    this.say(this.frame.note);
    return moving;
  }

  dispose() {
    this.tags.forEach((tag) => {
      tag.node.remove();
      tag.string.remove();
    });
    this.tags.clear();
    this.queue = null;
  }

  /** Makes `frame` the one on show: seats every tag, adds the new ones, and sends away the ones that are gone. */
  private adopt(frame: TreeFrame) {
    this.frame = frame;
    const seats = layout(frame);
    const kept = new Set<string>();
    for (const node of frame.nodes) {
      const seat = seats.get(node.id)!;
      kept.add(node.id);
      let tag = this.tags.get(node.id);
      if (!tag) {
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("class", "tg-tag");
        this.tagLayer.appendChild(group);
        const string = document.createElementNS(SVG_NS, "g");
        this.stringLayer.appendChild(string);
        // A new tag appears a little above its place and settles into it.
        tag = { node: group, string, body: null, face: "", seat, x: seat.x, z: seat.z + 12, alpha: 0, leaving: false, drawn: "" };
        this.tags.set(node.id, tag);
      }
      tag.seat = seat;
      tag.leaving = false;
      const face = faceOf(node);
      if (face !== tag.face) {
        tag.face = face;
        tag.node.innerHTML = tagSvg(node);
        tag.body = tag.node.querySelector(".tg-body");
      }
      tag.node.setAttribute("data-node", node.id);
    }
    for (const [id, tag] of this.tags) if (!kept.has(id)) tag.leaving = true;
    if (this.digits && frame.count !== undefined) this.digits.textContent = String(frame.count).padStart(2, "0");
  }

  private pointerTarget() {
    const at = this.frame.pointer ? this.tags.get(this.frame.pointer) : undefined;
    return at ? at.x : this.pointerX;
  }

  private paint() {
    const byId = new Map(this.frame.nodes.map((node) => [node.id, node]));
    const on = new Set(this.frame.on ?? []);
    for (const [id, tag] of this.tags) {
      tag.node.setAttribute("transform", translateAlong(P, [tag.x, 0, tag.z]));
      for (const part of [tag.node, tag.string]) {
        if (tag.alpha < 1) part.setAttribute("opacity", tag.alpha.toFixed(2));
        else part.removeAttribute("opacity");
      }
      const lit = this.frame.lit === id;
      if (lit) {
        tag.node.setAttribute("data-lit", "");
        tag.body?.setAttribute("data-lit", "");
      } else {
        tag.node.removeAttribute("data-lit");
        tag.body?.removeAttribute("data-lit");
      }
      if (on.has(id)) tag.node.setAttribute("data-on", "");
      else tag.node.removeAttribute("data-on");
      const node = byId.get(id);
      if (!node) continue;
      const parent = node.parent ? this.tags.get(node.parent) : undefined;
      const parentNode = node.parent ? byId.get(node.parent) : undefined;
      const here: Seat = { ...tag.seat, x: tag.x, z: tag.z };
      const above: Seat | null = parent ? { ...parent.seat, x: parent.x, z: parent.z } : null;
      const drawn = [here.x, here.z, above?.x ?? 0, above?.z ?? 0, node.port, node.heavy ? 1 : 0, node.via ?? ""].map((value) => (typeof value === "number" ? value.toFixed(2) : value)).join(",");
      if (drawn !== tag.drawn) {
        tag.drawn = drawn;
        tag.string.innerHTML = stringSvg(node, here, above, parentNode ? Math.max(parentNode.ports, 1) : 1);
      }
    }
    if (this.pointer) {
      this.pointer.setAttribute("transform", translateAlong(P, [this.pointerX - POINTER_X, 0, 0]));
      this.pointer.setAttribute("opacity", this.frame.pointer ? "1" : "0.25");
    }
  }

  private report() {
    this.changed({ busy: this.busy, frame: this.frame, note: this.note });
  }
}

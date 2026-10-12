import { translateAlong, type Point3 } from "../iso/iso-kit";
import { spring, type Spring } from "../iso/react/live";
import { armSvg, coinSvg, riderDrop, slopeOf, stringSvg } from "./geometry";
import { CAPACITY, has, heightLimit, insert, rootOf, type Frame, type RotationKind, type Tree } from "./model";
import { CENTRE, COIN_R, CRADLE, EYE, FRONT, HOOK_Z, P, hubZ, laneX } from "./view";

const SVG_NS = "http://www.w3.org/2000/svg";
const FADE = 0.2;

interface Move {
  from: Point3;
  to: Point3;
  age: number;
  span: number;
}

interface Coin {
  key: number;
  node: SVGGElement;
  solid: Element | null;
  at: Point3;
  move: Move | null;
  alpha: number;
  /** 1 while appearing, 0 otherwise. */
  fade: number;
  /** The beam's lean in notches of balance, sprung toward the node's balance factor. */
  tilt: Spring;
}

interface Arm {
  parent: number;
  child: number;
  node: SVGGElement;
  alpha: number;
  drawn: string;
}

interface Beat {
  run: () => void;
  hold: number;
}

export interface MobileState {
  busy: boolean;
  keys: number[];
  height: number;
  limit: number;
  /** What the last operation did, in words, for the caption and the live region. */
  note: string;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const edgeId = (parent: number, child: number) => `${parent}>${child}`;

function edgesOf(tree: Tree) {
  const edges = new Set<string>();
  for (const hung of tree) {
    if (hung.left !== null) edges.add(edgeId(hung.key, hung.left));
    if (hung.right !== null) edges.add(edgeId(hung.key, hung.right));
  }
  return edges;
}

const seatOf = (tree: Tree, key: number): Point3 => {
  const hung = tree.find((item) => item.key === key)!;
  return [laneX(hung.rank, tree.length), 0, hubZ(hung.depth)];
};

export class MobileEngine {
  private coins = new Map<number, Coin>();
  private arms = new Map<string, Arm>();
  private wanted = new Set<string>();
  private tree: Tree = [];
  private beats: Beat[] = [];
  private running = false;
  private waiting = false;
  private hold = 0;
  private verb = "";
  private turns = 0;
  private lastRotation: RotationKind | null = null;
  private note = "";
  private rootString: SVGGElement;
  private rootDrawn = "";
  private trolley: Element | null;
  private riders: { now: { node: Element | null; spring: Spring }; limit: { node: Element | null; spring: Spring } };
  private digits: Element | null;

  constructor(
    root: SVGSVGElement,
    private readonly armLayer: SVGGElement,
    private readonly coinLayer: SVGGElement,
    tree: Tree,
    private readonly say: (text: string) => void,
    private readonly changed: (state: MobileState) => void,
  ) {
    this.rootString = document.createElementNS(SVG_NS, "g");
    armLayer.appendChild(this.rootString);
    this.trolley = root.querySelector('[data-part="trolley"]');
    this.riders = {
      now: { node: root.querySelector('[data-part="rider-now"]'), spring: { at: 0, rate: 0 } },
      limit: { node: root.querySelector('[data-part="rider-limit"]'), spring: { at: 0, rate: 0 } },
    };
    this.digits = root.querySelector('[data-part="turns"]');
    this.reset(tree, "");
  }

  get busy() {
    return this.running;
  }

  get full() {
    return this.tree.length >= CAPACITY;
  }

  holds(key: number) {
    return has(this.tree, key);
  }

  /** Clears the gantry and hangs the given tree at once. */
  reset(tree: Tree, note: string) {
    this.coins.forEach((coin) => coin.node.remove());
    this.coins.clear();
    this.arms.forEach((arm) => arm.node.remove());
    this.arms.clear();
    this.beats = [];
    this.running = false;
    this.waiting = false;
    this.tree = tree;
    this.wanted = edgesOf(tree);
    this.turns = 0;
    this.lastRotation = null;
    this.note = note;
    for (const hung of tree) this.add(hung.key, seatOf(tree, hung.key)).tilt.at = hung.balance;
    this.wanted.forEach((id) => (this.arm(id).alpha = 1));
    this.riders.now.spring = { at: riderDrop(rootOf(tree)?.height ?? 0), rate: 0 };
    this.riders.limit.spring = { at: riderDrop(heightLimit(tree.length)), rate: 0 };
    this.count();
    this.paint();
    this.report();
  }

  /** Hangs a new key: plays the search, the hang, and whatever rotations repair the balance. */
  insert(key: number) {
    if (this.running) return false;
    const frames = insert(this.tree, key);
    if (!frames.length) {
      this.note = this.holds(key) ? `${key} is already in the tree.` : "The gantry is full.";
      this.report();
      return false;
    }
    this.verb = `inserting ${key}`;
    this.lastRotation = null;
    this.beats = this.score(key, frames);
    this.running = true;
    this.waiting = false;
    this.report();
    return true;
  }

  /** Advances the mobile; returns true while anything is still moving. */
  tick(dt: number, calm: boolean) {
    let moving = false;
    for (const coin of this.coins.values()) {
      if (coin.move) {
        const move = coin.move;
        move.age = calm ? move.span : move.age + dt;
        const e = ease(Math.min(1, move.age / move.span));
        coin.at = [0, 1, 2].map((axis) => move.from[axis]! + (move.to[axis]! - move.from[axis]!) * e) as Point3;
        if (move.age >= move.span) {
          coin.at = move.to;
          coin.move = null;
        }
        moving = true;
      }
      if (coin.fade) {
        coin.alpha = calm ? 1 : Math.min(1, coin.alpha + dt / FADE);
        if (coin.alpha >= 1) coin.fade = 0;
        moving = true;
      }
      const balance = this.tree.find((hung) => hung.key === coin.key)?.balance ?? 0;
      if (!spring(coin.tilt, balance, dt, 70, 11, calm)) moving = true;
    }
    for (const [id, arm] of this.arms) {
      const target = this.wanted.has(id) ? 1 : 0;
      if (arm.alpha === target) continue;
      const step = calm ? 1 : dt / FADE;
      arm.alpha = target ? Math.min(1, arm.alpha + step) : Math.max(0, arm.alpha - step);
      if (!target && arm.alpha === 0) {
        arm.node.remove();
        this.arms.delete(id);
      }
      moving = true;
    }
    if (this.running) {
      moving = true;
      this.advance(dt, calm);
    }
    const nowStill = spring(this.riders.now.spring, riderDrop(rootOf(this.tree)?.height ?? 0), dt, 120, 16, calm);
    const limitStill = spring(this.riders.limit.spring, riderDrop(heightLimit(this.tree.length)), dt, 120, 16, calm);
    this.paint();
    this.speak();
    return moving || !nowStill || !limitStill;
  }

  dispose() {
    this.coins.forEach((coin) => coin.node.remove());
    this.arms.forEach((arm) => arm.node.remove());
    this.rootString.remove();
    this.coins.clear();
    this.arms.clear();
    this.running = false;
  }

  /** Turns the model's frames into the beats the gantry plays. */
  private score(key: number, frames: Frame[]): Beat[] {
    const beats: Beat[] = [];
    let before = this.tree;
    beats.push({
      run: () => {
        const coin = this.add(key, [CRADLE[0], CRADLE[1], CRADLE[2] + 10]);
        coin.alpha = 0;
        coin.fade = 1;
        this.glide(coin, CRADLE);
        this.light(key);
      },
      hold: 0.2,
    });
    for (const frame of frames) {
      const { tree, at, rotation } = frame;
      if (frame.kind === "seek") {
        beats.push({
          run: () => {
            const [x, , z] = seatOf(this.tree, at!);
            this.glide(this.coins.get(key)!, [x + (key < at! ? -11 : 11), FRONT, z + 7]);
            this.mark(at);
            this.verb = `inserting ${key} · ${key < at! ? "left of" : "right of"} ${at}`;
          },
          hold: 0.34,
        });
      } else if (frame.kind === "hang") {
        beats.push({
          run: () => {
            this.mark(null);
            this.verb = `inserting ${key}`;
            this.hang(tree);
            this.wanted = edgesOf(tree);
          },
          hold: 0.5,
        });
        before = tree;
      } else if (frame.kind === "tip") {
        beats.push({
          run: () => {
            this.mark(at);
            this.verb = `inserting ${key} · ${rotation} at ${at}`;
            this.lastRotation = rotation;
          },
          hold: 0.8,
        });
      } else if (frame.kind === "turn") {
        const kept = new Set([...edgesOf(before)].filter((id) => edgesOf(tree).has(id)));
        // Unhook what changes, move the tags, then hook the new arms.
        beats.push({ run: () => (this.wanted = kept), hold: FADE + 0.04 });
        beats.push({ run: () => this.hang(tree), hold: 0.06 });
        beats.push({
          run: () => {
            this.wanted = edgesOf(tree);
            this.turns++;
            this.count();
          },
          hold: 0.4,
        });
        before = tree;
      }
    }
    beats.push({
      run: () => {
        this.mark(null);
        this.light(null);
        const rotation = frames[frames.length - 1]!.rotation;
        const pivot = frames.find((frame) => frame.kind === "tip")?.at;
        this.note = rotation ? `Inserted ${key}; repaired with ${rotation} rotation at ${pivot}.` : `Inserted ${key}; no rotation needed.`;
      },
      hold: 0,
    });
    return beats;
  }

  private advance(dt: number, calm: boolean) {
    if (this.waiting) {
      if ([...this.coins.values()].some((coin) => coin.move)) return;
      this.hold -= dt;
      if (this.hold > 0 && !calm) return;
      this.waiting = false;
    }
    const beat = this.beats.shift();
    if (!beat) {
      this.running = false;
      this.report();
      return;
    }
    beat.run();
    this.hold = beat.hold;
    this.waiting = true;
  }

  /** Makes `tree` the tree on show and sends every tag to its place in it. */
  private hang(tree: Tree) {
    this.tree = tree;
    for (const hung of tree) {
      const coin = this.coins.get(hung.key);
      if (coin) this.glide(coin, seatOf(tree, hung.key));
    }
  }

  private add(key: number, at: Point3) {
    const node = document.createElementNS(SVG_NS, "g");
    node.setAttribute("class", "am-coin");
    node.innerHTML = coinSvg(key);
    this.coinLayer.appendChild(node);
    const coin: Coin = { key, node, solid: node.querySelector(".am-body"), at, move: null, alpha: 1, fade: 0, tilt: { at: 0, rate: 0 } };
    this.coins.set(key, coin);
    return coin;
  }

  private arm(id: string) {
    let arm = this.arms.get(id);
    if (!arm) {
      const [parent, child] = id.split(">").map(Number) as [number, number];
      const node = document.createElementNS(SVG_NS, "g");
      this.armLayer.appendChild(node);
      arm = { parent, child, node, alpha: 0, drawn: "" };
      this.arms.set(id, arm);
    }
    return arm;
  }

  private glide(coin: Coin, to: Point3) {
    const from = coin.at;
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    if (distance < 1e-6) return;
    coin.move = { from, to, age: 0, span: 0.34 + distance / 260 };
  }

  private light(key: number | null) {
    for (const coin of this.coins.values()) {
      if (coin.key === key) {
        coin.node.setAttribute("data-lit", "");
        coin.solid?.setAttribute("data-lit", "");
        this.coinLayer.appendChild(coin.node);
      } else {
        coin.node.removeAttribute("data-lit");
        coin.solid?.removeAttribute("data-lit");
      }
    }
  }

  private mark(key: number | null) {
    for (const coin of this.coins.values()) {
      if (coin.key === key) coin.node.setAttribute("data-on", "");
      else coin.node.removeAttribute("data-on");
    }
  }

  private count() {
    if (this.digits) this.digits.textContent = String(this.turns).padStart(2, "0");
  }

  private paint() {
    for (const coin of this.coins.values()) {
      coin.node.setAttribute("transform", translateAlong(P, coin.at));
      if (coin.alpha < 1) coin.node.setAttribute("opacity", coin.alpha.toFixed(2));
      else coin.node.removeAttribute("opacity");
    }
    this.wanted.forEach((id) => this.arm(id));
    const reach = new Map<number, number>();
    for (const arm of this.arms.values()) {
      const parent = this.coins.get(arm.parent);
      const child = this.coins.get(arm.child);
      if (parent && child) reach.set(arm.parent, Math.max(reach.get(arm.parent) ?? 0, Math.abs(child.at[0] - parent.at[0])));
    }
    for (const arm of this.arms.values()) {
      const parent = this.coins.get(arm.parent);
      const child = this.coins.get(arm.child);
      if (!parent || !child) continue;
      const dx = child.at[0] - parent.at[0];
      const lowest = child.at[2] + COIN_R + EYE * 2 + 1.5;
      const end: Point3 = [child.at[0], 0, Math.max(lowest, parent.at[2] + dx * slopeOf(parent.tilt.at, reach.get(arm.parent) ?? 0))];
      const drawn = [parent.at, end, child.at].map((point) => point.map((value) => value.toFixed(2)).join(",")).join("|");
      if (drawn !== arm.drawn) {
        arm.drawn = drawn;
        arm.node.innerHTML = armSvg(parent.at, end, child.at);
      }
      if (arm.alpha < 1) arm.node.setAttribute("opacity", arm.alpha.toFixed(2));
      else arm.node.removeAttribute("opacity");
    }
    const top = rootOf(this.tree);
    const head = top ? this.coins.get(top.key) : undefined;
    const drawn = head ? head.at.map((value) => value.toFixed(2)).join(",") : "";
    if (drawn !== this.rootDrawn) {
      this.rootDrawn = drawn;
      this.rootString.innerHTML = head ? stringSvg([head.at[0], 0, HOOK_Z], head.at) : "";
      if (head) this.trolley?.setAttribute("transform", translateAlong(P, [head.at[0] - CENTRE, 0, 0]));
    }
    for (const rider of [this.riders.now, this.riders.limit]) {
      if (!rider.node) continue;
      if (rider.spring.at) rider.node.setAttribute("transform", translateAlong(P, [0, 0, -rider.spring.at]));
      else rider.node.removeAttribute("transform");
    }
  }

  private speak() {
    if (this.running) {
      this.say(this.verb);
      return;
    }
    const height = rootOf(this.tree)?.height ?? 0;
    const rest = `n ${this.tree.length} · height ${height} · limit ${heightLimit(this.tree.length)}`;
    this.say(this.lastRotation ? `${rest} · ${this.lastRotation}` : rest);
  }

  private report() {
    this.changed({
      busy: this.running,
      keys: [...this.tree].sort((a, b) => a.rank - b.rank).map((hung) => hung.key),
      height: rootOf(this.tree)?.height ?? 0,
      limit: heightLimit(this.tree.length),
      note: this.note,
    });
  }
}

import * as k from "./iso-kit";

/**
 * The parts every bench figure shares, bound to one projection: a base plate on feet,
 * a counter box with a digit window, a label plate, and grip ribs for knobs.
 */
export function partsFor(P: k.Projection) {
  const S = k.solidSvg;
  const L = k.lineSvg;
  const D = k.dotsSvg;

  const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

  const smooth = (lo: number, hi: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  };

  /** A grip band on an upright cylinder: ribs that fade toward both limbs instead of stopping. */
  function ribs(cx: number, cy: number, radius: number, z0: number, z1: number, count: number) {
    const [vx, vy] = k.towardViewer(P);
    const list: k.Faded[] = [];
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const alpha = smooth(0.04, 0.55, nx * vx + ny * vy);
      if (alpha <= 0.02) continue;
      list.push({ d: k.segment([cx + radius * nx, cy + radius * ny, z0], [cx + radius * nx, cy + radius * ny, z1], P), alpha });
    }
    return k.fadedSvg(list, { tone: "lo" });
  }

  /** A closed outline on a face of constant y, in (x, z) points. */
  const onFront = (points: Array<[number, number]>, y: number) => k.pathOf(points.map(([x, z]) => k.iso([x, y, z], P)), true);

  /** A base plate standing on four feet, with its halo, seam, groove and corner screws. Its top is z = 0. */
  function base(plan: k.Plan, height = 9, foot = 5, inset = 20) {
    const parts: string[] = [`<path class="iso-halo" d="${k.haloOf(plan, -height - foot, 12, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(plan, inset))) {
      parts.push(S(k.cylinder(x, y, 7.5, -height - foot, 1.6, P, 28), { tone: "lo" }));
      parts.push(S(k.cylinder(x, y, 5.6, -height - foot + 1.6, foot - 1.6, P, 28), { tone: "mid" }));
    }
    parts.push(S(k.slabOf(plan, -height, height, P, 8, 1.5), { tone: "mid", inner: L(k.sideSeam(plan, -height + 3, P, 8), { tone: "faint" }) }));
    parts.push(L(k.planOutline(k.insetPlan(plan, 4.5), 0, P), { tone: "lo" }));
    const screws = k.corners(plan, 9);
    parts.push(L(screws.map(([x, y]) => k.ring(x, y, 1.9, 0, P, 16)).join(""), { tone: "lo" }));
    parts.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5, tone: "mid" }));
    return parts.join("");
  }

  /** A counter box standing at z: a knurled reset knob on top and a two-digit window on its front, written to by `part`. */
  function counter(x: number, y: number, z: number, part: string) {
    const box: k.Plan = { x, y, w: 34, d: 22, r: 2 };
    const face = y + box.d;
    const top = z + 12;
    const [wx0, wx1, wz0, wz1] = [x + 9.5, x + 24.5, z + 2.9, z + 9.6];
    const window = onFront([[wx0, wz0], [wx1, wz0], [wx1, wz1], [wx0, wz1]], face);
    return [
      S(k.slabOf(box, z, 12, P, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(box, z + 1.6, P, 4), { tone: "faint" }) }),
      L(k.planOutline(k.insetPlan(box, 1.8), top, P, 4), { tone: "faint" }),
      D([k.iso([x + 4.5, y + 4.5, top], P), k.iso([x + 4.5, face - 4.5, top], P)], { size: 0.42, tone: "mid" }),
      S(k.cylinder(x + 24, y + 9, 3.2, top, 2.4, P, 20, 0.3), { tone: "mid" }),
      ribs(x + 24, y + 9, 3.2, top, top + 2.4, 22),
      L(k.lineOnTop([x + 24, y + 9], [x + 24, y + 12], top + 2.4, P), { tone: "hi" }),
      `<path class="fig-window" d="${window}"/>`,
      L(window, { tone: "lo" }),
      `<text class="iso-face-text fig-digits" data-part="${part}" transform="${k.sideMatrix([(wx0 + wx1) / 2, face], z + 4.3, P, "left")}" font-size="5.4" text-anchor="middle">00</text>`,
    ].join("");
  }

  /** A label plate with rule lines standing for its printed text. */
  function labelPlate(plan: k.Plan, z: number, rules: number[]) {
    const lines = rules
      .map((length, row) => k.lineOnTop([plan.x + 3, plan.y + 2.6 + row * 2.3], [plan.x + 3 + length, plan.y + 2.6 + row * 2.3], z + 0.8, P))
      .join("");
    return [
      S(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo", crease: "none" }),
      L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 4), { tone: "faint" }),
      L(lines, { tone: "lo", free: true }),
      D([k.iso([plan.x + plan.w - 2.6, plan.y + 2.6, z + 0.8], P), k.iso([plan.x + plan.w - 2.6, plan.y + plan.d - 2.6, z + 0.8], P)], { size: 0.42, tone: "mid" }),
    ].join("");
  }

  /** A small plate with a number or short word engraved on it, lying on a top face. */
  function tag(x: number, y: number, z: number, text: string, width = 12) {
    const plate: k.Plan = { x: x - width / 2, y, w: width, d: 9, r: 1.4 };
    return [
      S(k.slabOf(plate, z, 0.8, P, 3), { tone: "mid", crease: "none" }),
      k.faceTextSvg(k.topMatrix([x, y + 6.9], z + 0.8, P), text, { size: text.length > 2 ? 5.4 : 6.4, tone: "mid", anchor: "middle" }),
    ].join("");
  }

  return { S, L, D, byDepth, ribs, onFront, base, counter, labelPlate, tag };
}

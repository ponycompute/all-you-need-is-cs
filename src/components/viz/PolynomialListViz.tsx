"use client";

import { useMemo, useState } from "react";

type Term = { exp: number; coef: number };

function formatPoly(terms: Term[]) {
  const t = [...terms].sort((a, b) => b.exp - a.exp);
  if (t.length === 0) return "0";
  return t
    .map((x) => {
      if (x.exp === 0) return `${x.coef}`;
      if (x.exp === 1) return `${x.coef === 1 ? "" : x.coef === -1 ? "-" : x.coef + "*"}x`;
      return `${x.coef === 1 ? "" : x.coef === -1 ? "-" : x.coef + "*"}x^${x.exp}`;
    })
    .join(" + ")
    .replace(/\+ -/g, "- ");
}

export default function PolynomialListViz() {
  const [terms, setTerms] = useState<Term[]>([
    { exp: 3, coef: 5 },
    { exp: 1, coef: -2 },
    { exp: 0, coef: 1 },
  ]);
  const [x, setX] = useState(2);

  const evalAt = useMemo(() => {
    return terms.reduce((s, t) => s + t.coef * x ** t.exp, 0);
  }, [terms, x]);

  const addTerm = () => {
    const exp = Math.floor(Math.random() * 5);
    const coef = Math.floor(Math.random() * 10) - 5 || 1;
    setTerms((prev) => [...prev.filter((t) => t.exp !== exp), { exp, coef }]);
  };

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-body">
        Polynomials as linked lists of (exponent, coefficient) terms—usually sorted by exponent for
        addition and multiplication.
      </p>

      <div className="mx-auto max-w-xl rounded-lg border border-hairline bg-canvas p-4">
        <h3 className="mb-3 font-mono text-xs font-medium uppercase tracking-wide text-mute">
          Term list (conceptual nodes)
        </h3>
        <ul className="space-y-2">
          {[...terms]
            .sort((a, b) => b.exp - a.exp)
            .map((t, idx, arr) => (
              <li key={t.exp} className="flex items-center gap-2 font-mono text-sm">
                <span className="rounded border border-hairline bg-surface-soft px-3 py-2 text-ink">
                  coef={t.coef}, exp={t.exp}
                </span>
                {idx < arr.length - 1 && <span className="text-mute">→</span>}
              </li>
            ))}
        </ul>
        {terms.length === 0 && <p className="text-sm text-mute">Empty polynomial—add a term.</p>}
        <button type="button" onClick={addTerm} className="ui-btn-primary mt-4 w-full sm:w-auto">
          Add / replace random term
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <label className="flex items-center gap-2 font-mono text-sm text-body">
          x =
          <input
            type="number"
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="ui-input w-20 font-mono"
          />
        </label>
      </div>

      <p className="text-center font-mono text-sm text-ink">
        p(x) = {formatPoly(terms)} → p({x}) = {evalAt}
      </p>

      <p className="ui-caption text-center">
        Compare storing all degrees (dense) versus only nonzero terms (sparse linked form).
      </p>
    </div>
  );
}

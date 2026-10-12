"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import P5Wrapper, { type SketchFunction } from "@/components/viz/P5Wrapper";

interface BSTNode {
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
}

export default function BSTViz() {
  const [root, setRoot] = useState<BSTNode | null>(() => buildSampleBST());
  const [highlightPath, setHighlightPath] = useState<number[]>([]);
  const [status, setStatus] = useState("Insert, search for, or delete a key; the path it follows is highlighted.");
  const [insertVal, setInsertVal] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [deleteVal, setDeleteVal] = useState("");
  const rootRef = useRef(root);
  const hlRef = useRef<number[]>([]);

  useEffect(() => {
    rootRef.current = root;
  }, [root]);

  const sketch: SketchFunction = useCallback((p) => {
    p.setup = () => {
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.textAlign(p.CENTER, p.CENTER);
    };

    const drawBST = (node: BSTNode | null, x: number, y: number, level: number, maxW: number) => {
      if (!node) return;
      const gap = maxW / (2 ** (level + 1));
      const hl = hlRef.current;

      if (node.left) {
        const lx = x - gap;
        const ly = y + 72;
        p.stroke(0, 0, 82);
        p.strokeWeight(1.5);
        p.line(x, y + 22, lx, ly - 22);
        drawBST(node.left, lx, ly, level + 1, maxW);
      }
      if (node.right) {
        const rx = x + gap;
        const ry = y + 72;
        p.stroke(0, 0, 82);
        p.strokeWeight(1.5);
        p.line(x, y + 22, rx, ry - 22);
        drawBST(node.right, rx, ry, level + 1, maxW);
      }

      const isHighlighted = hl.includes(node.value);
      p.push();
      p.fill(0, 0, isHighlighted ? 0 : 100);
      p.stroke(0, 0, isHighlighted ? 0 : 72);
      p.strokeWeight(1.5);
      p.ellipse(x, y, 44, 44);
      p.fill(0, 0, isHighlighted ? 100 : 0);
      p.textSize(14);
      p.text(node.value, x, y);
      p.pop();
    };

    p.draw = () => {
      p.background(0, 0, 98);
      if (!rootRef.current) {
        p.fill(0, 0, 45);
        p.textSize(13);
        p.text("Empty BST", p.width / 2, p.height / 2);
        return;
      }
      drawBST(rootRef.current, p.width / 2, 44, 0, p.width * 0.5);
    };
  }, []);

  const insertBST = (node: BSTNode | null, val: number): BSTNode => {
    if (!node) return { value: val, left: null, right: null };
    if (val < node.value) node.left = insertBST(node.left, val);
    else if (val > node.value) node.right = insertBST(node.right, val);
    return node;
  };

  const findPath = (node: BSTNode | null, val: number, path: number[]): number[] => {
    if (!node) return path;
    path.push(node.value);
    if (val === node.value) return path;
    if (val < node.value) return findPath(node.left, val, path);
    return findPath(node.right, val, path);
  };

  const deleteBST = (node: BSTNode | null, val: number): BSTNode | null => {
    if (!node) return null;
    if (val < node.value) { node.left = deleteBST(node.left, val); return node; }
    if (val > node.value) { node.right = deleteBST(node.right, val); return node; }
    // Found: leaf
    if (!node.left && !node.right) return null;
    // One child
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    // Two children: find successor
    let succ = node.right;
    while (succ.left) succ = succ.left;
    node.value = succ.value;
    node.right = deleteBST(node.right, succ.value);
    return node;
  };

  const insert = () => {
    const val = parseInt(insertVal);
    if (isNaN(val)) {
      setStatus("Type a whole number first.");
      return;
    }
    const path = findPath(root, val, []);
    setHighlightPath(path);
    hlRef.current = path;
    const last = path[path.length - 1];
    setStatus(
      last === val
        ? `${val} is already in the tree, so nothing is inserted.`
        : last === undefined
          ? `Inserted ${val} as the root.`
          : `Searched ${path.join(" → ")}, fell off at ${last}: ${val} becomes its ${val < last ? "left" : "right"} child.`
    );
    setTimeout(() => {
      setRoot((prev) => insertBST(prev ? structuredClone(prev) : null, val));
      setHighlightPath([]);
      hlRef.current = [];
    }, 600);
    setInsertVal("");
  };

  const search = () => {
    const val = parseInt(searchVal);
    if (isNaN(val)) {
      setStatus("Type a whole number first.");
      return;
    }
    const path = findPath(root, val, []);
    setHighlightPath(path);
    hlRef.current = path;
    const last = path[path.length - 1];
    setStatus(
      last === val
        ? `Found ${val} after ${path.length} ${path.length === 1 ? "comparison" : "comparisons"}: ${path.join(" → ")}.`
        : `${val} is not in the tree: the search ${path.length ? `went ${path.join(" → ")} and reached NULL` : "found an empty tree"}.`
    );
    setTimeout(() => { setHighlightPath([]); hlRef.current = []; }, 1500);
  };

  const remove = () => {
    const val = parseInt(deleteVal);
    if (isNaN(val)) {
      setStatus("Type a whole number first.");
      return;
    }
    const path = findPath(root, val, []);
    setHighlightPath(path);
    hlRef.current = path;
    let target: BSTNode | null = root;
    while (target && target.value !== val) target = val < target.value ? target.left : target.right;
    if (!target) setStatus(`${val} is not in the tree, so nothing is deleted.`);
    else if (!target.left && !target.right) setStatus(`${val} is a leaf: it is simply removed.`);
    else if (!target.left || !target.right) setStatus(`${val} has one child: that child takes its place.`);
    else {
      let successor = target.right;
      while (successor.left) successor = successor.left;
      setStatus(`${val} has two children: it is replaced by ${successor.value}, the smallest key in its right subtree.`);
    }
    setTimeout(() => {
      setRoot((prev) => deleteBST(prev ? structuredClone(prev) : null, val));
      setHighlightPath([]);
      hlRef.current = [];
    }, 600);
  };

  return (
    <div className="space-y-4">
      <P5Wrapper sketch={sketch} className="min-h-[400px]" />

      <div className="flex flex-wrap items-center gap-2 justify-center">
        <input
          type="number"
          placeholder="Insert"
          value={insertVal}
          onChange={(e) => setInsertVal(e.target.value)}
          className="ui-input w-20"
        />
        <button type="button" onClick={insert} className="ui-btn-primary">
          Insert
        </button>
        <input
          type="number"
          placeholder="Search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="ui-input w-20"
        />
        <button type="button" onClick={search} className="ui-btn-secondary">
          Search
        </button>
        <input
          type="number"
          placeholder="Delete"
          value={deleteVal}
          onChange={(e) => setDeleteVal(e.target.value)}
          className="ui-input w-20"
        />
        <button type="button" onClick={remove} className="ui-btn-secondary">
          Delete
        </button>
        <button
          type="button"
          onClick={() => {
            setRoot(buildSampleBST());
            setStatus("Reset to the sample tree.");
          }}
          className="ui-btn-secondary"
        >
          Reset
        </button>
      </div>
      <p className="ui-caption text-center">
        BST property: left &lt; root &lt; right
      </p>
      <p className="text-center text-sm leading-[1.43] text-body">{status}</p>
    </div>
  );
}

function buildSampleBST(): BSTNode {
  return {
    value: 50,
    left: {
      value: 30,
      left: { value: 20, left: null, right: null },
      right: { value: 40, left: null, right: null },
    },
    right: {
      value: 70,
      left: { value: 60, left: null, right: null },
      right: { value: 80, left: null, right: null },
    },
  };
}

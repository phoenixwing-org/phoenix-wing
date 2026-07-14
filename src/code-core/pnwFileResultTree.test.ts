import { describe, expect, it } from "vitest";
import { pnwCompareFileResults, pnwGroupFileResults } from "./pnwFileResultTree.js";

describe("pnwGroupFileResults", () => {
  const files = [
    { relativePath: "src/zeta.cpp", changed: true },
    { relativePath: "include/Alpha.h", changed: true },
    { relativePath: "src/Alpha.cpp", changed: false },
    { relativePath: "tests/alpha.cpp", changed: true },
  ];

  it("puts changed files first and sorts each group by filename with a path tie-breaker", () => {
    const groups = pnwGroupFileResults(files);
    expect(groups.map((group) => group.id)).toEqual(["changed", "unchanged"]);
    expect(groups[0]?.items.map((item) => item.relativePath)).toEqual([
      "tests/alpha.cpp",
      "include/Alpha.h",
      "src/zeta.cpp",
    ]);
    expect(groups[1]?.items.map((item) => item.relativePath)).toEqual(["src/Alpha.cpp"]);
  });

  it("can omit unchanged results without mutating caller data", () => {
    const groups = pnwGroupFileResults(files, { includeUnchanged: false });
    expect(groups).toHaveLength(1);
    expect(files).toHaveLength(4);
  });

  it("supports directory ordering when a host offers that display mode", () => {
    const sorted = [...files].sort((left, right) => pnwCompareFileResults(left, right, "directory"));
    expect(sorted.map((item) => item.relativePath)).toEqual([
      "include/Alpha.h",
      "src/Alpha.cpp",
      "src/zeta.cpp",
      "tests/alpha.cpp",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  pnwIsWorkspacePathWithin,
  pnwMatchesWorkspacePath,
  pnwNormalizeWorkspacePath,
  pnwNormalizeWorkspacePaths,
  pnwRelativeToWorkspaceRoots,
} from "./pnwWorkspacePath.js";

describe("pnw workspace path", () => {
  it("normalizes separators and rejects absolute or escaping paths", () => {
    expect(pnwNormalizeWorkspacePath(" ./src\\module//a.cpp/ ")).toBe("src/module/a.cpp");
    expect(pnwNormalizeWorkspacePath(".")).toBe(".");
    expect(pnwNormalizeWorkspacePath("../outside.cpp")).toBeNull();
    expect(pnwNormalizeWorkspacePath("src/../outside.cpp")).toBeNull();
    expect(pnwNormalizeWorkspacePath("C:/outside.cpp")).toBeNull();
    expect(pnwNormalizeWorkspacePath("/outside.cpp")).toBeNull();
  });

  it("de-duplicates normalized paths without reordering", () => {
    expect(pnwNormalizeWorkspacePaths(["b\\a.cpp", "./b/a.cpp", "", "z.h"])).toEqual([
      "b/a.cpp",
      "z.h",
    ]);
  });

  it("matches files exactly and directories only on segment boundaries", () => {
    const entries = [
      { path: "src/module", type: "dir" as const },
      { path: "README.md", type: "file" as const },
    ];
    expect(pnwMatchesWorkspacePath("src/module/main.cpp", entries)).toBe(true);
    expect(pnwMatchesWorkspacePath("src/module-other/main.cpp", entries)).toBe(false);
    expect(pnwMatchesWorkspacePath("docs/README.md", entries)).toBe(false);
    expect(pnwIsWorkspacePathWithin("src/main.cpp", ".")).toBe(true);
  });

  it("resolves against the most specific matching root", () => {
    expect(pnwRelativeToWorkspaceRoots("src/module/main.cpp", [".", "src/module"])).toBe("main.cpp");
    expect(pnwRelativeToWorkspaceRoots("src/other.cpp", ["src/module"])).toBeUndefined();
  });
});

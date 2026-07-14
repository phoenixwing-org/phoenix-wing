import { describe, expect, it } from "vitest";
import { pnwApplyCodeRenameText, pnwPlanCodeRename } from "./pnwCodeRenamePlan.js";

describe("pnwPlanCodeRename", () => {
  it("plans literal text, filename and directory-basename changes without writing", () => {
    const plan = pnwPlanCodeRename([
      { relativePath: "OldMod", kind: "dir" },
      { relativePath: "OldMod/OldMod", kind: "file", text: "OldMod\nOldMod again\n" },
      { relativePath: "OldMod/keep.cpp", kind: "file", text: "nothing" },
    ], { oldText: "OldMod", newText: "NewMod", levels: ["dir", "file", "text"] });
    expect(plan.valid).toBe(true);
    expect(plan.summary).toEqual({ dirs: 1, files: 1, textFiles: 1, occurrences: 4, conflicts: 0 });
    expect(plan.changes).toContainEqual(expect.objectContaining({ level: "dir", relativePath: "OldMod", targetPath: "NewMod" }));
    expect(plan.changes).toContainEqual(expect.objectContaining({ level: "file", relativePath: "OldMod/OldMod", targetPath: "OldMod/NewMod" }));
    expect(plan.changes).toContainEqual(expect.objectContaining({ level: "text", relativePath: "OldMod/OldMod", occurrences: 2, lines: [1, 2] }));
    expect(pnwApplyCodeRenameText("OldName/OldName", "OldName", "NewName")).toBe("NewName/NewName");
  });

  it("reports target collisions and invalid names before a host attempts a rename", () => {
    const conflict = pnwPlanCodeRename([
      { relativePath: "Old", kind: "file" },
      { relativePath: "New", kind: "file" },
    ], { oldText: "Old", newText: "New", levels: ["file"], caseSensitivePaths: false });
    expect(conflict.summary.conflicts).toBe(1);
    expect(conflict.changes[0]).toMatchObject({ status: "conflict", targetPath: "New" });
    const invalid = pnwPlanCodeRename([], { oldText: "Old", newText: "New/Name" });
    expect(invalid.valid).toBe(false);
    expect(invalid.diagnostics).toContain("新名称不能包含路径分隔符");
  });

  it("defaults an omitted or empty level list to text replacement", () => {
    const emptyLevels = pnwPlanCodeRename(
      [{ relativePath: "a.cpp", kind: "file", text: "Old" }],
      { oldText: "Old", newText: "New", levels: [] },
    );
    expect(emptyLevels.levels).toEqual(["text"]);
    expect(emptyLevels.summary).toMatchObject({ textFiles: 1, occurrences: 1 });
  });
});

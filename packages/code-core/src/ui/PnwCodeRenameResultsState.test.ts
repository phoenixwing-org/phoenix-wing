import { describe, expect, it } from "vitest";
import {
  pnwCodePageRenameResults,
  pnwCodeProjectRenameResults,
  type PnwCodeRenameResultState,
} from "./PnwCodeRenameResultsState.js";

function state(): PnwCodeRenameResultState {
  return {
    root: "/workspace",
    applied: false,
    hits: [
      {
        id: "dir:src/OldFolder",
        relativePath: "src/OldFolder",
        originalPath: "/workspace/src/OldFolder",
        plannedPath: "/workspace/src/NewFolder",
        targetPath: "src/NewFolder",
        level: "dir",
        occurrences: 1,
        status: "preview",
        matches: [{ search: "Old", replace: "New" }],
      },
      {
        id: "text:src/file.cpp",
        relativePath: "src/file.cpp",
        originalPath: "/workspace/src/file.cpp",
        level: "text",
        occurrences: 6,
        lines: [2, 4, 6, 8, 10, 12],
        encoding: "utf8-bom",
        status: "encoding-error",
        detail: "cannot encode",
        matches: [{ search: "OldName", replace: "NewName" }],
      },
    ],
  };
}

describe("Phoenix Code rename result state", () => {
  it("projects common path, line, status and highlight presentation", () => {
    const [directory, text] = pnwCodeProjectRenameResults(state());
    expect(directory).toMatchObject({
      levelLabel: "文件夹",
      sourceName: "OldFolder",
      sourceAddress: "src",
      targetOrPositionLabel: "NewFolder",
      statusLabel: "预览",
      openPath: "/workspace/src/OldFolder",
      sourceHighlightTerms: ["Old"],
      editorHighlightTerms: ["Old"],
    });
    expect(text).toMatchObject({
      targetOrPositionLabel: "L2, L4, L6, L8，……等 6 处",
      encodingLabel: "utf8-bom",
      statusLabel: "编码错误",
      statusTone: "danger",
      detail: "cannot encode",
    });
  });

  it("opens the planned path and highlights replacement text after apply", () => {
    const applied = { ...state(), applied: true };
    applied.hits = [{ ...applied.hits[0]!, status: "applied" }];
    expect(pnwCodeProjectRenameResults(applied)[0]).toMatchObject({
      openPath: "/workspace/src/NewFolder",
      statusLabel: "已替换",
      editorHighlightTerms: ["New"],
    });
  });

  it("paginates large Host result sets with bounded inputs", () => {
    const first = pnwCodePageRenameResults(state(), -10, 1);
    const second = pnwCodePageRenameResults(state(), first.nextOffset, 1);
    expect(first).toMatchObject({ offset: 0, totalRows: 2, nextOffset: 1 });
    expect(first.rows).toHaveLength(1);
    expect(second).toMatchObject({ offset: 1, totalRows: 2 });
    expect(second.nextOffset).toBeUndefined();
  });

  it("preserves unknown Host status without inventing a failure", () => {
    const custom = { ...state(), hits: [{ ...state().hits[0]!, status: "queued-by-host" }] };
    expect(pnwCodeProjectRenameResults(custom)[0]).toMatchObject({
      statusLabel: "queued-by-host",
      statusTone: "neutral",
    });
  });
});

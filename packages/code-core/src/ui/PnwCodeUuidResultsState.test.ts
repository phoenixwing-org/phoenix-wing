import { describe, expect, it } from "vitest";
import {
  pnwCodeFormatUuidDisplay,
  pnwCodeGroupUuidHits,
  pnwCodeProjectUuidFiles,
  pnwCodeSelectedUuidGroupCount,
  pnwCodeSelectUuidFileUris,
  pnwCodeSelectUuidHitIds,
  type PnwCodeUuidResultHit,
} from "./PnwCodeUuidResultsState.js";

const a = "123456781234123412341234567890ab";
const hits: PnwCodeUuidResultHit[] = [
  { id: "b:2", fileId: "b", relativePath: "src/B.cpp", line: 2, column: 4, from: a, normalized: a, kind: "guid32", to: "two", state: "applied" },
  { id: "a:8", fileId: "a", relativePath: "include/A.h", line: 8, column: 1, from: a, normalized: a, kind: "uuid", to: "one", state: "pending" },
  { id: "a:3", fileId: "a", relativePath: "include/A.h", line: 3, column: 2, from: "other", normalized: "other", kind: "suspicious", state: "blocked", warning: "已变化" },
];

describe("UUID result view model", () => {
  it("统一格式化 32 位 identity", () => {
    expect(pnwCodeFormatUuidDisplay(a)).toBe("12345678-1234-1234-1234-1234567890ab");
    expect(pnwCodeFormatUuidDisplay("other")).toBe("other");
  });

  it("按 identity、路径和位置稳定分组，不修改输入", () => {
    const groups = pnwCodeGroupUuidHits(hits);
    expect(groups.map((group) => group.normalized)).toEqual([a, "other"]);
    expect(groups[0]?.hits.map((hit) => hit.id)).toEqual(["a:8", "b:2"]);
    expect(hits.map((hit) => hit.id)).toEqual(["b:2", "a:8", "a:3"]);
  });

  it("命中选择只接受待处理 id，并计算跨格式同值组", () => {
    expect(pnwCodeSelectUuidHitIds(hits, ["a:8", "b:2", "missing"])).toEqual(["a:8"]);
    expect(pnwCodeSelectedUuidGroupCount(hits, ["a:8", "b:2"])).toBe(1);
  });

  it("按文件聚合状态、映射和警告", () => {
    const rows = pnwCodeProjectUuidFiles([
      { uri: "a", relativePath: "include/A.h", encoding: "UTF-8" },
      { uri: "b", relativePath: "src/B.cpp", encoding: "GBK" },
      { uri: "empty", relativePath: "src/Empty.cpp", encoding: "UTF-8" },
    ], hits);
    expect(rows.map((row) => row.uri)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ state: "pending", hitCount: 2, firstLine: 3, warnings: ["已变化"] });
    expect(rows[1]).toMatchObject({ state: "applied", hasApplied: true });
    expect(pnwCodeSelectUuidFileUris(rows, ["a", "b"])).toEqual(["a"]);
  });
});

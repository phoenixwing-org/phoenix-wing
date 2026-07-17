import { describe, expect, it } from "vitest";
import type { KtCodegenPlan } from "../src/api/contracts.js";
import {
  KtCodegenApplyConcurrentChangeError,
  ktCodegenCommitApplyWrites,
  ktCodegenInspectApplyPlan,
  ktCodegenProjectApply,
  type KtCodegenApplyWritePort,
} from "../src/KtCodegenApply.js";

const bytes = (value: string) => new TextEncoder().encode(value);
const text = (value: Uint8Array | undefined) => value ? new TextDecoder().decode(value) : undefined;

function plan(): KtCodegenPlan {
  return {
    kind: "kt.codegen.plan",
    schemaVersion: 1,
    phase: "preview",
    targets: [{ target: "cpp.parameter", rendererId: "cpp", status: "ready", artifactCount: 1 }],
    blockKeys: ["PARAM DECLARATION", "QT UPDATE DIALOG"],
    markerRegions: [{
      id: "r1",
      path: "/workspace/a.cpp",
      sourceFingerprint: "sha256:before",
      classId: "PNXA",
      nameSuffix: "A",
      blockKey: "PARAM DECLARATION",
      start: { line: 1 },
      replaceStartOffset: 2,
      replaceEndOffset: 5,
    }],
    artifacts: [{
      id: "a1",
      regionId: "r1",
      target: "cpp.parameter",
      blockKey: "PARAM DECLARATION",
      classId: "PNXA",
      content: "A\nB",
      sourceParameters: [],
    }],
    diagnostics: [],
    hasChanges: true,
    canApply: true,
  } as unknown as KtCodegenPlan;
}

describe("KtCodegenApply", () => {
  it("汇总已命中和未命中的控制符", () => {
    const summary = ktCodegenInspectApplyPlan(plan());
    expect(summary.targets).toEqual([{ target: "cpp.parameter", status: "ready", artifactCount: 1 }]);
    expect(summary.blocks[0]).toMatchObject({ regionCount: 1, artifactCount: 1 });
    expect(summary.missingBlockKeys).toEqual(["QT UPDATE DIALOG"]);
  });

  it("按指纹投影区域并适配目标源码换行", () => {
    const result = ktCodegenProjectApply(plan(), [{
      path: "/workspace/a.cpp",
      text: "01old\r\nZ",
      fingerprint: "sha256:before",
    }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.changes[0]?.after).toBe("01A\r\nB\r\nZ");
    expect(result.changes[0]?.regions).toEqual([{
      id: "r1",
      artifactId: "a1",
      blockKey: "PARAM DECLARATION",
      classId: "PNXA",
      nameSuffix: "A",
      line: 1,
    }]);
  });

  it("事务发现并发变化后回滚，不覆盖第三方内容", async () => {
    const files = new Map<string, Uint8Array>([
      ["a.cpp", bytes("before-a")],
      ["b.cpp", bytes("before-b")],
    ]);
    let changed = false;
    const port: KtCodegenApplyWritePort<string> = {
      async readFile(target) {
        if (target === "b.cpp" && !changed) {
          changed = true;
          files.set(target, bytes("external-b"));
        }
        return Uint8Array.from(files.get(target)!);
      },
      async writeFile(target, content) {
        files.set(target, Uint8Array.from(content));
      },
    };
    const result = await ktCodegenCommitApplyWrites(port, [
      { target: "a.cpp", before: bytes("before-a"), after: bytes("after-a") },
      { target: "b.cpp", before: bytes("before-b"), after: bytes("after-b") },
    ]);
    expect(result.ok).toBe(false);
    expect(result.ok || result.error).toBeInstanceOf(KtCodegenApplyConcurrentChangeError);
    expect(text(files.get("a.cpp"))).toBe("before-a");
    expect(text(files.get("b.cpp"))).toBe("external-b");
  });
});

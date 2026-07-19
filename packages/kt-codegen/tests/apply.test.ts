import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { KtCodegenPlan } from "../src/api/contracts.js";
import type { KtCodegenBlockKey } from "../src/blocks/index.js";
import { KtCodegenController } from "../src/KtCodegenController.js";
import {
  KtCodegenApplyConcurrentChangeError,
  ktCodegenCanApplyValidRegions,
  ktCodegenCommitApplyWrites,
  ktCodegenInspectApplyPlan,
  ktCodegenProjectApply,
  type KtCodegenApplyWritePort,
} from "../src/KtCodegenApply.js";
import { ktCodegenReadFixture } from "./helpers.js";

const bytes = (value: string) => new TextEncoder().encode(value);
const text = (value: Uint8Array | undefined) => value ? new TextDecoder().decode(value) : undefined;
const contractFixture = JSON.parse(readFileSync(
  new URL("./fixtures/contracts/apply-projection-v1.json", import.meta.url),
  "utf8",
)) as {
  plan: KtCodegenPlan;
  source: { path: string; text: string; fingerprint: string };
  expected: {
    after: string;
    utf8Hex: string;
    regionCount: number;
    regionIds: string[];
    conflictFingerprint: string;
    conflictCode: string;
  };
};

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
  it("通过跨宿主 v1 fixture 锁定 CRLF、审计顺序、冲突码和最终字节", () => {
    const result = ktCodegenProjectApply(contractFixture.plan, [contractFixture.source]);
    expect(result.diagnostics).toEqual([]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      after: contractFixture.expected.after,
      regionCount: contractFixture.expected.regionCount,
    });
    expect(result.changes[0]?.regions.map((region) => region.id)).toEqual(contractFixture.expected.regionIds);
    expect(Buffer.from(result.changes[0]!.after, "utf8").toString("hex")).toBe(contractFixture.expected.utf8Hex);

    const conflict = ktCodegenProjectApply(contractFixture.plan, [{
      ...contractFixture.source,
      fingerprint: contractFixture.expected.conflictFingerprint,
    }]);
    expect(conflict.changes).toEqual([]);
    expect(conflict.diagnostics.map((item) => item.code)).toEqual([contractFixture.expected.conflictCode]);
  });

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

  it("缺失 End 只隔离错误控制块，其余完整区域仍可安全投影", () => {
    const partial = {
      ...plan(),
      canApply: false,
      diagnostics: [{
        code: "marker.missing-end",
        severity: "error",
        message: "Start marker BROKEN has no matching End marker before Start marker at line 20.",
        path: { source: "source", file: "/workspace/a.cpp", row: 10, column: 0 },
      }],
    } as KtCodegenPlan;

    expect(ktCodegenCanApplyValidRegions(partial)).toBe(true);
    const result = ktCodegenProjectApply(partial, [{
      path: "/workspace/a.cpp",
      text: "01old\r\nZ",
      fingerprint: "sha256:before",
    }]);
    expect(result.diagnostics).toEqual([]);
    expect(result.changes[0]?.after).toBe("01A\r\nB\r\nZ");
    expect(result.changes[0]?.regions.map((region) => region.id)).toEqual(["r1"]);
  });

  it("非 Marker 错误仍阻止整份计划，不能借部分 Apply 绕过", () => {
    const unsafe = {
      ...plan(),
      canApply: false,
      diagnostics: [{
        code: "renderer.invalid-output",
        severity: "error",
        message: "renderer failed",
        path: { source: "renderer", field: "artifact" },
      }],
    } as KtCodegenPlan;

    expect(ktCodegenCanApplyValidRegions(unsafe)).toBe(false);
    const result = ktCodegenProjectApply(unsafe, [{
      path: "/workspace/a.cpp",
      text: "01old\nZ",
      fingerprint: "sha256:before",
    }]);
    expect(result.changes).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "apply.plan-not-applicable",
    ]);
  });

  it("以 PNXBomAnalysis 反例保留两处缺失 End，并应用后续五个完整区域", () => {
    const controller = new KtCodegenController();
    expect(controller.readJson(ktCodegenReadFixture("legacy-v4/bom-analysis.json")).ok).toBe(true);
    const sourceText = ktCodegenReadFixture("source/bom-analysis-two-missing-ends.cpp");
    const source = {
      path: "PNXBomAnalysisCmd.cpp",
      text: sourceText,
      fingerprint: `fixture:${sourceText.length}`,
    };
    const blockKeys = [
      "CMD AGENT CONSTRUCTOR",
      "CMD AGENT DESTRUCTOR",
      "CMD ACTION FIA",
      "CMD ACTION PDA",
      "CMD AGENT FIA CLEAR",
      "CMD AGENT UPDATE STATE",
      "CMD SET ACTIVE FIELD",
    ] as const satisfies readonly KtCodegenBlockKey[];
    const plan = controller.analyze({
      targets: ["caa.control"],
      blockKeys,
      snapshot: { files: [source] },
    });

    expect(plan.canApply).toBe(false);
    expect(plan.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "marker.missing-end",
      "marker.missing-end",
    ]);
    const result = ktCodegenProjectApply(plan, [source]);
    expect(result.diagnostics).toEqual([]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.regions.map((region) => region.blockKey)).toEqual([
      "CMD ACTION FIA",
      "CMD ACTION PDA",
      "CMD AGENT FIA CLEAR",
      "CMD AGENT UPDATE STATE",
      "CMD SET ACTIVE FIELD",
    ]);
    expect(result.changes[0]?.after).toContain(", KT_AUTO_CMD_AGENT_CONSTRUCTOR_COMMON()");
    expect(result.changes[0]?.after).toContain("parameter = new PNXBomAnalysisParam();");
    expect(result.changes[0]?.after).toContain("catFrmEditor_ = NULL;");
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

import { describe, expect, it } from "vitest";
import { pnwBuildCadWorkspaceIndex, pnwCadIndexRelativePath, type PnwCadIndexRecord } from "./workspaceIndex.js";
import { pnwAnalyzeCadIndexDocumentXml } from "./index.js";

const record = (relativePath: string, files: readonly string[] = []): PnwCadIndexRecord => ({
  relativePath, filename: relativePath.split("/").at(-1)!, documentKind: "Part",
  sizeBytes: 100, modifiedAtMs: 1000, objectCount: 1,
  xlinks: files.map(file => ({ file, label: "" })),
});

describe("shared CAD workspace index plan", () => {
  it("projects validated XML, excluding comments and CDATA examples", () => {
    const analysis = pnwAnalyzeCadIndexDocumentXml(`<Document><Objects><Object name="Body" type="PartDesign::Body"/></Objects>
      <!-- <Object name="Example"><XLink file="fake.FCStd"/></Object> -->
      <ObjectData><Object name="Body"><Properties><Property name="PartName"><String value="Bracket &amp; rail"/></Property></Properties></Object></ObjectData></Document>`);
    expect(analysis.objectCount).toBe(1);
    expect(analysis.xlinks).toEqual([]);
    expect(analysis.embeddedFields.PartName).toBe("Bracket & rail");
  });
  it.each(["", "<Document><Object name='Body'></Document>", "<Document/><Document/>", "<!DOCTYPE Document><Document/>", "<Document><Object name='A' name='B'/></Document>"])
    ("rejects incomplete/unsupported XML %s", xml => expect(() => pnwAnalyzeCadIndexDocumentXml(xml)).toThrow());
  it("resolves cross-directory references and nested BOMs without host APIs", () => {
    const plan = pnwBuildCadWorkspaceIndex([
      record("asm/100.001-H-Root.ASSY.FCStd", ["../parts/200.001-S-Bracket.FCStd"]),
      record("parts/200.001-S-Bracket.FCStd", ["300.001-S-Bolt.FCStd"]),
      record("parts/300.001-S-Bolt.FCStd"),
    ]);
    expect(plan.references.map(row => row.status)).toEqual(["resolved", "resolved"]);
    expect(plan.bomLines.filter(row => row.assemblyRelativePath.startsWith("asm/")))
      .toMatchObject([{ partKey: "200.001", depth: 1 }, { partKey: "300.001", depth: 2 }]);
  });

  it("normalizes legacy dot/backslash paths and never mutates snapshots", () => {
    const source = record(".\\parts\\100.001-S-Bracket.FCStd");
    const plan = pnwBuildCadWorkspaceIndex([source]);
    expect(plan.assets[0].relativePath).toBe("parts/100.001-S-Bracket.FCStd");
    expect(source.relativePath).toContain("\\");
    expect(Object.isFrozen(plan.assets[0].fields)).toBe(true);
  });

  it.each(["../bad.FCStd", "/bad.FCStd", "C:\\bad.FCStd", "C:bad.FCStd", "part/../bad.FCStd", "bad\u0000.FCStd"])
    ("rejects unsafe snapshot path %s", path => expect(() => pnwCadIndexRelativePath(path)).toThrow());

  it("rejects duplicates and case collisions instead of resolving by input order", () => {
    expect(() => pnwBuildCadWorkspaceIndex([record("A.FCStd"), record("./a.FCStd")])).toThrow(/colliding/);
  });

  it("uses embedded attributes when present and filename hints only as fallback", () => {
    const plan = pnwBuildCadWorkspaceIndex([{ ...record("100.001-S-Bracket.FCStd"),
      embeddedFields: { PartName: "Explicit name", PartVersion: "002", TypeCode: "" } }]);
    expect(plan.assets[0].fields).toMatchObject({ PartName: "Explicit name", PartNumber: "100", PartVersion: "002", TypeCode: "S" });
  });

  it("retains parse failures without trusting partial XML links", () => {
    const plan = pnwBuildCadWorkspaceIndex([{ ...record("broken.FCStd", ["missing.FCStd"]), parseError: "invalid ZIP" }]);
    expect(plan.parseFailures).toBe(1);
    expect(plan.references).toEqual([]);
  });

  it("does not commit a suggested target for an ambiguous basename", () => {
    const plan = pnwBuildCadWorkspaceIndex([record("root.FCStd", ["missing/part.FCStd"]), record("one/part.FCStd"), record("two/part.FCStd")]);
    expect(plan.references[0]).toMatchObject({ status: "ambiguous", targetRelativePath: null, candidates: ["one/part.FCStd", "two/part.FCStd"] });
  });

  it("records missing/non-FCStd/self links and terminates cycles", () => {
    const plan = pnwBuildCadWorkspaceIndex([record("a.FCStd", ["b.FCStd", "a.FCStd", "gone.FCStd", "drawing.svg"]), record("b.FCStd", ["a.FCStd"])]);
    expect(plan.references.map(row => row.status)).toEqual(["resolved", "self", "missing", "non_fcstd", "resolved"]);
    expect(plan.bomLines.some(row => row.cycleDetected)).toBe(true);
    expect(plan.bomLines.length).toBeLessThan(20);
  });

  it("aggregates repeated explicit references and keeps distinct occurrence paths", () => {
    const plan = pnwBuildCadWorkspaceIndex([record("a.FCStd", ["b.FCStd", "b.FCStd"]), record("b.FCStd", ["c.FCStd", "c.FCStd"]), record("c.FCStd")]);
    expect(plan.references).toHaveLength(2);
    expect(plan.bomLines.filter(row => row.assemblyRelativePath === "a.FCStd").map(row => row.quantity)).toEqual([2, 4]);
  });

  it("rejects a truncated deep graph rather than reporting it as complete", () => {
    expect(() => pnwBuildCadWorkspaceIndex(Array.from({ length: 34 }, (_, i) => record(`${i}.FCStd`, i < 33 ? [`${i + 1}.FCStd`] : [])))).toThrow(/depth/);
  });
});

// SPDX-License-Identifier: Apache-2.0

import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KtCodegenController,
  ktCodegenCheckPlanCompatibility,
  type KtCodegenArtifact,
  type KtCodegenItem,
  type KtCodegenMarkerRegion,
  type KtCodegenParam,
} from "../src/index.js";

const fixture = JSON.parse(readFileSync(
  new URL("./fixtures/contracts/codegen-host-contract-v1.json", import.meta.url),
  "utf8",
)) as {
  kind: string;
  schemaVersion: number;
  compatibility: {
    planSchemaVersion: number;
    legacyJsonVersion: string;
    legacyCsvColumns: number;
  };
  input: {
    legacyJson: Record<string, unknown>;
    legacyCsv: string;
    source: { path: string; text: string; fingerprint: string };
    targets: string[];
    blockKeys: string[];
  };
  expected: unknown;
};

function itemSummary(item: KtCodegenItem) {
  return {
    nameSuffix: item.nameSuffix,
    id: item.id,
    paramString: item.paramString,
    dataType: item.dataType,
    defaultValue: item.defaultValue,
    isList: item.isList,
    component: item.component,
    componentCount: item.componentCount,
    unit: item.unit,
  };
}

function paramSummary(param: KtCodegenParam) {
  return {
    kind: param.kind,
    schemaVersion: param.schemaVersion,
    sourceFormat: param.source.format,
    namePrefix: param.namePrefix,
    nameMiddle: param.nameMiddle,
    nameSpace: param.nameSpace,
    appendFunction: param.appendFunction,
    items: param.items.map(itemSummary),
  };
}

function regionSummary(region: KtCodegenMarkerRegion) {
  return {
    id: region.id,
    path: region.path,
    sourceFingerprint: region.sourceFingerprint,
    classId: region.classId,
    nameSuffix: region.nameSuffix,
    blockKey: region.blockKey,
    startLine: region.start.line,
    linePrefix: region.start.linePrefix,
    bodyStartOffset: region.bodyStartOffset,
    bodyEndOffset: region.bodyEndOffset,
    replaceStartOffset: region.replaceStartOffset,
    replaceEndOffset: region.replaceEndOffset,
  };
}

function artifactSummary(artifact: KtCodegenArtifact) {
  return {
    id: artifact.id,
    regionId: artifact.regionId,
    target: artifact.target,
    blockKey: artifact.blockKey,
    classId: artifact.classId,
    contentSha256: crypto.createHash("sha256").update(artifact.content).digest("hex"),
    contentUtf8Bytes: Buffer.byteLength(artifact.content, "utf8"),
    sourceParameters: artifact.sourceParameters,
  };
}

describe("KtCodegen cross-host contract v1", () => {
  it("freezes legacy JSON/CSV, marker offsets, Analyze output and version rejection in one bundle", () => {
    expect(fixture).toMatchObject({
      kind: "kt.codegen.host-contract-fixture",
      schemaVersion: 1,
      compatibility: {
        planSchemaVersion: 1,
        legacyJsonVersion: "4.0",
        legacyCsvColumns: 17,
      },
    });

    const jsonController = new KtCodegenController();
    const jsonRead = jsonController.readJson(fixture.input.legacyJson);
    const csvController = new KtCodegenController();
    const csvRead = csvController.readCsv(fixture.input.legacyCsv);
    const plan = jsonController.analyze({
      targets: fixture.input.targets,
      blockKeys: fixture.input.blockKeys,
      snapshot: { files: [fixture.input.source] },
    });

    expect({
      legacyJson: {
        readOk: jsonRead.ok,
        diagnosticCodes: jsonRead.diagnostics.map((item) => item.code),
        param: paramSummary(jsonController.param),
      },
      legacyCsv: {
        readOk: csvRead.ok,
        diagnosticCodes: csvRead.diagnostics.map((item) => item.code),
        param: paramSummary(csvController.param),
      },
      markerRegions: plan.markerRegions.map(regionSummary),
      analyze: {
        kind: plan.kind,
        schemaVersion: plan.schemaVersion,
        phase: plan.phase,
        targets: plan.targets,
        blockKeys: plan.blockKeys,
        artifacts: plan.artifacts.map(artifactSummary),
        diagnosticCodes: plan.diagnostics.map((item) => item.code),
        hasChanges: plan.hasChanges,
        canApply: plan.canApply,
      },
      compatibility: {
        current: ktCodegenCheckPlanCompatibility(plan),
        future: ktCodegenCheckPlanCompatibility({ ...plan, schemaVersion: 2 }),
        invalid: ktCodegenCheckPlanCompatibility({ kind: "other", schemaVersion: 1 }),
      },
    }).toEqual(fixture.expected);
  });
});

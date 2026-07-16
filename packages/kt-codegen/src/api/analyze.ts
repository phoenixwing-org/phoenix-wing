// SPDX-License-Identifier: Apache-2.0

import {
  KT_CODEGEN_LEGACY_BLOCKS,
  ktCodegenIsBlockKey,
  type KtCodegenBlockKey,
} from "../blocks/legacy-blocks.js";
import { ktCodegenHasDiagnosticErrors, type KtCodegenDiagnostic } from "../model/diagnostic.js";
import { ktCodegenIsTargetId, type KtCodegenTargetId } from "../model/target.js";
import { ktCodegenValidateParam } from "../model/validate.js";
import type {
  KtCodegenAnalyzeRequest,
  KtCodegenArtifact,
  KtCodegenPlan,
  KtCodegenTargetPlan,
} from "./contracts.js";
import type { KtCodegenRenderer } from "../KtCodegenRenderer.js";
import { KtCodegenMarker } from "../KtCodegenMarker.js";

function ktCodegenModelDiagnostic(
  code: string,
  severity: "error" | "warning" | "info",
  message: string,
  field: string,
): KtCodegenDiagnostic {
  return { code, severity, message, path: { source: "model", field } };
}

/**
 * 执行无文件写入的参数代码生成分析，并聚合目标计划、artifact 和诊断。
 */
export function ktCodegenAnalyze(
  request: KtCodegenAnalyzeRequest,
  renderers: readonly KtCodegenRenderer[],
  marker: KtCodegenMarker = new KtCodegenMarker(),
): KtCodegenPlan {
  const diagnostics: KtCodegenDiagnostic[] = [];
  diagnostics.push(...ktCodegenValidateParam(request.param));
  const targetIds: KtCodegenTargetId[] = [];
  const targetSet = new Set<KtCodegenTargetId>();

  request.targets.forEach((target) => {
    if (!ktCodegenIsTargetId(target)) {
      diagnostics.push(
        ktCodegenModelDiagnostic(
          "target.unknown",
          "error",
          `Unknown parameter code generation target: ${target}.`,
          "targets",
        ),
      );
      return;
    }
    if (targetSet.has(target)) {
      diagnostics.push(
        ktCodegenModelDiagnostic("target.duplicate", "warning", `Duplicate target ${target} was ignored.`, "targets"),
      );
      return;
    }
    targetSet.add(target);
    targetIds.push(target);
  });
  if (targetIds.length === 0) {
    diagnostics.push(
      ktCodegenModelDiagnostic("target.empty", "error", "At least one target is required.", "targets"),
    );
  }

  const requestedBlockKeys = request.blockKeys ?? KT_CODEGEN_LEGACY_BLOCKS.map((block) => block.key);
  const blockKeys: KtCodegenBlockKey[] = [];
  const blockSet = new Set<KtCodegenBlockKey>();
  requestedBlockKeys.forEach((blockKey) => {
    if (!ktCodegenIsBlockKey(blockKey)) {
      diagnostics.push(
        ktCodegenModelDiagnostic(
          "block.unknown",
          "error",
          `Unknown legacy block key: ${blockKey}.`,
          "blockKeys",
        ),
      );
      return;
    }
    if (!blockSet.has(blockKey)) {
      blockSet.add(blockKey);
      blockKeys.push(blockKey);
    }
  });

  const markerScan = request.snapshot
    ? marker.scan(request.param, request.snapshot, blockKeys)
    : { regions: [], diagnostics: [] };
  diagnostics.push(...markerScan.diagnostics);

  const targetPlans: KtCodegenTargetPlan[] = [];
  const artifacts: KtCodegenArtifact[] = [];
  for (const target of targetIds) {
    const renderer = renderers.find((candidate) => candidate.targets.includes(target));
    if (!renderer) {
      diagnostics.push(
        ktCodegenModelDiagnostic(
          "renderer.missing",
          "error",
          `No renderer is registered for ${target}.`,
          "targets",
        ),
      );
      targetPlans.push({ target, rendererId: "", status: "unsupported", artifactCount: 0 });
      continue;
    }
    const result = renderer.render({
      param: request.param,
      target,
      blockKeys,
      snapshot: request.snapshot ?? { files: [] },
      markerRegions: markerScan.regions,
    });
    artifacts.push(...result.artifacts);
    diagnostics.push(...result.diagnostics);
    targetPlans.push({
      target,
      rendererId: renderer.id,
      status: result.status,
      artifactCount: result.artifacts.length,
    });
  }

  const regionIds = new Set(markerScan.regions.map((region) => region.id));
  const artifactsHaveRegions = artifacts.every((artifact) => regionIds.has(artifact.regionId));
  for (const artifact of artifacts) {
    if (regionIds.has(artifact.regionId)) continue;
    diagnostics.push({
      code: "artifact.region-not-found",
      severity: "error",
      message: `Artifact ${artifact.id} references unknown marker region ${artifact.regionId}.`,
      path: { source: "renderer", field: artifact.id },
    });
  }
  const allReady = targetPlans.length > 0 && targetPlans.every((target) => target.status === "ready");
  const hasErrors = ktCodegenHasDiagnosticErrors(diagnostics);
  return {
    kind: "kt.codegen.plan",
    schemaVersion: 1,
    phase: allReady ? "preview" : "scaffold",
    targets: targetPlans,
    blockKeys,
    artifacts,
    markerRegions: markerScan.regions,
    diagnostics,
    hasChanges: artifacts.length > 0,
    canApply: !hasErrors && allReady && artifacts.length > 0 && artifactsHaveRegions,
  };
}

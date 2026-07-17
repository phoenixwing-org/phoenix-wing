// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "./blocks/legacy-blocks.js";
import type { KtCodegenDiagnostic } from "./model/diagnostic.js";
import type { KtCodegenPlan, KtCodegenTargetStatus } from "./api/contracts.js";

export interface KtCodegenApplySource {
  readonly path: string;
  readonly text: string;
  readonly fingerprint: string;
}

export interface KtCodegenApplyChange {
  readonly path: string;
  readonly before: string;
  readonly after: string;
  readonly regionCount: number;
  readonly regions: readonly KtCodegenApplyRegionChange[];
}

/** 单个 Artifact 在 Apply 投影中绑定的区域元数据，供宿主逐区域审计。 */
export interface KtCodegenApplyRegionChange {
  readonly id: string;
  readonly artifactId: string;
  readonly blockKey: KtCodegenBlockKey;
  readonly classId: string;
  readonly nameSuffix: string;
  /** 从0开始的 Start Marker 行号。 */
  readonly line: number;
}

export interface KtCodegenApplyProjection {
  readonly changes: readonly KtCodegenApplyChange[];
  readonly diagnostics: readonly KtCodegenDiagnostic[];
}

export interface KtCodegenApplyBlockSummary {
  readonly blockKey: KtCodegenBlockKey;
  readonly regionCount: number;
  readonly artifactCount: number;
  readonly paths: readonly string[];
}

export interface KtCodegenApplyTargetSummary {
  readonly target: string;
  readonly status: KtCodegenTargetStatus;
  readonly artifactCount: number;
}

export interface KtCodegenApplyPlanSummary {
  readonly canApply: boolean;
  readonly regionCount: number;
  readonly artifactCount: number;
  readonly diagnosticCount: number;
  readonly targets: readonly KtCodegenApplyTargetSummary[];
  readonly blocks: readonly KtCodegenApplyBlockSummary[];
  readonly missingBlockKeys: readonly KtCodegenBlockKey[];
  readonly blocksWithoutArtifacts: readonly KtCodegenBlockKey[];
}

export interface KtCodegenApplyWrite<TTarget> {
  readonly target: TTarget;
  readonly before: Uint8Array;
  readonly after: Uint8Array;
}

export interface KtCodegenApplyWritePort<TTarget> {
  readFile(target: TTarget): PromiseLike<Uint8Array>;
  writeFile(target: TTarget, content: Uint8Array): PromiseLike<void>;
}

export class KtCodegenApplyConcurrentChangeError<TTarget = unknown> extends Error {
  override readonly name = "KtCodegenApplyConcurrentChangeError";

  constructor(public readonly target: TTarget) {
    super("源码在 Apply 最终写入前再次变化");
  }
}

export type KtCodegenApplyCommitResult<TTarget> =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: unknown;
      readonly rollbackFailures: readonly TTarget[];
    };

function ktCodegenApplyDiagnostic(
  code: string,
  message: string,
  file?: string,
  row?: number,
): KtCodegenDiagnostic {
  return {
    code,
    severity: "error",
    message,
    ...(file ? { path: { source: "source", file, row: row ?? 0, column: 0 } } : {}),
  };
}

/**
 * 汇总计划中的 Target、控制符区域和 Artifact 绑定关系。
 *
 * 返回结构化数据而不生成宿主日志，Desk Tools、VS Code 和测试可各自决定
 * 如何呈现“控制符未命中”或“区域没有产物”等信息。
 */
export function ktCodegenInspectApplyPlan(plan: KtCodegenPlan): KtCodegenApplyPlanSummary {
  const artifactsByRegion = new Map<string, number>();
  for (const artifact of plan.artifacts) {
    artifactsByRegion.set(artifact.regionId, (artifactsByRegion.get(artifact.regionId) ?? 0) + 1);
  }
  const blocks = plan.blockKeys.map((blockKey) => {
    const regions = plan.markerRegions.filter((region) => region.blockKey === blockKey);
    return {
      blockKey,
      regionCount: regions.length,
      artifactCount: regions.reduce((total, region) => total + (artifactsByRegion.get(region.id) ?? 0), 0),
      paths: [...new Set(regions.map((region) => region.path))].sort(),
    };
  });
  return {
    canApply: plan.canApply,
    regionCount: plan.markerRegions.length,
    artifactCount: plan.artifacts.length,
    diagnosticCount: plan.diagnostics.length,
    targets: plan.targets.map((target) => ({
      target: target.target,
      status: target.status,
      artifactCount: target.artifactCount,
    })),
    blocks,
    missingBlockKeys: blocks.filter((block) => block.regionCount === 0).map((block) => block.blockKey),
    blocksWithoutArtifacts: blocks
      .filter((block) => block.regionCount > 0 && block.artifactCount === 0)
      .map((block) => block.blockKey),
  };
}

/** 生成器统一产出 LF；Apply 投影按目标源码换行写回。 */
export function ktCodegenNormalizeGeneratedEol(
  text: string,
  eol: "lf" | "crlf",
): string {
  return text.replace(/\r\n|\r|\n/g, eol === "crlf" ? "\r\n" : "\n");
}

/**
 * 纯 Apply 投影：一次性验证计划、指纹和区域重叠后，产生整文件新文本。
 * 本函数不访问文件系统，也不修改传入的计划或源码快照。
 */
export function ktCodegenProjectApply(
  plan: KtCodegenPlan,
  sources: readonly KtCodegenApplySource[],
): KtCodegenApplyProjection {
  if (!plan.canApply) {
    return {
      changes: [],
      diagnostics: [ktCodegenApplyDiagnostic(
        "apply.plan-not-applicable",
        "当前预检计划包含错误或没有可应用的生成产物。",
      )],
    };
  }
  const diagnostics: KtCodegenDiagnostic[] = [];
  const sourceByPath = new Map(sources.map((source) => [source.path, source]));
  const regionById = new Map(plan.markerRegions.map((region) => [region.id, region]));
  const replacementsByPath = new Map<string, Array<{
    start: number;
    end: number;
    content: string;
    line: number;
    fingerprint: string;
    region: KtCodegenApplyRegionChange;
  }>>();
  const usedRegions = new Set<string>();

  for (const artifact of plan.artifacts) {
    const region = regionById.get(artifact.regionId);
    if (!region) {
      diagnostics.push(ktCodegenApplyDiagnostic(
        "apply.region-not-found",
        `生成产物 ${artifact.id} 对应的控制符区域已不存在。`,
      ));
      continue;
    }
    if (usedRegions.has(region.id)) {
      diagnostics.push(ktCodegenApplyDiagnostic(
        "apply.duplicate-region",
        `控制符区域 ${region.blockKey} 收到多个生成产物，已阻止写入。`,
        region.path,
        region.start.line,
      ));
      continue;
    }
    usedRegions.add(region.id);
    const replacements = replacementsByPath.get(region.path) ?? [];
    replacements.push({
      start: region.replaceStartOffset,
      end: region.replaceEndOffset,
      content: artifact.content,
      line: region.start.line,
      fingerprint: region.sourceFingerprint,
      region: {
        id: region.id,
        artifactId: artifact.id,
        blockKey: region.blockKey,
        classId: region.classId,
        nameSuffix: region.nameSuffix,
        line: region.start.line,
      },
    });
    replacementsByPath.set(region.path, replacements);
  }

  const changes: KtCodegenApplyChange[] = [];
  for (const [path, replacements] of replacementsByPath) {
    const source = sourceByPath.get(path);
    if (!source) {
      diagnostics.push(ktCodegenApplyDiagnostic("apply.source-missing", "Apply 前无法重新读取源码文件。", path));
      continue;
    }
    const expectedFingerprints = new Set(replacements.map((item) => item.fingerprint));
    if (expectedFingerprints.size !== 1 || !expectedFingerprints.has(source.fingerprint)) {
      diagnostics.push(ktCodegenApplyDiagnostic(
        "apply.source-changed",
        "源码在预检后发生变化，请重新预检后再 Apply。",
        path,
        replacements[0]?.line,
      ));
      continue;
    }
    const ordered = [...replacements].sort((left, right) => right.start - left.start);
    let previousStart = source.text.length;
    let output = source.text;
    let valid = true;
    const sourceEol = source.text.includes("\r\n") ? "crlf" : "lf";
    for (const replacement of ordered) {
      if (
        replacement.start < 0
        || replacement.end < replacement.start
        || replacement.end > source.text.length
        || replacement.end > previousStart
      ) {
        diagnostics.push(ktCodegenApplyDiagnostic(
          "apply.invalid-range",
          "预检区域偏移无效或互相重叠，请清理缓存后重新预检。",
          path,
          replacement.line,
        ));
        valid = false;
        break;
      }
      const content = ktCodegenNormalizeGeneratedEol(replacement.content, sourceEol);
      output = output.slice(0, replacement.start) + content + output.slice(replacement.end);
      previousStart = replacement.start;
    }
    if (valid && output !== source.text) {
      changes.push({
        path,
        before: source.text,
        after: output,
        regionCount: replacements.length,
        regions: [...replacements]
          .sort((left, right) => left.start - right.start)
          .map((replacement) => replacement.region),
      });
    }
  }

  return { changes: diagnostics.length ? [] : changes, diagnostics };
}

/**
 * 多文件 Apply 的宿主无关事务边界。
 *
 * 每个目标写入前复读并与 before 比较；失败时逆序恢复已尝试目标。回滚只
 * 覆盖仍等于本次 after 的文件，避免误删 Apply 期间出现的第三方修改。
 */
export async function ktCodegenCommitApplyWrites<TTarget>(
  port: KtCodegenApplyWritePort<TTarget>,
  writes: readonly KtCodegenApplyWrite<TTarget>[],
): Promise<KtCodegenApplyCommitResult<TTarget>> {
  const attempted: KtCodegenApplyWrite<TTarget>[] = [];
  try {
    for (const write of writes) {
      const current = await port.readFile(write.target);
      if (!ktCodegenBytesEqual(current, write.before)) {
        throw new KtCodegenApplyConcurrentChangeError(write.target);
      }
      attempted.push(write);
      await port.writeFile(write.target, write.after);
    }
    return { ok: true };
  } catch (error) {
    const rollbackFailures: TTarget[] = [];
    for (const write of [...attempted].reverse()) {
      try {
        const current = await port.readFile(write.target);
        if (!ktCodegenBytesEqual(current, write.after)) {
          rollbackFailures.push(write.target);
          continue;
        }
        await port.writeFile(write.target, write.before);
      } catch {
        rollbackFailures.push(write.target);
      }
    }
    return { ok: false, error, rollbackFailures };
  }
}

function ktCodegenBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

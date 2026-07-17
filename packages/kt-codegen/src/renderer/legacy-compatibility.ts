// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenArtifact } from "../api/contracts.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenParamSpecListClassifier,
  KtCodegenRendererContext,
} from "../KtCodegenRenderer.js";
import type { KtCodegenDiagnostic } from "../model/diagnostic.js";

/** 按旧 `CodeAppendNotes` 的0/1/2模式创建 Doxygen 注释。 */
export function ktCodegenRenderLegacyNotes(
  item: KtCodegenItem,
  prefix: string,
  mode: 0 | 1 | 2 = 0,
  isParamSpecList?: KtCodegenParamSpecListClassifier,
): string[] {
  const lines = [`${prefix}/**`, `${prefix} * @brief ${item.name}`];
  if (mode === 1) {
    lines.push(
      `${prefix} * @param[in] value ${item.dataType}`,
      `${prefix} * @return HRESULT`,
    );
  } else if (mode === 2) {
    lines.push(
      `${prefix} * @return ${isParamSpecList?.(item) ? "HRESULT" : item.dataType}`,
    );
  }
  if (item.author.length > 0) lines.push(`${prefix} * @author ${item.author}`);
  if (item.createDate.length > 0) lines.push(`${prefix} * @date ${item.createDate}`);
  if (item.notes.length > 0) lines.push(`${prefix} * @note ${item.notes}`);
  lines.push(`${prefix} * @id ${item.id}`, `${prefix} */`);
  return lines;
}

/** 创建旧 Start 标记和 clang-format off 头部。 */
export function ktCodegenRenderLegacyStart(region: KtCodegenMarkerRegion): string[] {
  const prefix = region.start.linePrefix;
  return [`${prefix}// ${region.start.text}`, "", `${prefix}// clang-format off`];
}

/** 创建标准旧 clang-format on 和 End 标记尾部。 */
export function ktCodegenRenderLegacyEnd(region: KtCodegenMarkerRegion): string[] {
  const prefix = region.start.linePrefix;
  return ["", `${prefix}// clang-format on`, `${prefix}// ${region.end.text}`];
}

/** 从快照推断一个区域写回时应继续使用的换行符。 */
function ktCodegenResolveRegionEol(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
): { readonly eol: "\n" | "\r\n"; readonly hasFinalEol: boolean } | null {
  const file = context.snapshot.files.find(
    (candidate) =>
      candidate.path === region.path && candidate.fingerprint === region.sourceFingerprint,
  );
  if (!file) return null;
  const eol =
    file.eol === "crlf" || (file.eol === undefined && file.text.includes("\r\n"))
      ? "\r\n"
      : "\n";
  const endTail = file.text.slice(region.end.markerEndOffset, region.end.lineEndOffset);
  return { eol, hasFinalEol: endTail.includes("\n") || endTail.includes("\r") };
}

/** 把逻辑行组装为绑定安全区域的 artifact，或返回快照缺失诊断。 */
export function ktCodegenAppendRegionArtifact(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  lines: readonly string[],
  artifacts: KtCodegenArtifact[],
  diagnostics: KtCodegenDiagnostic[],
): void {
  const lineEnding = ktCodegenResolveRegionEol(context, region);
  if (!lineEnding) {
    diagnostics.push({
      code: "renderer.source-snapshot-missing",
      severity: "error",
      message: `Marker region ${region.id} no longer has its source snapshot.`,
      path: { source: "renderer", file: region.path, field: region.blockKey },
    });
    return;
  }
  const body = lines.join(lineEnding.eol);
  artifacts.push({
    id: `kt.codegen.artifact:${context.target}:${region.id}`,
    regionId: region.id,
    target: context.target,
    blockKey: region.blockKey,
    classId: region.classId,
    content: lineEnding.hasFinalEol ? `${body}${lineEnding.eol}` : body,
    sourceParameters: items.map((item) => item.paramString),
  });
}

/** 兼容 family 统一产生废弃旧块告警，模板模块无需重复协议文案。 */
export function ktCodegenLegacyDeprecatedDiagnostic(
  region: KtCodegenMarkerRegion,
): KtCodegenDiagnostic {
  return {
    code: "renderer.legacy-deprecated-block",
    severity: "warning",
    message: `${region.blockKey} is retained for compatibility; its archived VB method is marked discarded.`,
    path: {
      source: "renderer",
      file: region.path,
      field: region.blockKey,
    },
  };
}

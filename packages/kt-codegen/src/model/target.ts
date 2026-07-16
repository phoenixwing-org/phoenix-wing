// SPDX-License-Identifier: Apache-2.0

/** 代码生成目标所属的平台。 */
export type KtCodegenPlatform = "caa" | "qt" | "cpp";

/** 当前核心识别的全部 CAA、Qt 和普通 C++ 生成目标。 */
export const KT_CODEGEN_TARGETS = [
  { id: "caa.model", platform: "caa", layer: "model", label: "CAA Model" },
  { id: "caa.core", platform: "caa", layer: "core", label: "CAA Core" },
  { id: "caa.control", platform: "caa", layer: "control", label: "CAA Control" },
  { id: "caa.dialog", platform: "caa", layer: "dialog", label: "CAA Dialog" },
  { id: "caa.parameter", platform: "caa", layer: "parameter", label: "CAA Parameter" },
  {
    id: "caa.feature-io",
    platform: "caa",
    layer: "feature-io",
    label: "CAA Feature In/Out",
  },
  { id: "qt.dialog", platform: "qt", layer: "dialog", label: "Qt Dialog" },
  { id: "qt.parameter", platform: "qt", layer: "parameter", label: "Qt Parameter" },
  { id: "cpp.parameter", platform: "cpp", layer: "parameter", label: "C++ Parameter" },
] as const;

/** 单个生成目标的只读元数据。 */
export type KtCodegenTarget = (typeof KT_CODEGEN_TARGETS)[number];

/** 可用于请求和 Renderer 注册的稳定目标 ID。 */
export type KtCodegenTargetId = KtCodegenTarget["id"];

const KT_CODEGEN_TARGET_ID_SET: ReadonlySet<string> = new Set(
  KT_CODEGEN_TARGETS.map((target) => target.id),
);

/** 判断运行时字符串是否为已知生成目标 ID。 */
export function ktCodegenIsTargetId(value: string): value is KtCodegenTargetId {
  return KT_CODEGEN_TARGET_ID_SET.has(value);
}

/** 根据稳定 ID 取得生成目标元数据。 */
export function ktCodegenGetTarget(
  id: KtCodegenTargetId,
): KtCodegenTarget {
  const target = KT_CODEGEN_TARGETS.find((candidate) => candidate.id === id);
  if (!target) {
    throw new Error(`Unknown parameter code generation target: ${id}`);
  }
  return target;
}

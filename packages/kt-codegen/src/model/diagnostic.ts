// SPDX-License-Identifier: Apache-2.0

/** 诊断严重级别。 */
export type KtCodegenDiagnosticSeverity = "error" | "warning" | "info";

/** 诊断在输入数据或生成阶段中的可选定位信息。 */
export interface KtCodegenDiagnosticPath {
  /** 诊断来源边界。 */
  readonly source: "json" | "csv" | "model" | "source" | "renderer";
  /** 源码诊断对应的宿主文件路径。 */
  readonly file?: string;
  /** 从0开始的数据行号或源码行号。 */
  readonly row?: number;
  /** 从0开始的列号。 */
  readonly column?: number;
  /** 相关模型字段、请求字段或生成目标。 */
  readonly field?: string;
}

/** 参数读取、校验或生成过程中产生的稳定诊断。 */
export interface KtCodegenDiagnostic {
  /** 可供测试、UI 和自动化判断使用的稳定诊断代码。 */
  readonly code: string;
  /** 错误、警告或说明级别。 */
  readonly severity: KtCodegenDiagnosticSeverity;
  /** 供开发者或用户阅读的说明。 */
  readonly message: string;
  /** 可选的结构化定位信息。 */
  readonly path?: KtCodegenDiagnosticPath;
}

/** Reader、Adapter 等数据边界统一使用的结果结构。 */
export interface KtCodegenDataResult<T> {
  /** 操作是否在没有 error 诊断的情况下完成。 */
  readonly ok: boolean;
  /** 成功值；操作失败且无法产生安全结果时为 null。 */
  readonly value: T | null;
  /** 操作产生的全部结构化诊断。 */
  readonly diagnostics: readonly KtCodegenDiagnostic[];
}

/** 判断诊断集合中是否至少包含一个 error。 */
export function ktCodegenHasDiagnosticErrors(
  diagnostics: readonly KtCodegenDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

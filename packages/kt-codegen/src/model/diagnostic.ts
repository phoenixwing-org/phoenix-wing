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

/** 源码 marker 诊断对应的结构化控制符身份。 */
export interface KtCodegenDiagnosticMarker {
  /** 诊断所定位控制符的开始或结束种类。 */
  readonly kind: "start" | "end";
  /** `NamePrefix + NameMiddle + NameSuffix` 组成的旧类身份。 */
  readonly classId: string;
  /** 控制符协议中的稳定块 key。 */
  readonly blockKey: string;
  /** 未闭合 Start 被下一条完整控制符截断时的边界。 */
  readonly boundary?: {
    /** 截断边界是下一条 Start 还是 End。 */
    readonly kind: "start" | "end";
    /** 截断边界在源码中的 1-based 行号。 */
    readonly line: number;
  };
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
  /** 可选的源码控制符上下文；消费者无需解析 message 即可定位对应 block。 */
  readonly marker?: KtCodegenDiagnosticMarker;
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

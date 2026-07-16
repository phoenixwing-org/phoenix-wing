// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenDiagnostic } from "../model/diagnostic.js";
import type { KtCodegenTargetId } from "../model/target.js";
import type { KtCodegenParam } from "../KtCodegenParam.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";

/** Analyze 使用的单个源码文件不可变快照。 */
export interface KtCodegenSourceFileSnapshot {
  /** 宿主提供的稳定文件路径。 */
  readonly path: string;
  /** 已按宿主编码策略解码的 Unicode 文本。 */
  readonly text: string;
  /** Analyze/Apply 并发检查使用的内容指纹。 */
  readonly fingerprint: string;
  /** 原文件编码名称，由宿主在最终写回时使用。 */
  readonly encoding?: string;
  /** 原文件换行风格。 */
  readonly eol?: "lf" | "crlf";
}

/** 一次 Analyze 可见的全部源码文件快照。 */
export interface KtCodegenSnapshot {
  /** 只读文件快照集合。 */
  readonly files: readonly KtCodegenSourceFileSnapshot[];
}

/** Renderer 生成的单个候选代码产物。 */
export interface KtCodegenArtifact {
  /** artifact 在当前计划中的稳定身份。 */
  readonly id: string;
  /** artifact 要替换的 `KtCodegenMarkerRegion.id`。 */
  readonly regionId: string;
  /** 产物所属生成目标。 */
  readonly target: KtCodegenTargetId;
  /** 产物对应的旧自动代码块身份。 */
  readonly blockKey: KtCodegenBlockKey;
  /** 标记匹配和宿主展示使用的目标类身份。 */
  readonly classId: string;
  /** Renderer 生成的候选代码文本。 */
  readonly content: string;
  /** 参与生成此产物的参数符号名，用于追踪和诊断。 */
  readonly sourceParameters: readonly string[];
}

/** `KtCodegenCore.analyze` 的完整内部请求。 */
export interface KtCodegenAnalyzeRequest {
  /** MVC-C 各层共享的参数数据实例。 */
  readonly param: KtCodegenParam;
  /** 请求的生成目标；接收运行时字符串以便对未知值产生诊断。 */
  readonly targets: readonly string[];
  /** 可选的自动代码块白名单；省略时使用全部旧 block key。 */
  readonly blockKeys?: readonly string[];
  /** 可选源码快照；没有真实源码时可用于 scaffold 分析。 */
  readonly snapshot?: KtCodegenSnapshot;
}

/** 单个目标在 Analyze 计划中的实现状态。 */
export type KtCodegenTargetStatus = "ready" | "scaffold" | "unsupported";

/** Analyze 对单个请求目标的处理结果。 */
export interface KtCodegenTargetPlan {
  /** 已规范化的生成目标。 */
  readonly target: KtCodegenTargetId;
  /** 实际处理此目标的 Renderer 身份；不支持时为空字符串。 */
  readonly rendererId: string;
  /** Renderer 的实现和可用状态。 */
  readonly status: KtCodegenTargetStatus;
  /** 此目标产生的 artifact 数量。 */
  readonly artifactCount: number;
}

/**
 * 一次参数代码生成 Analyze 的不可变计划。
 *
 * 计划只描述标记区域、候选产物、目标状态和诊断；真实 Apply 由宿主和
 * code-core 完成。
 */
export interface KtCodegenPlan {
  /** 计划类型标识。 */
  readonly kind: "kt.codegen.plan";
  /** 计划数据结构版本。 */
  readonly schemaVersion: 1;
  /** scaffold 表示仍有生成器未迁移；preview 表示可进入预览阶段。 */
  readonly phase: "scaffold" | "preview";
  /** 各生成目标的处理状态。 */
  readonly targets: readonly KtCodegenTargetPlan[];
  /** 本次计划允许处理的自动代码块身份。 */
  readonly blockKeys: readonly KtCodegenBlockKey[];
  /** 所有 Renderer 产生的候选产物。 */
  readonly artifacts: readonly KtCodegenArtifact[];
  /** 源码快照中与当前 Param 和 block 白名单匹配的安全标记区域。 */
  readonly markerRegions: readonly KtCodegenMarkerRegion[];
  /** Analyze 和 Renderer 汇总的诊断。 */
  readonly diagnostics: readonly KtCodegenDiagnostic[];
  /** 是否包含至少一个候选修改。 */
  readonly hasChanges: boolean;
  /** 当前计划是否满足进入 Apply 的基本条件。 */
  readonly canApply: boolean;
}

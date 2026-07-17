// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "./blocks/legacy-blocks.js";
import type {
  KtCodegenArtifact,
  KtCodegenSnapshot,
} from "./api/contracts.js";
import type { KtCodegenMarkerRegion } from "./KtCodegenMarker.js";
import type { KtCodegenDiagnostic } from "./model/diagnostic.js";
import type {
  KtCodegenPlatform,
  KtCodegenTargetId,
} from "./model/target.js";
import type { KtCodegenParam } from "./KtCodegenParam.js";
import type { KtCodegenItem } from "./KtCodegenItem.js";
import { ktCodegenRenderCaa } from "./renderer/caa-renderer.js";
import { ktCodegenRenderCppParameter } from "./renderer/cpp-parameter-family.js";
import { ktCodegenRenderQt } from "./renderer/qt-dialog-family.js";

/** 单次目标生成所需的只读上下文。 */
export interface KtCodegenRendererContext {
  /** MVC-C 各层共享的参数数据；Renderer 只能消费，不能暗中修改。 */
  readonly param: KtCodegenParam;

  /** 本次要求 Renderer 处理的具体 CAA、Qt 或 C++ 目标。 */
  readonly target: KtCodegenTargetId;

  /** 本次允许生成或更新的旧自动代码块身份。 */
  readonly blockKeys: readonly KtCodegenBlockKey[];

  /** Analyze 开始时由宿主提供的只读源码快照。 */
  readonly snapshot: KtCodegenSnapshot;

  /** Core 已扫描并确认结构安全的旧自动代码标记区域。 */
  readonly markerRegions: readonly KtCodegenMarkerRegion[];
}

/** 单个 Renderer 的生成结果。 */
export interface KtCodegenRendererResult {
  /** `ready` 表示所请求目标块均已实现；`scaffold` 表示仍含待迁移块。 */
  readonly status: "ready" | "scaffold";

  /** Renderer 产生的候选代码块；部分迁移的 scaffold 结果也可以包含。 */
  readonly artifacts: readonly KtCodegenArtifact[];

  /** 生成过程中产生的错误、警告和说明信息。 */
  readonly diagnostics: readonly KtCodegenDiagnostic[];
}

/** 可注入 `KtCodegenRenderer` 的纯生成回调。 */
export type KtCodegenRenderFunction = (
  context: KtCodegenRendererContext,
) => KtCodegenRendererResult;

/** C++ Renderer 从 Core 注入的旧默认值表达式格式化函数。 */
export type KtCodegenDefaultValueFormatter = (
  item: KtCodegenItem,
  addQuotation?: boolean,
) => string;

/** CAA Renderer 从 Core 注入的旧参数列表分类函数。 */
export type KtCodegenParamSpecListClassifier = (item: KtCodegenItem) => boolean;

/** CAA Renderer 从 Core 注入的末尾单独大写字符解析函数。 */
export type KtCodegenTrailingUppercaseResolver = (
  value: string | null | undefined,
) => string;

/** CAA block 生成所需、由 Core 统一提供的已验证算法。 */
export interface KtCodegenCaaAlgorithms {
  /** 按旧顺序判断 Item 是否使用列表式参数读写。 */
  readonly isParamSpecList: KtCodegenParamSpecListClassifier;
  /** 按旧单位、字符串和分隔符规则格式化默认值。 */
  readonly formatDefaultValue: KtCodegenDefaultValueFormatter;
  /** 提取参数名末尾单独的大写字符，用于列表排序函数后缀。 */
  readonly getLastStandaloneUppercase: KtCodegenTrailingUppercaseResolver;
  /** 判断类型是否属于旧3D点、向量、方向或射线集合。 */
  readonly isPointOrVector3DType: (dataType: string) => boolean;
  /** 按旧大写边界规则生成 CAA 特征树显示标题。 */
  readonly formatTreeName: (value: string) => string;
  /** 判断 Item 是否属于旧 CAA 点、向量或方向类型。 */
  readonly isCaaVector: (item: KtCodegenItem) => boolean;
  /** 按旧 `GetCurrentSelectorList` 规则判断 Item 是否为 Dialog/Command Field。 */
  readonly isSelectorField: (item: KtCodegenItem) => boolean;
  /** 判断 Field 是否支持旧 Command 自动宏分支。 */
  readonly isCommandAutoField: (item: KtCodegenItem) => boolean;
  /** 从 Field 参数名推断旧 BuildGraph 建议选择过滤器。 */
  readonly getCommandSuggestedFilter: (paramString: string) => string;
}

/** Qt 对话框生成所需、由 Core 注入的已验证类型算法。 */
export interface KtCodegenQtAlgorithms {
  /** 判断类型是否属于旧 Qt 更新逻辑识别的3D点、向量、方向或射线集合。 */
  readonly isPointOrVector3DType: (dataType: string) => boolean;
}

/**
 * 单一 Renderer 类型；不同生成目标通过元数据和 render 回调组合。
 *
 * Core 根据 `targets` 查找 Renderer，再把共享参数和源码快照作为只读上下文
 * 传入。未提供回调时返回稳定的 scaffold 诊断，便于逐步迁移旧生成器。
 */
export class KtCodegenRenderer {
  /** Renderer 的稳定身份，用于计划、诊断和宿主展示。 */
  public readonly id: string;

  /** Renderer 所属的平台类别。 */
  public readonly platform: KtCodegenPlatform;

  /** 此 Renderer 能处理的生成目标列表。 */
  public readonly targets: readonly KtCodegenTargetId[];

  /** 实际生成回调；未提供时 Renderer 保持 scaffold 状态。 */
  private readonly renderFunction: KtCodegenRenderFunction | undefined;

  /** 创建一个目标 Renderer，并可注入纯生成回调。 */
  constructor(options: {
    id: string;
    platform: KtCodegenPlatform;
    targets: readonly KtCodegenTargetId[];
    render?: KtCodegenRenderFunction;
  }) {
    this.id = options.id;
    this.platform = options.platform;
    this.targets = options.targets;
    this.renderFunction = options.render;
  }

  /**
   * 创建已实现四个旧 Parameter block 的普通 C++ Renderer。
   *
   * 默认值格式化函数由 Core 注入，使 Renderer 能复用已验证算法，同时避免
   * Renderer 模块反向导入 Core 形成循环依赖。
   */
  public static createCppParameter(
    formatDefaultValue: KtCodegenDefaultValueFormatter,
  ): KtCodegenRenderer {
    return new KtCodegenRenderer({
      id: "kt.codegen.renderer.cpp",
      platform: "cpp",
      targets: ["cpp.parameter"],
      render: (context) => ktCodegenRenderCppParameter(context, formatDefaultValue),
    });
  }

  /**
   * 创建逐步迁移 CAA block 的 Renderer。
   *
   * 当前实现 CAA 二十六个 block。列表、默认值、3D类型、树标题和大写后缀
   * 算法由 Core 注入；仍含待迁移 block 的 CAA 目标继续返回 scaffold。
   */
  public static createCaa(algorithms: KtCodegenCaaAlgorithms): KtCodegenRenderer {
    return new KtCodegenRenderer({
      id: "kt.codegen.renderer.caa",
      platform: "caa",
      targets: [
        "caa.model",
        "caa.core",
        "caa.control",
        "caa.dialog",
        "caa.parameter",
        "caa.feature-io",
      ],
      render: (context) => ktCodegenRenderCaa(context, algorithms),
    });
  }

  /**
   * 创建 Qt Dialog/Parameter 双向更新 Renderer。
   *
   * Renderer 只生成旧标记区域候选文本；3D类型判断由 Core 注入，不访问 UI
   * 或文件系统，也不修改共享 Parameter/Item。
   */
  public static createQt(algorithms: KtCodegenQtAlgorithms): KtCodegenRenderer {
    return new KtCodegenRenderer({
      id: "kt.codegen.renderer.qt",
      platform: "qt",
      targets: ["qt.dialog", "qt.parameter"],
      render: (context) => ktCodegenRenderQt(context, algorithms),
    });
  }

  /**
   * 生成当前目标的候选 artifact 和诊断。
   *
   * 本方法不得写文件，也不得修改 `context.param` 或 `context.snapshot`。
   */
  render(context: KtCodegenRendererContext): KtCodegenRendererResult {
    if (this.renderFunction) return this.renderFunction(context);
    return {
      status: "scaffold",
      artifacts: [],
      diagnostics: [
        {
          code: "renderer.scaffold-only",
          severity: "info",
          message: `${this.id} declares ${context.target}, but code generation is not migrated yet.`,
          path: { source: "renderer", field: context.target },
        },
      ],
    };
  }
}

// SPDX-License-Identifier: Apache-2.0

import { ktCodegenAnalyze } from "./api/analyze.js";
import type {
  KtCodegenAnalyzeRequest,
  KtCodegenPlan,
} from "./api/contracts.js";
import type { KtCodegenItem } from "./KtCodegenItem.js";
import type { KtCodegenParam } from "./KtCodegenParam.js";
import { KtCodegenRenderer } from "./KtCodegenRenderer.js";
import { KtCodegenMarker } from "./KtCodegenMarker.js";

const KT_CODEGEN_POINT_OR_VECTOR_3D_TYPES: ReadonlySet<string> = new Set([
  "CATMathPoint",
  "CATMathVector",
  "CATMathPointf",
  "CATMathVectorf",
  "KtMathVector",
  "KtMathRay",
  "CATMathDirectionf",
  "CATMathDirection",
]);

const KT_CODEGEN_CAA_VECTOR_TYPES: ReadonlySet<string> = new Set([
  "CATMathPoint",
  "CATMathVector",
  "CATMathPointf",
  "CATMathVectorf",
  "CATMathDirectionf",
  "CATMathDirection",
]);

const KT_CODEGEN_SELECTOR_FIELD_COMPONENTS: ReadonlySet<string> = new Set([
  "SelectorList",
  "MultiList",
  "QListWidget",
  "QTableWidget",
  "QTableView",
]);

/**
 * 与宿主、产品 UI 和文件系统无关的参数代码生成核心算法入口。
 *
 * Core 负责校验生成请求、扫描旧标记、选择目标 Renderer，并聚合 region、
 * artifact 和 diagnostic 生成 Analyze Plan。它不负责配置或真实源码读写。
 */
export class KtCodegenCore {
  /** 当前注册的目标 Renderer；宿主可注入或追加新的生成实现。 */
  public renderers: KtCodegenRenderer[];

  /** 旧自动代码 Start/End 控制标记的只读扫描器。 */
  public readonly marker: KtCodegenMarker;

  /**
   * 创建核心算法入口。
   *
   * 默认注册已迁移部分的 CAA Renderer、Qt 双向更新 Renderer、普通 C++
   * Parameter Renderer，并创建标准旧标记扫描器。自定义数组会被复制；
   * 扫描器可注入。
   */
  constructor(
    renderers: readonly KtCodegenRenderer[] = [
      KtCodegenRenderer.createCaa({
        isParamSpecList: (item) => KtCodegenCore.isParamSpecList(item),
        formatDefaultValue: KtCodegenCore.formatDefaultValue,
        getLastStandaloneUppercase: KtCodegenCore.getLastStandaloneUppercase,
        isPointOrVector3DType: KtCodegenCore.isPointOrVector3DType,
        formatTreeName: KtCodegenCore.formatTreeName,
        isCaaVector: KtCodegenCore.isCaaVector,
        isSelectorField: KtCodegenCore.isSelectorField,
        isCommandAutoField: KtCodegenCore.isCommandAutoField,
        getCommandSuggestedFilter: KtCodegenCore.getCommandSuggestedFilter,
      }),
      KtCodegenRenderer.createQt({
        isPointOrVector3DType: KtCodegenCore.isPointOrVector3DType,
      }),
      KtCodegenRenderer.createCppParameter(KtCodegenCore.formatDefaultValue),
    ],
    marker: KtCodegenMarker = new KtCodegenMarker(),
  ) {
    this.renderers = [...renderers];
    this.marker = marker;
  }

  /**
   * 根据共享参数、目标、block key 和源码 snapshot 生成 Analyze Plan。
   *
   * 本方法不修改 `param`，也不执行真实文件写入；Renderer 必须遵守同一规则。
   */
  analyze(
    param: KtCodegenParam,
    request: Omit<KtCodegenAnalyzeRequest, "param">,
  ): KtCodegenPlan {
    return ktCodegenAnalyze({ ...request, param }, this.renderers, this.marker);
  }

  /**
   * 按旧 `KevinCAAParamInfor.GetDefaultValue` 规则生成 C++ 默认值表达式。
   *
   * 字符串类型自动补双引号；分号恢复为逗号；Spinner/QDoubleSpinBox 的 `mm`
   * 和 `degree/deg` 根据旧规则转换。方法只返回新字符串，不修改 Item。
   */
  public static formatDefaultValue(
    item: KtCodegenItem,
    addQuotation = false,
  ): string {
    let output = item.defaultValue;
    const isStringType = item.dataType.toLowerCase().includes("string");

    if (output.length === 0) {
      return addQuotation && isStringType ? '""' : output;
    }
    if (output.startsWith('"')) return output;
    if (isStringType) return `"${output}"`;

    output = output.replaceAll(";", ", ");
    const component = item.component.toLowerCase();
    if (component !== "spinner" && component !== "qdoublespinbox") return output;
    if (output === "0" || output.length === 0) return output;

    const unit = item.unit.toLowerCase();
    if (unit === "mm") {
      const values = output.split(",");
      if (values.length > 1) {
        return values
          .map((value) => {
            const trimmed = value.trim();
            return trimmed === "0" || trimmed.length === 0
              ? trimmed
              : `${trimmed} * 0.001`;
          })
          .join(", ");
      }
      return `${output} * 0.001`;
    }
    if (unit === "degree" || unit === "deg") {
      return `${output} * 0.017453292519943295`;
    }
    return output;
  }

  /** 判断类型名是否属于旧生成器识别的3D点、向量、方向或射线类型。 */
  public static isPointOrVector3DType(dataType: string): boolean {
    return KT_CODEGEN_POINT_OR_VECTOR_3D_TYPES.has(dataType);
  }

  /** 判断 Item 是否为旧生成器识别的 Kt 三维向量类型。 */
  public static isKtVector(item: KtCodegenItem): boolean {
    return item.dataType === "KtMathVector";
  }

  /** 判断 Item 是否为旧生成器识别的 CAA 三维点、向量或方向类型。 */
  public static isCaaVector(item: KtCodegenItem): boolean {
    return KT_CODEGEN_CAA_VECTOR_TYPES.has(item.dataType);
  }

  /**
   * 按旧 `GetCurrentSelectorList` 规则判断 Item 是否属于 Selector Field。
   *
   * 旧实现只要求 `id >= 1` 且 Component 精确属于五个候选值，不检查
   * DataType，也从2023年起不再检查 ComponentCount；后缀筛选由 Renderer
   * 根据当前 Marker 单独完成。
   */
  public static isSelectorField(item: KtCodegenItem): boolean {
    return item.id >= 1 && KT_CODEGEN_SELECTOR_FIELD_COMPONENTS.has(item.component);
  }

  /**
   * 判断 Selector Field 是否支持旧 Command 宏自动生成。
   *
   * 旧实现只支持精确的 `SelectorList` 与 `QListWidget`，并仅排除
   * `ComponentCount === 0`；此处有意不把负数扩展解释为0。
   */
  public static isCommandAutoField(item: KtCodegenItem): boolean {
    return (
      (item.component === "SelectorList" || item.component === "QListWidget") &&
      item.componentCount !== 0
    );
  }

  /**
   * 按旧 `CmdAgentBuildGraph` 的优先级从 Field 名推断建议选择过滤器。
   *
   * 匹配不区分大小写；`GRID_AXIS`、`AXIS_SYSTEM` 等更具体名称必须先于
   * 通用 `AXIS`，未命中时返回 `DEFAULT`。
   */
  public static getCommandSuggestedFilter(paramString: string): string {
    const key = paramString.toLowerCase();
    if (key.includes("gridaxis")) return "GRID_AXIS";
    if (key.includes("axissystem")) return "AXIS_SYSTEM";
    if (key.includes("direction")) return "DIRECTION";
    if (key.includes("support")) return "SUPPORT";
    if (key.includes("point") || key.includes("origin")) return "POINT";
    if (key.includes("line")) return "LINE";
    if (key.includes("curve")) return "CURVE";
    if (key.includes("plane")) return "PLANE";
    if (key.includes("face") || key.includes("surface")) return "FACE";
    if (key.includes("axis")) return "AXIS";
    return "DEFAULT";
  }

  /**
   * 按旧 `IsParamSpecList` 顺序判断参数是否使用列表式 Get/Set。
   *
   * 旧逻辑先排除3D点和向量，即使这些 Item 的 `isList` 为 true 也返回 false；
   * 此处保留该顺序，避免迁移后的生成代码悄然变化。
   */
  public static isParamSpecList(item: KtCodegenItem): boolean {
    if (this.isPointOrVector3DType(item.dataType)) return false;
    if (item.isList) return true;
    return (
      item.dataType.includes("::SpecObjectCollect") ||
      item.dataType === "CATListValCATISpecObject_var" ||
      item.dataType === "CATMathVector" ||
      item.dataType === "CATRawColldouble" ||
      item.dataType === "CATRawCollint" ||
      item.dataType === "CATMathPoint"
    );
  }

  /**
   * 复现旧 `GetLastCharIfOnlyUpper`：仅当末字符为单独的大写字符时返回它。
   *
   * 该 helper 用于 `SpecObjectCollect` 的排序函数后缀选择。
   */
  public static getLastStandaloneUppercase(value: string | null | undefined): string {
    if (!value) return "";
    const last = value.at(-1) ?? "";
    if (!/^\p{Lu}$/u.test(last)) return "";
    if (value.length === 1) return last;
    const previous = value.at(-2) ?? "";
    return /^\p{Lu}$/u.test(previous) ? "" : last;
  }

  /**
   * 按旧 `ConvertNameOnTree` 规则把参数符号名转换为 CAA 特征树标题。
   *
   * 仅在当前字符为大写且前一字符不是大写时插入空格；连续大写缩写保持
   * 原样。方法不修改输入 Item。
   */
  public static formatTreeName(value: string): string {
    if (value.length <= 1) return value;
    let output = value[0] ?? "";
    for (let index = 1; index < value.length; index += 1) {
      const current = value[index] ?? "";
      const previous = value[index - 1] ?? "";
      if (/^\p{Lu}$/u.test(current) && !/^\p{Lu}$/u.test(previous)) output += " ";
      output += current;
    }
    return output;
  }
}

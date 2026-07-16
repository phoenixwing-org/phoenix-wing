// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenGetBlock,
  type KtCodegenBlockKey,
} from "./blocks/legacy-blocks.js";
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

const KT_CODEGEN_CPP_PARAMETER_BLOCKS: ReadonlySet<KtCodegenBlockKey> = new Set([
  "PARAM CONSTRUCTOR",
  "PARAM DECLARATION",
  "PARAM DESTRUCTOR",
  "PARAM EQUAL",
]);

const KT_CODEGEN_CAA_INTERFACE_BLOCKS: ReadonlySet<KtCodegenBlockKey> = new Set([
  "IMPLEMENTS HEAD GET",
  "IMPLEMENTS HEAD SET",
  "INTERFACES HEAD GET",
  "INTERFACES HEAD SET",
]);

const KT_CODEGEN_CAA_FEATURE_IO_BLOCKS: ReadonlySet<KtCodegenBlockKey> = new Set([
  "IMPLEMENTS CPP GET",
  "IMPLEMENTS CPP SET",
  "IMPLEMENTS PARAM GET",
  "IMPLEMENTS PARAM SET",
]);

const KT_CODEGEN_CAA_COMMAND_AGENT_LIFECYCLE_BLOCKS: ReadonlySet<KtCodegenBlockKey> =
  new Set([
    "CMD AGENT DECLARE",
    "CMD AGENT CONSTRUCTOR",
    "CMD AGENT DESTRUCTOR",
  ]);

const KT_CODEGEN_CAA_COMMAND_GRAPH_STATE_BLOCKS: ReadonlySet<KtCodegenBlockKey> =
  new Set([
    "CMD AGENT BUILD GRAPH",
    "CMD AGENT UPDATE STATE",
    "CMD AGENT FIA CLEAR",
  ]);

const KT_CODEGEN_CAA_COMMAND_ACTION_BLOCKS: ReadonlySet<KtCodegenBlockKey> =
  new Set([
    "CMD ACTION PDA",
    "CMD ACTION FIA",
    "CMD ELEMENT SELECTED",
    "CMD SET ACTIVE FIELD",
  ]);

const KT_CODEGEN_CAA_MIGRATED_BLOCKS: ReadonlySet<KtCodegenBlockKey> = new Set([
  ...KT_CODEGEN_CAA_INTERFACE_BLOCKS,
  ...KT_CODEGEN_CAA_FEATURE_IO_BLOCKS,
  "CATALOG PARAMS",
  "FACTRY ON TREE",
  "DIALOG NOTIFY",
  "UPDATE DIALOG",
  "UPDATE INFORS",
  "DLG DEFINE FIELD TYPE",
  "DLG SET ACTIVE FIELD",
  "DLG GET SELECTOR LIST",
  ...KT_CODEGEN_CAA_COMMAND_AGENT_LIFECYCLE_BLOCKS,
  ...KT_CODEGEN_CAA_COMMAND_GRAPH_STATE_BLOCKS,
  ...KT_CODEGEN_CAA_COMMAND_ACTION_BLOCKS,
]);

const KT_CODEGEN_QT_MIGRATED_BLOCKS: ReadonlySet<KtCodegenBlockKey> = new Set([
  "QT UPDATE DIALOG",
  "QT UPDATE INFORS",
]);

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

/** 按旧 `CodeAppendNotes` 的0/1/2模式创建 Doxygen 注释。 */
function ktCodegenRenderLegacyNotes(
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
function ktCodegenRenderLegacyStart(region: KtCodegenMarkerRegion): string[] {
  const prefix = region.start.linePrefix;
  return [`${prefix}// ${region.start.text}`, "", `${prefix}// clang-format off`];
}

/** 创建标准旧 clang-format on 和 End 标记尾部。 */
function ktCodegenRenderLegacyEnd(region: KtCodegenMarkerRegion): string[] {
  const prefix = region.start.linePrefix;
  return ["", `${prefix}// clang-format on`, `${prefix}// ${region.end.text}`];
}

/** 按旧 VB 规则生成一个普通 C++ Parameter 自动代码块的逻辑行。 */
function ktCodegenRenderCppParameterLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  formatDefaultValue: KtCodegenDefaultValueFormatter,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);

  switch (region.blockKey) {
    case "PARAM CONSTRUCTOR":
      for (const item of items) {
        const initializerPrefix = item.id === 1 ? ": " : ", ";
        lines.push(
          `${prefix}${initializerPrefix}${item.paramString}(${formatDefaultValue(item)}) // ${item.id}`,
        );
      }
      // 旧方法使用 Trim 写出 End，故 clang-format 与 End 不保留 `_prefix`。
      lines.push("", "// clang-format on", `// ${region.end.text}`);
      return lines;

    case "PARAM EQUAL":
      for (const item of items) {
        // 旧 VB 使用 IndexOf("*") > 0；星号位于首字符时不会注释该行。
        const pointerPrefix = item.dataType.indexOf("*") > 0 ? "// " : "";
        lines.push(
          `${prefix}${pointerPrefix}${item.paramString} = iOriginal.${item.paramString}; // ${item.id}`,
        );
      }
      return [...lines, ...ktCodegenRenderLegacyEnd(region)];

    case "PARAM DESTRUCTOR":
      for (const item of items) {
        if (item.dataType.toLowerCase() === "catispecobject_var") {
          lines.push(`${prefix}${item.paramString} = NULL_var; // ${item.id}`);
        } else if (item.dataType.includes("*")) {
          lines.push(`${prefix}${item.paramString} = NULL; // ${item.id}`);
        } else {
          lines.push(
            `${prefix}// ${item.paramString} = ${formatDefaultValue(item, true)}; // ${item.id}`,
          );
        }
      }
      return [...lines, ...ktCodegenRenderLegacyEnd(region)];

    case "PARAM DECLARATION":
      lines.push(
        "",
        `${prefix}// @app Kt Auto Code`,
        `${prefix}// @version 5.0.0, (2024)`,
        "",
      );
      items.forEach((item, index) => {
        if (index > 0) lines.push("");
        lines.push(...ktCodegenRenderLegacyNotes(item, prefix));
        lines.push(`${prefix}${item.dataType} ${item.paramString};`);
      });
      return [...lines, ...ktCodegenRenderLegacyEnd(region)];

    default:
      return [];
  }
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
function ktCodegenAppendRegionArtifact(
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

/** 生成已迁移的四个普通 C++ Parameter block artifact。 */
function ktCodegenRenderCppParameter(
  context: KtCodegenRendererContext,
  formatDefaultValue: KtCodegenDefaultValueFormatter,
): KtCodegenRendererResult {
  const artifacts: KtCodegenArtifact[] = [];
  const diagnostics: KtCodegenDiagnostic[] = [];
  const requestedBlocks = new Set(context.blockKeys);

  for (const region of context.markerRegions) {
    if (
      !KT_CODEGEN_CPP_PARAMETER_BLOCKS.has(region.blockKey) ||
      !requestedBlocks.has(region.blockKey)
    ) {
      continue;
    }
    const items = context.param.items.filter(
      (item) => item.nameSuffix === region.nameSuffix && item.id >= 1,
    );
    const lines = ktCodegenRenderCppParameterLines(region, items, formatDefaultValue);
    ktCodegenAppendRegionArtifact(context, region, items, lines, artifacts, diagnostics);
  }

  return { status: "ready", artifacts, diagnostics };
}

/** 判断旧接口头文件块生成时是否保留当前 Item。 */
function ktCodegenIsCaaInterfaceItem(item: KtCodegenItem, nameSuffix: string): boolean {
  if (item.nameSuffix !== nameSuffix || item.id === -1) return false;
  return item.id < 100 || item.id >= 200;
}

/** 按旧 VB 规则生成 CAA 实现类或纯虚接口类的 Get/Set 声明。 */
function ktCodegenRenderCaaInterfaceLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isParamSpecList: KtCodegenParamSpecListClassifier,
): string[] {
  const prefix = region.start.linePrefix;
  const isGet =
    region.blockKey === "IMPLEMENTS HEAD GET" ||
    region.blockKey === "INTERFACES HEAD GET";
  const isVirtual =
    region.blockKey === "INTERFACES HEAD GET" ||
    region.blockKey === "INTERFACES HEAD SET";
  const lines = ktCodegenRenderLegacyStart(region);
  // 旧方法使用 CodeAppendLine，public 标签不附加 `_prefix`。
  lines.push(`public: // ${isGet ? "Get" : "Set"}`);

  items.forEach((item, index) => {
    if (index > 0) lines.push("");
    lines.push(
      ...ktCodegenRenderLegacyNotes(item, prefix, isGet ? 2 : 1, isParamSpecList),
    );
    if (isGet) {
      const listSpec = isParamSpecList(item);
      const declaration = listSpec
        ? `HRESULT Get${item.paramString}(${item.dataType}& value) const`
        : `${item.dataType} Get${item.paramString}() const`;
      lines.push(
        `${prefix}${isVirtual ? "virtual " : ""}${declaration}${isVirtual ? " = 0" : ""};`,
      );
    } else {
      const declaration = `HRESULT Set${item.paramString}(const ${item.dataType}& value, const CATBoolean& checkExist = CATTrue)`;
      lines.push(
        `${prefix}${isVirtual ? "virtual " : ""}${declaration}${isVirtual ? " = 0" : ""};`,
      );
    }
  });

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 判断旧 Params Class Get/Set 是否保留当前 Item：仅允许 ID 1～99。 */
function ktCodegenIsCaaParamsClassItem(item: KtCodegenItem, nameSuffix: string): boolean {
  return item.nameSuffix === nameSuffix && item.id > 0 && item.id < 100;
}

/** 按旧 VB 规则生成 CAA 实现类 CPP 中的单参数 Get/Set 函数。 */
function ktCodegenRenderCaaFeatureCppLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;
  const isGet = region.blockKey === "IMPLEMENTS CPP GET";
  const className = `${context.param.namePrefix}E${context.param.nameMiddle}${region.nameSuffix}`;
  const lines = [...ktCodegenRenderLegacyStart(region), ""];

  for (const item of items) {
    const listSpec = algorithms.isParamSpecList(item);
    lines.push(`${prefix}//-----------------------------------------------`);
    if (isGet) {
      const returnType = listSpec ? "HRESULT" : item.dataType;
      const parameter = listSpec ? `${item.dataType}& value` : "";
      lines.push(
        `${prefix}${returnType} ${className}::Get${item.paramString}(${parameter}) const // ${item.id}`,
        `${prefix}{`,
      );

      const convertToInt =
        !listSpec && item.tcKind === "tk_integer" && item.dataType.toLowerCase() !== "int";
      if (!listSpec) {
        const defaultValue = algorithms.formatDefaultValue(item);
        if (convertToInt) {
          lines.push(`${prefix}    int value = (int)(${defaultValue});`);
        } else if (defaultValue.length > 0) {
          lines.push(`${prefix}    ${item.dataType} value(${defaultValue});`);
        } else {
          lines.push(`${prefix}    ${item.dataType} value;`);
        }
      }

      if (listSpec) {
        if (item.dataType === `${context.param.nameSpace}::SpecObjectCollect`) {
          const orderSuffix = algorithms.getLastStandaloneUppercase(item.paramString);
          lines.push(
            `${prefix}    value.RemoveAll();`,
            `${prefix}    value.SetIsOrderBySerial(GetIsOrderBySerial${orderSuffix}());`,
            // 旧 StringOut 在第二个 vbNewLine 后只追加四个空格，没有 `_prefix`。
            `    return ktcSpecRW.GetListValue("${item.paramString}", value);`,
          );
        } else {
          lines.push(
            `${prefix}    return ktcSpecRW.GetListValue("${item.paramString}", value);`,
          );
        }
      } else {
        const getFunction =
          item.tcKind.toLowerCase() === "tk_specobject" ? "GetSpecValue" : "GetValue";
        lines.push(
          `${prefix}    ktcSpecRW.${getFunction}("${item.paramString}", value);`,
          `${prefix}    return ${convertToInt ? `(${item.dataType})` : ""}value;`,
        );
      }
      lines.push(`${prefix}}`);
      continue;
    }

    lines.push(
      `${prefix}HRESULT ${className}::Set${item.paramString}(const ${item.dataType}& value, const CATBoolean& checkExist) // ${item.id}`,
      `${prefix}{`,
    );
    if (listSpec) {
      lines.push(
        `${prefix}    return ktcSpecRW.SetListValue("${item.paramString}", value, checkExist);`,
      );
    } else if (item.tcKind.toLowerCase() === "tk_specobject") {
      lines.push(
        `${prefix}    return ktcSpecRW.SetSpecValue("${item.paramString}", value, checkExist);`,
      );
    } else if (item.tcKind === "tk_integer" && item.dataType.toLowerCase() !== "int") {
      lines.push(
        `${prefix}    int valueInput = (int)value;`,
        `${prefix}    return ktcSpecRW.SetValue("${item.paramString}", valueInput, checkExist);`,
      );
    } else {
      lines.push(
        `${prefix}    return ktcSpecRW.SetValue("${item.paramString}", value, checkExist);`,
      );
    }
    lines.push(`${prefix}}`);
  }

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 VB 规则生成 Param 聚合对象与单参数 Get/Set 之间的桥接语句。 */
function ktCodegenRenderCaaParamsClassLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isParamSpecList: KtCodegenParamSpecListClassifier,
): string[] {
  const prefix = region.start.linePrefix;
  const isGet = region.blockKey === "IMPLEMENTS PARAM GET";
  const lines = [...ktCodegenRenderLegacyStart(region), ""];

  for (const item of items) {
    if (isGet) {
      lines.push(
        isParamSpecList(item)
          ? `${prefix}Get${item.paramString}(value.${item.paramString}); // ${item.id}`
          : `${prefix}value.${item.paramString} = Get${item.paramString}(); // ${item.id}`,
      );
      continue;
    }
    lines.push(
      `${prefix}hr = Set${item.paramString}(value.${item.paramString}); // ${item.id}`,
      `${prefix}if (FAILED(hr)) {`,
      `${prefix}    msg.Append("\\nSet Parameter of ${item.paramString} Error!");`,
      `${prefix}    findError = TRUE;`,
      `${prefix}}`,
    );
  }

  if (!isGet) {
    lines.push(
      `${prefix}if (findError) {`,
      `${prefix}    SetErrMsg(msg);`,
      `${prefix}    return E_FAIL;`,
      `${prefix}}`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 判断 Catalog 块是否保留 Item：仅排除旧保留段 ID 100～199。 */
function ktCodegenIsCaaCatalogItem(item: KtCodegenItem, nameSuffix: string): boolean {
  return (
    item.nameSuffix === nameSuffix &&
    !(item.id >= 100 && item.id < 200)
  );
}

/** 按旧 Catalog 参数注册格式生成注释、SetValue 和列表追加语句。 */
function ktCodegenRenderCaaCatalogLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);
  for (const item of items) {
    const notes = item.notes.length > 0 ? `\t${item.notes}` : "";
    lines.push(
      `${prefix}// ${item.id}; \t${item.name}; ${item.author}; ${item.createDate};${notes}`,
    );
    const listValue = item.isList || algorithms.isPointOrVector3DType(item.dataType);
    const setFunction = listValue ? "SetTKListValue" : "SetValue";
    lines.push(
      `${prefix}item.${setFunction}("${item.paramString}", ${item.tcKind}, ${item.catAttrInOut});`,
      `${prefix}itemList.push_back(item);`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 判断 Factory On Tree 块是否保留 Item。 */
function ktCodegenIsCaaFactoryTreeItem(item: KtCodegenItem, nameSuffix: string): boolean {
  return (
    item.nameSuffix === nameSuffix &&
    item.id >= -1 &&
    (item.isOnTree || item.id === -1)
  );
}

/** 按旧 Factory On Tree 规则生成参数工厂创建和树显示标志。 */
function ktCodegenRenderCaaFactoryTreeLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  formatTreeName: (value: string) => string,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);
  for (const item of items) {
    lines.push("");
    const notes = item.notes.length > 0 ? ` ${item.notes}` : "";
    lines.push(`${prefix}// ${item.id}, ${item.paramString},${notes}`);
    if (item.tcKind !== "tk_specobject") {
      // 旧代码把校验错误直接写进候选代码，且不附加 `_prefix`。
      lines.push("发现错误,TCKKind应该是tk_specobject");
    }
    lines.push(`${prefix}spListParmName.Append("${item.paramString}");`);
    if (item.id === -1) {
      lines.push(
        `${prefix}spListParm.Append(piParmFactory->CreateInteger("Temp Spec", 0));`,
      );
    } else {
      const unit = item.unit.toLowerCase();
      let createFunction: string;
      if (unit === "mm") {
        if (item.dataType !== "double") lines.push("发现错误,DataType应该是double");
        createFunction = "CreateLength";
      } else if (unit === "degree") {
        if (item.dataType !== "double") lines.push("发现错误,DataType应该是double");
        createFunction = "CreateAngle";
      } else if (item.dataType === "int") {
        createFunction = "CreateInteger";
      } else if (item.dataType === "double") {
        createFunction = "CreateReal";
      } else if (item.dataType === "CATBoolean") {
        createFunction = "CreateBoolean";
      } else if (item.dataType === "CATUnicodeString") {
        createFunction = "CreateString";
      } else {
        createFunction = `没有处理此类型<${item.dataType}>请告知杨海华`;
      }
      const title = formatTreeName(item.paramString);
      lines.push(
        `${prefix}spListParm.Append(piParmFactory->${createFunction}("${title}", parameter->${item.paramString}));`,
      );
    }
    lines.push(
      `${prefix}ListOnTree.Append(${item.id === -1 ? "false" : "true"});`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 判断旧 CAA Dialog 通知和双向更新块是否保留当前 Item。 */
function ktCodegenIsCaaDialogItem(item: KtCodegenItem, nameSuffix: string): boolean {
  return item.nameSuffix === nameSuffix && item.id >= 1;
}

/** 按旧 CAA Dialog Agent 规则生成各控件的 AcceptOnNotify。 */
function ktCodegenRenderCaaDialogNotifyLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isCaaVector: (item: KtCodegenItem) => boolean,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);
  for (const item of items) {
    lines.push("");
    const dialogPointer = item.isParamDlg ? "dialogMore->" : "";
    const paramName = item.paramString.replaceAll("_", "");
    const notes = `${prefix}// ${item.id}, ${item.paramString}`;
    if (item.componentCount <= 0) {
      lines.push(
        `${notes}, NO ACTION, ${item.component}, ${item.componentCount}`,
      );
      continue;
    }

    if (item.component === "Spinner") {
      lines.push(notes);
      const component = `${dialogPointer}_Spinner${paramName}`;
      const suffixes = isCaaVector(item) ? ["X", "Y", "Z"] : [""];
      for (const suffix of suffixes) {
        const control = `${component}${suffix}`;
        lines.push(
          `${prefix}ipDialogAgent->AcceptOnNotify(${control}, ${control}->GetSpinnerModifyNotification());`,
        );
      }
      continue;
    }

    if (item.component.startsWith("CheckButton")) {
      lines.push(notes);
      const component = `${dialogPointer}_CheckButton${paramName}`;
      if (item.componentCount === 1) {
        lines.push(
          `${prefix}ipDialogAgent->AcceptOnNotify(${component}, ${component}->GetChkBModifyNotification());`,
        );
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          const control = `${component}${index}`;
          lines.push(
            `${prefix}ipDialogAgent->AcceptOnNotify(${control}, ${control}->GetChkBModifyNotification());`,
          );
        }
      }
      continue;
    }

    if (item.component.startsWith("RadioButton")) {
      lines.push(notes);
      const component = `${dialogPointer}_RadioButton${paramName}`;
      // 旧代码会把共享 ComponentCount 由1改为2；这里只使用局部值保持输出。
      const count = item.componentCount === 1 ? 2 : item.componentCount;
      for (let index = 0; index < count; index += 1) {
        const control = `${component}${index}`;
        lines.push(
          `${prefix}ipDialogAgent->AcceptOnNotify(${control}, ${control}->GetRadBModifyNotification());`,
        );
      }
      continue;
    }

    if (item.component.startsWith("Combo")) {
      lines.push(notes);
      const component = `${dialogPointer}_Combo${paramName}`;
      lines.push(
        `${prefix}ipDialogAgent->AcceptOnNotify(${component}, ${component}->GetComboModifyNotification());`,
      );
      continue;
    }

    if (item.component === "Editor") {
      lines.push(notes);
      const component = `${dialogPointer}_Editor${paramName}`;
      if (item.componentCount === 1) {
        lines.push(
          `${prefix}ipDialogAgent->AcceptOnNotify(${component}, ${component}->GetEditModifyNotification());`,
        );
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          const control = `${component}${index}`;
          lines.push(
            `${prefix}ipDialogAgent->AcceptOnNotify(${control}, ${control}->GetEditModifyNotification());`,
          );
        }
      }
      continue;
    }

    lines.push(
      `${notes}, NOT SUPPORT, ${item.component}, ${item.componentCount}`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 取得旧 UI 多控件分支使用的集合起始下标；不支持时返回 `null`。 */
function ktCodegenLegacyDialogListIndex(
  dataType: string,
  includeFloat: boolean,
): number | null {
  if (dataType === "CATRawColldouble") return 1;
  if (dataType === "ListKtdouble" || dataType === "ListKtint") return 0;
  if (includeFloat && dataType === "ListKtfloat") return 0;
  return null;
}

/** 生成移除下划线后的旧 CAA/Qt 控件成员后缀。 */
function ktCodegenDialogParamName(item: KtCodegenItem): string {
  return item.paramString.replaceAll("_", "");
}

/** 按旧 `CreateCAAUpdateDialog` 规则把共享参数写入 CAA 控件。 */
function ktCodegenRenderCaaUpdateDialogLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isCaaVector: (item: KtCodegenItem) => boolean,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);

  for (const item of items) {
    lines.push("");
    const dialogPointer = item.isParamDlg ? "dialogMore->" : "";
    const param = `parameter->${item.paramString}`;
    const name = ktCodegenDialogParamName(item);
    const notes = `// ${item.id},${item.paramString},${item.notes}`;

    if (item.componentCount <= 0) {
      lines.push(
        `${prefix}${notes},NO ACTION,${item.component},${item.componentCount}`,
      );
      continue;
    }

    if (item.component === "Spinner") {
      lines.push(`${prefix}${notes}`);
      const component = `${dialogPointer}_Spinner${name}`;
      if (isCaaVector(item)) {
        const unitFactor = item.unit === "mm" ? " * 0.001" : "";
        lines.push(
          `${prefix}${component}X->SetValue(${param}.GetX()${unitFactor}, 0);`,
          `${prefix}${component}Y->SetValue(${param}.GetY()${unitFactor}, 0);`,
          `${prefix}${component}Z->SetValue(${param}.GetZ()${unitFactor}, 0);`,
        );
      } else if (item.componentCount === 1) {
        lines.push(`${prefix}${component}->SetValue(${param}, 0);`);
      } else {
        const indexSub = ktCodegenLegacyDialogListIndex(item.dataType, true);
        if (indexSub === null) {
          // 旧 VB 故意把错误文本写入候选源码，且不附加 `_prefix`。
          lines.push("data type is wrong!");
        } else {
          const unitFactor = item.unit === "mm" ? " * 0.001" : "";
          for (let index = 0; index < item.componentCount; index += 1) {
            lines.push(
              `${prefix}${component}${index}->SetValue(${param}[${index + indexSub}]${unitFactor}, 0);`,
            );
          }
        }
      }
      continue;
    }

    if (item.component.startsWith("CheckButton")) {
      lines.push(`${prefix}${notes}`);
      const component = `${dialogPointer}_CheckButton${name}`;
      if (item.componentCount === 1) {
        lines.push(
          `${prefix}${component}->SetState(${param} ? CATDlgCheck : CATDlgUncheck, 0);`,
        );
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          lines.push(
            `${prefix}${component}${index}->SetState( (${param} & (1<<${index}))? CATDlgCheck:CATDlgUncheck, 0);`,
          );
        }
      }
      continue;
    }

    if (item.component.startsWith("RadioButton")) {
      const component = `${dialogPointer}_RadioButton${name}`;
      // 旧方法会将共享 count=1 改成2；局部修正可保持输出且不污染 Analyze。
      const count = item.componentCount === 1 ? 2 : item.componentCount;
      const lastIndex = count - 1;
      // 原方法在 Radio 分支重复追加了同一条参数注释。
      lines.push(`${prefix}${notes}`, `${prefix}${notes}`);
      lines.push(
        `${prefix}if (${param} > ${lastIndex} || ${param} < 0) // BR`,
        `${prefix}    ${param} = (${item.dataType})0;`,
      );
      for (let index = 0; index < count; index += 1) {
        lines.push(
          `${prefix}${component}${index}->SetState((${param} == ${index}) ? CATDlgCheck : CATDlgUncheck, 0);`,
        );
      }
      continue;
    }

    if (item.component.startsWith("Combo")) {
      const component = `${dialogPointer}_Combo${name}`;
      if (item.dataType === "int") {
        lines.push(`${prefix}${component}->SetSelect( ${param}, 0);`);
      } else if (item.dataType === "double" || item.dataType === "CATUnicodeString") {
        lines.push(`${prefix}${component}->SetField( ${param});`);
      } else {
        lines.push(
          `${prefix}${component},NO ACTION,Data Type Error, ${item.dataType}`,
        );
      }
      continue;
    }

    if (item.component === "SelectorList") {
      lines.push(`${prefix}${notes}`);
      let withNoSelection = false;
      if (item.paramString === "OriginSpec") {
        withNoSelection = true;
        lines.push(
          `${prefix}NoSelectionMsg=${context.param.nameSpace}::GetCoordString(parameter->OriginCoord);`,
        );
      } else if (item.paramString === "XDirectionSpec") {
        withNoSelection = true;
        lines.push(
          `${prefix}NoSelectionMsg=${context.param.nameSpace}::GetCoordString(parameter->XDirectionCoord,parameter->XDirectionSign);`,
        );
      } else if (item.paramString === "YDirectionSpec") {
        withNoSelection = true;
        lines.push(
          `${prefix}NoSelectionMsg=${context.param.nameSpace}::GetCoordString(parameter->YDirectionCoord,parameter->YDirectionSign);`,
        );
      } else if (item.paramString === "AxisSpec") {
        withNoSelection = true;
        lines.push(`${prefix}NoSelectionMsg="Default(Absolute)";`);
      }
      const component = `${dialogPointer}_SelectorList${name}`;
      lines.push(
        `${prefix}KT_AUTO_FIELD_SET_LINE(${component}, ${param}${withNoSelection ? ", &NoSelectionMsg" : ""});`,
      );
      continue;
    }

    if (item.component === "Editor") {
      const component = `${dialogPointer}_Editor${name}`;
      const functionName =
        item.dataType === "double" || item.dataType === "int" ? "SetValue" : "SetText";
      if (item.componentCount === 1) {
        lines.push(`${prefix}${component}->${functionName}(${param}, 0);`);
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          lines.push(
            `${prefix}${component}${index}->${functionName}(${param}[${index + 1}], 0);`,
          );
        }
      }
      continue;
    }

    const supportNote =
      item.component.length === 0 || item.component === "PushButton"
        ? ""
        : " (Not Support)";
    lines.push(
      `${prefix}${notes},NO ACTION,${item.component}${supportNote},${item.componentCount}`,
    );
  }

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 `CreateCAAUpdateInfors` 规则把 CAA 控件值写回共享参数。 */
function ktCodegenRenderCaaUpdateInforsLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isCaaVector: (item: KtCodegenItem) => boolean,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);

  for (const item of items) {
    lines.push("");
    const dialogPointer = item.isParamDlg ? "dialogMore->" : "";
    const param = `parameter->${item.paramString}`;
    const name = ktCodegenDialogParamName(item);
    let notes = `// ${item.id},${item.paramString},${item.notes}`;
    const generated: string[] = [];
    const convertToInt =
      item.tcKind === "tk_integer" && item.dataType.toLowerCase() !== "int";

    if (item.componentCount <= 0) {
      notes += `,NO ACTION, ${item.component},${item.componentCount}`;
    } else if (item.component === "Spinner") {
      const component = `${dialogPointer}_Spinner${name}`;
      if (isCaaVector(item)) {
        const unitFactor = item.unit === "mm" ? " * 1000.0" : "";
        generated.push(
          `${prefix}${param}.SetX(${component}X->GetValue()${unitFactor});`,
          `${prefix}${param}.SetY(${component}Y->GetValue()${unitFactor});`,
          `${prefix}${param}.SetZ(${component}Z->GetValue()${unitFactor});`,
        );
      } else if (item.componentCount === 1) {
        const value = `${component}->GetValue()`;
        generated.push(
          `${prefix}${param} = ${item.dataType === "int" ? `Kt::round(${value})` : value};`,
        );
      } else {
        const indexSub = ktCodegenLegacyDialogListIndex(item.dataType, true);
        if (indexSub === null) {
          notes += "data type is wrong";
        } else {
          for (let index = 0; index < item.componentCount; index += 1) {
            const value = `${component}${index}->GetValue()`;
            const rounded = item.dataType === "int" ? `Kt::round(${value})` : value;
            generated.push(
              `${prefix}${param}[${index + indexSub}] = ${rounded};${item.dataType === "int" ? "//round" : ""}`,
            );
          }
        }
      }
    } else if (item.component.startsWith("CheckButton")) {
      const component = `${dialogPointer}_CheckButton${name}`;
      if (item.componentCount === 1) {
        const value = `${component}->GetState() == CATDlgCheck ? TRUE : FALSE`;
        generated.push(
          `${prefix}${param} = ${item.dataType === "int" ? value : `(${item.dataType})(int)(${value})`};`,
        );
      } else {
        generated.push(`${prefix}${param}=0;`);
        for (let index = 0; index < item.componentCount; index += 1) {
          const linePrefix = index === 0 ? "    " : prefix;
          generated.push(
            `${linePrefix}if (${component}${index}->GetState() == CATDlgCheck)${param} = ${param} | (1<<${index});`,
          );
        }
      }
    } else if (item.component.startsWith("RadioButton")) {
      const component = `${dialogPointer}_RadioButton${name}`;
      const count = item.componentCount === 1 ? 2 : item.componentCount;
      generated.push(`${prefix}${param} = (${item.dataType})0;`);
      for (let index = 1; index < count; index += 1) {
        generated.push(
          `${prefix}if (${component}${index}->GetState() == CATDlgCheck) // BR`,
          `${prefix}    ${param} = ${convertToInt ? `(${item.dataType})` : ""}${index};`,
        );
      }
    } else if (item.component.startsWith("Combo")) {
      const component = `${dialogPointer}_Combo${name}`;
      if (item.dataType === "int") {
        generated.push(`${prefix}${param} = ${component}->GetSelect();`);
      } else if (item.dataType === "double") {
        generated.push(`${prefix}${param} = ${component}->GetField();`);
      } else if (item.dataType === "CATUnicodeString") {
        generated.push(`${prefix}${component}->GetField(${param});`);
      } else {
        notes += `,NO ACTION,Data Type Error,${item.dataType}`;
      }
    } else if (item.component === "Editor") {
      const component = `${dialogPointer}_Editor${name}`;
      const functionName = item.dataType === "double" ? "GetValue" : "GetText";
      if (item.componentCount === 1) {
        generated.push(`${prefix}${param} = ${component}->${functionName}();`);
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          generated.push(
            `${prefix}${param}[${index + 1}] = ${component}${index}->${functionName}();`,
          );
        }
      }
    } else {
      const supportNote =
        item.component.length === 0 ||
        item.component === "PushButton" ||
        item.component === "SelectorList" ||
        item.component === "MultiList"
          ? ""
          : " (Not Support)";
      notes += `,NO ACTION,${item.component}${supportNote},${item.componentCount}`;
    }

    lines.push(`${prefix}${notes}`, ...generated);
  }

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 `CreateQTUpdateDialog` 规则把共享参数写入 Qt 控件。 */
function ktCodegenRenderQtUpdateDialogLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isPointOrVector3DType: (dataType: string) => boolean,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);

  for (const item of items) {
    lines.push("");
    const dialogPointer = item.isParamDlg ? "dialogMore->" : "ui->";
    const param = `parameter->${item.paramString}`;
    const name = ktCodegenDialogParamName(item);
    let notes = `// ${item.id}, ${item.paramString}, ${item.notes}`;
    const generated: string[] = [];

    if (item.componentCount <= 0) {
      notes += `,NO ACTION, ${item.component},${item.componentCount}`;
    } else if (item.component === "QListWidget") {
      generated.push(
        `${prefix}KT_AUTO_FIELD_SET_LINE(${dialogPointer}listWidget${name}, ${param});`,
      );
    } else if (item.component === "QDoubleSpinBox" || item.component === "QSpinBox") {
      const componentStem =
        item.component === "QDoubleSpinBox" ? "doubleSpinBox" : "spinBox";
      const component = `${dialogPointer}${componentStem}${name}`;
      if (isPointOrVector3DType(item.dataType)) {
        const unitFactor = item.unit === "mm" ? " * 0.001" : "";
        generated.push(
          `${prefix}${component}X->setValue(${param}.GetX()${unitFactor});`,
          `${prefix}${component}Y->setValue(${param}.GetY()${unitFactor});`,
          `${prefix}${component}Z->setValue(${param}.GetZ()${unitFactor});`,
        );
      } else if (item.componentCount === 1) {
        generated.push(`${prefix}${component}->setValue(${param});`);
      } else {
        const indexSub = ktCodegenLegacyDialogListIndex(
          item.dataType,
          item.component === "QSpinBox",
        );
        if (indexSub === null) {
          notes += "Data type is not suitable for auto code.";
        } else {
          const unitFactor = item.unit === "mm" ? " * 0.001" : "";
          for (let index = 0; index < item.componentCount; index += 1) {
            generated.push(
              `${prefix}${component}${index}->setValue(${param}[${index + indexSub}]${unitFactor});`,
            );
          }
        }
      }
    } else if (item.component.startsWith("QCheckBox")) {
      const component = `${dialogPointer}checkBox${name}`;
      if (item.componentCount === 1) {
        generated.push(`${prefix}${component}->setChecked(${param});`);
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          generated.push(
            `${prefix}${component}${index}->setChecked( ${param} & (1<<${index}));`,
          );
        }
      }
    } else if (item.component.startsWith("QRadioButton")) {
      const component = `${dialogPointer}radioButton${name}`;
      const count = item.componentCount === 1 ? 2 : item.componentCount;
      const lastIndex = count - 1;
      generated.push(
        `${prefix}if (${param}>${lastIndex} || ${param}<0) ${param}=0;//Correct`,
      );
      for (let index = 0; index < count; index += 1) {
        generated.push(
          `${prefix}${component}${index}->setChecked( ${param}==${index});`,
        );
      }
    } else if (item.component.startsWith("QComboBox")) {
      const component = `${dialogPointer}comboBox${name}`;
      if (
        item.dataType === "int" ||
        item.dataType === "short" ||
        item.dataType === "uint32_t"
      ) {
        generated.push(`${prefix}${component}->setCurrentIndex(${param});`);
      } else if (item.dataType === "QString") {
        generated.push(`${prefix}${component}->setEditText(${param});`);
      } else {
        // 原 VB 使用普通字符串而非插值字符串，故输出中保留字面占位符。
        generated.push(
          `${prefix}${component}->setEditText(QString::fromLocal8Bit({strParamSame}.str()));`,
        );
      }
    } else if (item.component === "QLineEdit") {
      const component = `${dialogPointer}lineEdit${name}`;
      const value =
        item.dataType === "KtString"
          ? ` QString::fromLocal8Bit(${param}.str()) `
          : param;
      if (item.componentCount === 1) {
        generated.push(`${prefix}${component}->setText( ${value});`);
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          generated.push(
            `${prefix}${component}${index}->setText(${value}[${index + 1}]);`,
          );
        }
      }
    } else {
      const supportNote =
        item.component.length === 0 || item.component === "QPushButton"
          ? ""
          : " (Not Support)";
      notes += `,NO ACTION, ${item.component}${supportNote},${item.componentCount}`;
    }

    lines.push(`${prefix}${notes}`, ...generated);
  }

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 `CreateQTUpdateInfors` 规则把 Qt 控件值写回共享参数。 */
function ktCodegenRenderQtUpdateInforsLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  isPointOrVector3DType: (dataType: string) => boolean,
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderLegacyStart(region);

  for (const item of items) {
    lines.push("");
    const dialogPointer = item.isParamDlg ? "dialogMore->" : "ui->";
    const param = `parameter->${item.paramString}`;
    const name = ktCodegenDialogParamName(item);
    let notes = `// ${item.id}, ${item.paramString}, ${item.notes}`;
    const generated: string[] = [];
    const convertToInt =
      item.tcKind === "tk_integer" && item.dataType.toLowerCase() !== "int";

    if (item.componentCount <= 0) {
      notes += `,NO ACTION, ${item.component},${item.componentCount}`;
    } else if (item.component === "QDoubleSpinBox" || item.component === "QSpinBox") {
      const componentStem =
        item.component === "QDoubleSpinBox" ? "doubleSpinBox" : "spinBox";
      const component = `${dialogPointer}${componentStem}${name}`;
      if (isPointOrVector3DType(item.dataType)) {
        const unitFactor = item.unit === "mm" ? " * 1000.0" : "";
        generated.push(
          `${prefix}${param}.SetX(${component}X->value()${unitFactor});`,
          `${prefix}${param}.SetY(${component}Y->value()${unitFactor});`,
          `${prefix}${param}.SetZ(${component}Z->value()${unitFactor});`,
        );
      } else if (item.componentCount === 1) {
        const value = `${component}->value()`;
        if (item.component === "QDoubleSpinBox" && item.dataType === "int") {
          generated.push(`${prefix}${param} = Kt::round(${value}); //round to int`);
        } else {
          generated.push(`${prefix}${param} = ${value};`);
        }
      } else {
        const indexSub = ktCodegenLegacyDialogListIndex(item.dataType, true);
        if (indexSub === null) {
          notes += "Data type is not suitable for auto code.";
        } else {
          for (let index = 0; index < item.componentCount; index += 1) {
            const value = `${component}${index}->value()`;
            const rounded =
              item.component === "QDoubleSpinBox" && item.dataType === "int"
                ? `Kt::round(${value})`
                : value;
            generated.push(
              `${prefix}${param}[${index + indexSub}] = ${rounded};${rounded !== value ? " //round to int" : ""}`,
            );
          }
        }
      }
    } else if (item.component.startsWith("QCheckBox")) {
      const component = `${dialogPointer}checkBox${name}`;
      if (item.componentCount === 1) {
        generated.push(`${prefix}${param} = ${component}->isChecked();`);
      } else {
        generated.push(`${prefix}${param}=0;`);
        for (let index = 0; index < item.componentCount; index += 1) {
          generated.push(
            `${prefix}if (${component}${index}->isChecked()) { ${param} = ${param} | (1<<${index}); }`,
          );
        }
      }
    } else if (item.component.startsWith("QRadioButton")) {
      const component = `${dialogPointer}radioButton${name}`;
      const count = item.componentCount === 1 ? 2 : item.componentCount;
      generated.push(`${prefix}${param} = 0;//默认值0`);
      for (let index = 0; index < count; index += 1) {
        generated.push(
          `${prefix}if (${component}${index}->isChecked())`,
          `${prefix}    ${param} = ${convertToInt ? `(${item.dataType})` : ""}${index};${convertToInt ? "}" : ""}`,
        );
      }
    } else if (item.component.startsWith("QComboBox")) {
      const component = `${dialogPointer}comboBox${name}`;
      if (
        item.dataType === "int" ||
        item.dataType === "short" ||
        item.dataType === "uint32_t"
      ) {
        generated.push(`${prefix}${param} = ${component}->currentIndex();`);
      } else if (item.dataType === "QString") {
        generated.push(`${prefix}${param} = ${component}->currentText();`);
      } else {
        generated.push(
          `${prefix}${param} = ${component}->currentText().toLocal8Bit().constData();`,
        );
      }
    } else if (item.component === "QLineEdit") {
      const component = `${dialogPointer}lineEdit${name}`;
      const conversion =
        item.dataType === "KtString" ? ".toLocal8Bit().constData()" : "";
      if (item.componentCount === 1) {
        generated.push(`${prefix}${param} = ${component}->text()${conversion};`);
      } else {
        for (let index = 0; index < item.componentCount; index += 1) {
          generated.push(
            `${prefix}${param}[${index + 1}] = ${component}${index}->text()${conversion};`,
          );
        }
      }
    } else {
      notes += `,NO ACTION, ${item.component} (Not Support),${item.componentCount}`;
    }

    lines.push(`${prefix}${notes}`, ...generated);
  }

  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 生成已迁移的 Qt Dialog/Parameter 更新块。 */
function ktCodegenRenderQt(
  context: KtCodegenRendererContext,
  algorithms: KtCodegenQtAlgorithms,
): KtCodegenRendererResult {
  const artifacts: KtCodegenArtifact[] = [];
  const diagnostics: KtCodegenDiagnostic[] = [];
  const requestedBlocks = new Set(context.blockKeys);

  for (const region of context.markerRegions) {
    if (
      !KT_CODEGEN_QT_MIGRATED_BLOCKS.has(region.blockKey) ||
      !requestedBlocks.has(region.blockKey) ||
      ktCodegenGetBlock(region.blockKey).target !== context.target
    ) {
      continue;
    }
    const items = context.param.items.filter(
      (item) => item.nameSuffix === region.nameSuffix && item.id >= 1,
    );
    const lines =
      region.blockKey === "QT UPDATE DIALOG"
        ? ktCodegenRenderQtUpdateDialogLines(
            region,
            items,
            algorithms.isPointOrVector3DType,
          )
        : ktCodegenRenderQtUpdateInforsLines(
            region,
            items,
            algorithms.isPointOrVector3DType,
          );
    ktCodegenAppendRegionArtifact(context, region, items, lines, artifacts, diagnostics);
  }

  const targetBlocks = context.blockKeys.filter(
    (blockKey) => ktCodegenGetBlock(blockKey).target === context.target,
  );
  const pendingBlocks = targetBlocks.filter(
    (blockKey) => !KT_CODEGEN_QT_MIGRATED_BLOCKS.has(blockKey),
  );
  const status = pendingBlocks.length === 0 ? "ready" : "scaffold";
  if (status === "scaffold") {
    diagnostics.push({
      code: "renderer.blocks-pending",
      severity: "info",
      message: `${context.target} still has pending blocks: ${pendingBlocks.join(", ")}.`,
      path: { source: "renderer", field: context.target },
    });
  }
  return { status, artifacts, diagnostics };
}

/** 取得旧 `KevinControlID.ToString()` 写入 Selector 块的枚举名称。 */
function ktCodegenSelectorBlockTitle(blockKey: KtCodegenBlockKey): string {
  switch (blockKey) {
    case "DLG DEFINE FIELD TYPE":
      return "DlgDefineFieldType";
    case "DLG SET ACTIVE FIELD":
      return "DlgSetActiveField";
    case "DLG GET SELECTOR LIST":
      return "DlgGetSelectorList";
    case "CMD AGENT DECLARE":
      return "CmdAgentDeclare";
    case "CMD AGENT CONSTRUCTOR":
      return "CmdAgentConstructor";
    case "CMD AGENT DESTRUCTOR":
      return "CmdAgentDestructor";
    case "CMD AGENT BUILD GRAPH":
      return "CmdAgentBuildGraph";
    case "CMD AGENT UPDATE STATE":
      return "CmdAgentUpdateState";
    case "CMD AGENT FIA CLEAR":
      return "CmdAgentFiaClear";
    case "CMD ACTION PDA":
      return "CmdActionPda";
    case "CMD ACTION FIA":
      return "CmdActionFia";
    case "CMD ELEMENT SELECTED":
      return "CmdElementSelected";
    case "CMD SET ACTIVE FIELD":
      return "CmdSetActiveField";
    default:
      throw new Error(`Unsupported selector block: ${blockKey}`);
  }
}

/** 按旧 `AutoCodeStartSelector` 规则生成 Field 块公共头部。 */
function ktCodegenRenderSelectorStart(
  region: KtCodegenMarkerRegion,
  notes: readonly string[] = [],
): string[] {
  const prefix = region.start.linePrefix;
  const separator = "//.............................................................................";
  return [
    ...ktCodegenRenderLegacyStart(region),
    `${prefix}${separator}`,
    `${prefix}// @key    ${ktCodegenSelectorBlockTitle(region.blockKey)}`,
    ...notes.map((note) => `${prefix}// ${note}`),
    `${prefix}${separator}`,
  ];
}

/** 创建旧 Field enum 使用的 `Field_<Class>_` 公共前缀。 */
function ktCodegenFieldTypePrefix(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
): string {
  return `Field_${context.param.namePrefix}${context.param.nameMiddle}${region.nameSuffix}_`;
}

/** 按旧 Dialog Selector 三个方法生成 Field 定义和兼容访问逻辑。 */
function ktCodegenRenderCaaDialogFieldLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
): string[] {
  const prefix = region.start.linePrefix;
  const fieldPrefix = ktCodegenFieldTypePrefix(context, region);

  if (region.blockKey === "DLG DEFINE FIELD TYPE") {
    const lines = ktCodegenRenderSelectorStart(region);
    lines.push(`${prefix}${fieldPrefix}None = 0, // None`);
    items.forEach((item, index) => {
      lines.push(
        `${prefix}${fieldPrefix}${item.paramString} = ${index + 1}, // ${item.paramString}`,
      );
    });
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "DLG SET ACTIVE FIELD") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Dlg::SetActiveField()",
      "@brief  Set Active Field, clear other field.",
    ]);
    for (const item of items) {
      lines.push(
        `${prefix}if (${fieldPrefix}${item.paramString} != field)`,
        `${prefix}    _SelectorList${item.paramString}->ClearSelect();`,
      );
    }
    lines.push(`${prefix}_ActiveField = field;`);
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Dlg::GetSelectorList()",
    "@brief  get SelectorList",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`);
  if (items.length === 0) {
    lines.push(`${prefix}return NULL;`);
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }
  lines.push(`${prefix}switch (field) {`);
  for (const item of items) {
    lines.push(
      `${prefix}case ${fieldPrefix}${item.paramString}:`,
      `${prefix}    return _SelectorList${item.paramString};`,
    );
  }
  lines.push(`${prefix}default:`, `${prefix}    return NULL;`, `${prefix}}`);
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 按旧 Command Selector 规则生成 Agent 声明、构造初始化和析构清理。 */
function ktCodegenRenderCaaCommandAgentLifecycleLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
): string[] {
  const prefix = region.start.linePrefix;
  const lines = ktCodegenRenderSelectorStart(region);

  if (region.blockKey === "CMD AGENT DECLARE") {
    lines.push(
      `${prefix}KT_AUTO_CMD_AGENT_DECLARE_COMMON();`,
      `${prefix}KT_AUTO_CMD_AGENT_DECLARE_BASE(${context.param.namePrefix}, ${context.param.nameMiddle}${region.nameSuffix});`,
      "",
      `${prefix}// Field count = ${items.length}`,
    );
    for (const item of items) {
      lines.push(`${prefix}KT_AUTO_CMD_AGENT_DECLARE_FIELD(${item.paramString});`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD AGENT CONSTRUCTOR") {
    lines.push(`${prefix}, KT_AUTO_CMD_AGENT_CONSTRUCTOR_COMMON()`);
    for (const item of items) {
      lines.push(
        `${prefix}, KT_AUTO_CMD_AGENT_CONSTRUCTOR_FIELD(${item.paramString})`,
      );
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  lines.push(`${prefix}// Field count = ${items.length}`);
  for (const item of items) {
    lines.push(`${prefix}KT_AUTO_CMD_AGENT_DESTRUCTOR_FIELD(${item.paramString});`);
  }
  lines.push(
    "",
    `${prefix}// place at the end`,
    `${prefix}KT_AUTO_CMD_AGENT_DESTRUCTOR_COMMON();`,
  );
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 为旧 Command Field 不支持分支生成可见原因注释。 */
function ktCodegenRenderUnsupportedCommandField(
  item: KtCodegenItem,
  prefix: string,
  indent = "",
): string[] {
  return [
    `${prefix}${indent}// Please write your own code outside.`,
    item.componentCount === 0
      ? `${prefix}${indent}// Because the component count is 0.`
      : `${prefix}${indent}// Because ${item.component} is not supported.`,
  ];
}

/** 按旧规则生成 BuildGraph、FIA Clear 和 UpdateState 三个 Command 块。 */
function ktCodegenRenderCaaCommandGraphStateLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;

  if (region.blockKey === "CMD AGENT BUILD GRAPH") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::BuildGraph()",
      "@brief  set agent, AddTransition",
      "RegisterFiled() will set suggested menu id by input name. You can change it later",
    ]);
    lines.push(
      "",
      `${prefix}// Build Start .......................`,
      `${prefix}KT_AUTO_CMD_BUILD_START(${region.classId});`,
      "",
      `${prefix}// Field count = ${items.length}`,
    );
    items.forEach((item, index) => {
      lines.push(
        "",
        `${prefix}// Field ${index + 1} ${item.paramString} .......................`,
        `${prefix}// ${index + 1}.1 define fia`,
      );
      if (algorithms.isCommandAutoField(item)) {
        lines.push(
          `${prefix}KT_AUTO_CMD_BUILD_FIA_${algorithms.getCommandSuggestedFilter(item.paramString)}(${item.paramString});`,
          `${prefix}// ${index + 1}.2 others`,
          `${prefix}KT_AUTO_CMD_BUILD_FIELD(${region.classId}, ${item.paramString});`,
        );
      } else {
        lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix));
      }
    });
    lines.push(
      "",
      `${prefix}// Build End .......................`,
      `${prefix}KT_AUTO_CMD_BUILD_END(${region.classId});`,
    );
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD AGENT FIA CLEAR") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::fiaAgentClear()",
      "@brief  clear select state",
    ]);
    for (const item of items) {
      lines.push(`${prefix}KT_AUTO_CMD_ACTION_FIA_CLEAR(${item.paramString});`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Cmd::fiaAgentUpdate()",
    "@brief  Update select state",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`);
  if (items.length > 0) {
    const fieldPrefix = ktCodegenFieldTypePrefix(context, region);
    lines.push(`${prefix}switch (field) {`);
    for (const item of items) {
      lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
      if (algorithms.isCommandAutoField(item)) {
        lines.push(
          `${prefix}    KT_AUTO_CMD_AGENT_UPDATE_STATE(${item.paramString});`,
        );
      } else {
        lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix, "    "));
      }
      lines.push(`${prefix}    break;`);
    }
    lines.push(
      `${prefix}case 0:`,
      `${prefix}    KT_AUTO_CMD_AGENT_UPDATE_STATE_ERROR();`,
      `${prefix}}`,
    );
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 生成 Command Action 自动宏或旧人工实现提示。 */
function ktCodegenAppendCommandAction(
  lines: string[],
  item: KtCodegenItem,
  prefix: string,
  macro: "KT_AUTO_CMD_ACTION_PDA" | "KT_AUTO_CMD_ACTION_FIA" | "KT_AUTO_HSO_ADD",
  isCommandAutoField: (item: KtCodegenItem) => boolean,
): void {
  if (isCommandAutoField(item)) {
    lines.push(`${prefix}    ${macro}(${item.paramString});`);
    return;
  }
  lines.push(...ktCodegenRenderUnsupportedCommandField(item, prefix, "    "));
}

/** 按旧规则生成 PDA、FIA、废弃 ElementSelected 和活动 Field 四个块。 */
function ktCodegenRenderCaaCommandActionLines(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  algorithms: KtCodegenCaaAlgorithms,
): string[] {
  const prefix = region.start.linePrefix;
  const fieldPrefix = ktCodegenFieldTypePrefix(context, region);

  if (region.blockKey === "CMD ACTION PDA") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::ActionSelectorListPda()",
      "@brief  InitializeAcquisition and HSO Append",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`);
    if (items.length > 0) {
      lines.push(
        `${prefix}if (fieldChange) KT_AUTO_HSO_CLEAR();`,
        `${prefix}switch (field) {`,
      );
      for (const item of items) {
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        ktCodegenAppendCommandAction(
          lines,
          item,
          prefix,
          "KT_AUTO_CMD_ACTION_PDA",
          algorithms.isCommandAutoField,
        );
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD ACTION FIA") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::ActionSelectorListFia()",
      "@brief  Action object selected",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`, `${prefix}int count = 0;`);
    if (items.length > 0) {
      lines.push(`${prefix}switch (field) {`);
      for (const item of items) {
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        ktCodegenAppendCommandAction(
          lines,
          item,
          prefix,
          "KT_AUTO_CMD_ACTION_FIA",
          algorithms.isCommandAutoField,
        );
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  if (region.blockKey === "CMD ELEMENT SELECTED") {
    const lines = ktCodegenRenderSelectorStart(region, [
      "@usage  put this code block into the function Cmd::AfterElementSelected()",
      "@brief  After Element Selected",
      "@brief  !Discard. Replaced by CMD ACTION FIA",
    ]);
    lines.push(`${prefix}// Field count = ${items.length}`);
    if (items.length > 0) {
      lines.push(`${prefix}switch (field) {`);
      for (const item of items) {
        const parameter = `parameter->${item.paramString}`;
        lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
        if (item.dataType === "CATListValCATISpecObject_var") {
          lines.push(
            `${prefix}    if (${parameter}.Locate(spiSpecOnSelection) == 0)`,
            `${prefix}    {`,
            `${prefix}        ${parameter}.Append(spiSpecOnSelection);`,
            `${prefix}    }`,
            `${prefix}    else`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(pPathElement);`,
            `${prefix}        ${parameter}.RemoveValue(spiSpecOnSelection);`,
            `${prefix}    }`,
          );
        } else {
          lines.push(
            `${prefix}    if (${parameter} == spiSpecOnSelection)`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(pPathElement);`,
            `${prefix}        ${parameter} = NULL_var;`,
            `${prefix}    }`,
            `${prefix}    else`,
            `${prefix}    {`,
            `${prefix}        _ktcHSO.RemoveElement(${parameter});`,
            `${prefix}        ${parameter} = spiSpecOnSelection;`,
            `${prefix}    }`,
          );
        }
        lines.push(`${prefix}    break;`);
      }
      lines.push(`${prefix}}`);
    }
    return [...lines, ...ktCodegenRenderLegacyEnd(region)];
  }

  const lines = ktCodegenRenderSelectorStart(region, [
    "@usage  put this code block into the function Cmd::SetActiveField()",
    "@brief  Set Active Field, clear other field, update select agent...",
  ]);
  lines.push(`${prefix}// Field count = ${items.length}`, "", `${prefix}KT_AUTO_HSO_CLEAR();`);
  if (items.length > 0) {
    lines.push(`${prefix}switch (field) {`);
    for (const item of items) {
      lines.push(`${prefix}case ${fieldPrefix}${item.paramString}:`);
      ktCodegenAppendCommandAction(
        lines,
        item,
        prefix,
        "KT_AUTO_HSO_ADD",
        algorithms.isCommandAutoField,
      );
      lines.push(`${prefix}    break;`);
    }
    lines.push(`${prefix}default:`, `${prefix}    break;`, `${prefix}}`);
  }
  return [...lines, ...ktCodegenRenderLegacyEnd(region)];
}

/** 生成当前已迁移 CAA block，并报告同目标尚未迁移的 block。 */
function ktCodegenRenderCaa(
  context: KtCodegenRendererContext,
  algorithms: KtCodegenCaaAlgorithms,
): KtCodegenRendererResult {
  const artifacts: KtCodegenArtifact[] = [];
  const diagnostics: KtCodegenDiagnostic[] = [];
  const requestedBlocks = new Set(context.blockKeys);

  for (const region of context.markerRegions) {
    if (
      !KT_CODEGEN_CAA_MIGRATED_BLOCKS.has(region.blockKey) ||
      !requestedBlocks.has(region.blockKey) ||
      ktCodegenGetBlock(region.blockKey).target !== context.target
    ) {
      continue;
    }
    const isCatalog = region.blockKey === "CATALOG PARAMS";
    const isFactoryTree = region.blockKey === "FACTRY ON TREE";
    const isDialogNotify = region.blockKey === "DIALOG NOTIFY";
    const isUpdateDialog = region.blockKey === "UPDATE DIALOG";
    const isUpdateInfors = region.blockKey === "UPDATE INFORS";
    const isDialogField =
      region.blockKey === "DLG DEFINE FIELD TYPE" ||
      region.blockKey === "DLG SET ACTIVE FIELD" ||
      region.blockKey === "DLG GET SELECTOR LIST";
    const isCommandAgentLifecycle =
      KT_CODEGEN_CAA_COMMAND_AGENT_LIFECYCLE_BLOCKS.has(region.blockKey);
    const isCommandGraphState =
      KT_CODEGEN_CAA_COMMAND_GRAPH_STATE_BLOCKS.has(region.blockKey);
    const isCommandAction = KT_CODEGEN_CAA_COMMAND_ACTION_BLOCKS.has(
      region.blockKey,
    );
    const isParamsClass =
      region.blockKey === "IMPLEMENTS PARAM GET" ||
      region.blockKey === "IMPLEMENTS PARAM SET";
    let items: KtCodegenItem[];
    if (isCatalog) {
      items = context.param.items.filter((item) =>
        ktCodegenIsCaaCatalogItem(item, region.nameSuffix),
      );
    } else if (isFactoryTree) {
      items = context.param.items.filter((item) =>
        ktCodegenIsCaaFactoryTreeItem(item, region.nameSuffix),
      );
    } else if (isDialogNotify || isUpdateDialog || isUpdateInfors) {
      items = context.param.items.filter((item) =>
        ktCodegenIsCaaDialogItem(item, region.nameSuffix),
      );
    } else if (
      isDialogField ||
      isCommandAgentLifecycle ||
      isCommandGraphState ||
      isCommandAction
    ) {
      items = context.param.items.filter(
        (item) =>
          item.nameSuffix === region.nameSuffix && algorithms.isSelectorField(item),
      );
    } else if (isParamsClass) {
      items = context.param.items.filter((item) =>
        ktCodegenIsCaaParamsClassItem(item, region.nameSuffix),
      );
    } else {
      items = context.param.items.filter((item) =>
        ktCodegenIsCaaInterfaceItem(item, region.nameSuffix),
      );
    }

    let lines: string[];
    if (isCatalog) {
      lines = ktCodegenRenderCaaCatalogLines(region, items, algorithms);
    } else if (isFactoryTree) {
      lines = ktCodegenRenderCaaFactoryTreeLines(region, items, algorithms.formatTreeName);
    } else if (isDialogNotify) {
      lines = ktCodegenRenderCaaDialogNotifyLines(region, items, algorithms.isCaaVector);
    } else if (isUpdateDialog) {
      lines = ktCodegenRenderCaaUpdateDialogLines(
        context,
        region,
        items,
        algorithms.isCaaVector,
      );
    } else if (isUpdateInfors) {
      lines = ktCodegenRenderCaaUpdateInforsLines(region, items, algorithms.isCaaVector);
    } else if (isDialogField) {
      lines = ktCodegenRenderCaaDialogFieldLines(context, region, items);
    } else if (isCommandAgentLifecycle) {
      lines = ktCodegenRenderCaaCommandAgentLifecycleLines(context, region, items);
    } else if (isCommandGraphState) {
      lines = ktCodegenRenderCaaCommandGraphStateLines(
        context,
        region,
        items,
        algorithms,
      );
    } else if (isCommandAction) {
      lines = ktCodegenRenderCaaCommandActionLines(
        context,
        region,
        items,
        algorithms,
      );
    } else if (KT_CODEGEN_CAA_INTERFACE_BLOCKS.has(region.blockKey)) {
      lines = ktCodegenRenderCaaInterfaceLines(region, items, algorithms.isParamSpecList);
    } else if (isParamsClass) {
      lines = ktCodegenRenderCaaParamsClassLines(region, items, algorithms.isParamSpecList);
    } else {
      lines = ktCodegenRenderCaaFeatureCppLines(context, region, items, algorithms);
    }
    const artifactCount = artifacts.length;
    ktCodegenAppendRegionArtifact(context, region, items, lines, artifacts, diagnostics);
    if (
      artifacts.length > artifactCount &&
      ktCodegenGetBlock(region.blockKey).legacyState === "legacy-deprecated"
    ) {
      diagnostics.push({
        code: "renderer.legacy-deprecated-block",
        severity: "warning",
        message: `${region.blockKey} is retained for compatibility; its archived VB method is marked discarded.`,
        path: {
          source: "renderer",
          file: region.path,
          field: region.blockKey,
        },
      });
    }
  }

  const targetBlocks = context.blockKeys.filter(
    (blockKey) => ktCodegenGetBlock(blockKey).target === context.target,
  );
  const pendingBlocks = targetBlocks.filter(
    (blockKey) => !KT_CODEGEN_CAA_MIGRATED_BLOCKS.has(blockKey),
  );
  const supportsTarget =
    context.target === "caa.core" ||
    context.target === "caa.model" ||
    context.target === "caa.feature-io" ||
    context.target === "caa.control" ||
    context.target === "caa.dialog";
  const status = supportsTarget && pendingBlocks.length === 0 ? "ready" : "scaffold";
  if (status === "scaffold") {
    diagnostics.push({
      code: "renderer.blocks-pending",
      severity: "info",
      message:
        pendingBlocks.length > 0
          ? `${context.target} still has pending blocks: ${pendingBlocks.join(", ")}.`
          : `${context.target} has no migrated CAA block renderer yet.`,
      path: { source: "renderer", field: context.target },
    });
  }

  return { status, artifacts, diagnostics };
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

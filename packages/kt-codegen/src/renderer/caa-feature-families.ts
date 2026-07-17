// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenCaaAlgorithms,
  KtCodegenParamSpecListClassifier,
  KtCodegenRendererContext,
} from "../KtCodegenRenderer.js";
import type { KtCodegenRendererFamily } from "./family-registry.js";
import {
  ktCodegenRenderLegacyEnd,
  ktCodegenRenderLegacyNotes,
  ktCodegenRenderLegacyStart,
} from "./legacy-compatibility.js";

const CAA_INTERFACE_BLOCKS = [
  "IMPLEMENTS HEAD GET",
  "IMPLEMENTS HEAD SET",
  "INTERFACES HEAD GET",
  "INTERFACES HEAD SET",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_FEATURE_IO_BLOCKS = [
  "IMPLEMENTS CPP GET",
  "IMPLEMENTS CPP SET",
  "IMPLEMENTS PARAM GET",
  "IMPLEMENTS PARAM SET",
] as const satisfies readonly KtCodegenBlockKey[];

const CAA_INTERFACE_BLOCK_SET: ReadonlySet<KtCodegenBlockKey> = new Set(CAA_INTERFACE_BLOCKS);
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

const featureIoFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.feature-io",
  blockKeys: [...CAA_INTERFACE_BLOCKS, ...CAA_FEATURE_IO_BLOCKS],
  renderRegion(context, region, algorithms) {
    const isParamsClass =
      region.blockKey === "IMPLEMENTS PARAM GET" ||
      region.blockKey === "IMPLEMENTS PARAM SET";
    const items = context.param.items.filter((item) =>
      isParamsClass
        ? ktCodegenIsCaaParamsClassItem(item, region.nameSuffix)
        : ktCodegenIsCaaInterfaceItem(item, region.nameSuffix),
    );
    const lines = CAA_INTERFACE_BLOCK_SET.has(region.blockKey)
      ? ktCodegenRenderCaaInterfaceLines(region, items, algorithms.isParamSpecList)
      : isParamsClass
        ? ktCodegenRenderCaaParamsClassLines(region, items, algorithms.isParamSpecList)
        : ktCodegenRenderCaaFeatureCppLines(context, region, items, algorithms);
    return { items, lines };
  },
};

const catalogFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.catalog",
  blockKeys: ["CATALOG PARAMS"],
  renderRegion(context, region, algorithms) {
    const items = context.param.items.filter((item) =>
      ktCodegenIsCaaCatalogItem(item, region.nameSuffix),
    );
    return { items, lines: ktCodegenRenderCaaCatalogLines(region, items, algorithms) };
  },
};

const factoryTreeFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.factory-tree",
  blockKeys: ["FACTRY ON TREE"],
  renderRegion(context, region, algorithms) {
    const items = context.param.items.filter((item) =>
      ktCodegenIsCaaFactoryTreeItem(item, region.nameSuffix),
    );
    return {
      items,
      lines: ktCodegenRenderCaaFactoryTreeLines(region, items, algorithms.formatTreeName),
    };
  },
};

export const KT_CODEGEN_CAA_FEATURE_FAMILIES = [
  featureIoFamily,
  catalogFamily,
  factoryTreeFamily,
] as const satisfies readonly KtCodegenRendererFamily<KtCodegenCaaAlgorithms>[];

// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenCaaAlgorithms,
  KtCodegenRendererContext,
} from "../KtCodegenRenderer.js";
import {
  ktCodegenDialogParamName,
  ktCodegenLegacyDialogListIndex,
} from "./dialog-support.js";
import type { KtCodegenRendererFamily } from "./family-registry.js";
import {
  ktCodegenRenderLegacyEnd,
  ktCodegenRenderLegacyStart,
} from "./legacy-compatibility.js";

export const KT_CODEGEN_CAA_DIALOG_BLOCKS = [
  "DIALOG NOTIFY",
  "UPDATE DIALOG",
  "UPDATE INFORS",
] as const satisfies readonly KtCodegenBlockKey[];
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
        `${prefix}ipDialogAgent->AcceptOnNotify(${component}, ${component}->GetComboSelectNotification());`,
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
        lines.push(`${prefix}${notes}`, `${prefix}${component}->SetSelect( ${param}, 0);`);
      } else if (item.dataType === "double" || item.dataType === "CATUnicodeString") {
        lines.push(`${prefix}${notes}`, `${prefix}${component}->SetField( ${param});`);
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

const caaDialogFamily: KtCodegenRendererFamily<KtCodegenCaaAlgorithms> = {
  id: "caa.dialog",
  blockKeys: KT_CODEGEN_CAA_DIALOG_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = context.param.items.filter((item) =>
      ktCodegenIsCaaDialogItem(item, region.nameSuffix),
    );
    const lines = region.blockKey === "DIALOG NOTIFY"
      ? ktCodegenRenderCaaDialogNotifyLines(region, items, algorithms.isCaaVector)
      : region.blockKey === "UPDATE DIALOG"
        ? ktCodegenRenderCaaUpdateDialogLines(
            context,
            region,
            items,
            algorithms.isCaaVector,
          )
        : ktCodegenRenderCaaUpdateInforsLines(region, items, algorithms.isCaaVector);
    return { items, lines };
  },
};

export const KT_CODEGEN_CAA_DIALOG_FAMILIES = [
  caaDialogFamily,
] as const satisfies readonly KtCodegenRendererFamily<KtCodegenCaaAlgorithms>[];

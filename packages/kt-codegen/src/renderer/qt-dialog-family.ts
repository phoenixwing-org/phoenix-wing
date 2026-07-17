// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenQtAlgorithms,
  KtCodegenRendererContext,
  KtCodegenRendererResult,
} from "../KtCodegenRenderer.js";
import {
  ktCodegenDialogParamName,
  ktCodegenLegacyDialogListIndex,
} from "./dialog-support.js";
import type { KtCodegenRendererFamily } from "./family-registry.js";
import { ktCodegenRenderRegisteredFamilies } from "./family-registry.js";
import {
  ktCodegenRenderLegacyEnd,
  ktCodegenRenderLegacyStart,
} from "./legacy-compatibility.js";

export const KT_CODEGEN_QT_BLOCKS = [
  "QT UPDATE DIALOG",
  "QT UPDATE INFORS",
] as const satisfies readonly KtCodegenBlockKey[];
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

const qtDialogFamily: KtCodegenRendererFamily<KtCodegenQtAlgorithms> = {
  id: "qt.dialog",
  blockKeys: KT_CODEGEN_QT_BLOCKS,
  renderRegion(context, region, algorithms) {
    const items = context.param.items.filter(
      (item) => item.nameSuffix === region.nameSuffix && item.id >= 1,
    );
    return {
      items,
      lines: region.blockKey === "QT UPDATE DIALOG"
        ? ktCodegenRenderQtUpdateDialogLines(
            region,
            items,
            algorithms.isPointOrVector3DType,
          )
        : ktCodegenRenderQtUpdateInforsLines(
            region,
            items,
            algorithms.isPointOrVector3DType,
          ),
    };
  },
};

export const KT_CODEGEN_QT_FAMILIES = [
  qtDialogFamily,
] as const satisfies readonly KtCodegenRendererFamily<KtCodegenQtAlgorithms>[];

/** 通过 block family 注册表生成 Qt Dialog/Parameter 双向更新目标。 */
export function ktCodegenRenderQt(
  context: KtCodegenRendererContext,
  algorithms: KtCodegenQtAlgorithms,
): KtCodegenRendererResult {
  return ktCodegenRenderRegisteredFamilies(context, algorithms, KT_CODEGEN_QT_FAMILIES, {
    supportedTargets: ["qt.dialog", "qt.parameter"],
    noFamilyMessage: (target) => `${target} has no registered Qt block family.`,
  });
}

// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenDefaultValueFormatter,
  KtCodegenRendererContext,
  KtCodegenRendererResult,
} from "../KtCodegenRenderer.js";
import type { KtCodegenRendererFamily } from "./family-registry.js";
import { ktCodegenRenderRegisteredFamilies } from "./family-registry.js";
import {
  ktCodegenRenderLegacyEnd,
  ktCodegenRenderLegacyNotes,
  ktCodegenRenderLegacyStart,
} from "./legacy-compatibility.js";

export const KT_CODEGEN_CPP_PARAMETER_BLOCKS = [
  "PARAM CONSTRUCTOR",
  "PARAM DECLARATION",
  "PARAM DESTRUCTOR",
  "PARAM EQUAL",
] as const satisfies readonly KtCodegenBlockKey[];

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

const cppParameterFamily: KtCodegenRendererFamily<KtCodegenDefaultValueFormatter> = {
  id: "cpp.parameter",
  blockKeys: KT_CODEGEN_CPP_PARAMETER_BLOCKS,
  renderRegion(context, region, formatDefaultValue) {
    const items = context.param.items.filter(
      (item) => item.nameSuffix === region.nameSuffix && item.id >= 1,
    );
    return {
      items,
      lines: ktCodegenRenderCppParameterLines(region, items, formatDefaultValue),
    };
  },
};

export const KT_CODEGEN_CPP_PARAMETER_FAMILIES = [
  cppParameterFamily,
] as const satisfies readonly KtCodegenRendererFamily<KtCodegenDefaultValueFormatter>[];

/** 通过 block family 注册表生成普通 C++ Parameter 目标。 */
export function ktCodegenRenderCppParameter(
  context: KtCodegenRendererContext,
  formatDefaultValue: KtCodegenDefaultValueFormatter,
): KtCodegenRendererResult {
  return ktCodegenRenderRegisteredFamilies(
    context,
    formatDefaultValue,
    KT_CODEGEN_CPP_PARAMETER_FAMILIES,
    {
      supportedTargets: ["cpp.parameter"],
      noFamilyMessage: (target) => `${target} has no registered C++ block family.`,
    },
  );
}

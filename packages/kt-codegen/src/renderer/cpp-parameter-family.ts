// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import { KT_CODEGEN_GENERATOR_VERSION } from "../KtCodegenGeneratorVersion.js";
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

/** Follow the next semantic source line without changing anything outside the owned region. */
function ktCodegenConstructorEndPrefix(
  context: KtCodegenRendererContext,
  region: KtCodegenMarkerRegion,
): string {
  const file = context.snapshot.files.find(candidate =>
    candidate.path === region.path && candidate.fingerprint === region.sourceFingerprint);
  let inBlockComment = false;
  for (const line of (file?.text.slice(region.replaceEndOffset) ?? "").split(/\r\n|\n|\r/u)) {
    let remainder = line.trimStart();
    while (remainder.length > 0) {
      if (inBlockComment) {
        const end = remainder.indexOf("*/");
        if (end < 0) break;
        inBlockComment = false;
        remainder = remainder.slice(end + 2).trimStart();
      } else if (remainder.startsWith("//")) {
        break;
      } else if (remainder.startsWith("/*")) {
        inBlockComment = true;
        remainder = remainder.slice(2);
      } else {
        return /^[\t ]*/u.exec(line)![0];
      }
    }
  }
  // No following semantic line: do not invent a constructor-body indentation.
  return /^[\t ]*/u.exec(region.end.linePrefix)![0];
}

/** 按旧 VB 规则生成一个普通 C++ Parameter 自动代码块的逻辑行。 */
function ktCodegenRenderCppParameterLines(
  region: KtCodegenMarkerRegion,
  items: readonly KtCodegenItem[],
  formatDefaultValue: KtCodegenDefaultValueFormatter,
  constructorEndPrefix = region.end.linePrefix,
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
      // Rules 1.0.1: align with the next initializer/body line, not legacy Trim.
      lines.push("", `${constructorEndPrefix}// clang-format on`, `${constructorEndPrefix}// ${region.end.text}`);
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
        `${prefix}// @codegen-rules-version ${KT_CODEGEN_GENERATOR_VERSION}`,
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
      lines: ktCodegenRenderCppParameterLines(region, items, formatDefaultValue,
        region.blockKey === "PARAM CONSTRUCTOR" ? ktCodegenConstructorEndPrefix(context, region) : undefined),
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

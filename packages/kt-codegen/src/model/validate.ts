// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenDiagnostic } from "./diagnostic.js";
import type { KtCodegenParam } from "../KtCodegenParam.js";

function ktCodegenValidationError(
  code: string,
  message: string,
  field: string,
  row?: number,
): KtCodegenDiagnostic {
  return {
    code,
    severity: "error",
    message,
    path: {
      source: "model",
      field,
      ...(row === undefined ? {} : { row }),
    },
  };
}

/**
 * 在写出或 Analyze 边界校验公开可变字段的结构完整性。
 *
 * 此校验不限制 Combo 字符串候选值；列表外值由 UI 提示并保持原样。
 */
export function ktCodegenValidateParam(
  data: KtCodegenParam,
): KtCodegenDiagnostic[] {
  const diagnostics: KtCodegenDiagnostic[] = [];
  if (!data.namePrefix.trim()) {
    diagnostics.push(
      ktCodegenValidationError("model.missing-prefix", "namePrefix is required.", "namePrefix"),
    );
  }
  if (!data.nameMiddle.trim()) {
    diagnostics.push(
      ktCodegenValidationError("model.missing-middle", "nameMiddle is required.", "nameMiddle"),
    );
  }

  const identities = new Set<string>();
  data.items.forEach((parameter, row) => {
    if (!parameter.nameSuffix.trim()) {
      diagnostics.push(
        ktCodegenValidationError(
          "model.missing-name-suffix",
          "nameSuffix is required.",
          "nameSuffix",
          row,
        ),
      );
    }
    if (!parameter.paramString.trim()) {
      diagnostics.push(
        ktCodegenValidationError(
          "model.missing-symbol",
          "paramString is required.",
          "paramString",
          row,
        ),
      );
    }
    if (!parameter.dataType.trim()) {
      diagnostics.push(
        ktCodegenValidationError(
          "model.missing-data-type",
          "dataType is required.",
          "dataType",
          row,
        ),
      );
    }
    if (!Number.isInteger(parameter.id)) {
      diagnostics.push(
        ktCodegenValidationError("model.invalid-id", "id must be an integer.", "id", row),
      );
    }
    if (!Number.isInteger(parameter.componentCount) || parameter.componentCount < 0) {
      diagnostics.push(
        ktCodegenValidationError(
          "model.invalid-component-count",
          "componentCount must be a non-negative integer.",
          "componentCount",
          row,
        ),
      );
    }

    const identity = `${parameter.nameSuffix}\u0000${parameter.paramString}`;
    if (identities.has(identity)) {
      diagnostics.push(
        ktCodegenValidationError(
          "model.duplicate-symbol",
          `Duplicate parameter ${parameter.nameSuffix}.${parameter.paramString}.`,
          "paramString",
          row,
        ),
      );
    }
    identities.add(identity);
  });

  return diagnostics;
}

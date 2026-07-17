// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenItem } from "../KtCodegenItem.js";

/** 取得旧 UI 多控件分支使用的集合起始下标；不支持时返回 `null`。 */
export function ktCodegenLegacyDialogListIndex(
  dataType: string,
  includeFloat: boolean,
): number | null {
  if (dataType === "CATRawColldouble") return 1;
  if (dataType === "ListKtdouble" || dataType === "ListKtint") return 0;
  if (includeFloat && dataType === "ListKtfloat") return 0;
  return null;
}

/** 生成移除下划线后的旧 CAA/Qt 控件成员后缀。 */
export function ktCodegenDialogParamName(item: KtCodegenItem): string {
  return item.paramString.replaceAll("_", "");
}

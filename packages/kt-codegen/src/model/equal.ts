// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenItem } from "../KtCodegenItem.js";
import type { KtCodegenParam } from "../KtCodegenParam.js";

const KT_CODEGEN_ITEM_FIELDS = [
  "nameSuffix",
  "id",
  "name",
  "paramString",
  "dataType",
  "tcKind",
  "defaultValue",
  "catAttrInOut",
  "isList",
  "isOnTree",
  "component",
  "componentCount",
  "isParamDlg",
  "unit",
  "author",
  "createDate",
  "notes",
] as const satisfies readonly (keyof KtCodegenItem)[];

function ktCodegenJsonValueEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => ktCodegenJsonValueEqual(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && ktCodegenJsonValueEqual(leftRecord[key], rightRecord[key]));
}

/**
 * 比较两份参数配置的业务语义。
 *
 * 来源格式和原始 headers 不参与比较，因此 CSV `ComponentCount` 与旧 JSON
 * `Count` 等别名不会制造假冲突；协议版本、未知扩展字段、类属性、Item
 * 数量/顺序和17列值仍须完全一致，适合安全转换和宿主去重。
 */
export function ktCodegenParamsEqual(left: KtCodegenParam, right: KtCodegenParam): boolean {
  return left.kind === right.kind
    && left.schemaVersion === right.schemaVersion
    && left.source.legacyType === right.source.legacyType
    && left.source.legacyVersion === right.source.legacyVersion
    && ktCodegenJsonValueEqual(left.source.extensions, right.source.extensions)
    && left.namePrefix === right.namePrefix
    && left.nameMiddle === right.nameMiddle
    && left.nameSpace === right.nameSpace
    && left.appendFunction === right.appendFunction
    && left.items.length === right.items.length
    && left.items.every((item, index) => {
      const candidate = right.items[index];
      return candidate !== undefined
        && KT_CODEGEN_ITEM_FIELDS.every((field) => Object.is(item[field], candidate[field]));
    });
}

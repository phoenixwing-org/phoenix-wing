// SPDX-License-Identifier: Apache-2.0

/** 当前 v4 JSON 写出使用的规范17列表头和顺序。 */
export const KT_CODEGEN_LEGACY_V4_JSON_HEADERS = [
  "NameSuffix",
  "ID",
  "Name",
  "ParamString",
  "DataType",
  "TCKind",
  "DefaultValue",
  "CATAttrInOut",
  "IsList",
  "IsOnTree",
  "Component",
  "ComponentCount",
  "IsParamDlg",
  "Unit",
  "Author",
  "CreateDate",
  "Notes",
] as const;

/** 旧 CSV 使用的17列表头；第11列历史名称为 `Count`。 */
export const KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS = [
  ...KT_CODEGEN_LEGACY_V4_JSON_HEADERS.slice(0, 11),
  "Count",
  ...KT_CODEGEN_LEGACY_V4_JSON_HEADERS.slice(12),
] as const;

/** 规范化后的旧 v4 参数列名。 */
export type KtCodegenLegacyV4Column = (typeof KT_CODEGEN_LEGACY_V4_JSON_HEADERS)[number];

/** C++/Qt v4 JSON 配置的结构化表示。 */
export interface KtCodegenLegacyV4JsonObject extends Record<string, unknown> {
  /** 旧文件类型标识。 */
  readonly type: "100106";
  /** 旧文件协议版本。 */
  readonly version: "4.0";
  /** 旧类名前缀。 */
  readonly NamePrefix: string;
  /** 旧类名主体。 */
  readonly NameMiddle: string;
  /** 旧代码命名空间。 */
  readonly NameSpace: string;
  /** 旧列表追加函数名。 */
  readonly AppendFunction: string;
  /** 输入或输出表头。 */
  readonly headers: readonly string[];
  /** 按表头顺序存储的参数行。 */
  readonly data: readonly (readonly unknown[])[];
}

/** 已知 v4 JSON 根字段；其余字段作为 extensions 保留。 */
export const KT_CODEGEN_LEGACY_V4_ROOT_KEYS = new Set([
  "type",
  "version",
  "NamePrefix",
  "NameMiddle",
  "NameSpace",
  "AppendFunction",
  "headers",
  "data",
]);

const KT_CODEGEN_LEGACY_HEADER_ALIASES: Readonly<Record<string, KtCodegenLegacyV4Column>> = Object.freeze({
  namesuffix: "NameSuffix",
  id: "ID",
  name: "Name",
  paramstring: "ParamString",
  datatype: "DataType",
  tckind: "TCKind",
  defaultvalue: "DefaultValue",
  catattrinout: "CATAttrInOut",
  islist: "IsList",
  isontree: "IsOnTree",
  component: "Component",
  componentcount: "ComponentCount",
  count: "ComponentCount",
  isparamdlg: "IsParamDlg",
  unit: "Unit",
  author: "Author",
  createdate: "CreateDate",
  notes: "Notes",
});

/** 把大小写或历史别名不同的表头规范化为当前17列字段名。 */
export function ktCodegenNormalizeLegacyV4Header(value: string): KtCodegenLegacyV4Column | null {
  return KT_CODEGEN_LEGACY_HEADER_ALIASES[value.trim().toLowerCase()] ?? null;
}

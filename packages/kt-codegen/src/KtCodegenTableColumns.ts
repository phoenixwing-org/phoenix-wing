// SPDX-License-Identifier: Apache-2.0

/** 旧 Qt/JSON/CSV 的17个可编辑 Item 字段。 */
export type KtCodegenTableItemField =
  | "nameSuffix"
  | "id"
  | "name"
  | "paramString"
  | "dataType"
  | "tcKind"
  | "defaultValue"
  | "catAttrInOut"
  | "isList"
  | "isOnTree"
  | "component"
  | "componentCount"
  | "isParamDlg"
  | "unit"
  | "author"
  | "createDate"
  | "notes";

/** Web Component 为列选择的编辑器类型。 */
export type KtCodegenTableColumnKind =
  | "text"
  | "integer"
  | "boolean"
  | "tcKind"
  | "catAttrInOut"
  | "component";

/** 单个 Codegen 表格列定义。 */
export interface KtCodegenTableColumn {
  readonly field: KtCodegenTableItemField;
  readonly title: string;
  readonly width: number;
  readonly kind: KtCodegenTableColumnKind;
}

/** Qt KtdAutoCodeTableModel 的17列；顺序属于旧 JSON/CSV 兼容协议。 */
export const KT_CODEGEN_TABLE_COLUMNS = [
  { field: "nameSuffix", title: "Suffix", width: 96, kind: "text" },
  { field: "id", title: "ID", width: 64, kind: "integer" },
  { field: "name", title: "Title", width: 120, kind: "text" },
  { field: "paramString", title: "Variable", width: 130, kind: "text" },
  { field: "dataType", title: "Data Type", width: 130, kind: "text" },
  { field: "tcKind", title: "TCKind", width: 130, kind: "tcKind" },
  { field: "defaultValue", title: "DefVal", width: 120, kind: "text" },
  { field: "catAttrInOut", title: "CATAttrIO", width: 110, kind: "catAttrInOut" },
  { field: "isList", title: "IsList", width: 72, kind: "boolean" },
  { field: "isOnTree", title: "IsOnTree", width: 82, kind: "boolean" },
  { field: "component", title: "Component", width: 130, kind: "component" },
  { field: "componentCount", title: "CompCnt", width: 82, kind: "integer" },
  { field: "isParamDlg", title: "IsParaDlg", width: 88, kind: "boolean" },
  { field: "unit", title: "Unit", width: 82, kind: "text" },
  { field: "author", title: "Author", width: 100, kind: "text" },
  { field: "createDate", title: "CreateDate", width: 108, kind: "text" },
  { field: "notes", title: "Notes", width: 180, kind: "text" },
] as const satisfies readonly KtCodegenTableColumn[];

const KT_CODEGEN_TABLE_COLUMN_BY_FIELD = new Map<KtCodegenTableItemField, KtCodegenTableColumn>(
  KT_CODEGEN_TABLE_COLUMNS.map((column) => [column.field, column]),
);

/** 判断运行时字符串是否为可编辑的17列字段。 */
export function ktCodegenIsTableItemField(value: unknown): value is KtCodegenTableItemField {
  return typeof value === "string"
    && KT_CODEGEN_TABLE_COLUMN_BY_FIELD.has(value as KtCodegenTableItemField);
}

/** 根据字段取得稳定列定义。 */
export function ktCodegenGetTableColumn(field: KtCodegenTableItemField): KtCodegenTableColumn {
  const column = KT_CODEGEN_TABLE_COLUMN_BY_FIELD.get(field);
  if (!column) throw new Error("Unknown KtCodegen table field: " + field);
  return column;
}

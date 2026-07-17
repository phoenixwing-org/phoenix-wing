// SPDX-License-Identifier: Apache-2.0

import { KtCodegenItem } from "./KtCodegenItem.js";

/** VS Code Webview、DeskTools 与表格组件之间交换的整表快照类型。 */
export const KT_CODEGEN_TABLE_DATA_KIND = "kt.codegen.table-data" as const;

/** 当前 KtCodegenTableData 协议版本。 */
export const KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION = 1 as const;

/**
 * KtCodegenTable 的宿主无关整表数据。
 *
 * 文件 URI、文件名和 Prefix/Middle/Namespace/Append 属于文档或 Block，不能
 * 混入此结构。selectedRow 与 documentRevision 仅用于 UI 会话和并发保护，
 * 不写入旧 v4 JSON。
 */
export interface KtCodegenTableData {
  readonly kind: typeof KT_CODEGEN_TABLE_DATA_KIND;
  readonly schemaVersion: typeof KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION;
  readonly documentRevision: number;
  readonly selectedRow: number | null;
  readonly items: readonly KtCodegenItem[];
}

/** 创建一个会复制 Item 的安全整表快照。 */
export function ktCodegenCloneTableData(data: KtCodegenTableData): KtCodegenTableData {
  return {
    kind: KT_CODEGEN_TABLE_DATA_KIND,
    schemaVersion: KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION,
    documentRevision: Math.max(0, Math.trunc(data.documentRevision)),
    selectedRow: data.selectedRow === null ? null : Math.trunc(data.selectedRow),
    items: data.items.map((item) => new KtCodegenItem(item)),
  };
}

// SPDX-License-Identifier: Apache-2.0

import { KtCodegenItem } from "./KtCodegenItem.js";
import { KtCodegenParam } from "./KtCodegenParam.js";
import {
  ktCodegenGetTableColumn,
  type KtCodegenTableItemField,
} from "./KtCodegenTableColumns.js";
import {
  KT_CODEGEN_TABLE_DATA_KIND,
  KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION,
  type KtCodegenTableData,
} from "./KtCodegenTableData.js";

type KtCodegenBooleanItemField = "isList" | "isOnTree" | "isParamDlg";
type KtCodegenIntegerItemField = "id" | "componentCount";
type KtCodegenStringItemField = Exclude<
  KtCodegenTableItemField,
  KtCodegenBooleanItemField | KtCodegenIntegerItemField
>;

function ktCodegenTableBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function ktCodegenTableInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function ktCodegenTableString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function ktCodegenCloneItems(items: readonly Partial<KtCodegenItem>[]): KtCodegenItem[] {
  return items.map((item) => new KtCodegenItem(item));
}

/**
 * Codegen 17列表格的纯 TypeScript 控制层。
 *
 * Core 只修改共享 KtCodegenParam.items，不拥有 Prefix/Middle/Namespace/
 * Append，不依赖 DOM、Node、VS Code 或 Vue。表格 checkpoint 也只备份 items，
 * 因此还原表格不会覆盖宿主 Block 中较新的文档属性。
 */
export class KtCodegenTableCore {
  private checkpointItems: KtCodegenItem[] = [];
  private clipboard: KtCodegenItem | undefined;
  private currentDocumentRevision = 0;
  private currentSelectedRow: number | null = null;
  private changed = false;

  constructor(public readonly param: KtCodegenParam, documentRevision = 0) {
    this.markCheckpoint(documentRevision);
  }

  /** 当前表格是否相对 checkpoint 有修改。 */
  get dirty(): boolean {
    return this.changed;
  }

  /** 当前整表快照绑定的宿主文档 revision。 */
  get documentRevision(): number {
    return this.currentDocumentRevision;
  }

  /** 当前选中行；选择变化不构成文档修改。 */
  get selectedRow(): number | null {
    return this.currentSelectedRow;
  }

  /** 内部剪贴板是否已有可粘贴的完整 Item。 */
  get hasClipboard(): boolean {
    return this.clipboard !== undefined;
  }

  /** 设置当前行并规范越界值。 */
  select(row: number | null): number | null {
    if (row === null || !Number.isInteger(row) || row < 0 || row >= this.param.items.length) {
      this.currentSelectedRow = null;
    } else {
      this.currentSelectedRow = row;
    }
    return this.currentSelectedRow;
  }

  /** 按列类型更新一个单元格；未知 Combo 字符串会原样保留。 */
  updateCell(row: number, field: KtCodegenTableItemField, value: unknown): boolean {
    const item = this.param.items[row];
    if (!item) return false;
    const column = ktCodegenGetTableColumn(field);
    let next: string | number | boolean;
    if (column.kind === "boolean") next = ktCodegenTableBoolean(value);
    else if (column.kind === "integer") next = ktCodegenTableInteger(value);
    else next = ktCodegenTableString(value);

    if (item[field] === next) return false;
    if (column.kind === "boolean") item[field as KtCodegenBooleanItemField] = next as boolean;
    else if (column.kind === "integer") item[field as KtCodegenIntegerItemField] = next as number;
    else item[field as KtCodegenStringItemField] = next as string;
    this.changed = true;
    return true;
  }

  /** 在指定行之后插入空项；没有有效行时追加。 */
  insert(afterRow: number | null = this.currentSelectedRow): number {
    const index = afterRow !== null && afterRow >= 0 && afterRow < this.param.items.length
      ? afterRow + 1
      : this.param.items.length;
    this.param.items.splice(index, 0, new KtCodegenItem({ id: index + 1 }));
    this.currentSelectedRow = index;
    this.changed = true;
    return index;
  }

  /** 在原行之后插入一个完整副本。 */
  duplicate(row: number = this.currentSelectedRow ?? -1): number | undefined {
    const source = this.param.items[row];
    if (!source) return undefined;
    const index = row + 1;
    this.param.items.splice(index, 0, new KtCodegenItem(source));
    this.currentSelectedRow = index;
    this.changed = true;
    return index;
  }

  /** 把当前行复制到组件内部剪贴板，不修改文档。 */
  copy(row: number = this.currentSelectedRow ?? -1): boolean {
    const source = this.param.items[row];
    if (!source) return false;
    this.clipboard = new KtCodegenItem(source);
    return true;
  }

  /** 用内部剪贴板完整替换目标行，对应旧 Qt 的 Clone/Paste。 */
  paste(row: number = this.currentSelectedRow ?? -1): boolean {
    if (!this.clipboard || !this.param.items[row]) return false;
    this.param.items.splice(row, 1, new KtCodegenItem(this.clipboard));
    this.currentSelectedRow = row;
    this.changed = true;
    return true;
  }

  /** 删除指定行并把选择移动到相邻有效行。 */
  delete(row: number = this.currentSelectedRow ?? -1): boolean {
    if (!this.param.items[row]) return false;
    this.param.items.splice(row, 1);
    this.currentSelectedRow = this.param.items.length
      ? Math.min(row, this.param.items.length - 1)
      : null;
    this.changed = true;
    return true;
  }

  /** 上下移动指定行，保持被移动 Item 的对象身份。 */
  move(
    row: number = this.currentSelectedRow ?? -1,
    direction: "up" | "down",
  ): number | undefined {
    const target = direction === "up" ? row - 1 : row + 1;
    if (!this.param.items[row] || target < 0 || target >= this.param.items.length) return undefined;
    const [item] = this.param.items.splice(row, 1);
    if (!item) return undefined;
    this.param.items.splice(target, 0, item);
    this.currentSelectedRow = target;
    this.changed = true;
    return target;
  }

  /**
   * 复现旧 Qt KtdAutoCodeCore::sort() 的分组/编号规范化。
   *
   * 连续组由 nameSuffix 和 Math.trunc(id / 100) 共同决定；首行空 suffix
   * 变为 Unknown，后续空 suffix 继承前一组，id <= 0 形成编号边界。
   */
  sortAndNormalize(): boolean {
    const items = this.param.items;
    const first = items[0];
    if (!first) return false;

    let changed = false;
    let oldId = first.id;
    let oldGroup = Math.trunc(oldId / 100);
    let oldNameSuffix = first.nameSuffix || "Unknown";
    if (!first.nameSuffix) {
      first.nameSuffix = "Unknown";
      changed = true;
    }

    for (let index = 1; index < items.length; index += 1) {
      const item = items[index];
      if (!item) continue;
      if (!item.nameSuffix) {
        item.nameSuffix = oldNameSuffix;
        changed = true;
      } else if (item.nameSuffix !== oldNameSuffix) {
        oldNameSuffix = item.nameSuffix;
        oldGroup = -1;
      }

      if (item.id <= 0) {
        oldGroup = -1;
        continue;
      }

      if (oldGroup === Math.trunc(item.id / 100)) {
        const nextId = oldId + 1;
        if (item.id !== nextId) {
          item.id = nextId;
          changed = true;
        }
        oldId = nextId;
      } else {
        oldGroup = Math.trunc(item.id / 100);
        oldId = item.id;
      }
    }

    if (changed) this.changed = true;
    return changed;
  }

  /** 用整表 DTO 原地替换当前草稿；用于宿主接收 Webview 的批量交换。 */
  replaceData(data: KtCodegenTableData): void {
    if (data.kind !== KT_CODEGEN_TABLE_DATA_KIND
      || data.schemaVersion !== KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION) {
      throw new Error("Unsupported KtCodegenTableData schema");
    }
    this.param.items.splice(0, this.param.items.length, ...ktCodegenCloneItems(data.items));
    this.currentDocumentRevision = Math.max(0, Math.trunc(data.documentRevision));
    this.select(data.selectedRow);
    this.changed = true;
  }

  /** 用整表 DTO 原地替换 items，并把输入建立为新 checkpoint。 */
  setData(data: KtCodegenTableData): void {
    this.replaceData(data);
    this.markCheckpoint(this.currentDocumentRevision);
  }

  /** 返回复制 Item 的整表 DTO，不暴露 Core 的可变内部数组。 */
  getData(): KtCodegenTableData {
    return {
      kind: KT_CODEGEN_TABLE_DATA_KIND,
      schemaVersion: KT_CODEGEN_TABLE_DATA_SCHEMA_VERSION,
      documentRevision: this.currentDocumentRevision,
      selectedRow: this.currentSelectedRow,
      items: ktCodegenCloneItems(this.param.items),
    };
  }

  /** 确认实际保存的 items 为 checkpoint；省略快照时使用当前 items。 */
  markCheckpoint(
    documentRevision = this.currentDocumentRevision,
    savedItems?: KtCodegenTableData["items"],
  ): void {
    this.currentDocumentRevision = Math.max(0, Math.trunc(documentRevision));
    this.checkpointItems = ktCodegenCloneItems(savedItems ?? this.param.items);
    // 异步保存只确认实际写出的快照，不能把保存期间的新草稿当成已保存。
    this.changed = savedItems !== undefined
      && JSON.stringify(this.param.items) !== JSON.stringify(this.checkpointItems);
  }

  /** 只还原 items，保持 Param/items 数组身份且不覆盖文档属性。 */
  revertToCheckpoint(): void {
    this.param.items.splice(
      0,
      this.param.items.length,
      ...ktCodegenCloneItems(this.checkpointItems),
    );
    this.select(this.currentSelectedRow);
    this.changed = false;
  }
}

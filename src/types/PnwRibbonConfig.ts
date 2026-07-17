/** Ribbon Tab / 分组 / 工具项类型定义。数据由消费项目提供。 */

export type PnwRibbonItemSize = "large" | "small";

export interface PnwRibbonItemDef {
  pageId: string;
  label?: string;
  size?: PnwRibbonItemSize;
}

export interface PnwRibbonGroupDef {
  id: string;
  label: string;
  items: PnwRibbonItemDef[];
}

export interface PnwRibbonTabDef {
  id: string;
  label: string;
  /** 空 = 不过滤模块；cad/code 等与模块联动 */
  module?: string;
  groups: PnwRibbonGroupDef[];
}

/** Ribbon 数据贡献的稳定 envelope；具体页面和图标仍由产品宿主拥有。 */
export interface PnwRibbonContributionDocumentV1 {
  readonly kind: "phoenix.ribbon-contributions";
  readonly schemaVersion: 1;
  readonly tabs: readonly PnwRibbonTabDef[];
}

export const PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION = 1 as const;

export type PnwRibbonContributionCompatibility =
  | {
      readonly compatible: true;
      readonly document: PnwRibbonContributionDocumentV1;
    }
  | {
      readonly compatible: false;
      readonly code:
        | "contribution.invalid-document"
        | "contribution.unsupported-schema-version";
      readonly actualSchemaVersion: number | null;
      readonly supportedSchemaVersions: readonly [typeof PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION];
    };

/** 拒绝未知 schema 或不完整结构，避免宿主按字段猜测兼容性。 */
export function pnwCheckRibbonContributionCompatibility(
  value: unknown,
): PnwRibbonContributionCompatibility {
  const record = typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
  const actualSchemaVersion = typeof record?.schemaVersion === "number"
    && Number.isInteger(record.schemaVersion)
    ? record.schemaVersion
    : null;

  if (record?.kind !== "phoenix.ribbon-contributions") {
    return incompatible("contribution.invalid-document", actualSchemaVersion);
  }
  if (actualSchemaVersion !== PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION) {
    return incompatible("contribution.unsupported-schema-version", actualSchemaVersion);
  }
  if (!Array.isArray(record.tabs) || !record.tabs.every(isRibbonTab)) {
    return incompatible("contribution.invalid-document", actualSchemaVersion);
  }
  return {
    compatible: true,
    document: value as PnwRibbonContributionDocumentV1,
  };
}

function incompatible(
  code: "contribution.invalid-document" | "contribution.unsupported-schema-version",
  actualSchemaVersion: number | null,
): PnwRibbonContributionCompatibility {
  return {
    compatible: false,
    code,
    actualSchemaVersion,
    supportedSchemaVersions: [PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION],
  };
}

function isRibbonTab(value: unknown): value is PnwRibbonTabDef {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.label) || !Array.isArray(value.groups)) {
    return false;
  }
  if (value.module !== undefined && typeof value.module !== "string") return false;
  return value.groups.every((group) => {
    if (!isRecord(group) || !nonEmpty(group.id) || !nonEmpty(group.label) || !Array.isArray(group.items)) {
      return false;
    }
    return group.items.every((item) => isRecord(item)
      && nonEmpty(item.pageId)
      && (item.label === undefined || typeof item.label === "string")
      && (item.size === undefined || item.size === "large" || item.size === "small"));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// SPDX-License-Identifier: Apache-2.0

/** 当前宿主可消费的 KtCodegen Analyze Plan schema。 */
export const KT_CODEGEN_PLAN_SCHEMA_VERSION = 1 as const;

export type KtCodegenPlanCompatibility =
  | {
      readonly compatible: true;
      readonly kind: "kt.codegen.plan";
      readonly schemaVersion: typeof KT_CODEGEN_PLAN_SCHEMA_VERSION;
    }
  | {
      readonly compatible: false;
      readonly code: "contract.invalid-plan" | "contract.unsupported-schema-version";
      readonly actualKind: string | null;
      readonly actualSchemaVersion: number | null;
      readonly supportedSchemaVersions: readonly [typeof KT_CODEGEN_PLAN_SCHEMA_VERSION];
    };

/**
 * 在宿主解释 Analyze Plan 前执行最小版本门禁。
 *
 * 该函数只判断公开 envelope，不重复验证领域内容。内容由 Analyze/Apply 自身契约负责；
 * 未知 schema 必须显式拒绝，不能在 Auto、Desk 等宿主中按字段猜测兼容性。
 */
export function ktCodegenCheckPlanCompatibility(value: unknown): KtCodegenPlanCompatibility {
  const record = typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
  const actualKind = typeof record?.kind === "string" ? record.kind : null;
  const actualSchemaVersion = typeof record?.schemaVersion === "number"
    && Number.isInteger(record.schemaVersion)
    ? record.schemaVersion
    : null;

  if (actualKind !== "kt.codegen.plan") {
    return {
      compatible: false,
      code: "contract.invalid-plan",
      actualKind,
      actualSchemaVersion,
      supportedSchemaVersions: [KT_CODEGEN_PLAN_SCHEMA_VERSION],
    };
  }
  if (actualSchemaVersion !== KT_CODEGEN_PLAN_SCHEMA_VERSION) {
    return {
      compatible: false,
      code: "contract.unsupported-schema-version",
      actualKind,
      actualSchemaVersion,
      supportedSchemaVersions: [KT_CODEGEN_PLAN_SCHEMA_VERSION],
    };
  }
  return {
    compatible: true,
    kind: actualKind,
    schemaVersion: actualSchemaVersion,
  };
}

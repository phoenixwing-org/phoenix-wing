// SPDX-License-Identifier: Apache-2.0

import type { KtCodegenPlatform, KtCodegenTargetId } from "../model/target.js";

/** 旧生成块在 VB 源码中的有效性标记。 */
export type KtCodegenLegacyBlockState = "active" | "legacy-deprecated";

/** 当前 TypeScript 迁移阶段。 */
export type KtCodegenBlockMigrationStatus = "pending" | "in-progress" | "migrated";

/**
 * 从旧 `KevinControlID`、`KevinControlWords` 和 `CreateCAAItem` 提取的32个
 * 稳定自动代码块身份及迁移依据。
 *
 * `legacyCall` 保留 VB 分派调用的精确写法；`legacySourceLine` 指向当前归档
 * `KevinCAAFileGuide.vb` 中方法定义的起始行，便于迁移和 golden test 审计。
 */
export const KT_CODEGEN_LEGACY_BLOCKS = [
  {
    legacyId: 0,
    key: "CATALOG PARAMS",
    platform: "caa",
    target: "caa.feature-io",
    legacyCall: "CreateCAACatalogParam()",
    legacySourceLine: 495,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 1,
    key: "FACTRY ON TREE",
    platform: "caa",
    target: "caa.model",
    legacyCall: "CreateCAAFactoryOnTree()",
    legacySourceLine: 1725,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 2,
    key: "IMPLEMENTS CPP GET",
    platform: "caa",
    target: "caa.feature-io",
    legacyCall: "CreateCAAImplementsCppGet()",
    legacySourceLine: 824,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 3,
    key: "IMPLEMENTS CPP SET",
    platform: "caa",
    target: "caa.feature-io",
    legacyCall: "CreateCAAImplementsCppSet()",
    legacySourceLine: 951,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 4,
    key: "IMPLEMENTS HEAD GET",
    platform: "caa",
    target: "caa.core",
    legacyCall: "CreateCAAInterfacesGet(False)",
    legacySourceLine: 676,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 5,
    key: "IMPLEMENTS HEAD SET",
    platform: "caa",
    target: "caa.core",
    legacyCall: "CreateCAAInterfacesSet(False)",
    legacySourceLine: 743,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 6,
    key: "IMPLEMENTS PARAM GET",
    platform: "caa",
    target: "caa.feature-io",
    legacyCall: "CreateCAAImplementsCppParamsClassGet()",
    legacySourceLine: 1027,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 7,
    key: "IMPLEMENTS PARAM SET",
    platform: "caa",
    target: "caa.feature-io",
    legacyCall: "CreateCAAImplementsCppParamsClassSet()",
    legacySourceLine: 1063,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 8,
    key: "INTERFACES HEAD GET",
    platform: "caa",
    target: "caa.model",
    legacyCall: "CreateCAAInterfacesGet(True)",
    legacySourceLine: 676,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 9,
    key: "INTERFACES HEAD SET",
    platform: "caa",
    target: "caa.model",
    legacyCall: "CreateCAAInterfacesSet(True)",
    legacySourceLine: 743,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 10,
    key: "PARAM CONSTRUCTOR",
    platform: "cpp",
    target: "cpp.parameter",
    legacyCall: "CreateCAAParamConstructor()",
    legacySourceLine: 543,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 11,
    key: "PARAM DECLARATION",
    platform: "cpp",
    target: "cpp.parameter",
    legacyCall: "CreateCAAParamDeclaration()",
    legacySourceLine: 644,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 12,
    key: "PARAM DESTRUCTOR",
    platform: "cpp",
    target: "cpp.parameter",
    legacyCall: "CreateCAAParamDestructor()",
    legacySourceLine: 608,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 13,
    key: "PARAM EQUAL",
    platform: "cpp",
    target: "cpp.parameter",
    legacyCall: "CreateCAAParamEqual()",
    legacySourceLine: 579,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 14,
    key: "DIALOG NOTIFY",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "CreateCAADialogNotifyValueChange()",
    legacySourceLine: 1603,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 15,
    key: "UPDATE DIALOG",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "CreateCAAUpdateDialog()",
    legacySourceLine: 1124,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 16,
    key: "UPDATE INFORS",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "CreateCAAUpdateInfors()",
    legacySourceLine: 1347,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 17,
    key: "QT UPDATE DIALOG",
    platform: "qt",
    target: "qt.dialog",
    legacyCall: "CreateQTUpdateDialog()",
    legacySourceLine: 1809,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 18,
    key: "QT UPDATE INFORS",
    platform: "qt",
    target: "qt.parameter",
    legacyCall: "CreateQTUpdateInfors()",
    legacySourceLine: 2096,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 19,
    key: "DLG DEFINE FIELD TYPE",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "DlgDefineFieldType()",
    legacySourceLine: 3141,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 20,
    key: "DLG SET ACTIVE FIELD",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "DlgSetActiveField()",
    legacySourceLine: 3169,
    legacyState: "legacy-deprecated",
    migrationStatus: "migrated",
  },
  {
    legacyId: 21,
    key: "DLG GET SELECTOR LIST",
    platform: "caa",
    target: "caa.dialog",
    legacyCall: "DlgGetSelectorList()",
    legacySourceLine: 3199,
    legacyState: "legacy-deprecated",
    migrationStatus: "migrated",
  },
  {
    legacyId: 22,
    key: "CMD AGENT DECLARE",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentDeclare()",
    legacySourceLine: 3238,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 23,
    key: "CMD AGENT CONSTRUCTOR",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentConstructor()",
    legacySourceLine: 3269,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 24,
    key: "CMD AGENT DESTRUCTOR",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentDestructor()",
    legacySourceLine: 3290,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 25,
    key: "CMD AGENT BUILD GRAPH",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentBuildGraph()",
    legacySourceLine: 3313,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 26,
    key: "CMD AGENT UPDATE STATE",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentUpdateState()",
    legacySourceLine: 3436,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 27,
    key: "CMD AGENT FIA CLEAR",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdAgentFiaClear()",
    legacySourceLine: 3414,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 28,
    key: "CMD ACTION PDA",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdActionPda()",
    legacySourceLine: 3497,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 29,
    key: "CMD ACTION FIA",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdActionFia()",
    legacySourceLine: 3561,
    legacyState: "active",
    migrationStatus: "migrated",
  },
  {
    legacyId: 30,
    key: "CMD ELEMENT SELECTED",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdElementSelected()",
    legacySourceLine: 3621,
    legacyState: "legacy-deprecated",
    migrationStatus: "migrated",
  },
  {
    legacyId: 31,
    key: "CMD SET ACTIVE FIELD",
    platform: "caa",
    target: "caa.control",
    legacyCall: "CmdSetActiveField()",
    legacySourceLine: 3686,
    legacyState: "active",
    migrationStatus: "migrated",
  },
] as const satisfies readonly {
  readonly legacyId: number;
  readonly key: string;
  readonly platform: KtCodegenPlatform;
  readonly target: KtCodegenTargetId;
  readonly legacyCall: string;
  readonly legacySourceLine: number;
  readonly legacyState: KtCodegenLegacyBlockState;
  readonly migrationStatus: KtCodegenBlockMigrationStatus;
}[];

/** 旧自动代码标记使用的稳定 block key 联合类型。 */
export type KtCodegenBlockKey = (typeof KT_CODEGEN_LEGACY_BLOCKS)[number]["key"];

/** 单个旧生成块的完整迁移元数据。 */
export type KtCodegenBlock = (typeof KT_CODEGEN_LEGACY_BLOCKS)[number];

const KT_CODEGEN_BLOCK_KEY_SET: ReadonlySet<string> = new Set(
  KT_CODEGEN_LEGACY_BLOCKS.map((block) => block.key),
);

/** 判断运行时字符串是否为已知旧自动代码 block key。 */
export function ktCodegenIsBlockKey(value: string): value is KtCodegenBlockKey {
  return KT_CODEGEN_BLOCK_KEY_SET.has(value);
}

/** 根据稳定 key 取得旧生成块及其迁移依据。 */
export function ktCodegenGetBlock(key: KtCodegenBlockKey): KtCodegenBlock {
  const block = KT_CODEGEN_LEGACY_BLOCKS.find((candidate) => candidate.key === key);
  if (!block) throw new Error(`Unknown parameter code generation block: ${key}`);
  return block;
}

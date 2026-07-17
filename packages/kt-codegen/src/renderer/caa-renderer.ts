// SPDX-License-Identifier: Apache-2.0

import type {
  KtCodegenCaaAlgorithms,
  KtCodegenRendererContext,
  KtCodegenRendererResult,
} from "../KtCodegenRenderer.js";
import { KT_CODEGEN_CAA_COMMAND_FAMILIES } from "./caa-command-families.js";
import { KT_CODEGEN_CAA_DIALOG_FAMILIES } from "./caa-dialog-family.js";
import { KT_CODEGEN_CAA_FEATURE_FAMILIES } from "./caa-feature-families.js";
import { ktCodegenRenderRegisteredFamilies } from "./family-registry.js";

/** CAA 只在这里组合能力；具体模板归各 block family 所有。 */
export const KT_CODEGEN_CAA_FAMILIES = [
  ...KT_CODEGEN_CAA_FEATURE_FAMILIES,
  ...KT_CODEGEN_CAA_DIALOG_FAMILIES,
  ...KT_CODEGEN_CAA_COMMAND_FAMILIES,
] as const;

/** 通过 family registry 生成已迁移 CAA block，并报告未注册目标。 */
export function ktCodegenRenderCaa(
  context: KtCodegenRendererContext,
  algorithms: KtCodegenCaaAlgorithms,
): KtCodegenRendererResult {
  return ktCodegenRenderRegisteredFamilies(context, algorithms, KT_CODEGEN_CAA_FAMILIES, {
    supportedTargets: [
      "caa.core",
      "caa.model",
      "caa.feature-io",
      "caa.control",
      "caa.dialog",
    ],
    noFamilyMessage: (target) => `${target} has no migrated CAA block renderer yet.`,
  });
}

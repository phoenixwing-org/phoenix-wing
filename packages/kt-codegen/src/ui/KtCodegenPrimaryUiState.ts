// SPDX-License-Identifier: Apache-2.0

import type {
  KtCodegenPrimaryActionDetail,
  KtCodegenPrimaryUiModel,
} from "./KtCodegenUiContracts.js";

type KtCodegenPrimaryOperationState = Pick<KtCodegenPrimaryUiModel, "operation" | "running">;

/**
 * Host 已声明动作可用后，共享 UI 只负责运行期互斥；取消动作必须始终可达。
 */
export function ktCodegenPrimaryActionDisabled(
  model: KtCodegenPrimaryOperationState | undefined,
  action: KtCodegenPrimaryActionDetail["action"],
  enabled: boolean,
): boolean {
  if (!enabled) return true;
  if (action === "cancelOperation") return false;
  return Boolean(model?.running || model?.operation);
}

/** 控制符选择与模板输出会改变 Host session，任何工作区操作期间都锁定。 */
export function ktCodegenPrimaryControlsLocked(model: KtCodegenPrimaryOperationState): boolean {
  return Boolean(model.running || model.operation);
}

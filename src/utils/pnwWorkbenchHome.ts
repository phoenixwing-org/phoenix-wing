import type {
  PnwCreateWorkbenchHomeDefinitionOptions,
  PnwWorkbenchHomeDefinition,
} from "../types/PnwWorkbenchHome.js";

export const PNW_DEFAULT_WORKBENCH_HOME_VIEW_ID = "pnw.workbench.home";

/**
 * 创建可移植的 Home 注册元数据。
 *
 * Wing 不据此打开路由、创建 Tab 或选择关闭策略；Host 显式映射到自己的 View registry。
 */
export function pnwCreateWorkbenchHomeDefinition(
  options: PnwCreateWorkbenchHomeDefinitionOptions = {},
): PnwWorkbenchHomeDefinition {
  const viewId = options.viewId?.trim() || PNW_DEFAULT_WORKBENCH_HOME_VIEW_ID;
  const title = options.title?.trim() || "Home";
  return Object.freeze({
    viewId,
    title,
    iconId: options.iconId ?? "pnw:home",
    isHome: true,
    presentation: Object.freeze({ detachable: false }),
  });
}

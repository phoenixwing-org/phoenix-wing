import type { Component } from "vue";

/** pageId → 图标（Ribbon 工具按钮）。
 * 消费项目提供自己的映射表后调用 pnwRibbonIconFor。
 */
let iconMap: Record<string, Component> = {};

/** 注册图标映射表 */
export function pnwRegisterRibbonIcons(map: Record<string, Component>): void {
  iconMap = { ...map };
}

/** 根据 pageId 查找图标，未匹配时返回 fallback */
export function pnwRibbonIconFor(pageId: string, fallback?: Component): Component | undefined {
  return iconMap[pageId] ?? fallback;
}

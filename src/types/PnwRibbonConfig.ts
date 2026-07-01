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

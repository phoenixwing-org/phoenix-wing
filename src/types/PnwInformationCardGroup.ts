import type { PnwInformationBlockItem } from "./PnwInformationBlock.js";

/** 可序列化的中立信息卡片；默认不可折叠。 */
export interface PnwInformationCardDefinition {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
  readonly items: readonly PnwInformationBlockItem[];
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
}

/**
 * 可序列化的信息卡片组定义。
 *
 * Wing 只解释布局与可访问性，不读取 JSON，也不解释卡片字段的业务含义。
 */
export interface PnwInformationCardGroupDefinition {
  readonly id: string;
  readonly ariaLabel: string;
  readonly cards: readonly PnwInformationCardDefinition[];
}

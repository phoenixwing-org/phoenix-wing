/** 可序列化的中立信息项；业务含义与格式化由 Host 决定。 */
export interface PnwInformationBlockItem {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly note?: string;
}

/**
 * 可序列化的信息 Block 定义。
 *
 * Wing 不读取 JSON，也不解释 status、label、value 或 note 的业务语义。
 */
export interface PnwInformationBlockDefinition {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
  readonly items: readonly PnwInformationBlockItem[];
  readonly defaultExpanded?: boolean;
}

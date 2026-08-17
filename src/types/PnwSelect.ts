/** 简单枚举 Select 的稳定选项；不承载搜索、分组、标签或业务元数据。 */
export interface PnwSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** compact 用于约 24px 的 Header 工具区，default 用于常规 32px 表单。 */
export type PnwSelectSize = "compact" | "default";

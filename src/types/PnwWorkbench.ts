/** 工作台通用类型定义 */

/** Tab 可携带的任意 payload */
export type PnwWorkbenchTabPayload = Record<string, unknown>;

export interface PnwWorkbenchTab {
  id: string;
  pageId: string;
  title: string;
  subtitle?: string;
  contextKey?: string;
  dirty: boolean;
  payload?: PnwWorkbenchTabPayload;
  payloadConsumed: boolean;
  /** 从持久化存储恢复的页内快照 */
  pageState?: Record<string, unknown>;
}

export interface PnwWorkbenchSessionTab {
  id: string;
  pageId: string;
  title: string;
  subtitle?: string;
  contextKey?: string;
  pageState?: Record<string, unknown>;
}

export interface PnwWorkbenchSessionSnapshot {
  version: number;
  activeTabId: string;
  tabs: PnwWorkbenchSessionTab[];
}

export interface PnwOpenTabOptions {
  pageId: string;
  title?: string;
  subtitle?: string;
  contextKey?: string;
  payload?: PnwWorkbenchTabPayload;
  forceNew?: boolean;
}

export interface PnwPageTabPolicy {
  maxTabs: number;
  tabEnabled: boolean;
}

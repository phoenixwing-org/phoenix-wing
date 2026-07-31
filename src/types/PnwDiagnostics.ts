/** 运行日志级别；业务审计日志和后端分页日志不使用此契约。 */
export type PnwLogLevel = "debug" | "info" | "warning" | "error";

/** 工作台实例内的结构化、可序列化日志记录。 */
export interface PnwLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: PnwLogLevel;
  readonly channel: string;
  readonly source?: string;
  readonly message: string;
  readonly details?: string;
  readonly correlationId?: string;
}

/**
 * 日志过滤器。省略 levels 表示全部级别；空数组明确表示不显示任何级别。
 */
export interface PnwLogFilter {
  readonly channel?: string;
  readonly levels?: readonly PnwLogLevel[];
  readonly text?: string;
}

export type PnwProblemSeverity = "error" | "warning" | "info";

/**
 * 工作台问题项实验契约。
 *
 * `resource` 只是可显示定位符；Router、文件打开和权限检查由 consumer 处理。
 */
export interface PnwProblemItem {
  readonly id: string;
  readonly ownerId: string;
  readonly severity: PnwProblemSeverity;
  readonly message: string;
  readonly source?: string;
  readonly code?: string;
  readonly resource?: string;
  readonly line?: number;
  readonly column?: number;
  readonly details?: string;
}

/** Consumer 提交给单一 owner 的问题数据；owner 由命令统一赋值。 */
export type PnwProblemInput = Omit<PnwProblemItem, "ownerId">;

/** 省略 severities 表示全部；空数组表示不显示任何 severity。 */
export interface PnwProblemFilter {
  readonly severities?: readonly PnwProblemSeverity[];
  readonly source?: string;
  readonly text?: string;
}

export interface PnwDiagnosticsSnapshot {
  readonly logs: readonly PnwLogEntry[];
  readonly problems: readonly PnwProblemItem[];
}

export type PnwDiagnosticsCommand =
  | { readonly type: "log.append"; readonly entry: PnwLogEntry }
  | { readonly type: "log.clear"; readonly channel?: string }
  | {
    readonly type: "problems.replace";
    readonly ownerId: string;
    readonly items: readonly PnwProblemInput[];
  }
  | { readonly type: "problems.clear"; readonly ownerId: string };

export type PnwDiagnosticsListener = (snapshot: PnwDiagnosticsSnapshot) => void;

export interface PnwDiagnosticsHub {
  readonly getSnapshot: () => PnwDiagnosticsSnapshot;
  readonly dispatch: (command: PnwDiagnosticsCommand) => void;
  readonly subscribe: (listener: PnwDiagnosticsListener) => () => void;
}

export interface PnwDiagnosticsHubOptions {
  readonly maxLogEntries?: number;
  readonly initialLogs?: readonly PnwLogEntry[];
  readonly initialProblems?: readonly PnwProblemItem[];
}

import type {
  PnwDiagnosticsHub,
  PnwDiagnosticsHubOptions,
  PnwDiagnosticsSnapshot,
  PnwLogEntry,
  PnwLogFilter,
  PnwProblemFilter,
  PnwProblemInput,
  PnwProblemItem,
} from "../types/PnwDiagnostics.js";

export const PNW_DEFAULT_DIAGNOSTICS_MAX_LOG_ENTRIES = 1000;
export const PNW_DIAGNOSTICS_MAX_LOG_ENTRIES_LIMIT = 10000;

function pnwDiagnosticsMaxEntries(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return PNW_DEFAULT_DIAGNOSTICS_MAX_LOG_ENTRIES;
  }
  return Math.min(
    PNW_DIAGNOSTICS_MAX_LOG_ENTRIES_LIMIT,
    Math.max(1, Math.trunc(value)),
  );
}

function pnwFreezeLogEntry(entry: PnwLogEntry): PnwLogEntry {
  return Object.freeze({ ...entry });
}

function pnwFreezeProblemItem(
  item: PnwProblemInput,
  ownerId: string,
): PnwProblemItem {
  return Object.freeze({ ...item, ownerId });
}

function pnwDiagnosticsSnapshot(
  logs: readonly PnwLogEntry[],
  problems: readonly PnwProblemItem[],
): PnwDiagnosticsSnapshot {
  return Object.freeze({
    logs: Object.freeze([...logs]),
    problems: Object.freeze([...problems]),
  });
}

/**
 * 创建与单个工作台实例绑定的内存诊断总线。
 *
 * 不写 console/localStorage、不上传遥测，也不持有 Router。相同日志 ID 视为
 * 同一记录的新版本，替换后仍移动到末尾；日志始终按追加顺序保存。
 */
export function pnwCreateDiagnosticsHub(
  options: PnwDiagnosticsHubOptions = {},
): PnwDiagnosticsHub {
  const maxLogEntries = pnwDiagnosticsMaxEntries(options.maxLogEntries);
  const listeners = new Set<(snapshot: PnwDiagnosticsSnapshot) => void>();
  let snapshot = pnwDiagnosticsSnapshot(
    (options.initialLogs ?? []).slice(-maxLogEntries).map(pnwFreezeLogEntry),
    (options.initialProblems ?? []).map((item) => pnwFreezeProblemItem(item, item.ownerId)),
  );

  function pnwPublish(next: PnwDiagnosticsSnapshot): void {
    snapshot = next;
    for (const listener of listeners) listener(snapshot);
  }

  return {
    getSnapshot: () => snapshot,
    dispatch: (command) => {
      switch (command.type) {
        case "log.append": {
          const nextEntry = pnwFreezeLogEntry(command.entry);
          const nextLogs = snapshot.logs
            .filter((entry) => entry.id !== nextEntry.id)
            .concat(nextEntry)
            .slice(-maxLogEntries);
          pnwPublish(pnwDiagnosticsSnapshot(nextLogs, snapshot.problems));
          break;
        }
        case "log.clear": {
          const nextLogs = command.channel === undefined
            ? []
            : snapshot.logs.filter((entry) => entry.channel !== command.channel);
          if (nextLogs.length !== snapshot.logs.length) {
            pnwPublish(pnwDiagnosticsSnapshot(nextLogs, snapshot.problems));
          }
          break;
        }
        case "problems.replace": {
          const nextProblems = snapshot.problems
            .filter((item) => item.ownerId !== command.ownerId)
            .concat(command.items.map((item) => pnwFreezeProblemItem(item, command.ownerId)));
          pnwPublish(pnwDiagnosticsSnapshot(snapshot.logs, nextProblems));
          break;
        }
        case "problems.clear": {
          const nextProblems = snapshot.problems
            .filter((item) => item.ownerId !== command.ownerId);
          if (nextProblems.length !== snapshot.problems.length) {
            pnwPublish(pnwDiagnosticsSnapshot(snapshot.logs, nextProblems));
          }
          break;
        }
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function pnwDiagnosticsSearchText(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

export function pnwFilterLogEntries(
  entries: readonly PnwLogEntry[],
  filter: PnwLogFilter = {},
): readonly PnwLogEntry[] {
  const text = pnwDiagnosticsSearchText(filter.text);
  const levels = filter.levels === undefined ? undefined : new Set(filter.levels);
  return entries.filter((entry) => {
    if (filter.channel && entry.channel !== filter.channel) return false;
    if (levels && !levels.has(entry.level)) return false;
    if (!text) return true;
    return [entry.message, entry.details, entry.channel, entry.source, entry.correlationId]
      .some((value) => value?.toLocaleLowerCase().includes(text));
  });
}

export function pnwFilterProblemItems(
  items: readonly PnwProblemItem[],
  filter: PnwProblemFilter = {},
): readonly PnwProblemItem[] {
  const text = pnwDiagnosticsSearchText(filter.text);
  const severities = filter.severities === undefined
    ? undefined
    : new Set(filter.severities);
  return items.filter((item) => {
    if (filter.source && item.source !== filter.source) return false;
    if (severities && !severities.has(item.severity)) return false;
    if (!text) return true;
    return [item.message, item.details, item.source, item.code, item.resource]
      .some((value) => value?.toLocaleLowerCase().includes(text));
  });
}

export function pnwDiagnosticsLogChannels(
  entries: readonly PnwLogEntry[],
): readonly string[] {
  return [...new Set(entries.map((entry) => entry.channel).filter(Boolean))].sort();
}

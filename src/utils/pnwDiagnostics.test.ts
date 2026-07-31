import { describe, expect, it, vi } from "vitest";
import type { PnwLogEntry, PnwProblemItem } from "../types/PnwDiagnostics.js";
import {
  pnwCreateDiagnosticsHub,
  pnwDiagnosticsLogChannels,
  pnwFilterLogEntries,
  pnwFilterProblemItems,
} from "./pnwDiagnostics.js";

function pnwTestLog(id: string, level: PnwLogEntry["level"], channel = "pnw.workbench"):
PnwLogEntry {
  return { id, timestamp: Number(id), level, channel, message: `message ${id}` };
}

function pnwTestProblem(
  id: string,
  ownerId: string,
  severity: PnwProblemItem["severity"],
): PnwProblemItem {
  return { id, ownerId, severity, message: `problem ${id}`, source: "fixture" };
}

describe("Pnw 实例级诊断总线", () => {
  it("日志按追加顺序限长，重复 ID 更新后移动到末尾", () => {
    const hub = pnwCreateDiagnosticsHub({ maxLogEntries: 2 });
    hub.dispatch({ type: "log.append", entry: pnwTestLog("1", "info") });
    hub.dispatch({ type: "log.append", entry: pnwTestLog("2", "warning") });
    hub.dispatch({ type: "log.append", entry: pnwTestLog("3", "error") });
    hub.dispatch({ type: "log.append", entry: { ...pnwTestLog("2", "error"), message: "updated" } });

    expect(hub.getSnapshot().logs.map((entry) => [entry.id, entry.message]))
      .toEqual([["3", "message 3"], ["2", "updated"]]);
    expect(Object.isFrozen(hub.getSnapshot().logs)).toBe(true);
  });

  it("日志可按频道清空且只在快照变化时通知", () => {
    const hub = pnwCreateDiagnosticsHub({
      initialLogs: [pnwTestLog("1", "info"), pnwTestLog("2", "error", "host")],
    });
    const listener = vi.fn();
    const unsubscribe = hub.subscribe(listener);

    hub.dispatch({ type: "log.clear", channel: "missing" });
    hub.dispatch({ type: "log.clear", channel: "host" });
    unsubscribe();
    hub.dispatch({ type: "log.clear" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].logs.map((entry: PnwLogEntry) => entry.id))
      .toEqual(["1"]);
  });

  it("问题按 owner 整组替换和清除，条目无需重复 owner", () => {
    const hub = pnwCreateDiagnosticsHub({
      initialProblems: [pnwTestProblem("a", "view-a", "warning")],
    });
    hub.dispatch({
      type: "problems.replace",
      ownerId: "view-a",
      items: [{ id: "b", severity: "error", message: "problem b", source: "fixture" }],
    });
    expect(hub.getSnapshot().problems).toEqual([
      expect.objectContaining({ id: "b", ownerId: "view-a" }),
    ]);
    hub.dispatch({ type: "problems.clear", ownerId: "view-a" });
    expect(hub.getSnapshot().problems).toEqual([]);
  });

  it("日志支持频道、级别与文本组合过滤", () => {
    const entries = [
      { ...pnwTestLog("1", "info"), message: "ActivityBar switched" },
      { ...pnwTestLog("2", "error", "host"), message: "Request failed" },
    ];
    expect(pnwFilterLogEntries(entries, { channel: "host", levels: ["error"] }))
      .toEqual([entries[1]]);
    expect(pnwFilterLogEntries(entries, { text: "activitybar" })).toEqual([entries[0]]);
    expect(pnwFilterLogEntries(entries, { levels: [] })).toEqual([]);
    expect(pnwDiagnosticsLogChannels(entries)).toEqual(["host", "pnw.workbench"]);
  });

  it("问题支持 severity、source 与定位文本过滤", () => {
    const items = [
      { ...pnwTestProblem("a", "view", "warning"), resource: "config.json" },
      { ...pnwTestProblem("b", "view", "error"), source: "codegen", code: "marker.end" },
    ];
    expect(pnwFilterProblemItems(items, { severities: ["error"], source: "codegen" }))
      .toEqual([items[1]]);
    expect(pnwFilterProblemItems(items, { text: "config.json" })).toEqual([items[0]]);
    expect(pnwFilterProblemItems(items, { severities: [] })).toEqual([]);
  });
});

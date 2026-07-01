/** asyncProgress 纯函数 — vitest 单测。数据 in → 断言 out。 */

import { describe, expect, it } from "vitest";
import {
  pnwComputeProgressPercent,
  pnwComputeStepStatus,
  pnwCreateScanTaskState,
  pnwCreateTestTaskState,
  pnwFilterActiveTasks,
  pnwHasRunningTasks,
  pnwIsTerminal,
  pnwSortTasksByTime,
  pnwUpdateTaskFromPoll,
  pnwUpdateTaskFromStreamEvent,
} from "./asyncProgress.js";
import type { PnwAsyncProgressStep, PnwAsyncTaskState } from "./asyncProgressTypes.js";

// ---------------------------------------------------------------------------
// pnwCreateScanTaskState / pnwCreateTestTaskState
// ---------------------------------------------------------------------------

describe("pnwCreateScanTaskState", () => {
  it("creates fcstd-scan task with 3 pending steps", () => {
    const state = pnwCreateScanTaskState("scan-001");
    expect(state.taskId).toBe("scan-001");
    expect(state.kind).toBe("fcstd-scan");
    expect(state.status).toBe("running");
    expect(state.progressPercent).toBe(0);
    expect(state.currentStep).toBe(0);
    expect(state.steps).toHaveLength(3);
    expect(state.steps[0].label).toBe("遍历文件");
    expect(state.steps[0].status).toBe("active");
    expect(state.steps[1].status).toBe("pending");
    expect(state.steps[2].status).toBe("pending");
  });

  it("uses custom task name", () => {
    const state = pnwCreateScanTaskState("scan-002", "自定义扫描");
    expect(state.taskName).toBe("自定义扫描");
  });
});

describe("pnwCreateTestTaskState", () => {
  it("creates unit-test task with single step", () => {
    const state = pnwCreateTestTaskState("run-001", 10);
    expect(state.kind).toBe("unit-test");
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].label).toBe("运行测试");
    expect(state.steps[0].total).toBe(10);
    expect(state.steps[0].status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// pnwComputeStepStatus
// ---------------------------------------------------------------------------

describe("pnwComputeStepStatus", () => {
  const mkStep = (index: number, percent: number, status = "pending" as const): PnwAsyncProgressStep => ({
    index,
    label: `Step ${index}`,
    status,
    percent,
    processed: percent,
    total: 100,
    errors: [],
  });

  it("returns active if index equals currentStep", () => {
    const step = mkStep(1, 30);
    expect(pnwComputeStepStatus(step, 1)).toBe("active");
  });

  it("returns done if percent >= 100", () => {
    const step = mkStep(2, 100);
    expect(pnwComputeStepStatus(step, 1)).toBe("done");
  });

  it("returns done for steps before currentStep when processed > 0", () => {
    const step = mkStep(0, 100);
    expect(pnwComputeStepStatus(step, 2)).toBe("done");
  });

  it("returns pending for steps before currentStep when processed == 0", () => {
    const step = { ...mkStep(0, 0), processed: 0, percent: 0 };
    expect(pnwComputeStepStatus(step, 2)).toBe("pending");
  });

  it("returns pending for steps after currentStep", () => {
    const step = mkStep(2, 0);
    expect(pnwComputeStepStatus(step, 0)).toBe("pending");
  });

  it("preserves error status", () => {
    const step = { ...mkStep(0, 0), status: "error" as const };
    expect(pnwComputeStepStatus(step, 0)).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// pnwComputeProgressPercent
// ---------------------------------------------------------------------------

describe("pnwComputeProgressPercent", () => {
  it("returns 0 for all pending at 0%", () => {
    const steps: PnwAsyncProgressStep[] = [
      { index: 0, label: "a", status: "pending", percent: 0, processed: 0, total: 10, errors: [] },
      { index: 1, label: "b", status: "pending", percent: 0, processed: 0, total: 10, errors: [] },
    ];
    expect(pnwComputeProgressPercent(steps)).toBe(0);
  });

  it("returns 100 for all done", () => {
    const steps: PnwAsyncProgressStep[] = [
      { index: 0, label: "a", status: "done", percent: 100, processed: 10, total: 10, errors: [] },
      { index: 1, label: "b", status: "done", percent: 100, processed: 10, total: 10, errors: [] },
    ];
    expect(pnwComputeProgressPercent(steps)).toBe(100);
  });

  it("averages partial progress", () => {
    const steps: PnwAsyncProgressStep[] = [
      { index: 0, label: "a", status: "done", percent: 100, processed: 10, total: 10, errors: [] },
      { index: 1, label: "b", status: "active", percent: 50, processed: 5, total: 10, errors: [] },
      { index: 2, label: "c", status: "pending", percent: 0, processed: 0, total: 10, errors: [] },
    ];
    expect(pnwComputeProgressPercent(steps)).toBe(50);
  });

  it("returns 0 for empty steps", () => {
    expect(pnwComputeProgressPercent([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// pnwIsTerminal
// ---------------------------------------------------------------------------

describe("pnwIsTerminal", () => {
  it("returns false for running", () => {
    expect(pnwIsTerminal("running")).toBe(false);
  });

  it.each(["done", "error", "cancelled", "orphaned"] as const)(
    "returns true for %s",
    (status) => {
      expect(pnwIsTerminal(status)).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// pnwFilterActiveTasks / pnwSortTasksByTime / pnwHasRunningTasks
// ---------------------------------------------------------------------------

describe("pnwFilterActiveTasks", () => {
  it("filters running tasks only", () => {
    const tasks: PnwAsyncTaskState[] = [
      { taskId: "1", kind: "fcstd-scan", taskName: "a", status: "running", progressPercent: 0, currentStep: 0, steps: [], logs: [], fileTimings: [] },
      { taskId: "2", kind: "fcstd-scan", taskName: "b", status: "done", progressPercent: 100, currentStep: 3, steps: [], logs: [], fileTimings: [] },
      { taskId: "3", kind: "unit-test", taskName: "c", status: "running", progressPercent: 50, currentStep: 0, steps: [], logs: [], fileTimings: [] },
    ];
    const active = pnwFilterActiveTasks(tasks);
    expect(active).toHaveLength(2);
    expect(active.map((t) => t.taskId)).toEqual(["1", "3"]);
  });
});

describe("pnwSortTasksByTime", () => {
  it("sorts by startedAt descending", () => {
    const tasks: PnwAsyncTaskState[] = [
      { taskId: "1", kind: "fcstd-scan", taskName: "old", status: "done", progressPercent: 100, currentStep: 3, steps: [], logs: [], fileTimings: [], startedAt: "2025-01-01T00:00:00Z" },
      { taskId: "2", kind: "fcstd-scan", taskName: "new", status: "running", progressPercent: 0, currentStep: 0, steps: [], logs: [], fileTimings: [], startedAt: "2025-06-01T00:00:00Z" },
    ];
    const sorted = pnwSortTasksByTime(tasks);
    expect(sorted[0].taskId).toBe("2");
    expect(sorted[1].taskId).toBe("1");
  });
});

describe("pnwHasRunningTasks", () => {
  it("returns true when any task is running", () => {
    const tasks: PnwAsyncTaskState[] = [
      { taskId: "1", kind: "fcstd-scan", taskName: "a", status: "done", progressPercent: 100, currentStep: 0, steps: [], logs: [], fileTimings: [] },
      { taskId: "2", kind: "unit-test", taskName: "b", status: "running", progressPercent: 50, currentStep: 0, steps: [], logs: [], fileTimings: [] },
    ];
    expect(pnwHasRunningTasks(tasks)).toBe(true);
  });

  it("returns false when all done", () => {
    const tasks: PnwAsyncTaskState[] = [
      { taskId: "1", kind: "fcstd-scan", taskName: "a", status: "done", progressPercent: 100, currentStep: 0, steps: [], logs: [], fileTimings: [] },
    ];
    expect(pnwHasRunningTasks(tasks)).toBe(false);
  });

  it("returns false for empty", () => {
    expect(pnwHasRunningTasks([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pnwUpdateTaskFromPoll
// ---------------------------------------------------------------------------

const _baseState = (): PnwAsyncTaskState => pnwCreateScanTaskState("scan-test", "测试扫描");

function _payload(overrides: Record<string, unknown> = {}) {
  return {
    scan_id: "scan-test",
    phase: "bom",
    step: 1,
    status: "running",
    cancelled: false,
    error: "",
    total_cad_files: 100,
    total_fcstd_files: 50,
    walk: { total: 100, processed: 100, percent: 100 },
    bom: { total: 50, processed: 25, skipped: 2, failed: 1, current_file: "part.FCStd", percent: 50, errors: [{ rel: "bad.FCStd", error: "无法读取" }] },
    xref: { total: 50, processed: 0, percent: 0 },
    ...overrides,
  };
}

describe("pnwUpdateTaskFromPoll", () => {
  it("updates step percent and processed from payload", () => {
    const state = pnwUpdateTaskFromPoll(_baseState(), _payload());
    expect(state.steps[0].percent).toBe(100);
    expect(state.steps[0].status).toBe("done");
    expect(state.steps[1].percent).toBe(50);
    expect(state.steps[1].status).toBe("active");
    expect(state.steps[1].processed).toBe(25);
    expect(state.steps[1].total).toBe(50);
  });

  it("sets currentFile on the active step", () => {
    const state = pnwUpdateTaskFromPoll(_baseState(), _payload());
    expect(state.steps[1].currentFile).toBe("part.FCStd");
  });

  it("accumulates errors from payload", () => {
    const state = pnwUpdateTaskFromPoll(_baseState(), _payload());
    expect(state.steps[1].errors).toHaveLength(1);
    expect(state.steps[1].errors[0]).toEqual({ file: "bad.FCStd", error: "无法读取" });
  });

  it("marks task done when payload status is done", () => {
    const state = pnwUpdateTaskFromPoll(
      _baseState(),
      _payload({ status: "done", step: 3, xref: { total: 50, processed: 50, percent: 100 } }),
    );
    expect(state.status).toBe("done");
    expect(state.finishedAt).toBeTruthy();
  });

  it("propagates error message", () => {
    const state = pnwUpdateTaskFromPoll(
      _baseState(),
      _payload({ status: "error", error: "磁盘满" }),
    );
    expect(state.status).toBe("error");
    expect(state.error).toBe("磁盘满");
  });

  it("maintains progressPercent as average of steps", () => {
    const state = pnwUpdateTaskFromPoll(_baseState(), _payload());
    // walk 100 + bom 50 + xref 0 = 150 / 3 = 50
    expect(state.progressPercent).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// pnwUpdateTaskFromStreamEvent
// ---------------------------------------------------------------------------

const _testBase = (): PnwAsyncTaskState => pnwCreateTestTaskState("run-test", 5);

describe("pnwUpdateTaskFromStreamEvent", () => {
  it("updates total modules on start event", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), {
      type: "start",
      suite_id: "cad",
      total_modules: 8,
      total_cases: 42,
    });
    expect(state.steps[0].total).toBe(8);
  });

  it("sets current file to module name on module_start", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), {
      type: "module_start",
      module: "test_bom",
      module_index: 1,
      module_total: 5,
    });
    expect(state.steps[0].currentFile).toBe("test_bom");
  });

  it("updates progress on case_done", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), {
      type: "case_done",
      completed: 21,
      total: 42,
    });
    expect(state.steps[0].percent).toBe(50);
    expect(state.steps[0].processed).toBe(21);
  });

  it("marks as done on done event", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), { type: "done" });
    expect(state.status).toBe("done");
    expect(state.progressPercent).toBe(100);
    expect(state.steps[0].status).toBe("done");
  });

  it("marks as cancelled on cancelled event", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), { type: "cancelled" });
    expect(state.status).toBe("cancelled");
  });

  it("marks as error on error event", () => {
    const state = pnwUpdateTaskFromStreamEvent(_testBase(), {
      type: "error",
      message: "timeout",
    });
    expect(state.status).toBe("error");
    expect(state.error).toBe("timeout");
  });
});

// ---------------------------------------------------------------------------
// File timing utilities
// ---------------------------------------------------------------------------

import {
  pnwRecordFileTiming,
  pnwAverageFileDuration,
  pnwFastestFileDuration,
  pnwSlowestFileDuration,
  pnwEstimateRemaining,
  pnwFormatDuration,
  pnwFormatSeconds,
} from "./asyncProgress.js";

function _state() { return pnwCreateScanTaskState("t1"); }

describe("pnwRecordFileTiming", () => {
  it("appends record with correct fields", () => {
    const s = pnwRecordFileTiming(_state(), "a.FCStd", "bom", 1500, true);
    expect(s.fileTimings).toHaveLength(1);
    expect(s.fileTimings[0]).toMatchObject({ file: "a.FCStd", phase: "bom", duration: 1500, success: true });
  });

  it("returns new state (immutable)", () => {
    const prev = _state();
    const next = pnwRecordFileTiming(prev, "a.FCStd", "bom", 100, true);
    expect(next.fileTimings).not.toBe(prev.fileTimings);
    expect(prev.fileTimings).toHaveLength(0);
  });

  it("ignores empty file name", () => {
    const s = pnwRecordFileTiming(_state(), "", "bom", 100, true);
    expect(s.fileTimings).toHaveLength(0);
  });
});

describe("pnwAverageFileDuration", () => {
  it("empty -> 0", () => expect(pnwAverageFileDuration([])).toBe(0));
  it("single -> that value", () => expect(pnwAverageFileDuration([{ file: "a", phase: "bom", duration: 500, success: true }])).toBe(500));
  it("multiple -> correct avg", () => expect(pnwAverageFileDuration([{ file: "a", phase: "bom", duration: 100, success: true }, { file: "b", phase: "bom", duration: 200, success: true }])).toBe(150));
});

describe("pnwFastestFileDuration", () => {
  it("empty -> 0", () => expect(pnwFastestFileDuration([])).toBe(0));
  it("finds min", () => expect(pnwFastestFileDuration([{ file: "a", phase: "bom", duration: 500, success: true }, { file: "b", phase: "bom", duration: 100, success: true }])).toBe(100));
});

describe("pnwSlowestFileDuration", () => {
  it("empty -> 0", () => expect(pnwSlowestFileDuration([])).toBe(0));
  it("finds max", () => expect(pnwSlowestFileDuration([{ file: "a", phase: "bom", duration: 100, success: true }, { file: "b", phase: "bom", duration: 500, success: true }])).toBe(500));
});

describe("pnwEstimateRemaining", () => {
  it("empty -> 0", () => expect(pnwEstimateRemaining([], 50)).toBe(0));
  it("0 remaining -> 0", () => expect(pnwEstimateRemaining([{ file: "a", phase: "bom", duration: 100, success: true }], 0)).toBe(0));
  it("100ms avg, 10 remaining -> 1s", () => expect(pnwEstimateRemaining([{ file: "a", phase: "bom", duration: 100, success: true }], 10)).toBe(1));
});

describe("pnwFormatDuration", () => {
  it("0 -> '0'", () => expect(pnwFormatDuration(0)).toBe("0"));
  it("45 -> '45ms'", () => expect(pnwFormatDuration(45)).toBe("45ms"));
  it("1234 -> '1.2s'", () => expect(pnwFormatDuration(1234)).toBe("1.2s"));
});

describe("pnwFormatSeconds", () => {
  it("0 -> '0s'", () => expect(pnwFormatSeconds(0)).toBe("0s"));
  it("45 -> '45s'", () => expect(pnwFormatSeconds(45)).toBe("45s"));
  it("125 -> '2m5s'", () => expect(pnwFormatSeconds(125)).toBe("2m5s"));
  it("3600 -> '60m'", () => expect(pnwFormatSeconds(3600)).toBe("60m"));
});

import { describe, expect, it } from "vitest";
import { pnwWorkbenchTabActionTargets, type PnwWorkbenchTabAction } from "./pnwWorkbenchTabActions.js";

const PNW_TABS = Object.freeze([Object.freeze({ id: "a" }), Object.freeze({ id: "b" }), Object.freeze({ id: "c" })]);
describe("pnwWorkbenchTabActionTargets", () => {
  it.each<[PnwWorkbenchTabAction, string[]]>([
    ["refresh", ["b"]], ["close", ["b"]], ["close-others", ["a", "c"]],
    ["close-right", ["c"]], ["close-all", ["a", "b", "c"]],
  ])("%s selects the explicit target without mutating tabs", (action, expected) => {
    expect(pnwWorkbenchTabActionTargets(PNW_TABS, { action, tabId: "b" })).toEqual(expected);
  });
  it("rejects stale targets, empty lists, and empty batch ranges", () => {
    for (const action of ["refresh", "close", "close-others", "close-right", "close-all"] as const) {
      expect(pnwWorkbenchTabActionTargets(PNW_TABS, { action, tabId: "missing" })).toEqual([]);
      expect(pnwWorkbenchTabActionTargets([], { action, tabId: "a" })).toEqual([]);
    }
    expect(pnwWorkbenchTabActionTargets(PNW_TABS, { action: "close-right", tabId: "c" })).toEqual([]);
    expect(pnwWorkbenchTabActionTargets([{ id: "a" }], { action: "close-others", tabId: "a" })).toEqual([]);
  });
});

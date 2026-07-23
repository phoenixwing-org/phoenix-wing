// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  pnwCodeNextReorderSelection,
  pnwCodeProjectReorderMembersPanel,
  pnwCodeSetReorderSelection,
  type PnwCodeReorderMembersPanelModel,
  type PnwCodeReorderMembersPanelRow,
} from "./PnwCodeReorderMembersPanelState.js";

function row(uri: string, state: PnwCodeReorderMembersPanelRow["state"]): PnwCodeReorderMembersPanelRow {
  return {
    uri,
    relativePath: `project/${uri}.cpp`,
    kind: "source",
    encoding: "UTF-8",
    changed: state !== "unchanged",
    state,
    warnings: [],
  };
}

function model(
  reorderResults: readonly PnwCodeReorderMembersPanelRow[] | undefined,
  extra: Partial<PnwCodeReorderMembersPanelModel> = {},
): PnwCodeReorderMembersPanelModel {
  return { presentation: "ribbon", status: "done", reorderResults, ...extra };
}

describe("shared member reorder panel state", () => {
  it("selects only pending rows for a new revision", () => {
    expect(pnwCodeNextReorderSelection(
      { selectedUris: [], revision: 1 },
      model([row("one", "pending"), row("two", "applied"), row("three", "unchanged")], { reorderRevision: 2 }),
    )).toEqual({ selectedUris: ["one"], revision: 2 });
  });

  it("honors an explicit empty Host selection in the same revision", () => {
    expect(pnwCodeNextReorderSelection(
      { selectedUris: ["one"], revision: 5 },
      model([row("one", "pending")], { reorderRevision: 5, reorderSelectedUris: [] }),
    )).toEqual({ selectedUris: [], revision: 5 });
  });

  it("keeps optimistic selection only while rows remain pending", () => {
    expect(pnwCodeNextReorderSelection(
      { selectedUris: ["one", "two"], revision: 5 },
      model([row("one", "blocked"), row("two", "pending"), row("three", "pending")], { reorderRevision: 5 }),
    )).toEqual({ selectedUris: ["two"], revision: 5 });
  });

  it("filters and de-duplicates local selection", () => {
    expect(pnwCodeSetReorderSelection(
      { selectedUris: [], revision: 8 },
      model([row("one", "pending"), row("two", "blocked")]),
      ["two", "one", "one", "missing"],
    )).toEqual({ selectedUris: ["one"], revision: 8 });
  });

  it("projects changed/unchanged independently and only applies pending", () => {
    const projected = pnwCodeProjectReorderMembersPanel(
      model([
        row("pending", "pending"), row("blocked", "blocked"), row("applied", "applied"),
        row("same", "unchanged"), row("cancelled", "cancelled"),
      ]),
      { selectedUris: ["pending", "blocked", "cancelled"], revision: 1 },
    );
    expect(projected.changedRows.map((entry) => entry.uri)).toEqual(["pending", "blocked", "applied"]);
    expect(projected.unchangedRows.map((entry) => entry.uri)).toEqual(["same"]);
    expect(projected.selectedPendingUris).toEqual(["pending"]);
    expect(projected).toMatchObject({ allPendingSelected: true, somePendingSelected: false, applyDisabled: false, applyLabel: "应用所选（1）" });
  });

  it("locks Apply/workset projection while running or cacheless", () => {
    expect(pnwCodeProjectReorderMembersPanel(
      model([row("one", "pending")], { status: "running" }),
      { selectedUris: ["one"], revision: 1 },
    )).toMatchObject({ applyDisabled: true, worksetDisabled: true });
    expect(pnwCodeProjectReorderMembersPanel(
      model(undefined),
      { selectedUris: [], revision: undefined },
    ).worksetDisabled).toBe(true);
  });
});

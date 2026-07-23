// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  ktCodegenPrimaryActionDisabled,
  ktCodegenPrimaryControlsLocked,
} from "../src/ui/KtCodegenPrimaryUiState.js";

describe("KtCodegen Primary operation locks", () => {
  it("keeps cancel available while discovery is running", () => {
    expect(ktCodegenPrimaryActionDisabled(
      { operation: "discovery", running: true },
      "cancelOperation",
      true,
    )).toBe(false);
  });

  it("locks ordinary actions during an operation or Host running state", () => {
    expect(ktCodegenPrimaryActionDisabled(
      { operation: "candidates", running: true },
      "scanCandidates",
      true,
    )).toBe(true);
    expect(ktCodegenPrimaryActionDisabled(
      { running: true },
      "openJson",
      true,
    )).toBe(true);
  });

  it("does not override a disabled Host capability", () => {
    expect(ktCodegenPrimaryActionDisabled(
      { running: false },
      "applyAll",
      false,
    )).toBe(true);
  });

  it("locks control selection and output for every operation", () => {
    expect(ktCodegenPrimaryControlsLocked({ operation: "batch-apply", running: true })).toBe(true);
    expect(ktCodegenPrimaryControlsLocked({ running: false })).toBe(false);
  });
});

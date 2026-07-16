import { describe, expect, it } from "vitest";
import { pnwIsCaaDialogHandoff } from "./pnwCaaDialogHandoff.js";

describe("pnwIsCaaDialogHandoff", () => {
  it("accepts a versioned file-only handoff", () => {
    expect(pnwIsCaaDialogHandoff({
      protocol: "phoenix-desk-tools.caa-dialog.v1",
      workspaceUri: "file:///workspace",
      selectedFiles: [{ uri: "file:///workspace/dialogs/Test.CATDlg", relativePath: "dialogs/Test.CATDlg" }],
    })).toBe(true);
  });

  it("rejects empty selections, non-file URIs and traversal display paths", () => {
    expect(pnwIsCaaDialogHandoff({ protocol: "phoenix-desk-tools.caa-dialog.v1", workspaceUri: "file:///workspace", selectedFiles: [] })).toBe(false);
    expect(pnwIsCaaDialogHandoff({ protocol: "phoenix-desk-tools.caa-dialog.v1", workspaceUri: "https://example.test", selectedFiles: [{ uri: "file:///x", relativePath: "x.CATDlg" }] })).toBe(false);
    expect(pnwIsCaaDialogHandoff({ protocol: "phoenix-desk-tools.caa-dialog.v1", workspaceUri: "file:///workspace", selectedFiles: [{ uri: "file:///workspace/x", relativePath: "../x.CATDlg" }] })).toBe(false);
  });
});

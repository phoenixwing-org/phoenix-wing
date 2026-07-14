export type PnwCaaDialogHandoffFile = {
  readonly uri: string;
  readonly relativePath: string;
};

/** Versioned, data-only handoff from a file selector to a CAA editor host. */
export type PnwCaaDialogHandoff = {
  readonly protocol: "phoenix-desk-tools.caa-dialog.v1";
  readonly workspaceUri: string;
  readonly selectedFiles: readonly PnwCaaDialogHandoffFile[];
};

/**
 * Validates the v1 handoff shape before a local bridge accepts file paths.
 * It deliberately only allows file URIs and relative display paths without
 * parent traversal; the receiving host must still authorize file access.
 */
export function pnwIsCaaDialogHandoff(value: unknown): value is PnwCaaDialogHandoff {
  if (!value || typeof value !== "object") return false;
  const handoff = value as Partial<PnwCaaDialogHandoff>;
  return handoff.protocol === "phoenix-desk-tools.caa-dialog.v1"
    && pnwIsFileUri(handoff.workspaceUri)
    && Array.isArray(handoff.selectedFiles)
    && handoff.selectedFiles.length > 0
    && handoff.selectedFiles.every((file) => pnwIsCaaDialogHandoffFile(file));
}

function pnwIsCaaDialogHandoffFile(value: unknown): value is PnwCaaDialogHandoffFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<PnwCaaDialogHandoffFile>;
  return pnwIsFileUri(file.uri)
    && typeof file.relativePath === "string"
    && file.relativePath.length > 0
    && !file.relativePath.startsWith("/")
    && !file.relativePath.split(/[\\/]+/).includes("..");
}

function pnwIsFileUri(value: unknown): value is string {
  try { return typeof value === "string" && new URL(value).protocol === "file:"; } catch { return false; }
}

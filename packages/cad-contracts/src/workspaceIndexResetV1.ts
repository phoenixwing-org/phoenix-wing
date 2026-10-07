import { pnwReadCadIndexRevisionV1, type PnwCadIndexDatabaseV1 } from "./workspaceIndexV1.js";

export interface PnwCadIndexResetPreviewV1 {
  readonly revision: number;
  readonly files: number;
  readonly fileLinks: number;
  readonly references: number;
  readonly bomLines: number;
}
export function pnwPreviewCadIndexResetV1(db: PnwCadIndexDatabaseV1): PnwCadIndexResetPreviewV1 {
  if (db.get<{ value: string }>("SELECT value FROM phoenix_meta WHERE key='schema_version'")?.value !== "13") throw new Error("CAD index reset requires Schema v13");
  const count = (table: string) => Number(db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`)?.count || 0);
  return { revision: pnwReadCadIndexRevisionV1(db), files: count("phoenix_cad_file_asset"),
    fileLinks: count("phoenix_cad_part_file_link"), references: count("phoenix_cad_bom_xref"), bomLines: count("phoenix_cad_bom_line") };
}

/** Explicit destructive index reset, separate from normal non-destructive rescanning. */
export function pnwResetCadWorkspaceIndexV1(db: PnwCadIndexDatabaseV1, options: {
  readonly expected: PnwCadIndexResetPreviewV1;
  readonly confirmRemoveFileLinks: boolean;
  readonly scanUuid: string;
  readonly scannedAt: string;
  readonly scanRoot: string;
  /** Hosts must complete a recoverable backup here, under the SQLite writer lock. */
  readonly beforeReset: () => void;
}) {
  if (options.confirmRemoveFileLinks !== true) throw new Error("Explicit file-link removal confirmation is required");
  if (!options.scanUuid || !options.scanRoot || !Number.isFinite(Date.parse(options.scannedAt))) throw new Error("Invalid CAD reset metadata");
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = pnwPreviewCadIndexResetV1(db);
    for (const key of ["revision", "files", "fileLinks", "references", "bomLines"] as const) {
      if (current[key] !== options.expected[key]) throw new Error("CAD index changed after reset preview; confirm again");
    }
    options.beforeReset();
    for (const table of ["phoenix_cad_bom_tree_occurrence", "phoenix_cad_bom_line", "phoenix_cad_xref_flat",
      "phoenix_cad_bom_xref", "phoenix_cad_bom_assembly_cache", "phoenix_cad_part_file_link", "phoenix_cad_file_asset", "phoenix_cad_scan"]) {
      db.exec(`DELETE FROM ${table}`);
    }
    // Keep the AUTOINCREMENT generation moving so in-flight scans cannot commit after a reset.
    db.run(`INSERT INTO phoenix_cad_scan(scan_uuid,scanned_at,scan_root,stats_json,status,phase,started_at,finished_at)
      VALUES (?,?,?,?,'cleared','explicit-index-reset',?,?)`,
    [options.scanUuid, options.scannedAt, options.scanRoot, JSON.stringify(current), options.scannedAt, options.scannedAt]);
    const revision = pnwReadCadIndexRevisionV1(db);
    db.exec("COMMIT");
    return { ...current, revision };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

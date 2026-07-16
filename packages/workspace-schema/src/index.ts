export const PNW_WORKSPACE_SCHEMA_ID = "phoenix-workspace" as const;
export const PNW_WORKSPACE_SCHEMA_VERSION = 13 as const;
export const PNW_WORKSPACE_DATABASE_FILENAME = "phoenix-workspace.sqlite" as const;
export const PNW_WORKSPACE_LEGACY_DATABASE_FILENAMES = [
  "cad-database.sqlite",
  "phoenix-cad.sqlite",
] as const;

/**
 * Pre-v13 unprefixed table names. Their presence requires explicit recreate;
 * Wing does not claim an in-place migration for these layouts.
 */
export const PNW_WORKSPACE_LEGACY_TABLE_NAMES = [
  "meta",
  "fcstd_scan",
  "file_asset",
  "part_key",
  "part_file_link",
  "bom_xref",
  "bom_assembly_cache",
  "bom_tree_occurrence",
  "change_event",
  "rename_log",
  "ref_hit",
  "ref_patch_log",
  "ui_session",
] as const;

export const PNW_WORKSPACE_SCHEMA_V13_SHA256 = "116c5bff9c95e6f670b9ecfc52c053ee08e33e9cf1f3f3b46c02888e97643e1c" as const;

export const PNW_WORKSPACE_SCHEMA_VERSION_UPSERT_SQL = `
INSERT INTO phoenix_meta(key, value) VALUES ('schema_version', ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value
` as const;

/**
 * Frozen production v13 schema lifted verbatim from Phoenix Desk Tools.
 * This package owns SQL/version semantics only; hosts own paths, connections,
 * journal handling, permissions, confirmation, backups and lifecycle.
 */
export const PNW_WORKSPACE_SCHEMA_V13_DDL = `
CREATE TABLE IF NOT EXISTS phoenix_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_cad_scan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_uuid TEXT UNIQUE,
  scanned_at TEXT NOT NULL,
  scan_root TEXT NOT NULL,
  stats_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'done',
  phase TEXT DEFAULT '',
  progress_json TEXT,
  started_at TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS phoenix_cad_file_asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_rel_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  asset_kind TEXT,
  part_number TEXT,
  part_version TEXT,
  type_code TEXT,
  model_series TEXT,
  part_name TEXT,
  label TEXT,
  file_status TEXT NOT NULL DEFAULT 'present',
  last_seen_at TEXT,
  bom_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_file_asset_filename
  ON phoenix_cad_file_asset(filename);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_file_asset_status
  ON phoenix_cad_file_asset(file_status);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_file_asset_part
  ON phoenix_cad_file_asset(part_number, part_version);

CREATE TABLE IF NOT EXISTS phoenix_cad_part_key (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT NOT NULL,
  part_version TEXT NOT NULL,
  type_code TEXT,
  model_series TEXT,
  part_name TEXT,
  label TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(part_number, part_version)
);

CREATE TABLE IF NOT EXISTS phoenix_cad_part_file_link (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_key_id INTEGER NOT NULL REFERENCES phoenix_cad_part_key(id) ON DELETE CASCADE,
  file_asset_id INTEGER NOT NULL UNIQUE REFERENCES phoenix_cad_file_asset(id) ON DELETE CASCADE,
  file_role TEXT NOT NULL DEFAULT 'part',
  notes TEXT,
  link_status TEXT NOT NULL DEFAULT 'active',
  linked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_part_key_pn_pv
  ON phoenix_cad_part_key(part_number, part_version);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_part_file_link_key
  ON phoenix_cad_part_file_link(part_key_id);

CREATE TABLE IF NOT EXISTS phoenix_audit_change_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  actor TEXT,
  source TEXT,
  note TEXT,
  stats_json TEXT
);

CREATE TABLE IF NOT EXISTS phoenix_audit_rename_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES phoenix_audit_change_event(id) ON DELETE CASCADE,
  file_asset_id INTEGER REFERENCES phoenix_cad_file_asset(id) ON DELETE SET NULL,
  old_repo_rel_path TEXT NOT NULL,
  new_repo_rel_path TEXT NOT NULL,
  old_filename TEXT NOT NULL,
  new_filename TEXT NOT NULL,
  old_basename TEXT NOT NULL,
  new_basename TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_audit_ref_hit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES phoenix_audit_change_event(id) ON DELETE CASCADE,
  rename_log_id INTEGER REFERENCES phoenix_audit_rename_log(id) ON DELETE SET NULL,
  host_repo_rel_path TEXT NOT NULL,
  host_asset_kind TEXT,
  ref_kind TEXT NOT NULL DEFAULT 'xlink_file_attr',
  locator TEXT NOT NULL DEFAULT 'Document.xml',
  matched_text TEXT NOT NULL,
  proposed_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  detail_json TEXT
);

CREATE TABLE IF NOT EXISTS phoenix_audit_ref_patch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES phoenix_audit_change_event(id) ON DELETE CASCADE,
  ref_hit_id INTEGER REFERENCES phoenix_audit_ref_hit(id) ON DELETE SET NULL,
  host_repo_rel_path TEXT NOT NULL,
  old_text TEXT NOT NULL,
  new_text TEXT NOT NULL,
  applied_at TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_phoenix_audit_rename_log_old_basename
  ON phoenix_audit_rename_log(old_basename);
CREATE INDEX IF NOT EXISTS idx_phoenix_audit_ref_hit_rename
  ON phoenix_audit_ref_hit(rename_log_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_audit_ref_hit_host
  ON phoenix_audit_ref_hit(host_repo_rel_path);

CREATE TABLE IF NOT EXISTS phoenix_ui_session (
  scope TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_cad_bom_xref (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES phoenix_cad_scan(id) ON DELETE CASCADE,
  host_file_asset_id INTEGER NOT NULL REFERENCES phoenix_cad_file_asset(id) ON DELETE CASCADE,
  host_repo_rel_path TEXT NOT NULL,
  ref_kind TEXT NOT NULL DEFAULT 'xlink_file_attr',
  locator TEXT NOT NULL DEFAULT 'Document.xml',
  xlink_file_attr TEXT NOT NULL,
  link_label TEXT NOT NULL DEFAULT '',
  rule_label TEXT NOT NULL DEFAULT '',
  target_basename TEXT NOT NULL,
  target_file_asset_id INTEGER REFERENCES phoenix_cad_file_asset(id) ON DELETE SET NULL,
  target_repo_rel_path TEXT,
  target_part_number TEXT NOT NULL DEFAULT '',
  target_part_version TEXT NOT NULL DEFAULT '',
  target_type_code TEXT NOT NULL DEFAULT '',
  target_model_series TEXT NOT NULL DEFAULT '',
  target_part_name TEXT NOT NULL DEFAULT '',
  target_asset_label TEXT NOT NULL DEFAULT '',
  resolve_status TEXT NOT NULL DEFAULT 'missing',
  detail_json TEXT,
  last_seen_at TEXT NOT NULL,
  UNIQUE(host_file_asset_id, xlink_file_attr)
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_host
  ON phoenix_cad_bom_xref(host_file_asset_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_host_path
  ON phoenix_cad_bom_xref(host_repo_rel_path);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_target_asset
  ON phoenix_cad_bom_xref(target_file_asset_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_target_basename
  ON phoenix_cad_bom_xref(target_basename);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_target_path
  ON phoenix_cad_bom_xref(target_repo_rel_path);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_xref_scan
  ON phoenix_cad_bom_xref(scan_id);

CREATE TABLE IF NOT EXISTS phoenix_cad_bom_assembly_cache (
  host_repo_rel_path TEXT NOT NULL,
  mode TEXT NOT NULL,
  tree_json TEXT NOT NULL,
  node_count INTEGER NOT NULL DEFAULT 0,
  bom_xref_at TEXT NOT NULL DEFAULT '',
  built_at TEXT NOT NULL,
  PRIMARY KEY (host_repo_rel_path, mode)
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_asm_cache_built
  ON phoenix_cad_bom_assembly_cache(bom_xref_at);

CREATE TABLE IF NOT EXISTS phoenix_cad_bom_tree_occurrence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  root_host_repo_rel_path TEXT NOT NULL,
  tree_path TEXT NOT NULL,
  depth INTEGER NOT NULL,
  host_repo_rel_path TEXT NOT NULL,
  target_repo_rel_path TEXT,
  xlink_file_attr TEXT NOT NULL,
  link_label TEXT,
  built_at TEXT NOT NULL,
  UNIQUE(root_host_repo_rel_path, tree_path)
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_occ_target
  ON phoenix_cad_bom_tree_occurrence(target_repo_rel_path);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_occ_root
  ON phoenix_cad_bom_tree_occurrence(root_host_repo_rel_path);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_occ_host_target
  ON phoenix_cad_bom_tree_occurrence(host_repo_rel_path, target_repo_rel_path);

CREATE TABLE IF NOT EXISTS phoenix_cad_bom_line (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES phoenix_cad_scan(id) ON DELETE CASCADE,
  assembly_rel TEXT NOT NULL,
  part_rel TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  bom_path TEXT NOT NULL,
  part_key TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  cycle_detected INTEGER NOT NULL DEFAULT 0,
  built_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_line_assembly
  ON phoenix_cad_bom_line(assembly_rel);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_line_part
  ON phoenix_cad_bom_line(part_rel);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_bom_line_scan
  ON phoenix_cad_bom_line(scan_id);

CREATE TABLE IF NOT EXISTS phoenix_cad_xref_flat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES phoenix_cad_scan(id) ON DELETE CASCADE,
  host_rel TEXT NOT NULL,
  target_rel TEXT NOT NULL,
  link_label TEXT NOT NULL DEFAULT '',
  is_direct INTEGER NOT NULL DEFAULT 1,
  built_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phoenix_cad_xref_flat_host
  ON phoenix_cad_xref_flat(host_rel);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_xref_flat_target
  ON phoenix_cad_xref_flat(target_rel);
CREATE INDEX IF NOT EXISTS idx_phoenix_cad_xref_flat_scan
  ON phoenix_cad_xref_flat(scan_id);

CREATE TABLE IF NOT EXISTS phoenix_code_scan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanned_at TEXT NOT NULL,
  scan_root TEXT NOT NULL,
  stats_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_code_file_asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_rel_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  asset_kind TEXT NOT NULL,
  file_ext TEXT NOT NULL DEFAULT '',
  file_status TEXT NOT NULL DEFAULT 'present',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  text_encoding TEXT NOT NULL DEFAULT '',
  last_seen_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phoenix_code_file_kind
  ON phoenix_code_file_asset(asset_kind);
CREATE INDEX IF NOT EXISTS idx_phoenix_code_file_filename
  ON phoenix_code_file_asset(filename);
CREATE INDEX IF NOT EXISTS idx_phoenix_code_file_status
  ON phoenix_code_file_asset(file_status);
CREATE INDEX IF NOT EXISTS idx_phoenix_code_file_ext
  ON phoenix_code_file_asset(file_ext);
CREATE INDEX IF NOT EXISTS idx_phoenix_code_file_encoding
  ON phoenix_code_file_asset(text_encoding);

CREATE TABLE IF NOT EXISTS phoenix_workset (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_workset_path (
  workset_id TEXT NOT NULL REFERENCES phoenix_workset(id) ON DELETE CASCADE,
  repo_rel_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  entry_type TEXT NOT NULL DEFAULT 'file',
  PRIMARY KEY (workset_id, repo_rel_path)
);

CREATE INDEX IF NOT EXISTS idx_phoenix_workset_path_rel
  ON phoenix_workset_path(repo_rel_path);

CREATE TABLE IF NOT EXISTS phoenix_caa_scan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanned_at TEXT NOT NULL,
  scan_root TEXT NOT NULL,
  stats_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_caa_dialog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_rel_catdlg TEXT NOT NULL UNIQUE,
  dialog_name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL,
  group_key TEXT NOT NULL,
  group_label TEXT NOT NULL,
  file_status TEXT NOT NULL DEFAULT 'present',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  mtime_ms REAL NOT NULL DEFAULT 0,
  type_counts_json TEXT NOT NULL DEFAULT '{}',
  last_seen_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_caa_dialog_group (
  group_key TEXT PRIMARY KEY,
  group_label TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phoenix_caa_dialog_group_member (
  group_key TEXT NOT NULL,
  dialog_id INTEGER NOT NULL,
  PRIMARY KEY(group_key, dialog_id),
  FOREIGN KEY(dialog_id) REFERENCES phoenix_caa_dialog(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_phoenix_caa_dialog_status
  ON phoenix_caa_dialog(file_status);
CREATE INDEX IF NOT EXISTS idx_phoenix_caa_dialog_group
  ON phoenix_caa_dialog(group_key);
CREATE INDEX IF NOT EXISTS idx_phoenix_caa_dialog_name
  ON phoenix_caa_dialog(dialog_name);

CREATE TABLE IF NOT EXISTS phoenix_workspace_pref (
  section TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export type PnwWorkspaceSchemaCompatibility =
  | "uninitialized"
  | "current"
  | "recreate";

export function pnwClassifyWorkspaceSchemaVersion(
  actualVersion: number | null | undefined,
): PnwWorkspaceSchemaCompatibility {
  if (actualVersion === null || actualVersion === undefined) return "uninitialized";
  return actualVersion === PNW_WORKSPACE_SCHEMA_VERSION ? "current" : "recreate";
}

export function pnwWorkspaceSchemaV13ObjectNames(): {
  readonly tables: readonly string[];
  readonly indexes: readonly string[];
} {
  const names = (kind: "TABLE" | "INDEX"): string[] => {
    const pattern = new RegExp(
      `CREATE ${kind} IF NOT EXISTS\\s+([a-z0-9_]+)`,
      "giu",
    );
    return [...PNW_WORKSPACE_SCHEMA_V13_DDL.matchAll(pattern)]
      .map((entry) => entry[1])
      .sort();
  };
  return { tables: names("TABLE"), indexes: names("INDEX") };
}

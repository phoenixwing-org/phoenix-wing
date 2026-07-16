CREATE TABLE phoenix_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
INSERT INTO phoenix_meta VALUES ('schema_version', '13');

CREATE TABLE phoenix_cad_scan (
  id INTEGER PRIMARY KEY, scan_uuid TEXT, scanned_at TEXT NOT NULL,
  status TEXT NOT NULL, stats_json TEXT
);
CREATE TABLE phoenix_cad_file_asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT, repo_rel_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL, asset_kind TEXT, part_number TEXT, part_version TEXT,
  part_name TEXT, label TEXT, file_status TEXT NOT NULL DEFAULT 'present',
  last_seen_at TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE phoenix_cad_part_key (
  id INTEGER PRIMARY KEY, part_number TEXT NOT NULL, part_version TEXT NOT NULL,
  part_name TEXT, type_code TEXT, model_series TEXT
);
CREATE TABLE phoenix_cad_part_file_link (part_key_id INTEGER NOT NULL);
CREATE TABLE phoenix_cad_bom_xref (
  host_repo_rel_path TEXT NOT NULL, target_repo_rel_path TEXT,
  link_label TEXT, ref_kind TEXT, target_part_number TEXT
);
CREATE TABLE phoenix_cad_bom_line (
  assembly_rel TEXT NOT NULL, depth INTEGER NOT NULL, part_rel TEXT NOT NULL,
  part_key TEXT NOT NULL, quantity INTEGER NOT NULL, bom_path TEXT NOT NULL
);

INSERT INTO phoenix_cad_file_asset
  (repo_rel_path, filename, asset_kind, part_number, part_version, part_name, label, file_status, updated_at)
VALUES
  ('assembly.FCStd', 'assembly.FCStd', 'assembly', 'A100', '01', 'Main assembly', 'A', 'present', '2026-01-01'),
  ('parts/bolt.FCStd', 'bolt.FCStd', 'part', 'P200', '02', 'Bolt', 'B', 'present', '2026-01-01'),
  ('gone.FCStd', 'gone.FCStd', 'part', NULL, NULL, NULL, NULL, 'missing', '2026-01-01');
INSERT INTO phoenix_cad_part_key VALUES (1, 'P200', '02', 'Bolt', 'STD', 'M1');
INSERT INTO phoenix_cad_part_file_link VALUES (1);
INSERT INTO phoenix_cad_bom_xref VALUES
  ('assembly.FCStd', 'parts/bolt.FCStd', 'Bolt link', 'xlink_file_attr', 'P200');
INSERT INTO phoenix_cad_bom_line VALUES
  ('assembly.FCStd', 1, 'parts/bolt.FCStd', 'P200-02', 2, '0/0');
INSERT INTO phoenix_cad_scan VALUES
  (1, 'scan-1', '2026-01-01T00:00:00Z', 'done', '{"files":2}');


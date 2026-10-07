import { pnwCadIndexIncludesPath, pnwCadIndexRelativePath, pnwCadXlinkRuleLabel, type PnwCadWorkspaceIndexPlan } from "@phoenix-wing/cad-core";

export const PNW_CAD_INDEX_WRITE_PROTOCOL = "phoenix-cad-index-v1" as const;

/** A synchronous SQLite connection; hosts own drivers, schema initialization and lifetime. */
export interface PnwCadIndexDatabaseV1 {
  exec(sql: string): void;
  get<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T | undefined;
  all<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T[];
  run(sql: string, params?: readonly unknown[]): unknown;
}

export interface PnwCadIndexWriteOptionsV1 {
  readonly scanUuid: string;
  readonly scannedAt: string;
  readonly scanRoot: string;
  /** V1 supports only a complete workspace scan. Partial discovery MUST NOT set this. */
  readonly scope: "workspace";
  readonly complete: boolean;
  /** Read before file discovery, not immediately before committing. */
  readonly expectedScanId: number;
  /** Throw on cancellation, a changed workspace or a stale file snapshot. Called under the lock. */
  readonly assertCurrent: () => void;
}

export interface PnwCadIndexWriteResultV1 {
  readonly scanId: number;
  readonly files: number;
  readonly parsedFiles: number;
  readonly references: number;
  readonly bomLines: number;
}

export function pnwReadCadIndexRevisionV1(db: Pick<PnwCadIndexDatabaseV1, "get">): number {
  const row = db.get<{ id: number }>("SELECT COALESCE(MAX(id), 0) AS id FROM phoenix_cad_scan");
  const id = Number(row?.id ?? 0);
  if (!Number.isSafeInteger(id) || id < 0) throw new Error("Invalid CAD scan revision");
  return id;
}

/**
 * Atomic Schema-v13 derived index replacement. Never updates manual PartKey
 * fields/links, audit history, non-FCStd assets or user preferences. No file I/O.
 */
export function pnwWriteCadWorkspaceIndexV1(
  db: PnwCadIndexDatabaseV1, plan: PnwCadWorkspaceIndexPlan, options: PnwCadIndexWriteOptionsV1,
): PnwCadIndexWriteResultV1 {
  if (options.scope !== "workspace" || options.complete !== true) throw new Error("A complete workspace scan is required");
  if (!options.scanUuid.trim() || !options.scanRoot.trim() || !Number.isFinite(Date.parse(options.scannedAt))
    || !Number.isSafeInteger(options.expectedScanId) || options.expectedScanId < 0) throw new Error("Invalid CAD scan metadata");
  if (plan.parseFailures || plan.assets.some(asset => asset.parseError)) throw new Error("CAD parse failures: previous index preserved");
  const planned = new Set<string>();
  for (const asset of plan.assets) {
    const relative = pnwCadIndexRelativePath(asset.relativePath);
    if (relative !== asset.relativePath || !pnwCadIndexIncludesPath(relative) || planned.has(relative.toLowerCase())) {
      throw new Error("Unsafe or duplicate CAD index asset");
    }
    planned.add(relative.toLowerCase());
  }
  options.assertCurrent();
  db.exec("BEGIN IMMEDIATE"); // A busy writer fails here; never roll back somebody else's transaction.
  try {
    const schema = db.get<{ value: string }>("SELECT value FROM phoenix_meta WHERE key='schema_version'");
    if (String(schema?.value) !== "13") throw new Error("CAD index requires workspace Schema v13; no automatic migration");
    if (pnwReadCadIndexRevisionV1(db) !== options.expectedScanId) throw new Error("CAD index changed during discovery; rescan required");
    options.assertCurrent();
    const existing = db.all<{ id: number; repo_rel_path: string }>("SELECT id, repo_rel_path FROM phoenix_cad_file_asset");
    const byKey = new Map<string, { id: number; repo_rel_path: string }>();
    for (const row of existing) {
      if (!pnwCadIndexIncludesPath(row.repo_rel_path)) continue;
      const key = pnwCadIndexRelativePath(row.repo_rel_path).toLowerCase();
      if (byKey.has(key)) throw new Error(`Duplicate legacy CAD paths; resolve explicitly before scanning: ${byKey.get(key)!.repo_rel_path} | ${row.repo_rel_path}`);
      byKey.set(key, row);
    }
    const storedPath = (relative: string): string => byKey.get(relative.toLowerCase())?.repo_rel_path || relative;
    const now = options.scannedAt;
    const stats = JSON.stringify({ source: PNW_CAD_INDEX_WRITE_PROTOCOL, files: plan.assets.length,
      parsed_files: plan.assets.length, parse_failures: 0, references: plan.references.length, bom_lines: plan.bomLines.length });
    db.run(`INSERT INTO phoenix_cad_scan
      (scan_uuid, scanned_at, scan_root, stats_json, status, phase, started_at, finished_at)
      VALUES (?, ?, ?, ?, 'done', 'ts-light-index', ?, ?)`, [options.scanUuid, now, options.scanRoot, stats, now, now]);
    const scanId = pnwReadCadIndexRevisionV1(db);
    // All updates are per known FCStd identity. STEP/SolidWorks and unrelated tables are untouched.
    for (const row of byKey.values()) db.run("UPDATE phoenix_cad_file_asset SET file_status='missing', updated_at=? WHERE id=?", [now, row.id]);
    for (const asset of plan.assets) {
      const fields = asset.fields;
      const relative = storedPath(asset.relativePath);
      const kind = asset.documentKind.toLowerCase();
      db.run(`INSERT INTO phoenix_cad_file_asset
        (repo_rel_path,filename,asset_kind,part_number,part_version,type_code,model_series,part_name,label,file_status,last_seen_at,bom_json,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,'present',?,?,?) ON CONFLICT(repo_rel_path) DO UPDATE SET
        filename=excluded.filename,asset_kind=excluded.asset_kind,part_number=excluded.part_number,
        part_version=excluded.part_version,type_code=excluded.type_code,model_series=excluded.model_series,
        part_name=excluded.part_name,label=excluded.label,file_status='present',last_seen_at=excluded.last_seen_at,
        bom_json=excluded.bom_json,updated_at=excluded.updated_at`,
      [relative, asset.filename, kind, fields.PartNumber, fields.PartVersion, fields.TypeCode, fields.ModelSeries,
        fields.PartName, fields.label, now, JSON.stringify({ protocol: PNW_CAD_INDEX_WRITE_PROTOCOL, version: 1,
          size_bytes: asset.sizeBytes, mtime_ms: Math.trunc(asset.modifiedAtMs), document_xml_objects: asset.objectCount,
          xlinks: asset.xlinks }), now]);
      const row = db.get<{ id: number; repo_rel_path: string }>("SELECT id,repo_rel_path FROM phoenix_cad_file_asset WHERE repo_rel_path=?", [relative]);
      if (!row) throw new Error("CAD asset insertion failed");
      byKey.set(asset.relativePath.toLowerCase(), row);
      if (!fields.PartNumber || !fields.PartVersion) continue;
      db.run(`INSERT INTO phoenix_cad_part_key
        (part_number,part_version,type_code,model_series,part_name,label,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'active',?,?) ON CONFLICT(part_number,part_version) DO NOTHING`,
      [fields.PartNumber, fields.PartVersion, fields.TypeCode, fields.ModelSeries, fields.PartName, fields.label, now, now]);
      const part = db.get<{ id: number }>("SELECT id FROM phoenix_cad_part_key WHERE part_number=? AND part_version=?", [fields.PartNumber, fields.PartVersion]);
      if (!part) throw new Error("CAD PartKey insertion failed");
      db.run(`INSERT INTO phoenix_cad_part_file_link (part_key_id,file_asset_id,file_role,link_status,linked_at)
        VALUES (?,?,?,'active',?) ON CONFLICT(file_asset_id) DO NOTHING`, [part.id, row.id, kind, now]);
    }
    // Include legacy ./ aliases without renaming assets or invalidating user-owned foreign keys.
    const hosts = new Set<string>();
    for (const row of byKey.values()) {
      const key = pnwCadIndexRelativePath(row.repo_rel_path);
      hosts.add(row.repo_rel_path); hosts.add(key); hosts.add(`./${key}`);
    }
    for (const host of hosts) {
      for (const [table, column] of [
        ["phoenix_cad_bom_xref", "host_repo_rel_path"], ["phoenix_cad_xref_flat", "host_rel"],
        ["phoenix_cad_bom_line", "assembly_rel"], ["phoenix_cad_bom_tree_occurrence", "root_host_repo_rel_path"],
        ["phoenix_cad_bom_assembly_cache", "host_repo_rel_path"],
      ]) db.run(`DELETE FROM ${table} WHERE ${column}=?`, [host]);
    }
    for (const reference of plan.references) {
      const host = byKey.get(reference.hostRelativePath.toLowerCase());
      if (!host) throw new Error("Unknown CAD reference host");
      const target = reference.targetRelativePath ? byKey.get(reference.targetRelativePath.toLowerCase()) : undefined;
      if (reference.targetRelativePath && !target) throw new Error("Unknown CAD reference target");
      const fields = reference.targetFields;
      const targetBasename = reference.file.split("/").at(-1) || "";
      const ruleLabel = pnwCadXlinkRuleLabel({
        part_number: fields.PartNumber, part_version: fields.PartVersion,
        part_name: fields.PartName, label: fields.label,
      }, targetBasename, target?.repo_rel_path ?? null);
      db.run(`INSERT INTO phoenix_cad_bom_xref
        (scan_id,host_file_asset_id,host_repo_rel_path,xlink_file_attr,link_label,rule_label,target_basename,
        target_file_asset_id,target_repo_rel_path,target_part_number,target_part_version,target_type_code,
        target_model_series,target_part_name,target_asset_label,resolve_status,detail_json,last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [scanId, host.id, host.repo_rel_path, reference.file, reference.label, ruleLabel, targetBasename,
        target?.id ?? null, target?.repo_rel_path ?? null, fields.PartNumber, fields.PartVersion, fields.TypeCode,
        fields.ModelSeries, fields.PartName, fields.label, reference.status,
        JSON.stringify({ source: PNW_CAD_INDEX_WRITE_PROTOCOL, basic_bom: true, quantity: reference.quantity }), now]);
      if (reference.status === "resolved" && target) db.run(`INSERT INTO phoenix_cad_xref_flat
        (scan_id,host_rel,target_rel,link_label,is_direct,built_at) VALUES (?,?,?,?,1,?)`,
      [scanId, host.repo_rel_path, target.repo_rel_path, reference.label, now]);
    }
    for (const line of plan.bomLines) {
      const root = storedPath(line.assemblyRelativePath);
      db.run(`INSERT INTO phoenix_cad_bom_line
        (scan_id,assembly_rel,part_rel,depth,bom_path,part_key,quantity,cycle_detected,built_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [scanId, root, storedPath(line.partRelativePath), line.depth, line.bomPath, line.partKey, line.quantity, line.cycleDetected ? 1 : 0, now]);
      db.run(`INSERT INTO phoenix_cad_bom_tree_occurrence
        (root_host_repo_rel_path,tree_path,depth,host_repo_rel_path,target_repo_rel_path,xlink_file_attr,link_label,built_at)
        VALUES (?,?,?,?,?,?,?,?)`, [root, line.treePath, line.depth, storedPath(line.hostRelativePath),
        storedPath(line.partRelativePath), line.file, line.label, now]);
    }
    options.assertCurrent();
    db.exec("COMMIT");
    return { scanId, files: plan.assets.length, parsedFiles: plan.assets.length,
      references: plan.references.length, bomLines: plan.bomLines.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

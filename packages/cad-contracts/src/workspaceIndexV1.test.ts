import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pnwCreateDb, type PnwDbAdapter } from "@phoenix-wing/db-node";
import { PNW_WORKSPACE_SCHEMA_V13_DDL } from "@phoenix-wing/workspace-schema";
import { pnwBuildCadWorkspaceIndex, type PnwCadIndexRecord } from "@phoenix-wing/cad-core";
import { pnwReadCadIndexRevisionV1, pnwWriteCadWorkspaceIndexV1, type PnwCadIndexWriteOptionsV1 } from "./workspaceIndexV1.js";
import { pnwPreviewCadIndexResetV1, pnwResetCadWorkspaceIndexV1 } from "./workspaceIndexResetV1.js";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
function database() {
  const directory = mkdtempSync(join(tmpdir(), "pnw-cad-index-"));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, "test.sqlite");
  const db = pnwCreateDb(filename);
  cleanups.push(() => db.close());
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(PNW_WORKSPACE_SCHEMA_V13_DDL);
  db.run("INSERT INTO phoenix_meta(key,value) VALUES ('schema_version','13')");
  return { db, filename };
}
const record = (relativePath = "100.001-S-Bracket.FCStd", files: string[] = []): PnwCadIndexRecord => ({
  relativePath, filename: relativePath, documentKind: "Part", sizeBytes: 100, modifiedAtMs: 1000,
  objectCount: 1, xlinks: files.map(file => ({ file, label: "" })),
});
function options(db: PnwDbAdapter, patch: Partial<PnwCadIndexWriteOptionsV1> = {}): PnwCadIndexWriteOptionsV1 {
  return { scanUuid: `scan-${pnwReadCadIndexRevisionV1(db) + 1}`, scanRoot: "workspace", scope: "workspace", complete: true,
    scannedAt: "2026-01-01T00:00:00.000Z", expectedScanId: pnwReadCadIndexRevisionV1(db), assertCurrent() {}, ...patch };
}
function snapshot(db: PnwDbAdapter) {
  return ["phoenix_cad_scan", "phoenix_cad_file_asset", "phoenix_cad_part_key", "phoenix_cad_part_file_link",
    "phoenix_cad_bom_xref", "phoenix_cad_bom_line", "phoenix_cad_xref_flat", "phoenix_cad_bom_tree_occurrence"]
    .map(table => db.all(`SELECT * FROM ${table} ORDER BY id`));
}

describe("atomic shared CAD index writer", () => {
  it("resets only explicitly confirmed derived CAD tables and keeps a new revision", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db));
    db.run("UPDATE phoenix_cad_part_key SET part_name='Manual',notes='keep'");
    db.run("INSERT INTO phoenix_meta(key,value) VALUES ('user_preference','keep')");
    const parts = db.all("SELECT * FROM phoenix_cad_part_key");
    const expected = pnwPreviewCadIndexResetV1(db);
    const reset = { expected, confirmRemoveFileLinks: true, scanUuid: "reset", scanRoot: "workspace", scannedAt: "2026-01-02T00:00:00Z", beforeReset() {} };
    expect(() => pnwResetCadWorkspaceIndexV1(db, { ...reset, confirmRemoveFileLinks: false })).toThrow(/confirmation/);
    expect(() => pnwResetCadWorkspaceIndexV1(db, { ...reset, beforeReset() { throw new Error("backup failed"); } })).toThrow("backup failed");
    expect(pnwPreviewCadIndexResetV1(db)).toEqual(expected);
    const result = pnwResetCadWorkspaceIndexV1(db, reset);
    expect(result.revision).toBeGreaterThan(expected.revision);
    expect(db.all("SELECT * FROM phoenix_cad_file_asset")).toEqual([]);
    expect(db.all("SELECT * FROM phoenix_cad_part_file_link")).toEqual([]);
    expect(db.all("SELECT * FROM phoenix_cad_part_key")).toEqual(parts);
    expect(db.get("SELECT value FROM phoenix_meta WHERE key='user_preference'")).toEqual({ value: "keep" });
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db, { expectedScanId: expected.revision }))).toThrow(/changed/);
    expect(() => pnwResetCadWorkspaceIndexV1(db, reset)).toThrow(/changed after reset preview/);
  });
  it("writes scan/assets/reference/BOM as one successful transaction", () => {
    const { db } = database();
    const result = pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record("root.FCStd", ["100.001-S-Bracket.FCStd"]), record()]), options(db));
    expect(result).toMatchObject({ scanId: 1, files: 2, parsedFiles: 2, references: 1, bomLines: 1 });
    expect(db.get("SELECT target_repo_rel_path,resolve_status,rule_label FROM phoenix_cad_bom_xref")).toMatchObject({ target_repo_rel_path: record().relativePath, resolve_status: "resolved", rule_label: "100.001-Bracket" });
    expect(db.get("PRAGMA foreign_key_check")).toBeUndefined();
  });

  it("writes target rule labels separately from link labels and replaces old scan markers on refresh", () => {
    const { db } = database();
    const host = { ...record("root.FCStd"), xlinks: [{ file: record().relativePath, label: "实例标签" }] };
    const target = { ...record(), embeddedFields: { PartName: "支架", label: "100.001-支架" } };
    const plan = pnwBuildCadWorkspaceIndex([host, target]);
    pnwWriteCadWorkspaceIndexV1(db, plan, options(db));
    expect(db.get("SELECT link_label,rule_label,target_part_name,target_asset_label FROM phoenix_cad_bom_xref"))
      .toEqual({ link_label: "实例标签", rule_label: "100.001-支架", target_part_name: "支架", target_asset_label: "100.001-支架" });
    db.run("UPDATE phoenix_cad_bom_xref SET rule_label='ts-light-index'");
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([
      host, { ...target, embeddedFields: { PartName: "新支架", label: "100.001-新支架" } },
    ]), options(db));
    expect(db.get("SELECT link_label,rule_label FROM phoenix_cad_bom_xref"))
      .toEqual({ link_label: "实例标签", rule_label: "100.001-新支架" });
    expect(db.get("SELECT phase FROM phoenix_cad_scan ORDER BY id DESC LIMIT 1"))
      .toEqual({ phase: "ts-light-index" });
  });

  it("uses a filename-based rule label for an unresolved target, never a scan phase marker", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([
      record("root.FCStd", ["200.001-S-Bolt.FCStd"]),
    ]), options(db));
    expect(db.get("SELECT rule_label,resolve_status,target_file_asset_id FROM phoenix_cad_bom_xref"))
      .toEqual({ rule_label: "200.001-Bolt", resolve_status: "missing", target_file_asset_id: null });
  });

  it("rolls back an index reset even after earlier tables were cleared", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record("root.FCStd", [record().relativePath]), record()]), options(db));
    const before = snapshot(db);
    db.exec("CREATE TRIGGER reject_reset BEFORE DELETE ON phoenix_cad_file_asset BEGIN SELECT RAISE(ABORT,'reset denied'); END");
    expect(() => pnwResetCadWorkspaceIndexV1(db, {
      expected: pnwPreviewCadIndexResetV1(db), confirmRemoveFileLinks: true,
      scanUuid: "reset", scanRoot: "workspace", scannedAt: "2026-01-02T00:00:00Z", beforeReset() {},
    })).toThrow(/reset denied/);
    expect(snapshot(db)).toEqual(before);
  });

  it("preserves manual fields, relinking, ignored status and unrelated assets/data", () => {
    const { db } = database();
    const plan = pnwBuildCadWorkspaceIndex([record()]);
    pnwWriteCadWorkspaceIndexV1(db, plan, options(db));
    db.run("UPDATE phoenix_cad_part_key SET part_name='Hand written', notes='keep', status='inactive'");
    db.run("UPDATE phoenix_cad_part_file_link SET notes='manual link',link_status='ignored',file_role='drawing'");
    db.run("INSERT INTO phoenix_cad_file_asset(repo_rel_path,filename,file_status,updated_at) VALUES ('source.step','source.step','present','before')");
    db.run("INSERT INTO phoenix_cad_file_asset(repo_rel_path,filename,file_status,updated_at) VALUES ('node_modules/fixture.FCStd','fixture.FCStd','present','before')");
    db.run("INSERT INTO phoenix_meta(key,value) VALUES ('user_preference','keep')");
    const part = db.all("SELECT * FROM phoenix_cad_part_key");
    const links = db.all("SELECT * FROM phoenix_cad_part_file_link");
    pnwWriteCadWorkspaceIndexV1(db, plan, options(db));
    expect(db.all("SELECT * FROM phoenix_cad_part_key")).toEqual(part);
    expect(db.all("SELECT * FROM phoenix_cad_part_file_link")).toEqual(links);
    expect(db.get("SELECT file_status,updated_at FROM phoenix_cad_file_asset WHERE repo_rel_path='source.step'")).toEqual({ file_status: "present", updated_at: "before" });
    expect(db.get("SELECT value FROM phoenix_meta WHERE key='user_preference'")).toEqual({ value: "keep" });
    expect(db.get("SELECT file_status,updated_at FROM phoenix_cad_file_asset WHERE repo_rel_path='node_modules/fixture.FCStd'")).toEqual({ file_status: "present", updated_at: "before" });
  });

  it("preserves legacy ./ asset identities and their foreign keys", () => {
    const { db } = database();
    db.run("INSERT INTO phoenix_cad_file_asset(repo_rel_path,filename,updated_at) VALUES (?,?,?)", [`./${record().relativePath}`, record().filename, "before"]);
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record("root.FCStd", [record().relativePath]), record()]), options(db));
    expect(db.get("SELECT COUNT(*) AS count FROM phoenix_cad_file_asset")).toEqual({ count: 2 });
    expect(db.get("SELECT target_file_asset_id,target_repo_rel_path FROM phoenix_cad_bom_xref")).toEqual({ target_file_asset_id: 1, target_repo_rel_path: `./${record().relativePath}` });
  });

  it("marks absent FCStd missing but preserves its manual PartKey association", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db));
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), options(db));
    expect(db.get("SELECT file_status FROM phoenix_cad_file_asset")).toEqual({ file_status: "missing" });
    expect(db.all("SELECT * FROM phoenix_cad_part_file_link")).toHaveLength(1);
  });

  it("refuses partial or failed discovery without altering previous successful rows", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db));
    const before = snapshot(db);
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), options(db, { complete: false }))).toThrow(/complete/);
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([{ ...record(), parseError: "bad XML" }]), options(db))).toThrow(/parse failures/);
    expect(snapshot(db)).toEqual(before);
  });

  it("rolls back every table on SQL failure or late cancellation/stale snapshot", () => {
    const { db } = database();
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db));
    const before = snapshot(db);
    let guards = 0;
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record("new.FCStd")]), options(db, {
      assertCurrent() { if (++guards === 3) throw new Error("file changed"); },
    }))).toThrow("file changed");
    expect(snapshot(db)).toEqual(before);
    db.exec("CREATE TRIGGER fail_index BEFORE INSERT ON phoenix_cad_bom_line BEGIN SELECT RAISE(ABORT,'injected failure'); END");
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record("root.FCStd", [record().relativePath]), record()]), options(db))).toThrow(/injected failure/);
    expect(snapshot(db)).toEqual(before);
  });

  it("rejects a competing committed scan and an active SQLite writer", () => {
    const { db, filename } = database();
    const stale = options(db);
    pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([record()]), options(db));
    const before = snapshot(db);
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), stale)).toThrow(/changed during discovery/);
    const other = pnwCreateDb(filename);
    cleanups.push(() => other.close());
    other.exec("BEGIN IMMEDIATE");
    try { expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), options(db))).toThrow(); }
    finally { other.exec("ROLLBACK"); }
    expect(snapshot(db)).toEqual(before);
  });

  it("refuses incompatible schema and duplicate legacy identities without migration", () => {
    const { db } = database();
    db.run("UPDATE phoenix_meta SET value='12' WHERE key='schema_version'");
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), options(db))).toThrow(/Schema v13/);
    expect(db.get("SELECT value FROM phoenix_meta WHERE key='schema_version'")).toEqual({ value: "12" });
    db.run("UPDATE phoenix_meta SET value='13' WHERE key='schema_version'");
    db.exec("INSERT INTO phoenix_cad_file_asset(repo_rel_path,filename,updated_at) VALUES ('a.FCStd','a.FCStd','before'),('./a.FCStd','a.FCStd','before')");
    expect(() => pnwWriteCadWorkspaceIndexV1(db, pnwBuildCadWorkspaceIndex([]), options(db))).toThrow(/Duplicate legacy/);
    expect(pnwReadCadIndexRevisionV1(db)).toBe(0);
  });
});

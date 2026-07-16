import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  PNW_WORKSPACE_DATABASE_FILENAME,
  PNW_WORKSPACE_SCHEMA_ID,
  PNW_WORKSPACE_SCHEMA_V13_DDL,
  PNW_WORKSPACE_SCHEMA_V13_SHA256,
  PNW_WORKSPACE_SCHEMA_VERSION,
  PNW_WORKSPACE_SCHEMA_VERSION_UPSERT_SQL,
  pnwClassifyWorkspaceSchemaVersion,
  pnwWorkspaceSchemaV13ObjectNames,
} from "./index.js";

const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/workspace-schema-v13.json", import.meta.url),
  "utf8",
)) as {
  schema_id: string;
  schema_version: number;
  ddl_sha256: string;
  database_filename: string;
  tables: string[];
  indexes: string[];
};

const compatibilityFixture = JSON.parse(readFileSync(
  new URL("../fixtures/workspace-schema-compatibility-v1.json", import.meta.url),
  "utf8",
)) as {
  contract_version: number;
  current_version: number;
  cases: Array<{
    actual_version: number | null;
    classification: "uninitialized" | "current" | "recreate";
    may_write: boolean;
    host_action: string;
  }>;
};

describe("Phoenix workspace schema v13", () => {
  it("freezes the production DDL hash and SQL object inventory", () => {
    const hash = createHash("sha256").update(PNW_WORKSPACE_SCHEMA_V13_DDL).digest("hex");
    expect({
      schema_id: PNW_WORKSPACE_SCHEMA_ID,
      schema_version: PNW_WORKSPACE_SCHEMA_VERSION,
      ddl_sha256: PNW_WORKSPACE_SCHEMA_V13_SHA256,
      database_filename: PNW_WORKSPACE_DATABASE_FILENAME,
      ...pnwWorkspaceSchemaV13ObjectNames(),
    }).toEqual(fixture);
    expect(hash).toBe(PNW_WORKSPACE_SCHEMA_V13_SHA256);
  });

  it("executes the frozen DDL in SQLite and records schema version 13", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA foreign_keys = ON");
      db.exec(PNW_WORKSPACE_SCHEMA_V13_DDL);
      db.prepare(PNW_WORKSPACE_SCHEMA_VERSION_UPSERT_SQL).run(String(PNW_WORKSPACE_SCHEMA_VERSION));
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      ).all().map((row) => String(row.name));
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      ).all().map((row) => String(row.name));
      expect(tables).toEqual(fixture.tables);
      expect(indexes).toEqual(fixture.indexes);
      expect(db.prepare("SELECT value FROM phoenix_meta WHERE key = 'schema_version'").get())
        .toEqual({ value: "13" });
    } finally {
      db.close();
    }
  });

  it("only treats exact v13 as current until migrations are specified", () => {
    expect(compatibilityFixture).toMatchObject({ contract_version: 1, current_version: 13 });
    for (const entry of compatibilityFixture.cases) {
      expect(pnwClassifyWorkspaceSchemaVersion(entry.actual_version), entry.host_action)
        .toBe(entry.classification);
      expect(entry.may_write, entry.host_action).toBe(entry.classification === "current");
    }
    expect(pnwClassifyWorkspaceSchemaVersion(undefined)).toBe("uninitialized");
  });
});

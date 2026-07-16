import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pnwCreateDb } from "@phoenix-wing/db-node";
import { pnwQueryCadWorkspaceSummaryV1 } from "./queryV1.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Phoenix CAD driver-neutral query core", () => {
  it("matches the Rust v13 SQL fixture through a non-Rust SQLite adapter", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "phoenix-cad-query-core-"));
    roots.push(root);
    const database = pnwCreateDb(path.join(root, "phoenix-workspace.sqlite"));
    try {
      database.exec(readFileSync(
        new URL("../../cad-rust-source/fixtures/database/query-v13.sql", import.meta.url),
        "utf8",
      ));
      const changesBefore = database.get<{ changes: number }>(
        "SELECT total_changes() AS changes",
      )?.changes;
      const summary = pnwQueryCadWorkspaceSummaryV1(database, "assembly.FCStd");
      expect(summary.counts).toEqual({ incoming: 0, outgoing: 1, flat_lines: 1 });
      expect(summary.incoming).toEqual([]);
      expect(summary.outgoing).toEqual([{
        target_repo_rel_path: "parts/bolt.FCStd",
        target_filename: "bolt.FCStd",
        link_label: "Bolt link",
        target_part_number: "P200",
      }]);
      expect(summary.bom).toEqual([{
        depth: 1,
        part_rel: "parts/bolt.FCStd",
        part_key: "P200-02",
        quantity: 2,
        bom_path: "0/0",
      }]);
      expect(database.get<{ changes: number }>(
        "SELECT total_changes() AS changes",
      )?.changes).toBe(changesBefore);
    } finally {
      database.close();
    }
  });

  it("rejects unsafe paths and incompatible schemas before domain queries", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "phoenix-cad-query-core-"));
    roots.push(root);
    const database = pnwCreateDb(path.join(root, "phoenix-workspace.sqlite"));
    try {
      database.exec("CREATE TABLE phoenix_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      database.run("INSERT INTO phoenix_meta VALUES (?, ?)", ["schema_version", "12"]);
      expect(() => pnwQueryCadWorkspaceSummaryV1(database, "../outside.FCStd"))
        .toThrow(/workspace-relative/);
      expect(() => pnwQueryCadWorkspaceSummaryV1(database, "assembly.FCStd"))
        .toThrow(/expected phoenix-workspace v13, got 12/);
    } finally {
      database.close();
    }
  });
});
